import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { userQueries } from '../db/queries.js';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types.js';

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
}

