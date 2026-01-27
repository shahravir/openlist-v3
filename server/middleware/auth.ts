import { FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; email: string };
    user: { userId: string; email: string };
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

// Authenticate using token from either Authorization header or query parameter
// This is useful for OAuth flows where the token needs to be in the URL
export async function authenticateWithQueryToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // First try to verify from Authorization header (standard way)
    try {
      await request.jwtVerify();
      return;
    } catch (headerErr) {
      // If header auth fails, try query parameter
      const query = request.query as { token?: string };
      if (query?.token) {
        // Temporarily set the Authorization header to use the token from query
        const originalAuth = request.headers.authorization;
        request.headers.authorization = `Bearer ${query.token}`;
        try {
          await request.jwtVerify();
          // Restore original header if verification succeeds
          if (originalAuth) {
            request.headers.authorization = originalAuth;
          } else {
            delete request.headers.authorization;
          }
          return;
        } catch (queryErr) {
          // Restore original header if verification fails
          if (originalAuth) {
            request.headers.authorization = originalAuth;
          } else {
            delete request.headers.authorization;
          }
          throw queryErr;
        }
      }
      // If both fail, throw the original error
      throw headerErr;
    }
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

