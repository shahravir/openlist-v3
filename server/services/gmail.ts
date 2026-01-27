import { google } from 'googleapis';
import { gmailQueries } from '../db/queries.js';
import { GmailIntegration } from '../types.js';

// Validate required environment variables
if (!process.env.GMAIL_CLIENT_ID) {
  throw new Error('GMAIL_CLIENT_ID environment variable is required for Gmail OAuth');
}
if (!process.env.GMAIL_CLIENT_SECRET) {
  throw new Error('GMAIL_CLIENT_SECRET environment variable is required for Gmail OAuth');
}
if (!process.env.GMAIL_REDIRECT_URI) {
  throw new Error('GMAIL_REDIRECT_URI environment variable is required for Gmail OAuth');
}

// Email metadata interface
export interface EmailMetadata {
  id: string;
  subject: string;
  snippet: string;
  from: string;
  date: string;
  threadId: string;
}

// Full email content interface
export interface EmailContent {
  id: string;
  threadId: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  date: string;
  isHtml: boolean;
}

/**
 * Get configured Gmail API client for a user
 * @param userId - User ID to get Gmail client for
 * @returns Configured Gmail API client
 * @throws Error if integration not found or inactive
 */
export async function getGmailClient(userId: string) {
  // Retrieve user's Gmail integration from database
  const integration = await gmailQueries.findByUserId(userId);
  
  if (!integration) {
    throw new Error('Gmail integration not found for user');
  }
  
  if (!integration.is_active) {
    throw new Error('Gmail integration is inactive');
  }
  
  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  
  // Set credentials
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expiry_date: integration.token_expires_at.getTime(),
  });
  
  // Set up automatic token refresh
  oauth2Client.on('tokens', async (tokens) => {
    console.log('Token refresh triggered for user:', userId);
    
    if (tokens.access_token) {
      const expiresAt = tokens.expiry_date 
        ? new Date(tokens.expiry_date) 
        : new Date(Date.now() + 3600 * 1000);
      
      // Update tokens in database
      await gmailQueries.updateTokens(
        userId, 
        tokens.access_token, 
        tokens.refresh_token || integration.refresh_token,
        expiresAt
      );
    }
  });
  
  // Create and return Gmail API client
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  return gmail;
}

/**
 * Manually refresh access token if expired
 * @param userId - User ID to refresh token for
 * @returns New access token
 * @throws Error if refresh fails
 */
export async function refreshAccessToken(userId: string): Promise<string> {
  try {
    // Retrieve user's Gmail integration
    const integration = await gmailQueries.findByUserId(userId);
    
    if (!integration) {
      throw new Error('Gmail integration not found for user');
    }
    
    // Check if token is expired or about to expire (within 5 minutes)
    const now = new Date();
    const expiresAt = new Date(integration.token_expires_at);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    if (expiresAt > fiveMinutesFromNow) {
      console.log('Token still valid for user:', userId);
      return integration.access_token;
    }
    
    console.log('Token expired or expiring soon for user:', userId);
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );
    
    // Set credentials with refresh token
    oauth2Client.setCredentials({
      refresh_token: integration.refresh_token,
    });
    
    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }
    
    // Calculate new expiration time
    const newExpiresAt = credentials.expiry_date 
      ? new Date(credentials.expiry_date) 
      : new Date(Date.now() + 3600 * 1000);
    
    // Update tokens in database
    await gmailQueries.updateTokens(
      userId,
      credentials.access_token,
      credentials.refresh_token || integration.refresh_token,
      newExpiresAt
    );
    
    console.log('Token refreshed successfully for user:', userId);
    
    return credentials.access_token;
  } catch (error: any) {
    console.error('Error refreshing access token for user:', userId, error);
    
    // Check if token was revoked
    if (error.message && (
      error.message.includes('invalid_grant') || 
      error.message.includes('Token has been expired or revoked')
    )) {
      console.log('Token revoked, marking integration as inactive for user:', userId);
      
      // Mark integration as inactive
      const integration = await gmailQueries.findByUserId(userId);
      if (integration) {
        await gmailQueries.delete(userId);
      }
      
      throw new Error('Gmail token has been revoked. Please reconnect your Gmail account.');
    }
    
    throw error;
  }
}

/**
 * Fetch recent emails from user's Gmail inbox
 * @param userId - User ID to fetch emails for
 * @param maxResults - Maximum number of emails to fetch (default: 50)
 * @returns Array of email metadata
 * @throws Error if fetch fails
 */
