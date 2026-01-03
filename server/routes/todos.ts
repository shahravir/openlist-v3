import { FastifyInstance } from 'fastify';
import { todoQueries } from '../db/queries.js';
import { authenticate } from '../middleware/auth.js';
import { SyncRequest, SyncResponse } from '../types.js';

export async function todoRoutes(fastify: FastifyInstance) {
  // Get all todos
  fastify.get('/todos', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const todos = await todoQueries.findByUserId(userId);

    return {
      todos: todos.map((todo) => ({
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        created_at: new Date(todo.created_at).getTime(),
        updated_at: new Date(todo.updated_at).getTime(),
      })),
    };
  });

  // Sync todos (bulk upsert with conflict resolution)
  fastify.post<{ Body: SyncRequest }>('/todos/sync', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const { todos: clientTodos } = request.body;

    console.log('Sync request - userId:', userId, 'clientTodos:', clientTodos.length);

    // Get server todos
    const serverTodos = await todoQueries.findByUserId(userId);
    console.log('Server todos:', serverTodos.length);

    // Convert server todos to client format with timestamps
    const serverTodosMap = new Map(
      serverTodos.map((todo) => [
        todo.id,
        {
          id: todo.id,
          text: todo.text,
          completed: todo.completed,
          created_at: new Date(todo.created_at).getTime(),
          updated_at: new Date(todo.updated_at).getTime(),
        },
      ])
    );

    // Merge client and server todos (last-write-wins based on updated_at)
    const todosToUpsert: typeof clientTodos = [];

    // Process client todos - add to upsert list if newer or doesn't exist on server
    clientTodos.forEach((clientTodo) => {
      const serverTodo = serverTodosMap.get(clientTodo.id);
      if (!serverTodo) {
        // New todo from client - always include it
        console.log('New client todo:', clientTodo.id);
        todosToUpsert.push(clientTodo);
      } else if (clientTodo.updated_at >= serverTodo.updated_at) {
        // Client version is newer or equal - include client version
        console.log('Client todo is newer:', clientTodo.id, clientTodo.updated_at, 'vs', serverTodo.updated_at);
        todosToUpsert.push(clientTodo);
      } else {
        // Server version is newer - keep server version
        console.log('Server todo is newer:', serverTodo.id);
        todosToUpsert.push(serverTodo);
      }
    });

    // Add server todos that don't exist in client (new todos from other devices)
    serverTodosMap.forEach((serverTodo) => {
      const clientTodo = clientTodos.find((t) => t.id === serverTodo.id);
      if (!clientTodo) {
        // Server has a todo that client doesn't - add it
        console.log('New server todo:', serverTodo.id);
        todosToUpsert.push(serverTodo);
      }
    });

    console.log('Todos to upsert:', todosToUpsert.length);

    // Upsert all merged todos to database (bulkUpsert handles conflict resolution)
    const upsertedTodos = await todoQueries.bulkUpsert(userId, todosToUpsert);
    console.log('Upserted todos:', upsertedTodos.length);

    // Return final merged state from database
    const finalTodos = await todoQueries.findByUserId(userId);
    console.log('Final todos from DB:', finalTodos.length);
    
    const response: SyncResponse = {
      todos: finalTodos.map((todo) => ({
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        created_at: new Date(todo.created_at).getTime(),
        updated_at: new Date(todo.updated_at).getTime(),
      })),
    };

    console.log('Sending response with', response.todos.length, 'todos');
    return response;
  });

  // Update single todo
  fastify.put<{ Params: { id: string }; Body: { text: string; completed: boolean } }>(
    '/todos/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params;
      const { text, completed } = request.body;

      const todo = await todoQueries.update(id, userId, text, completed);
      if (!todo) {
        return reply.code(404).send({ error: 'Todo not found' });
      }

      return {
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        created_at: new Date(todo.created_at).getTime(),
        updated_at: new Date(todo.updated_at).getTime(),
      };
    }
  );

  // Delete todo
  fastify.delete<{ Params: { id: string } }>(
    '/todos/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params;

      const deleted = await todoQueries.delete(id, userId);
      if (!deleted) {
        return reply.code(404).send({ error: 'Todo not found' });
      }

      return { success: true };
    }
  );
}

