import { FastifyInstance } from 'fastify';
import { tagQueries } from '../db/queries.js';
import { authenticate } from '../middleware/auth.js';

export async function tagRoutes(fastify: FastifyInstance) {
  // Get all tags for the user
  fastify.get('/tags', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const tags = await tagQueries.findByUserId(userId);

    return {
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        created_at: new Date(tag.created_at).getTime(),
      })),
    };
  });

  // Create a new tag
  fastify.post<{ Body: { name: string; color?: string } }>(
    '/tags',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user.userId;
      const { name, color } = request.body;

      if (!name || !name.trim()) {
        return reply.code(400).send({ error: 'Tag name is required' });
      }

      const trimmedName = name.trim();
      
      // Check if tag already exists
      const existing = await tagQueries.findByName(trimmedName, userId);
      if (existing) {
        return reply.code(409).send({ error: 'Tag already exists' });
      }

      // Generate color if not provided
      const tagColor = color || generateTagColor(trimmedName);
      
      const tag = await tagQueries.create(userId, trimmedName, tagColor);

      return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        created_at: new Date(tag.created_at).getTime(),
      };
    }
  );

  // Update a tag
  fastify.put<{ Params: { id: string }; Body: { name?: string; color?: string } }>(
    '/tags/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params;
      const { name, color } = request.body;

      // Get existing tag
      const existing = await tagQueries.findById(id, userId);
      if (!existing) {
        return reply.code(404).send({ error: 'Tag not found' });
      }

      const updatedName = name?.trim() || existing.name;
      const updatedColor = color || existing.color;

      // Check if new name conflicts with another tag
      if (name && name.trim() !== existing.name) {
        const conflict = await tagQueries.findByName(name.trim(), userId);
        if (conflict && conflict.id !== id) {
          return reply.code(409).send({ error: 'Tag name already exists' });
        }
      }

      const tag = await tagQueries.update(id, userId, updatedName, updatedColor);
      if (!tag) {
        return reply.code(404).send({ error: 'Tag not found' });
      }

      return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        created_at: new Date(tag.created_at).getTime(),
      };
    }
  );

  // Delete a tag
  fastify.delete<{ Params: { id: string } }>(
    '/tags/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params;

      const deleted = await tagQueries.delete(id, userId);
      if (!deleted) {
        return reply.code(404).send({ error: 'Tag not found' });
      }

      return { success: true };
    }
  );
}

// Helper function to generate consistent colors for tags
function generateTagColor(tagName: string): string {
  const colors = [
    '#EF4444', // red
    '#F59E0B', // amber
    '#10B981', // green
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
    '#84CC16', // lime
    '#6366F1', // indigo
  ];
  
  // Generate a deterministic color based on tag name
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
