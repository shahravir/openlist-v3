import pool from './connection.js';
import { Todo, User, Tag, GmailIntegration } from '../types.js';
import { generateTagColor } from '../utils/tagColor.js';

export const userQueries = {
  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async findById(id: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create(email: string, passwordHash: string): Promise<User> {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email, passwordHash]
    );
    return result.rows[0];
  },
};

export const todoQueries = {
  async findByUserId(userId: string): Promise<Todo[]> {
    const result = await pool.query(
      'SELECT * FROM todos WHERE user_id = $1 ORDER BY "order" ASC, created_at ASC',
      [userId]
    );
    return result.rows;
  },

  async findById(id: string, userId: string): Promise<Todo | null> {
    const result = await pool.query(
      'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  },

  async create(userId: string, text: string, completed: boolean = false, order?: number, dueDate?: number | null, priority: 'none' | 'low' | 'medium' | 'high' = 'none'): Promise<Todo> {
    // If order is not provided, set it to be after all existing todos
    if (order === undefined) {
      const maxOrderResult = await pool.query(
        'SELECT COALESCE(MAX("order"), 0) as max_order FROM todos WHERE user_id = $1',
        [userId]
      );
      order = (maxOrderResult.rows[0]?.max_order || 0) + 1;
    }
    
    const result = await pool.query(
      'INSERT INTO todos (user_id, text, completed, "order", due_date, priority) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, text, completed, order, dueDate ? new Date(dueDate) : null, priority]
    );
    return result.rows[0];
  },

  async update(id: string, userId: string, text: string, completed: boolean, order?: number, dueDate?: number | null, priority?: 'none' | 'low' | 'medium' | 'high'): Promise<Todo | null> {
    let query: string;
    let params: any[];
    
    if (order !== undefined && priority !== undefined) {
      query = 'UPDATE todos SET text = $1, completed = $2, "order" = $3, due_date = $4, priority = $5 WHERE id = $6 AND user_id = $7 RETURNING *';
      params = [text, completed, order, dueDate ? new Date(dueDate) : null, priority, id, userId];
    } else if (order !== undefined) {
      query = 'UPDATE todos SET text = $1, completed = $2, "order" = $3, due_date = $4 WHERE id = $5 AND user_id = $6 RETURNING *';
      params = [text, completed, order, dueDate ? new Date(dueDate) : null, id, userId];
    } else if (priority !== undefined) {
      query = 'UPDATE todos SET text = $1, completed = $2, due_date = $3, priority = $4 WHERE id = $5 AND user_id = $6 RETURNING *';
      params = [text, completed, dueDate ? new Date(dueDate) : null, priority, id, userId];
    } else {
      query = 'UPDATE todos SET text = $1, completed = $2, due_date = $3 WHERE id = $4 AND user_id = $5 RETURNING *';
      params = [text, completed, dueDate ? new Date(dueDate) : null, id, userId];
    }
    
    const result = await pool.query(query, params);
    return result.rows[0] || null;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM todos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async bulkUpsert(userId: string, todos: Array<{ id: string; text: string; completed: boolean; order: number; priority?: 'none' | 'low' | 'medium' | 'high'; due_date?: number | null; created_at: number; updated_at: number }>): Promise<Todo[]> {
    if (todos.length === 0) {
      return [];
    }

    // Retry logic for CockroachDB transaction retry errors
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const results: Todo[] = [];
        for (const todo of todos) {
          // First check if todo exists globally (for any user)
          const globalCheck = await client.query(
            'SELECT * FROM todos WHERE id = $1',
            [todo.id]
          );

          if (globalCheck.rows.length > 0) {
            const existingTodo = globalCheck.rows[0];
            
            // If todo exists but belongs to a different user, skip it
            // This prevents duplicate key errors and ensures data isolation
            if (existingTodo.user_id !== userId) {
              console.log(`Skipping todo ${todo.id} - belongs to different user (${existingTodo.user_id} vs ${userId})`);
              continue;
            }
            
            // Todo exists for this user - update only if client version is newer
            const existingUpdatedAt = new Date(existingTodo.updated_at).getTime();
            
            if (todo.updated_at >= existingUpdatedAt) {
              const result = await client.query(
                `UPDATE todos 
                 SET text = $1, completed = $2, "order" = $3, due_date = $4, priority = $5, updated_at = to_timestamp($6 / 1000.0)
                 WHERE id = $7 AND user_id = $8
                 RETURNING *`,
                [todo.text, todo.completed, todo.order, todo.due_date ? new Date(todo.due_date) : null, todo.priority || 'none', todo.updated_at, todo.id, userId]
              );
              if (result.rows[0]) {
                results.push(result.rows[0]);
              }
            } else {
              // Keep server version (newer)
              results.push(existingTodo);
            }
          } else {
            // Todo doesn't exist - insert new todo
            // Use ON CONFLICT to handle race conditions gracefully
            // If conflict occurs and todo belongs to different user, do nothing (skip it)
            try {
              const result = await client.query(
                `INSERT INTO todos (id, user_id, text, completed, "order", due_date, priority, created_at, updated_at)
                 VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, to_timestamp($8 / 1000.0), to_timestamp($9 / 1000.0))
                 ON CONFLICT (id) DO NOTHING
                 RETURNING *`,
                [todo.id, userId, todo.text, todo.completed, todo.order, todo.due_date ? new Date(todo.due_date) : null, todo.priority || 'none', todo.created_at, todo.updated_at]
              );
              
              // If insert succeeded (no conflict), add to results
              if (result.rows[0]) {
                results.push(result.rows[0]);
              } else {
                // Insert was skipped due to conflict - check if it belongs to this user
                // If it does, we should update it; if not, skip it
                const conflictCheck = await client.query(
                  'SELECT * FROM todos WHERE id = $1',
                  [todo.id]
                );
                if (conflictCheck.rows[0] && conflictCheck.rows[0].user_id === userId) {
                  // It belongs to this user, update it
                  const updateResult = await client.query(
                    `UPDATE todos 
                     SET text = $1, completed = $2, "order" = $3, due_date = $4, priority = $5, updated_at = to_timestamp($6 / 1000.0)
                     WHERE id = $7 AND user_id = $8
                     RETURNING *`,
                    [todo.text, todo.completed, todo.order, todo.due_date ? new Date(todo.due_date) : null, todo.priority || 'none', todo.updated_at, todo.id, userId]
                  );
                  if (updateResult.rows[0]) {
                    results.push(updateResult.rows[0]);
                  }
                } else {
                  // Belongs to different user, skip it
                  console.log(`Skipping todo ${todo.id} - conflict with different user's todo`);
                }
              }
            } catch (insertError: any) {
              // If insert fails due to duplicate key, check ownership and handle accordingly
              if (insertError?.code === '23505') {
                const conflictCheck = await client.query(
                  'SELECT * FROM todos WHERE id = $1',
                  [todo.id]
                );
                if (conflictCheck.rows[0] && conflictCheck.rows[0].user_id !== userId) {
                  console.log(`Skipping todo ${todo.id} - duplicate key (belongs to different user)`);
                  continue;
                }
                // If it belongs to this user, it's a race condition - try to update
                const updateResult = await client.query(
                  `UPDATE todos 
                   SET text = $1, completed = $2, "order" = $3, due_date = $4, priority = $5, updated_at = to_timestamp($6 / 1000.0)
                   WHERE id = $7 AND user_id = $8
                   RETURNING *`,
                  [todo.text, todo.completed, todo.order, todo.due_date ? new Date(todo.due_date) : null, todo.priority || 'none', todo.updated_at, todo.id, userId]
                );
                if (updateResult.rows[0]) {
                  results.push(updateResult.rows[0]);
                }
              } else {
                throw insertError;
              }
            }
          }
        }

        await client.query('COMMIT');
        client.release();
        return results;
      } catch (error: any) {
        await client.query('ROLLBACK');
        client.release();

        // Check if it's a retryable error (CockroachDB transaction retry)
        const isRetryable = error?.code === '40001' || 
                           error?.message?.includes('TransactionRetryWithProtoRefreshError') ||
                           error?.message?.includes('ReadWithinUncertaintyIntervalError') ||
                           error?.message?.includes('WriteTooOldError');

        if (isRetryable && retries < maxRetries - 1) {
          retries++;
          // Exponential backoff: wait 50ms * 2^retries
          const delay = 50 * Math.pow(2, retries);
          console.log(`Transaction retry error, retrying in ${delay}ms (attempt ${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  },
};

export const tagQueries = {
  async findByUserId(userId: string): Promise<Tag[]> {
    const result = await pool.query(
      'SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    return result.rows;
  },

  async findById(id: string, userId: string): Promise<Tag | null> {
    const result = await pool.query(
      'SELECT * FROM tags WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  },

  async findByName(name: string, userId: string): Promise<Tag | null> {
    const result = await pool.query(
      'SELECT * FROM tags WHERE name = $1 AND user_id = $2',
      [name, userId]
    );
    return result.rows[0] || null;
  },

  async create(userId: string, name: string, color: string): Promise<Tag> {
    const result = await pool.query(
      'INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) RETURNING *',
      [userId, name, color]
    );
    return result.rows[0];
  },

  async update(id: string, userId: string, name: string, color: string): Promise<Tag | null> {
    const result = await pool.query(
      'UPDATE tags SET name = $1, color = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [name, color, id, userId]
    );
    return result.rows[0] || null;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM tags WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async findOrCreate(userId: string, name: string, color: string): Promise<Tag> {
    // Try to find existing tag first
    const existing = await this.findByName(name, userId);
    if (existing) {
      return existing;
    }
    // Create new tag if it doesn't exist
    return this.create(userId, name, color);
  },

  async getTagsForTodo(todoId: string): Promise<Tag[]> {
    const result = await pool.query(
      `SELECT t.* FROM tags t
       INNER JOIN todo_tags tt ON t.id = tt.tag_id
       WHERE tt.todo_id = $1
       ORDER BY t.name ASC`,
      [todoId]
    );
    return result.rows;
  },

  async addTagToTodo(todoId: string, tagId: string): Promise<void> {
    await pool.query(
      'INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2) ON CONFLICT (todo_id, tag_id) DO NOTHING',
      [todoId, tagId]
    );
  },

  async removeTagFromTodo(todoId: string, tagId: string): Promise<void> {
    await pool.query(
      'DELETE FROM todo_tags WHERE todo_id = $1 AND tag_id = $2',
      [todoId, tagId]
    );
  },

  async setTagsForTodo(todoId: string, userId: string, tagNames: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Remove all existing tags for this todo
      await client.query('DELETE FROM todo_tags WHERE todo_id = $1', [todoId]);

      // Add new tags
      for (const tagName of tagNames) {
        if (tagName.trim()) {
          // Find or create tag
          let tag = await this.findByName(tagName.trim(), userId);
          if (!tag) {
            // Auto-generate color for new tag
            const color = generateTagColor(tagName);
            const result = await client.query(
              'INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO UPDATE SET user_id = EXCLUDED.user_id RETURNING *',
              [userId, tagName.trim(), color]
            );
            tag = result.rows[0];
          }
          
          // Link tag to todo (only if tag exists)
          if (tag) {
            await client.query(
              'INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2) ON CONFLICT (todo_id, tag_id) DO NOTHING',
              [todoId, tag.id]
            );
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

export const gmailQueries = {
  async create(userId: string, email: string, accessToken: string, refreshToken: string, expiresAt: Date): Promise<GmailIntegration> {
    const result = await pool.query(
      'INSERT INTO gmail_integrations (user_id, email, access_token, refresh_token, token_expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, email, accessToken, refreshToken, expiresAt]
    );
    return result.rows[0];
  },

  async findByUserId(userId: string): Promise<GmailIntegration | null> {
    const result = await pool.query(
      'SELECT * FROM gmail_integrations WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    return result.rows[0] || null;
  },

  async updateTokens(userId: string, accessToken: string, refreshToken: string, expiresAt: Date): Promise<GmailIntegration | null> {
    const result = await pool.query(
      'UPDATE gmail_integrations SET access_token = $1, refresh_token = $2, token_expires_at = $3 WHERE user_id = $4 RETURNING *',
      [accessToken, refreshToken, expiresAt, userId]
    );
    return result.rows[0] || null;
  },

  async delete(userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM gmail_integrations WHERE user_id = $1',
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};

