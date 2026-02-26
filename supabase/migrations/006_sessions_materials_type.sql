-- Add type column to materials for categorization
ALTER TABLE materials ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'document';
