import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { userQueries } from '../db/queries.js';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types.js';
import { generateVerificationToken, getTokenExpiration, isTokenExpired } from '../utils/tokenGenerator.js';
import { emailService } from '../utils/emailService.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Get frontend URL from environment or use default
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

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

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiration = getTokenExpiration();
    await userQueries.setVerificationToken(user.id, verificationToken, tokenExpiration);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, verificationToken, frontendUrl);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails - user can resend
    }

    // Generate JWT
    const token = fastify.jwt.sign({ userId: user.id, email: user.email });

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified || false,
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
        emailVerified: user.email_verified || false,
      },
    };

    return reply.send(response);
  });

  // Verify Email
  fastify.post<{ Body: { token: string } }>('/verify-email', async (request, reply) => {
    const { token } = request.body;

    if (!token) {
      return reply.code(400).send({ error: 'Verification token is required' });
    }

    // Find user by token
    const user = await userQueries.findByVerificationToken(token);
    if (!user) {
      return reply.code(400).send({ error: 'Invalid verification token' });
    }

    // Check if token has expired
    if (isTokenExpired(user.verification_token_expires)) {
      return reply.code(400).send({ error: 'Verification token has expired' });
    }

    // Verify email
    await userQueries.verifyEmail(user.id);

    return reply.send({ message: 'Email verified successfully' });
  });

  // Resend Verification Email
  fastify.post('/resend-verification', async (request, reply) => {
    // Get user from JWT token
    try {
      await request.jwtVerify();
    } catch (error) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const { userId } = request.user as { userId: string; email: string };

    // Find user
    const user = await userQueries.findById(userId);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Check if already verified
    if (user.email_verified) {
      return reply.code(400).send({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiration = getTokenExpiration();
    await userQueries.setVerificationToken(user.id, verificationToken, tokenExpiration);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, verificationToken, frontendUrl);
      return reply.send({ message: 'Verification email sent' });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return reply.code(500).send({ error: 'Failed to send verification email' });
    }
  });
}

