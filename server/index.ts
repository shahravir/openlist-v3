import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { todoRoutes } from './routes/todos.js';
import { tagRoutes } from './routes/tags.js';
import { gmailRoutes } from './routes/gmail.js';
import { setupWebSocket } from './websocket.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

const start = async () => {
  try {
    // Register CORS
    // Determine if we're in development mode
    const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    
    // Build allowed origins list
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];
    
    // Add Render service URL if provided
    if (process.env.RENDER_SERVICE_URL) {
      allowedOrigins.push(process.env.RENDER_SERVICE_URL);
    }
    
    // Add Vercel preview URLs in development
    if (isDevelopment) {
      // Allow common Vite dev server ports
      for (let port = 5173; port <= 5180; port++) {
        allowedOrigins.push(`http://localhost:${port}`);
        allowedOrigins.push(`http://127.0.0.1:${port}`);
      }
    }
    
    await fastify.register(cors, {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, curl, etc.)
        if (!origin) {
          return callback(null, true);
        }
        
        // In development mode, allow all origins for easier local development
        if (isDevelopment) {
          console.log(`[CORS] Development mode: Allowing origin: ${origin}`);
          return callback(null, true);
        }
        
        // In production, check against allowed origins list
        // Check for exact match first
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Check if origin starts with any allowed origin (for subdomains, etc.)
        if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed + '/'))) {
          return callback(null, true);
        }
        
        // In production, also allow Render service URLs
        if (origin.includes('.onrender.com')) {
          return callback(null, true);
        }
        
        // In production, also allow Vercel preview URLs
        if (origin.includes('.vercel.app') || origin.includes('.vercel.sh')) {
          return callback(null, true);
        }
        
        // Reject if not in allowed list
        console.warn(`[CORS] Rejected origin: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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
    await fastify.register(tagRoutes, { prefix: '/api' });
    await fastify.register(gmailRoutes, { prefix: '/api/gmail' });

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

