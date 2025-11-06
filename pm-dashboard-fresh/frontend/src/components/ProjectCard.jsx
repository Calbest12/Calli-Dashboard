// frontend/src/components/ProjectCard.jsx
import React from 'react';

const ProjectCard = ({ project, onEdit, onDelete, onView }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'active': return '#3b82f6';
      case 'on_hold': return '#f59e0b';
      case 'planning': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getOverallProgress = () => {
    if (!project.progress) return 0;
    const pmProgress = project.progress.PM || 0;
    return Math.round((pmProgress / 7) * 100);
  };

  // Extract stakeholder/client information from project description or use dedicated field
  const getProjectStakeholder = () => {
    // Check for dedicated stakeholder field first
    if (project.stakeholder) {
      return project.stakeholder;
    }
    
    // Fallback: extract from description if formatted as "client: Name"
    if (project.description && project.description.toLowerCase().includes('client:')) {
      const match = project.description.match(/client:\s*([^\.]+)/i);
      return match ? match[1].trim() : 'Internal Project';
    }
    
    // Default fallback
    return 'Internal Project';
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      transition: 'all 0.2s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    onClick={() => onView(project)}
    >
      {/* Project Header */}
      <div style={{ padding: '1.5rem 1.5rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111827',
            margin: 0,
            flex: 1,
            marginRight: '1rem'
          }}>
            {project.name}
          </h3>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{
              backgroundColor: getStatusColor(project.status) + '20',
              color: getStatusColor(project.status),
              padding: '0.25rem 0.5rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: '500',
              textTransform: 'capitalize'
            }}>
              {project.status?.replace('_', ' ')}
            </span>
            
            <span style={{
              backgroundColor: getPriorityColor(project.priority) + '20',
              color: getPriorityColor(project.priority),
              padding: '0.25rem 0.5rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: '500',
              textTransform: 'capitalize'
            }}>
              {project.priority}
            </span>
          </div>
        </div>

        {/* Project Stakeholder */}
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#6b7280', 
            margin: 0,
            fontWeight: '500'
          }}>
            <span style={{ color: '#374151' }}>Who the project is for:</span> {getProjectStakeholder()}
          </p>
        </div>

        <p style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          margin: 0,
          lineHeight: '1.4'
        }}>
          {project.description}
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{ padding: '0 1.5rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>
            Overall Progress
          </span>
          <span style={{ fontSize: '0.75rem', color: '#374151', fontWeight: '600' }}>
            {getOverallProgress()}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#e5e7eb',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${getOverallProgress()}%`,
            height: '100%',
            backgroundColor: '#3b82f6',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        borderTop: '1px solid #f3f4f6',
        padding: '1rem 1.5rem',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(project);
          }}
          style={{
            flex: 1,
            padding: '0.5rem',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            color: '#374151',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#f3f4f6';
          }}
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project);
          }}
          style={{
            flex: 1,
            padding: '0.5rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            color: '#dc2626',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#fecaca';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#fef2f2';
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;