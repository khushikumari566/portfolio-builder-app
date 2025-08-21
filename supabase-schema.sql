-- Portfolio Builder Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  bio TEXT NOT NULL,
  skills JSONB DEFAULT '[]',
  social_links JSONB DEFAULT '{}',
  profile_photo TEXT,
  theme VARCHAR(50) NOT NULL DEFAULT 'modern',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id BIGINT REFERENCES portfolios(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  technologies VARCHAR(500),
  url VARCHAR(255),
  github VARCHAR(255),
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolios_email ON portfolios(email);
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON portfolios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_portfolio_id ON projects(portfolio_id);

-- Enable Row Level Security (RLS)
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for now (you can restrict later)
CREATE POLICY "Allow all operations on portfolios" ON portfolios
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on projects" ON projects
  FOR ALL USING (true);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE
    ON portfolios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert sample data (optional - remove if you don't want sample data)
INSERT INTO portfolios (name, title, email, bio, skills, social_links, theme) VALUES
(
  'John Doe',
  'Full Stack Developer',
  'john.doe@example.com',
  'Passionate full-stack developer with 5+ years of experience building web applications using modern technologies. I love creating user-friendly interfaces and robust backend systems.',
  '["JavaScript", "TypeScript", "React", "Angular", "Node.js", "Python", "PostgreSQL", "MongoDB"]',
  '{"github": "https://github.com/johndoe", "linkedin": "https://linkedin.com/in/johndoe", "website": "https://johndoe.dev"}',
  'modern'
);

-- Insert sample projects for the sample portfolio
INSERT INTO projects (portfolio_id, name, description, technologies, url, github) VALUES
(
  (SELECT id FROM portfolios WHERE email = 'john.doe@example.com' LIMIT 1),
  'E-commerce Platform',
  'A full-featured e-commerce platform with shopping cart, payment integration, and admin dashboard.',
  'React, Node.js, Express, PostgreSQL, Stripe',
  'https://ecommerce-demo.com',
  'https://github.com/johndoe/ecommerce-platform'
),
(
  (SELECT id FROM portfolios WHERE email = 'john.doe@example.com' LIMIT 1),
  'Task Management App',
  'A collaborative task management application with real-time updates and team collaboration features.',
  'Angular, TypeScript, Supabase, Tailwind CSS',
  'https://taskmanager-demo.com',
  'https://github.com/johndoe/task-manager'
),
(
  (SELECT id FROM portfolios WHERE email = 'john.doe@example.com' LIMIT 1),
  'Portfolio Builder',
  'A dynamic portfolio builder that allows users to create and customize their professional portfolios.',
  'Angular, Node.js, PostgreSQL, Docker',
  'https://portfolio-builder-demo.com',
  'https://github.com/johndoe/portfolio-builder'
);

-- Verify the data
SELECT 
  p.name, 
  p.title, 
  p.email, 
  COUNT(pr.id) as project_count 
FROM portfolios p 
LEFT JOIN projects pr ON p.id = pr.portfolio_id 
GROUP BY p.id, p.name, p.title, p.email;
