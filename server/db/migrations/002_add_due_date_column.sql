-- Add due_date column to todos table
ALTER TABLE todos ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;

-- Create index for efficient filtering by due_date
CREATE INDEX idx_todos_due_date ON todos(user_id, due_date);
