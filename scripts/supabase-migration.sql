-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create markers table
CREATE TABLE IF NOT EXISTS markers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  marker_image_path TEXT NOT NULL,
  video_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS ar_analytics (
  id SERIAL PRIMARY KEY,
  marker_id UUID REFERENCES markers(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address TEXT
);

-- Insert a sample admin user (password: admin123)
INSERT INTO admin_users (email, password_hash) 
VALUES ('admin@example.com', '$2b$10$rQZ9QmjlhQZ9QmjlhQZ9Qu') 
ON CONFLICT (email) DO NOTHING;

-- Create storage buckets (run these in Supabase Storage section)
-- marker-images bucket (public)
-- marker-videos bucket (public)  
-- targets bucket (public)
