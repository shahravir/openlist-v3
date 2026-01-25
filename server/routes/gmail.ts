import { FastifyInstance } from 'fastify';
import { google } from 'googleapis';
import { authenticate } from '../middleware/auth.js';
import { gmailQueries } from '../db/queries.js';
import { GmailStatusResponse } from '../types.js';
import crypto from 'crypto';

// Store state tokens temporarily (in production, use Redis or database)
const stateStore = new Map<string, { userId: string; timestamp: number }>();

// Clean up expired state tokens (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (now - data.timestamp > 600000) { // 10 minutes
      stateStore.delete(state);
    }
  }
}, 60000); // Run every minute

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

export async function gmailRoutes(fastify: FastifyInstance) {
  // GET /api/gmail/oauth/authorize
  // Generate OAuth authorization URL and redirect user to Google consent screen
  fastify.get('/oauth/authorize', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      
      // Generate a random state token to prevent CSRF attacks
      const state = crypto.randomBytes(32).toString('hex');
      stateStore.set(state, { userId, timestamp: Date.now() });

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
        prompt: 'consent', // Force consent screen to ensure we get refresh token
        state,
      });

      return reply.redirect(authUrl);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate authorization URL' });
    }
  });

  // GET /api/gmail/oauth/callback
  // Handle OAuth callback from Google
  fastify.get('/oauth/callback', async (request, reply) => {
    try {
      const { code, error, state } = request.query as { code?: string; error?: string; state?: string };

      // Handle error from Google OAuth
      if (error) {
        fastify.log.error(`OAuth error: ${error}`);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return reply.redirect(`${frontendUrl}/settings?gmail_error=${encodeURIComponent(error)}`);
      }

      if (!code) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return reply.redirect(`${frontendUrl}/settings?gmail_error=no_code`);
      }

      if (!state) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return reply.redirect(`${frontendUrl}/settings?gmail_error=no_state`);
      }

      // Verify state token
      const stateData = stateStore.get(state);
      if (!stateData) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return reply.redirect(`${frontendUrl}/settings?gmail_error=invalid_state`);
      }

      // Remove state token after use
      stateStore.delete(state);
      const userId = stateData.userId;

      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens.access_token || !tokens.refresh_token) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return reply.redirect(`${frontendUrl}/settings?gmail_error=no_tokens`);
      }

      // Set credentials to get user info
      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Get user's Gmail profile to retrieve email address
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const email = profile.data.emailAddress;

      if (!email) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return reply.redirect(`${frontendUrl}/settings?gmail_error=no_email`);
      }

      // Calculate token expiration time
      const expiresAt = tokens.expiry_date 
        ? new Date(tokens.expiry_date) 
        : new Date(Date.now() + 3600 * 1000); // Default to 1 hour from now

      // Check if integration already exists
      const existingIntegration = await gmailQueries.findByUserId(userId);
      
      if (existingIntegration) {
        // Update existing integration
        await gmailQueries.updateTokens(userId, tokens.access_token, tokens.refresh_token, expiresAt);
      } else {
        // Create new integration
        await gmailQueries.create(userId, email, tokens.access_token, tokens.refresh_token, expiresAt);
      }

      // Redirect to frontend success page
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return reply.redirect(`${frontendUrl}/settings?gmail_success=true`);
    } catch (error: any) {
      fastify.log.error(error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return reply.redirect(`${frontendUrl}/settings?gmail_error=exchange_failed`);
    }
  });

  // GET /api/gmail/status
  // Check if user has active Gmail integration
  fastify.get('/status', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const integration = await gmailQueries.findByUserId(userId);

      const response: GmailStatusResponse = {
        connected: !!integration,
        email: integration?.email,
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to check Gmail status' });
    }
  });

  // DELETE /api/gmail/disconnect
  // Remove Gmail integration for user
  fastify.delete('/disconnect', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const deleted = await gmailQueries.delete(userId);

      if (!deleted) {
        return reply.code(404).send({ error: 'No Gmail integration found' });
      }

      return reply.send({ success: true, message: 'Gmail integration disconnected' });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to disconnect Gmail integration' });
    }
  });
}
