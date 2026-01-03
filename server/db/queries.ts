import pool from './connection.js';
import { Todo, User } from '../types.js';

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
      'SELECT * FROM todos WHERE user_id = $1 ORDER BY updated_at DESC',
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

  async create(userId: string, text: string, completed: boolean = false): Promise<Todo> {
    const result = await pool.query(
      'INSERT INTO todos (user_id, text, completed) VALUES ($1, $2, $3) RETURNING *',
      [userId, text, completed]
    );
    return result.rows[0];
  },

  async update(id: string, userId: string, text: string, completed: boolean): Promise<Todo | null> {
    const result = await pool.query(
      'UPDATE todos SET text = $1, completed = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [text, completed, id, userId]
    );
    return result.rows[0] || null;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM todos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async bulkUpsert(userId: string, todos: Array<{ id: string; text: string; completed: boolean; created_at: number; updated_at: number }>): Promise<Todo[]> {
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
          // Check if todo exists
          const existing = await client.query(
            'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
            [todo.id, userId]
          );

          if (existing.rows.length > 0) {
            // Update only if client version is newer
            const existingTodo = existing.rows[0];
            const existingUpdatedAt = new Date(existingTodo.updated_at).getTime();
            
            if (todo.updated_at >= existingUpdatedAt) {
              const result = await client.query(
                `UPDATE todos 
                 SET text = $1, completed = $2, updated_at = to_timestamp($3 / 1000.0)
                 WHERE id = $4 AND user_id = $5
                 RETURNING *`,
                [todo.text, todo.completed, todo.updated_at, todo.id, userId]
              );
              if (result.rows[0]) {
                results.push(result.rows[0]);
              }
            } else {
              // Keep server version (newer)
              results.push(existingTodo);
            }
          } else {
            // Insert new todo
            const result = await client.query(
              `INSERT INTO todos (id, user_id, text, completed, created_at, updated_at)
               VALUES ($1::uuid, $2::uuid, $3, $4, to_timestamp($5 / 1000.0), to_timestamp($6 / 1000.0))
               RETURNING *`,
              [todo.id, userId, todo.text, todo.completed, todo.created_at, todo.updated_at]
            );
            if (result.rows[0]) {
              results.push(result.rows[0]);
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

