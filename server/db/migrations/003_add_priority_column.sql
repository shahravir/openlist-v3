-- Add priority column to todos table
ALTER TABLE todos ADD COLUMN priority VARCHAR(10) DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high'));

-- Create index for efficient filtering by priority
CREATE INDEX idx_todos_priority ON todos(user_id, priority);
