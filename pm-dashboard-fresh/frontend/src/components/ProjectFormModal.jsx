import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, Flag, FileText } from 'lucide-react';

const ProjectFormModal = ({ isOpen, onClose, onSubmit, project }) => {
  const availableTeamMembers = [
    'John Doe',
    'Jane Smith', 
    'Mike Johnson',
    'Alice Chen',
    'Sarah Wilson',
    'David Brown',
    'Emma Davis',
    'Chris Wilson'
  ];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    deadline: '',
    team: [],
    progress: {
      PM: 1,
      Leadership: 1,
      ChangeMgmt: 1,
      CareerDev: 0
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      console.log('ðŸ”„ Populating form with project data:', project);
      console.log('ðŸ” Raw team data:', project.team);
      
      let formattedDeadline = '';
      if (project.deadline) {
        const deadlineDate = new Date(project.deadline);
        if (!isNaN(deadlineDate.getTime())) {
          formattedDeadline = deadlineDate.toISOString().split('T')[0];
        }
      }
      
      let cleanTeam = [];
      if (Array.isArray(project.team)) {
        cleanTeam = project.team.filter(member => member && member.trim() !== '');
      } else if (project.team && typeof project.team === 'string') {
        cleanTeam = [project.team].filter(member => member && member.trim() !== '');
      }
      
      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'planning',
        priority: project.priority || 'medium',
        deadline: formattedDeadline,
        team: cleanTeam,
        progress: {
          PM: project.progress?.PM || 1,
          Leadership: project.progress?.Leadership || 1,
          ChangeMgmt: project.progress?.ChangeMgmt || 1,
          CareerDev: project.progress?.CareerDev || 0
        }
      });
    } else if (!project && isOpen) {
      setFormData({
        name: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        deadline: '',
        team: [],
        progress: {
          PM: 1,
          Leadership: 1,
          ChangeMgmt: 1,
          CareerDev: 0
        }
      });
    }
  }, [project, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTeamChange = (memberName) => {
    setFormData(prev => {
      const newTeam = prev.team.includes(memberName)
        ? prev.team.filter(member => member !== memberName)
        : [...prev.team, memberName];
      
      return {
        ...prev,
        team: newTeam
      };
    });
  };

  const handleProgressChange = (category, value) => {
    setFormData(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        [category]: parseInt(value)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Project name is required');
      return;
    }
    if (!formData.description.trim()) {
      alert('Project description is required');
      return;
    }
    if (!formData.deadline) {
      alert('Project deadline is required');
      return;
    }
    if (formData.team.length === 0) {
      alert('At least one team member must be selected');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('âŒ Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem 1.5rem 0 1.5rem',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#6b7280'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem' }}>
          {/* Project Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              <FileText size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Project Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
              placeholder="Enter project name"
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              disabled={isSubmitting}
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
              placeholder="Enter project description"
            />
          </div>

          {/* Status and Priority Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                <Flag size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Deadline *
            </label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleInputChange}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Team Members */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              <Users size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Team Members * ({formData.team.length} selected)
            </label>
            
            {/* Show current team members if editing and team exists */}
            {project && formData.team && formData.team.length > 0 && (
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '0.375rem',
                padding: '0.75rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0369a1', marginBottom: '0.5rem' }}>
                  Current Team Members:
                </div>
                <div style={{ fontSize: '0.75rem', color: '#0369a1' }}>
                  {formData.team.filter(member => member && member.trim() !== '').join(', ') || 'No team members assigned'}
                </div>
              </div>
            )}
            
            <div style={{
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              padding: '0.75rem',
              maxHeight: '150px',
              overflow: 'auto'
            }}>
              {availableTeamMembers.map(member => {
                const isCurrentMember = formData.team && formData.team.includes(member);
                
                return (
                  <label key={member} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    backgroundColor: isCurrentMember ? '#f0f9ff' : 'transparent',
                    marginBottom: '0.25rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={isCurrentMember}
                      onChange={() => handleTeamChange(member)}
                      disabled={isSubmitting}
                      style={{ margin: 0 }}
                    />
                    <span style={{ 
                      color: isCurrentMember ? '#0369a1' : '#374151',
                      fontWeight: isCurrentMember ? '600' : '400'
                    }}>
                      {member}
                      {isCurrentMember && project && (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: '#0369a1', 
                          marginLeft: '0.5rem' 
                        }}>
                          (current)
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            
            {project && (
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.5rem',
                fontStyle: 'italic'
              }}>
                ðŸ’¡ Tip: Current team members are highlighted in blue. Uncheck to remove, check others to add.
              </div>
            )}
          </div>

          {/* Progress Sliders */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.75rem' 
            }}>
              Progress Levels
            </label>
            {Object.entries(formData.progress).map(([category, value]) => (
              <div key={category} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {category === 'ChangeMgmt' ? 'Change Mgmt' : category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {value}/7
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="7"
                  value={value}
                  onChange={(e) => handleProgressChange(category, e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: '#e5e7eb'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '0.5rem',
                backgroundColor: isSubmitting ? '#9ca3af' : '#2563eb',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Saving...' : (project ? 'Update Project' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectFormModal;