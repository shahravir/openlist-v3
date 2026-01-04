-- Add order column to todos table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Create index on (user_id, order) for performance
CREATE INDEX IF NOT EXISTS idx_todos_user_order ON todos(user_id, "order");

-- Update existing todos to have sequential order based on created_at
-- This ensures existing todos have a proper order
UPDATE todos 
SET "order" = subquery.row_num 
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as row_num 
  FROM todos
) AS subquery 
WHERE todos.id = subquery.id AND todos."order" = 0;
