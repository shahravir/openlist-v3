import { useState } from 'react';
import { Todo } from '../types';
import { TodoItem } from './TodoItem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Priority } from './PrioritySelector';

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string, dueDate?: number | null, priority?: Priority) => void;
  onReorder: (reorderedTodos: Todo[]) => void;
  searchQuery?: string;
  emptyMessage?: string;
}

export function TodoList({ 
  todos, 
  onToggle, 
  onDelete, 
  onUpdate, 
  onReorder, 
  searchQuery = '', 
  emptyMessage = 'No tasks yet. Tap the + button to add one.' 
}: TodoListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = async (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    
    // Trigger haptic feedback on mobile
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      // Haptics not available (web), silently continue
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      const oldIndex = todos.findIndex((todo) => todo.id === active.id);
      const newIndex = todos.findIndex((todo) => todo.id === over.id);
      
      const reorderedTodos = arrayMove(todos, oldIndex, newIndex);
      onReorder(reorderedTodos);
      
      // Trigger haptic feedback on mobile
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (error) {
        // Haptics not available (web), silently continue
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const reorderedTodos = arrayMove(todos, index, index - 1);
      onReorder(reorderedTodos);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < todos.length - 1) {
      const reorderedTodos = arrayMove(todos, index, index + 1);
      onReorder(reorderedTodos);
    }
  };
  
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-gray-400 text-center text-base">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const activeTodo = activeId ? todos.find(todo => todo.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={todos.map(todo => todo.id)} strategy={verticalListSortingStrategy}>
        <div 
          className="space-y-2" 
          role="list" 
          aria-label="Todo list"
        >
          {todos.map((todo, index) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              canMoveUp={index > 0}
              canMoveDown={index < todos.length - 1}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      </SortableContext>
      
      <DragOverlay>
        {activeTodo ? (
          <div className="bg-white rounded-lg shadow-lg border-2 border-primary-400 px-4 py-3 opacity-90">
            <span className="text-base text-gray-800">{activeTodo.text}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

