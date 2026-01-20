import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { userQueries, passwordResetQueries } from '../db/queries.js';
import { RegisterRequest, LoginRequest, AuthResponse, ForgotPasswordRequest, ResetPasswordRequest } from '../types.js';
import { emailService } from '../services/emailService.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post<{ Body: RegisterRequest }>('/register', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return reply.code(400).send({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await userQueries.findByEmail(email);
    if (existingUser) {
      return reply.code(409).send({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await userQueries.create(email, passwordHash);

    // Generate JWT
    const token = fastify.jwt.sign({ userId: user.id, email: user.email });

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    };

    return reply.code(201).send(response);
  });

  // Login
  fastify.post<{ Body: LoginRequest }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    // Find user
    const user = await userQueries.findByEmail(email);
    if (!user) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = fastify.jwt.sign({ userId: user.id, email: user.email });

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    };

    return reply.send(response);
  });

  // Forgot Password
  fastify.post<{ Body: ForgotPasswordRequest }>('/forgot-password', async (request, reply) => {
    const { email } = request.body;

    if (!email) {
      return reply.code(400).send({ error: 'Email is required' });
    }

    // Rate limiting: Check recent attempts (3 attempts per hour per email)
    const MAX_ATTEMPTS = 3;
    const TIME_WINDOW_MINUTES = 60;
    
    try {
      const recentAttempts = await passwordResetQueries.countRecentAttempts(email, TIME_WINDOW_MINUTES);
      
      if (recentAttempts >= MAX_ATTEMPTS) {
        return reply.code(429).send({ 
          error: 'Too many password reset requests. Please try again later.' 
        });
      }

      // Record this attempt
      const ipAddress = request.ip;
      await passwordResetQueries.recordAttempt(email, ipAddress);

      // Find user by email
      const user = await userQueries.findByEmail(email);
      
      // Always return success to prevent email enumeration
      // Don't reveal if the email exists or not
      const response = { 
        message: 'If an account exists with that email, you will receive password reset instructions.' 
      };

      if (user) {
        // Clean up any expired tokens
        await passwordResetQueries.deleteExpiredTokens();
        
        // Create reset token (expires in 1 hour)
        const resetToken = await passwordResetQueries.createToken(user.id, 1);
        
        // Send password reset email
        try {
          await emailService.sendPasswordResetEmail(email, resetToken);
        } catch (emailError) {
          console.error('[Auth] Failed to send password reset email:', {
            email,
            error: emailError instanceof Error ? emailError.message : String(emailError),
            timestamp: new Date().toISOString(),
          });
          // Don't reveal email sending failure to user for security
        }
      }

      return reply.send(response);
    } catch (error) {
      console.error('[Auth] Forgot password error:', error);
      return reply.code(500).send({ error: 'An error occurred processing your request' });
    }
  });

  // Reset Password
  fastify.post<{ Body: ResetPasswordRequest }>('/reset-password', async (request, reply) => {
    const { token, password } = request.body;

    if (!token || !password) {
      return reply.code(400).send({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return reply.code(400).send({ error: 'Password must be at least 6 characters' });
    }

    try {
      // Find token
      const resetToken = await passwordResetQueries.findByToken(token);

      if (!resetToken) {
        return reply.code(400).send({ error: 'Invalid or expired reset token' });
      }

      // Check if token has been used
      if (resetToken.used) {
        return reply.code(400).send({ error: 'Reset token has already been used' });
      }

      // Check if token is expired
      const now = new Date();
      if (new Date(resetToken.expires_at) < now) {
        return reply.code(400).send({ error: 'Reset token has expired' });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user password
      await userQueries.updatePassword(resetToken.user_id, passwordHash);

      // Mark token as used
      await passwordResetQueries.markAsUsed(token);

      return reply.send({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('[Auth] Reset password error:', error);
      return reply.code(500).send({ error: 'An error occurred resetting your password' });
    }
  });
}

