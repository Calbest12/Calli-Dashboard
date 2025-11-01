import React, { useState } from 'react';
import { Calendar, Users, Target, FileText, Edit, Trash2, MoreVertical } from 'lucide-react';

const ProjectCard = ({ project, onEdit, onDelete, onView }) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status) => {
    const statusColors = {
      'active': { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
      'planning': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
      'completed': { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
      'on_hold': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' }
    };
    return statusColors[status] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
  };

  const getPriorityColor = (priority) => {
    const priorityColors = {
      'low': { bg: '#f3f4f6', text: '#6b7280' },
      'medium': { bg: '#fef3c7', text: '#92400e' },
      'high': { bg: '#fecaca', text: '#991b1b' },
      'critical': { bg: '#fee2e2', text: '#7f1d1d' }
    };
    return priorityColors[priority] || { bg: '#f3f4f6', text: '#6b7280' };
  };

  const formatDeadline = (deadline) => {
    const date = new Date(deadline);
    const now = new Date();
    const isOverdue = date < now;
    return {
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isOverdue
    };
  };

  const deadline = formatDeadline(project.deadline);
  const avgProgress = Math.round((project.progress?.PM || 0) * 100 / 7);
  const statusColors = getStatusColor(project.status);
  const priorityColors = getPriorityColor(project.priority);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      position: 'relative'
    }}>
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0, flex: 1 }}>
            {project.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor: statusColors.bg,
              color: statusColors.text,
              border: `1px solid ${statusColors.border}`
            }}>
              {project.status.replace('_', ' ')}
            </span>

            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor: priorityColors.bg,
              color: priorityColors.text
            }}>
              {project.priority}
            </span>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowActions(!showActions)}
                style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <MoreVertical size={16} />
              </button>

              {showActions && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
                  zIndex: 10,
                  minWidth: '120px'
                }}>
                  <button
                    onClick={() => {
                      onEdit(project);
                      setShowActions(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#374151'
                    }}
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete(project);
                      setShowActions(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#ef4444',
                      borderTop: '1px solid #f3f4f6'
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.625', margin: '0 0 1.5rem 0' }}>
          {project.description}
        </p>

        {/* Simple Progress Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Project Progress</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#111827' }}>{avgProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: '9999px',
                background: avgProgress >= 80 ? 'linear-gradient(to right, #10b981, #059669)' :
                           avgProgress >= 60 ? 'linear-gradient(to right, #3b82f6, #2563eb)' :
                           avgProgress >= 40 ? 'linear-gradient(to right, #eab308, #ca8a04)' :
                           'linear-gradient(to right, #ef4444, #dc2626)',
                width: `${avgProgress}%`,
                transition: 'width 0.8s ease-in-out'
              }}
            />
          </div>
        </div>

        {/* Basic Project Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280' }}>
            <Users size={16} style={{ color: '#9ca3af' }} />
                {/* FIXED: Use team_size from backend instead of team.length */}
                <span style={{ fontWeight: '500' }}>{project.team_size || 0} members</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} style={{ color: deadline.isOverdue ? '#ef4444' : '#9ca3af' }} />
            <span style={{ fontWeight: '500', color: deadline.isOverdue ? '#dc2626' : '#6b7280' }}>
              {deadline.text}
            </span>
          </div>
        </div>

        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: '600',
              flexShrink: 0
            }}>
              {project.creator_avatar || project.creator_name?.charAt(0) || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {project.creator_name || 'Unknown'}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                Project Manager
              </p>
            </div>
          </div>


        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
            <FileText size={12} />
            <span>Updated {project.lastUpdate}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('ðŸ”¥ View Details button clicked for:', project.name);
              onView(project);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(to right, #eff6ff, #dbeafe)',
              border: '1px solid #bfdbfe',
              borderRadius: '0.5rem',
              color: '#2563eb',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;