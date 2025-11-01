-- backend/database/migrations/003_executive_team_features.sql
-- Enhanced RBAC with Executive Leader Team Management

-- Add executive_leader_id to users table for team hierarchy
ALTER TABLE users 
ADD COLUMN executive_leader_id INTEGER,
ADD CONSTRAINT fk_users_executive_leader 
  FOREIGN KEY (executive_leader_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Create index for faster lookups of team members under executives
CREATE INDEX idx_users_executive_leader_id ON users(executive_leader_id);

-- Add Executive Oversight role to project_team table
ALTER TABLE project_team 
DROP CONSTRAINT IF EXISTS check_role_valid;

ALTER TABLE project_team 
ADD CONSTRAINT check_role_valid 
CHECK (role IN (
  'Project Manager', 
  'Team Member', 
  'Reviewer', 
  'Stakeholder', 
  'Executive Oversight'
));

-- Create function to auto-assign executive leader to new projects
CREATE OR REPLACE FUNCTION auto_assign_executive_to_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the project creator has an executive leader
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.created_by 
    AND executive_leader_id IS NOT NULL
  ) THEN
    -- Insert executive leader into project team with Executive Oversight role
    INSERT INTO project_team (project_id, user_id, role, contribution_score, joined_at)
    SELECT 
      NEW.id,
      u.executive_leader_id,
      'Executive Oversight',
      0,
      NOW()
    FROM users u
    WHERE u.id = NEW.created_by
    AND u.executive_leader_id IS NOT NULL
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign executive leaders to new projects
DROP TRIGGER IF EXISTS trigger_auto_assign_executive ON projects;
CREATE TRIGGER trigger_auto_assign_executive
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_executive_to_project();

-- Create function to handle team member assignment changes
CREATE OR REPLACE FUNCTION handle_team_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If executive_leader_id is being set (member being assigned)
  IF OLD.executive_leader_id IS NULL AND NEW.executive_leader_id IS NOT NULL THEN
    -- Add executive to all existing projects created by this user
    INSERT INTO project_team (project_id, user_id, role, contribution_score, joined_at)
    SELECT 
      p.id,
      NEW.executive_leader_id,
      'Executive Oversight',
      0,
      NOW()
    FROM projects p
    WHERE p.created_by = NEW.id
    ON CONFLICT (project_id, user_id) DO NOTHING;
    
  -- If executive_leader_id is being removed (member being unassigned)
  ELSIF OLD.executive_leader_id IS NOT NULL AND NEW.executive_leader_id IS NULL THEN
    -- Remove executive from projects they were auto-assigned to
    DELETE FROM project_team 
    WHERE user_id = OLD.executive_leader_id
    AND role = 'Executive Oversight'
    AND project_id IN (
      SELECT id FROM projects WHERE created_by = NEW.id
    );
    
  -- If executive_leader_id is being changed (member reassigned)
  ELSIF OLD.executive_leader_id IS NOT NULL AND NEW.executive_leader_id IS NOT NULL 
    AND OLD.executive_leader_id != NEW.executive_leader_id THEN
    
    -- Remove old executive
    DELETE FROM project_team 
    WHERE user_id = OLD.executive_leader_id
    AND role = 'Executive Oversight'
    AND project_id IN (
      SELECT id FROM projects WHERE created_by = NEW.id
    );
    
    -- Add new executive
    INSERT INTO project_team (project_id, user_id, role, contribution_score, joined_at)
    SELECT 
      p.id,
      NEW.executive_leader_id,
      'Executive Oversight',
      0,
      NOW()
    FROM projects p
    WHERE p.created_by = NEW.id
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for team assignment changes
DROP TRIGGER IF EXISTS trigger_team_assignment_change ON users;
CREATE TRIGGER trigger_team_assignment_change
  AFTER UPDATE OF executive_leader_id ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_team_assignment_change();

-- Create view for executive team analytics
CREATE OR REPLACE VIEW executive_team_analytics AS
SELECT 
  el.id as executive_id,
  el.name as executive_name,
  COUNT(DISTINCT tm.id) as team_size,
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects,
  COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
  COALESCE(AVG(
    (COALESCE(p.pm_progress, 0) + 
     COALESCE(p.leadership_progress, 0) + 
     COALESCE(p.change_mgmt_progress, 0) + 
     COALESCE(p.career_dev_progress, 0)) / 4.0
  ), 0) as avg_progress,
  COUNT(DISTINCT CASE 
    WHEN p.updated_at >= NOW() - INTERVAL '30 days' THEN p.id 
  END) as recent_activity_count
FROM users el
LEFT JOIN users tm ON tm.executive_leader_id = el.id
LEFT JOIN projects p ON p.created_by = tm.id
WHERE el.role = 'Executive Leader'
GROUP BY el.id, el.name;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_project_team_role ON project_team(role);

-- Insert sample data for testing (optional)
-- Note: Uncomment these if you want sample data

/*
-- Update existing users to have some team relationships
UPDATE users SET executive_leader_id = (
  SELECT id FROM users WHERE role = 'Executive Leader' LIMIT 1
) WHERE role IN ('Team Member', 'Manager') AND id % 2 = 0;

-- Add some sample projects if none exist
INSERT INTO projects (title, description, priority, status, created_by, pm_progress, leadership_progress, change_mgmt_progress, career_dev_progress)
SELECT 
  'Sample Project ' || generate_series,
  'This is a sample project for testing executive oversight features',
  CASE (generate_series % 3) 
    WHEN 0 THEN 'low'
    WHEN 1 THEN 'medium'
    ELSE 'high'
  END,
  CASE (generate_series % 4)
    WHEN 0 THEN 'planning'
    WHEN 1 THEN 'active'
    WHEN 2 THEN 'on_hold'
    ELSE 'completed'
  END,
  (SELECT id FROM users WHERE role IN ('Team Member', 'Manager') ORDER BY RANDOM() LIMIT 1),
  (RANDOM() * 7)::INTEGER + 1,
  (RANDOM() * 7)::INTEGER + 1,
  (RANDOM() * 7)::INTEGER + 1,
  (RANDOM() * 7)::INTEGER + 1
FROM generate_series(1, 5)
WHERE NOT EXISTS (SELECT 1 FROM projects LIMIT 1);
*/

-- Add comments for documentation
COMMENT ON COLUMN users.executive_leader_id IS 'References the executive leader responsible for this team member';
COMMENT ON FUNCTION auto_assign_executive_to_project() IS 'Automatically assigns executive leaders to projects created by their team members';
COMMENT ON FUNCTION handle_team_assignment_change() IS 'Handles project assignments when team members are assigned/reassigned to executives';
COMMENT ON VIEW executive_team_analytics IS 'Provides analytics for executive leaders about their teams and projects';

-- Verify the migration
SELECT 'Executive team features migration completed successfully' as status;

-- Add executive_leader_id column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS executive_leader_id INTEGER,
ADD CONSTRAINT IF NOT EXISTS fk_users_executive_leader 
  FOREIGN KEY (executive_leader_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_executive_leader_id ON users(executive_leader_id);