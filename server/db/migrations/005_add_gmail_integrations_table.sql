-- Migration: Add gmail_integrations table for storing Gmail OAuth tokens
-- Purpose: Store OAuth access/refresh tokens for users who connect their Gmail account
-- Supports one Gmail integration per user with secure token storage

-- Create gmail_integrations table
CREATE TABLE IF NOT EXISTS gmail_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  email VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gmail_integrations_user_id ON gmail_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_integrations_is_active ON gmail_integrations(is_active);

-- Create trigger to automatically update updated_at timestamp
-- Note: The update_updated_at_column() function is already defined in previous migrations
DROP TRIGGER IF EXISTS update_gmail_integrations_updated_at ON gmail_integrations;
CREATE TRIGGER update_gmail_integrations_updated_at
  BEFORE UPDATE ON gmail_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
