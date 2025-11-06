// frontend/src/components/ProjectDetailsOverview.jsx
import React from 'react';
import { Target, Award, Activity, Users, TrendingUp } from 'lucide-react';

const ProjectDetailsOverview = ({ project, onUpdateProject }) => {
  console.log('📊 ProjectDetailsOverview received project:', project);

  if (!project) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>No project data available</p>
      </div>
    );
  }

  const getOverallProgress = () => {
    if (!project.progress) return 0;
    const pmProgress = project.progress.PM || 0;
    return Math.round((pmProgress / 7) * 100);
  };

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

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '2rem',
      padding: '0'
    }}>
      {/* Project Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        {/* Overall Progress */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#dbeafe',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Target size={28} style={{ color: '#3b82f6' }} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
            Overall Progress
          </h3>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#3b82f6',
            lineHeight: '1'
          }}>
            {getOverallProgress()}%
          </div>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>
            Based on Project Management progress
          </p>
        </div>

        {/* Project Status */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
            Project Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Current Status</span>
              <span style={{
                backgroundColor: getStatusColor(project.status) + '20',
                color: getStatusColor(project.status),
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {project.status?.replace('_', ' ')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Priority</span>
              <span style={{
                backgroundColor: getPriorityColor(project.priority) + '20',
                color: getPriorityColor(project.priority),
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {project.priority}
              </span>
            </div>
            {project.deadline && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Deadline</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                  {new Date(project.deadline).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Team Overview */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Users size={20} style={{ color: '#374151' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Team Size
            </h3>
          </div>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#10b981',
            lineHeight: '1',
            marginBottom: '0.5rem'
          }}>
            {project.teamMembers?.length || 0}
          </div>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            Active team members
          </p>
        </div>
      </div>

      {/* Stakeholder Information */}
      {(project.stakeholder || project.description?.includes('client:')) && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
            Project Stakeholder
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
            Who this project is for
          </p>
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #f3f4f6'
          }}>
            <p style={{ 
              fontSize: '1rem', 
              color: '#374151', 
              margin: 0,
              fontWeight: '500'
            }}>
              {project.stakeholder || 'Internal Project'}
            </p>
          </div>
        </div>
      )}

      {/* Progress Breakdown */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
          Project Metrics
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
          Track both project completion and team feedback across different areas
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[
            { key: 'PM', label: 'Project Management (Actual Progress)', color: '#3b82f6', icon: Target, isMainProgress: true },
            { key: 'Leadership', label: 'Leadership (Team Feedback)', color: '#10b981', icon: Award, isMainProgress: false },
            { key: 'ChangeMgmt', label: 'Organizational Change Management (Team Feedback)', color: '#8b5cf6', icon: Activity, isMainProgress: false },
            { key: 'CareerDev', label: 'Career Development', color: '#f59e0b', icon: TrendingUp, isMainProgress: false }
          ].map(category => {
            const Icon = category.icon;
            const progress = project?.progress?.[category.key] || 0;
            const percentage = (progress / 7) * 100;

            return (
              <div key={category.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon size={16} style={{ color: category.color }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                      {category.label}
                    </span>
                    {category.isMainProgress && (
                      <span style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontWeight: '500'
                      }}>
                        Main Progress
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#111827'
                  }}>
                    {progress}/7
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: category.color,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {getProgressLabel(progress)}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '500', color: category.color }}>
                    {Math.round(percentage)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Description */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
          Project Description
        </h3>
        <p style={{
          fontSize: '0.875rem',
          color: '#374151',
          lineHeight: '1.6',
          margin: 0
        }}>
          {project.description || 'No description provided'}
        </p>
      </div>
    </div>
  );
};

const getProgressLabel = (progress) => {
  if (progress === 0) return 'Not started';
  if (progress <= 2) return 'Getting started';
  if (progress <= 4) return 'In progress';
  if (progress <= 6) return 'Nearly complete';
  return 'Complete';
};

export default ProjectDetailsOverview;