export async function fetchRecentEmails(userId: string, maxResults: number = 50): Promise<EmailMetadata[]> {
  try {
    console.log(`Fetching recent emails for user: ${userId}, maxResults: ${maxResults}`);
    
    // Get Gmail client
    const gmail = await getGmailClient(userId);
    
    // Query for unread emails or emails from last 7 days
    const query = 'is:unread OR newer_than:7d';
    
    // Fetch email list
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
    });
    
    const messages = response.data.messages || [];
    
    if (messages.length === 0) {
      console.log('No messages found for user:', userId);
      return [];
    }
    
    console.log(`Found ${messages.length} messages for user:`, userId);
    
    // Fetch metadata for each message
    const emailMetadataPromises = messages.map(async (message) => {
      try {
        const emailDetails = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });
        
        const headers = emailDetails.data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
        const from = headers.find(h => h.name === 'From')?.value || '(Unknown Sender)';
        const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();
        
        return {
          id: emailDetails.data.id!,
          subject,
          snippet: emailDetails.data.snippet || '',
          from,
          date,
          threadId: emailDetails.data.threadId!,
        };
      } catch (error) {
        console.error(`Error fetching metadata for message ${message.id}:`, error);
        return null;
      }
    });
    
    const emailMetadata = await Promise.all(emailMetadataPromises);
    
    // Filter out any null results (failed fetches)
    return emailMetadata.filter((email): email is EmailMetadata => email !== null);
  } catch (error: any) {
    console.error('Error fetching recent emails for user:', userId, error);
    
    // Handle rate limiting
    if (error.code === 429 || error.message?.includes('rate limit')) {
      throw new Error('Gmail API rate limit exceeded. Please try again later.');
    }
    
    // Handle expired token (should be handled by auto-refresh, but just in case)
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      console.log('Token expired, attempting refresh for user:', userId);
      await refreshAccessToken(userId);
      // Retry once after refresh
      return fetchRecentEmails(userId, maxResults);
    }
    
    throw error;
  }
}

/**
 * Parse email body from Gmail API response
 * @param parts - Email parts from Gmail API
 * @returns Parsed email body and content type
 */
function parseEmailBody(parts: any[]): { body: string; isHtml: boolean } {
  let body = '';
  let isHtml = false;
  
  for (const part of parts) {
    // Handle nested parts (multipart messages)
    if (part.parts) {
      const parsed = parseEmailBody(part.parts);
      if (parsed.body) {
        body = parsed.body;
        isHtml = parsed.isHtml;
        // Prefer HTML over plain text
        if (isHtml) {
          return { body, isHtml };
        }
      }
    }
    
    // Handle text/plain
    if (part.mimeType === 'text/plain' && part.body?.data && !body) {
      body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      isHtml = false;
    }
    
    // Handle text/html (preferred over plain text)
    if (part.mimeType === 'text/html' && part.body?.data) {
      body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      isHtml = true;
    }
  }
  
  return { body, isHtml };
}

/**
 * Fetch full email content by message ID
 * @param userId - User ID to fetch email for
 * @param messageId - Gmail message ID
 * @returns Full email content
 * @throws Error if fetch fails
 */
export async function getEmailContent(userId: string, messageId: string): Promise<EmailContent> {
  try {
    console.log(`Fetching email content for user: ${userId}, messageId: ${messageId}`);
    
    // Get Gmail client
    const gmail = await getGmailClient(userId);
    
    // Fetch full email content
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    
    const message = response.data;
    const headers = message.payload?.headers || [];
    
    // Extract headers
    const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
    const from = headers.find(h => h.name === 'From')?.value || '(Unknown Sender)';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();
    
    // Parse email body
    let body = '';
    let isHtml = false;
    
    if (message.payload?.body?.data) {
      // Simple message body
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      isHtml = message.payload.mimeType === 'text/html';
    } else if (message.payload?.parts) {
      // Multipart message
      const parsed = parseEmailBody(message.payload.parts);
      body = parsed.body;
      isHtml = parsed.isHtml;
    }
    
    return {
      id: message.id!,
      threadId: message.threadId!,
      subject,
      body,
      from,
      to,
      date,
      isHtml,
    };
  } catch (error: any) {
    console.error('Error fetching email content for user:', userId, 'messageId:', messageId, error);
    
    // Handle rate limiting
    if (error.code === 429 || error.message?.includes('rate limit')) {
      throw new Error('Gmail API rate limit exceeded. Please try again later.');
    }
    
    // Handle expired token
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      console.log('Token expired, attempting refresh for user:', userId);
      await refreshAccessToken(userId);
      // Retry once after refresh
      return getEmailContent(userId, messageId);
    }
    
    // Handle not found
    if (error.code === 404) {
      throw new Error('Email not found');
    }
    
    throw error;
  }
}
