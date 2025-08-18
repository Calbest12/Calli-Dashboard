-- Project Management Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(100),
    avatar VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning',
    priority VARCHAR(50) DEFAULT 'medium',
    deadline DATE,
    last_update VARCHAR(100) DEFAULT 'Just now',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Progress tracking (0-7 scale)
    pm_progress INTEGER DEFAULT 0 CHECK (pm_progress >= 0 AND pm_progress <= 7),
    leadership_progress INTEGER DEFAULT 0 CHECK (leadership_progress >= 0 AND leadership_progress <= 7),
    change_mgmt_progress INTEGER DEFAULT 0 CHECK (change_mgmt_progress >= 0 AND change_mgmt_progress <= 7),
    career_dev_progress INTEGER DEFAULT 0 CHECK (career_dev_progress >= 0 AND career_dev_progress <= 7)
);

-- Project team members (many-to-many relationship)
CREATE TABLE IF NOT EXISTS project_team_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_date DATE DEFAULT CURRENT_DATE,
    role_in_project VARCHAR(255),
    contribution_percentage INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    UNIQUE(project_id, user_id)
);

-- Project history/activity log
CREATE TABLE IF NOT EXISTS project_history (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'created', 'team_change', 'status_change', etc.
    details JSONB, -- Store flexible details about the action
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project feedback (Likert scale responses)
CREATE TABLE IF NOT EXISTS project_feedback (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    
    -- Project Management feedback (1-7 scale)
    pm_vision INTEGER CHECK (pm_vision >= 1 AND pm_vision <= 7),
    pm_time INTEGER CHECK (pm_time >= 1 AND pm_time <= 7),
    pm_quality INTEGER CHECK (pm_quality >= 1 AND pm_quality <= 7),
    pm_cost INTEGER CHECK (pm_cost >= 1 AND pm_cost <= 7),
    
    -- Leadership feedback (1-7 scale)
    leadership_vision INTEGER CHECK (leadership_vision >= 1 AND leadership_vision <= 7),
    leadership_reality INTEGER CHECK (leadership_reality >= 1 AND leadership_reality <= 7),
    leadership_ethics INTEGER CHECK (leadership_ethics >= 1 AND leadership_ethics <= 7),
    leadership_courage INTEGER CHECK (leadership_courage >= 1 AND leadership_courage <= 7),
    
    -- Change Management feedback (1-7 scale)
    change_mgmt_alignment INTEGER CHECK (change_mgmt_alignment >= 1 AND change_mgmt_alignment <= 7),
    change_mgmt_understand INTEGER CHECK (change_mgmt_understand >= 1 AND change_mgmt_understand <= 7),
    change_mgmt_enact INTEGER CHECK (change_mgmt_enact >= 1 AND change_mgmt_enact <= 7),
    
    -- Career Development feedback (1-7 scale)
    career_dev_know_yourself INTEGER CHECK (career_dev_know_yourself >= 1 AND career_dev_know_yourself <= 7),
    career_dev_know_market INTEGER CHECK (career_dev_know_market >= 1 AND career_dev_know_market <= 7),
    career_dev_tell_story INTEGER CHECK (career_dev_tell_story >= 1 AND career_dev_tell_story <= 7),
    
    -- Calculated averages for quick access
    pm_average DECIMAL(3,2),
    leadership_average DECIMAL(3,2),
    change_mgmt_average DECIMAL(3,2),
    career_dev_average DECIMAL(3,2),
    overall_average DECIMAL(3,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id) -- One feedback per user per project
);

-- Project comments
CREATE TABLE IF NOT EXISTS project_comments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'comment', -- 'comment', 'system'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User skills (for team member profiles)
CREATE TABLE IF NOT EXISTS user_skills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    UNIQUE(user_id, skill_name)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_project_history_project_id ON project_history(project_id);
CREATE INDEX IF NOT EXISTS idx_project_history_created_at ON project_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_feedback_project_id ON project_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_project_id ON project_team_members(project_id);

-- Triggers to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO users (name, email, role, avatar) VALUES
('John Doe', 'john.doe@company.com', 'Project Manager', 'JD'),
('Jane Smith', 'jane.smith@company.com', 'Frontend Developer', 'JS'),
('Mike Johnson', 'mike.johnson@company.com', 'Backend Developer', 'MJ'),
('Alice Chen', 'alice.chen@company.com', 'UX Designer', 'AC'),
('Sarah Johnson', 'sarah.johnson@company.com', 'Product Manager', 'SJ'),
('Current User', 'user@company.com', 'Project Manager', 'CU')
ON CONFLICT (email) DO NOTHING;

INSERT INTO projects (name, description, status, priority, deadline, pm_progress, leadership_progress, change_mgmt_progress, career_dev_progress) VALUES
('Website Redesign', 'Complete overhaul of company website', 'active', 'high', '2025-03-15', 7, 6, 7, 2),
('AI Integration Project', 'Implementing StorAI across all modules', 'planning', 'critical', '2025-05-20', 4, 5, 4, 0)
ON CONFLICT DO NOTHING;

-- Add team members to projects (only if projects exist)
INSERT INTO project_team_members (project_id, user_id, role_in_project, contribution_percentage, tasks_completed)
SELECT 1, u.id, 
       CASE 
         WHEN u.name = 'John Doe' THEN 'Project Manager'
         WHEN u.name = 'Jane Smith' THEN 'Frontend Developer'
         WHEN u.name = 'Mike Johnson' THEN 'Backend Developer'
         ELSE 'Team Member'
       END,
       CASE 
         WHEN u.name = 'John Doe' THEN 92
         WHEN u.name = 'Jane Smith' THEN 88
         WHEN u.name = 'Mike Johnson' THEN 85
         ELSE 75
       END,
       CASE 
         WHEN u.name = 'John Doe' THEN 15
         WHEN u.name = 'Jane Smith' THEN 12
         WHEN u.name = 'Mike Johnson' THEN 18
         ELSE 10
       END
FROM users u 
WHERE u.name IN ('John Doe', 'Jane Smith', 'Mike Johnson')
AND EXISTS (SELECT 1 FROM projects WHERE id = 1)
ON CONFLICT (project_id, user_id) DO NOTHING;

-- ============================================================================
-- CAREER DEVELOPMENT DATABASE SCHEMA
-- ============================================================================

-- Career Development Goals Table
CREATE TABLE IF NOT EXISTS career_development_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('technical', 'management', 'communication', 'design', 'analytics', 'business strategy', 'team building', 'leadership', 'innovation')),
    current_level VARCHAR(20) NOT NULL CHECK (current_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    target_level VARCHAR(20) NOT NULL CHECK (target_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    current_progress INTEGER DEFAULT 0 CHECK (current_progress >= 0 AND current_progress <= 100),
    target_date DATE NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    notes TEXT,
    resources JSONB DEFAULT '[]'::jsonb,
    completed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Career Milestones Table (formerly career_achievements)
CREATE TABLE IF NOT EXISTS career_milestones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id INTEGER REFERENCES career_development_goals(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    milestone_type VARCHAR(50) NOT NULL CHECK (milestone_type IN ('certification', 'promotion', 'skill_milestone', 'project_completion', 'leadership', 'training', 'other')),
    skill_category VARCHAR(50) CHECK (skill_category IN ('technical', 'management', 'communication', 'design', 'analytics', 'business strategy', 'team building', 'leadership', 'innovation')),
    date_completed DATE NOT NULL DEFAULT CURRENT_DATE,
    evidence_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, goal_id)
);

-- User Skills Table (Enhanced)
CREATE TABLE IF NOT EXISTS user_skills_enhanced (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('technical', 'management', 'communication', 'design', 'analytics', 'business strategy', 'team building', 'leadership', 'innovation')),
    proficiency_level VARCHAR(20) NOT NULL CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience DECIMAL(3,1) DEFAULT 0,
    last_used DATE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_name)
);

