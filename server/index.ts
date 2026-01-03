import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { todoRoutes } from './routes/todos.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

// Register CORS
fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

// Register JWT
fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
});

// Register routes
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(todoRoutes, { prefix: '/api' });

// Health check
fastify.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

