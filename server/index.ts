import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { todoRoutes } from './routes/todos.js';
import { setupWebSocket } from './websocket.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

const start = async () => {
  try {
    // Register CORS
    // Allow Capacitor origins (capacitor://localhost, ionic://localhost, http://localhost)
    // and configured frontend URL
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost',
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    
    await fastify.register(cors, {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin) {
          return callback(null, true);
        }
        // Check if origin is in allowed list
        if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
          return callback(null, true);
        }
        // For development, allow all origins (remove in production)
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        // Reject in production if not allowed
        callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
    });

    // Register JWT
    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    });

    // Register WebSocket
    await fastify.register(websocket);

    // Setup WebSocket handler (must be after websocket plugin is registered)
    setupWebSocket(fastify);

    // Register routes
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(todoRoutes, { prefix: '/api' });

    // Health check
    fastify.get('/health', async () => {
      return { status: 'ok' };
    });

    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

