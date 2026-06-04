-- ==========================================
-- PostgreSQL Database Schema for Jira-like Issue Tracker
-- Description: Core structures for Users, Projects, Issues, Comments, and Attachments
-- ==========================================

-- 1. Setup custom type mappings for Status and Priority
CREATE TYPE issue_status AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE issue_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- 2. Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Projects Table
CREATE TABLE projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_by VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Issues / Tickets Table
CREATE TABLE issues (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status issue_status DEFAULT 'todo' NOT NULL,
    priority issue_priority DEFAULT 'medium' NOT NULL,
    assignee_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    reporter_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Comments Table
CREATE TABLE comments (
    id VARCHAR(50) PRIMARY KEY,
    issue_id VARCHAR(50) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Attachments Table
CREATE TABLE attachments (
    id VARCHAR(50) PRIMARY KEY,
    issue_id VARCHAR(50) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_data TEXT NOT NULL, -- Stored as Base64 encoded string data for portability
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================
-- Optimization Indices for High Read Speeds
-- ==========================================
CREATE INDEX idx_issues_project ON issues(project_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_comments_issue ON comments(issue_id);
CREATE INDEX idx_attachments_issue ON attachments(issue_id);
