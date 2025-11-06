// frontend/src/components/ProjectFormModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, User, Target, AlertCircle } from 'lucide-react';
import apiService from '../services/apiService';

const ProjectFormModal = ({ isOpen, onClose, onSubmit, project }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    deadline: '',
    stakeholder: '', // Added stakeholder field
    team: []
  });

  const [availableMembers] = useState([
    'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 
    'David Chen', 'Lisa Anderson', 'Tom Rodriguez', 'Emma Thompson'
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (project) {
        console.log('🔧 Editing existing project:', project);
        setFormData({
          name: project.name || '',
          description: project.description || '',
          status: project.status || 'planning',
          priority: project.priority || 'medium',
          deadline: project.deadline || '',
          stakeholder: project.stakeholder || '',
          team: project.team || []
        });
      } else {
        console.log('🆕 Creating new project');
        setFormData({
          name: '',
          description: '',
          status: 'planning',
          priority: 'medium',
          deadline: '',
          stakeholder: '',
          team: []
        });
      }
      setError('');
      setFieldErrors({});
    }
  }, [isOpen, project]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleTeamChange = (member) => {
    const isCurrentMember = formData.team.includes(member);
    
    if (isCurrentMember) {
      // Remove member
      setFormData(prev => ({
        ...prev,
        team: prev.team.filter(m => m !== member)
      }));
    } else {
      // Add member
      setFormData(prev => ({
        ...prev,
        team: [...prev.team, member]
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Project description is required';
    }

    if (!formData.stakeholder.trim()) {
      errors.stakeholder = 'Please specify who this project is for';
    }
    
    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (deadlineDate < today) {
        errors.deadline = 'Deadline cannot be in the past';
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix the highlighted errors');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('💾 Submitting project form:', formData);
      await onSubmit(formData);
      console.log('✅ Project submitted successfully');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        deadline: '',
        stakeholder: '',
        team: []
      });
      
    } catch (err) {
      console.error('❌ Project submission failed:', err);
      setError(err.message || 'Failed to save project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem 1.5rem 1rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#111827',
            margin: 0
          }}>
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#6b7280',
              transition: 'color 0.2s'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Error Display */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Project Name */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isSubmitting}
              placeholder="Enter project name"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${fieldErrors.name ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                opacity: isSubmitting ? 0.6 : 1
              }}
              onFocus={(e) => !fieldErrors.name && (e.target.style.borderColor = '#2563eb')}
              onBlur={(e) => !fieldErrors.name && (e.target.style.borderColor = '#d1d5db')}
            />
            {fieldErrors.name && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Project Description */}
          <div style={{ marginBottom: '1.5rem' }}>
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
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isSubmitting}
              placeholder="Describe the project goals and scope"
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${fieldErrors.description ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                opacity: isSubmitting ? 0.6 : 1,
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => !fieldErrors.description && (e.target.style.borderColor = '#2563eb')}
              onBlur={(e) => !fieldErrors.description && (e.target.style.borderColor = '#d1d5db')}
            />
            {fieldErrors.description && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                {fieldErrors.description}
              </p>
            )}
          </div>

          {/* Stakeholder Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Who the project is for (Stakeholder) *
            </label>
            <input
              type="text"
              value={formData.stakeholder}
              onChange={(e) => handleInputChange('stakeholder', e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., Marketing Team, External Client, CEO Office"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${fieldErrors.stakeholder ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                opacity: isSubmitting ? 0.6 : 1
              }}
              onFocus={(e) => !fieldErrors.stakeholder && (e.target.style.borderColor = '#2563eb')}
              onBlur={(e) => !fieldErrors.stakeholder && (e.target.style.borderColor = '#d1d5db')}
            />
            {fieldErrors.stakeholder && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                {fieldErrors.stakeholder}
              </p>
            )}
          </div>

          {/* Status and Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
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
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: 'white',
                  opacity: isSubmitting ? 0.6 : 1
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
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: 'white',
                  opacity: isSubmitting ? 0.6 : 1
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
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Deadline (Optional)
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => handleInputChange('deadline', e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${fieldErrors.deadline ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                opacity: isSubmitting ? 0.6 : 1
              }}
            />
            {fieldErrors.deadline && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                {fieldErrors.deadline}
              </p>
            )}
          </div>

          {/* Team Selection */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              <User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Team Members
            </label>
            <div style={{
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              {availableMembers.map(member => {
                const isCurrentMember = formData.team.includes(member);
                return (
                  <label key={member} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
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
                💡 Tip: Current team members are highlighted in blue. Uncheck to remove, check others to add.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '1.5rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                background: isSubmitting ? '#9ca3af' : 'linear-gradient(to right, #2563eb, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
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