-- Mentorship Relationships Table
CREATE TABLE IF NOT EXISTS mentorship_relationships (
    id SERIAL PRIMARY KEY,
    mentor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentee_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('formal', 'informal', 'peer', 'reverse')),
    focus_area VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (mentor_user_id != mentee_user_id)
);

-- Learning Resources Table
CREATE TABLE IF NOT EXISTS learning_resources (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id INTEGER REFERENCES career_development_goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('book', 'course', 'article', 'video', 'podcast', 'workshop', 'certification', 'other')),
    url VARCHAR(500),
    completion_status VARCHAR(20) DEFAULT 'not_started' CHECK (completion_status IN ('not_started', 'in_progress', 'completed', 'bookmarked')),
    completion_date DATE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goal Progress History Table
CREATE TABLE IF NOT EXISTS goal_progress_history (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES career_development_goals(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_progress INTEGER DEFAULT 0,
    new_progress INTEGER NOT NULL,
    notes TEXT,
    is_initial_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Career Development Goals Indexes
CREATE INDEX IF NOT EXISTS idx_career_goals_user_id ON career_development_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_description ON career_development_goals(description);
CREATE INDEX IF NOT EXISTS idx_career_goals_notes ON career_development_goals(notes);
CREATE INDEX IF NOT EXISTS idx_career_goals_status ON career_development_goals(status);
CREATE INDEX IF NOT EXISTS idx_career_goals_category ON career_development_goals(category);
CREATE INDEX IF NOT EXISTS idx_career_goals_priority ON career_development_goals(priority);
CREATE INDEX IF NOT EXISTS idx_career_goals_target_date ON career_development_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_career_goals_user_status ON career_development_goals(user_id, status);

-- Career Milestones Indexes
CREATE INDEX IF NOT EXISTS idx_career_milestones_user_id ON career_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_career_milestones_type ON career_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_career_milestones_category ON career_milestones(skill_category);
CREATE INDEX IF NOT EXISTS idx_career_milestones_date ON career_milestones(date_completed);

-- User Skills Indexes
CREATE INDEX IF NOT EXISTS idx_user_skills_enhanced_user_id ON user_skills_enhanced(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_enhanced_category ON user_skills_enhanced(category);
CREATE INDEX IF NOT EXISTS idx_user_skills_enhanced_proficiency ON user_skills_enhanced(proficiency_level);

-- Mentorship Relationships Indexes
CREATE INDEX IF NOT EXISTS idx_mentorship_mentor ON mentorship_relationships(mentor_user_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_mentee ON mentorship_relationships(mentee_user_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_status ON mentorship_relationships(status);

-- Learning Resources Indexes
CREATE INDEX IF NOT EXISTS idx_learning_resources_user_id ON learning_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_goal_id ON learning_resources(goal_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_type ON learning_resources(resource_type);

-- Goal Progress History Index
CREATE INDEX IF NOT EXISTS idx_goal_progress_history_goal_user ON goal_progress_history(goal_id, user_id);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

-- Triggers for updated_at timestamps
CREATE TRIGGER update_career_goals_updated_at BEFORE UPDATE
    ON career_development_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_career_milestones_updated_at BEFORE UPDATE
    ON career_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skills_enhanced_updated_at BEFORE UPDATE
    ON user_skills_enhanced FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentorship_updated_at BEFORE UPDATE
    ON mentorship_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_resources_updated_at BEFORE UPDATE
    ON learning_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_progress_history_updated_at BEFORE UPDATE
    ON goal_progress_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();