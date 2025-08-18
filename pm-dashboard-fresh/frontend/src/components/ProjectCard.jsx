import React, { useState } from 'react';
import { Calendar, Users, Target, FileText, Edit, Trash2, MoreVertical } from 'lucide-react';

const ProjectCard = ({ project, onEdit, onDelete, onView }) => {
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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
  const avgProgress = Math.round((project.progress.PM) * 100 / 7);
  const statusColors = getStatusColor(project.status);
  const priorityColors = getPriorityColor(project.priority);

  // Real feedback data driving the front-page stats
  const progressCategories = [
    {
      key: 'PM',
      label: 'Project Management',
      color: '#3b82f6',
      icon: Target,
      currentValue: project.progress?.PM || 0,
      maxValue: 7,
      feedbackCount: project.feedback?.length || 0,
      subElements: project.feedback && project.feedback.length > 0 ? [
        { name: 'Vision', value: project.feedback.reduce((sum, f) => sum + (f.data.PM_Vision || 0), 0) / project.feedback.length },
        { name: 'Time', value: project.feedback.reduce((sum, f) => sum + (f.data.PM_Time || 0), 0) / project.feedback.length },
        { name: 'Quality', value: project.feedback.reduce((sum, f) => sum + (f.data.PM_Quality || 0), 0) / project.feedback.length },
        { name: 'Cost', value: project.feedback.reduce((sum, f) => sum + (f.data.PM_Cost || 0), 0) / project.feedback.length }
      ] : [
        { name: 'Vision', value: 0 }, { name: 'Time', value: 0 }, { name: 'Quality', value: 0 }, { name: 'Cost', value: 0 }
      ]
    },
    {
      key: 'Leadership',
      label: 'Leadership',
      color: '#10b981',
      icon: Users,
      currentValue: project.progress?.Leadership || 0,
      maxValue: 7,
      feedbackCount: project.feedback?.length || 0,
      subElements: project.feedback && project.feedback.length > 0 ? [
        { name: 'Vision', value: project.feedback.reduce((sum, f) => sum + (f.data.Leadership_Vision || 0), 0) / project.feedback.length },
        { name: 'Reality', value: project.feedback.reduce((sum, f) => sum + (f.data.Leadership_Reality || 0), 0) / project.feedback.length },
        { name: 'Ethics', value: project.feedback.reduce((sum, f) => sum + (f.data.Leadership_Ethics || 0), 0) / project.feedback.length },
        { name: 'Courage', value: project.feedback.reduce((sum, f) => sum + (f.data.Leadership_Courage || 0), 0) / project.feedback.length }
      ] : [
        { name: 'Vision', value: 0 }, { name: 'Reality', value: 0 }, { name: 'Ethics', value: 0 }, { name: 'Courage', value: 0 }
      ]
    },
    {
      key: 'ChangeMgmt',
      label: 'Organizational Change Management',
      color: '#8b5cf6',
      icon: Target,
      currentValue: project.progress?.ChangeMgmt || 0,
      maxValue: 7,
      feedbackCount: project.feedback?.length || 0,
      subElements: project.feedback && project.feedback.length > 0 ? [
        { name: 'Alignment', value: project.feedback.reduce((sum, f) => sum + (f.data.ChangeMgmt_Alignment || 0), 0) / project.feedback.length },
        { name: 'Understand', value: project.feedback.reduce((sum, f) => sum + (f.data.ChangeMgmt_Understand || 0), 0) / project.feedback.length },
        { name: 'Enact', value: project.feedback.reduce((sum, f) => sum + (f.data.ChangeMgmt_Enact || 0), 0) / project.feedback.length }
      ] : [
        { name: 'Alignment', value: 0 }, { name: 'Understand', value: 0 }, { name: 'Enact', value: 0 }
      ]
    },
    {
      key: 'CareerDev',
      label: 'Career Development',
      color: '#f59e0b',
      icon: Users,
      currentValue: project.progress?.CareerDev || 0,
      maxValue: 7,
      feedbackCount: project.feedback?.length || 0,
      subElements: project.feedback && project.feedback.length > 0 ? [
        { name: 'Know Yourself', value: project.feedback.reduce((sum, f) => sum + (f.data.CareerDev_KnowYourself || 0), 0) / project.feedback.length },
        { name: 'Know Your Market', value: project.feedback.reduce((sum, f) => sum + (f.data.CareerDev_KnowYourMarket || 0), 0) / project.feedback.length },
        { name: 'Tell Your Story', value: project.feedback.reduce((sum, f) => sum + (f.data.CareerDev_TellYourStory || 0), 0) / project.feedback.length }
      ] : [
        { name: 'Know Yourself', value: 0 }, { name: 'Know Your Market', value: 0 }, { name: 'Tell Your Story', value: 0 }
      ]
    }
  ];

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

        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.625', margin: '0 0 1.5rem 0' }}>
          {project.description}
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Project Completion</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#111827' }}>{avgProgress}%</span>
              <span style={{
                fontSize: '0.75rem',
                color: '#3b82f6',
                backgroundColor: '#eff6ff',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px'
              }}>
                PM Progress
              </span>
              {project.feedback && project.feedback.length > 0 && (
                <span style={{
                  fontSize: '0.75rem',
                  color: '#10b981',
                  backgroundColor: '#dcfce7',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px'
                }}>
                  {project.feedback.length} reviews
                </span>
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                  padding: '0.25rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                >
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </button>
            </div>
          </div>
          <div style={{ width: '100%', height: '0.75rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
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

        {/* Expanded Progress Breakdown - Now using REAL feedback data */}
        {isExpanded && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1.5rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              📊 Project Metrics & Team Feedback
              <span style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                fontWeight: '400'
              }}>
                {project.feedback && project.feedback.length > 0 ?
                  `(Based on ${project.feedback.length} team feedback${project.feedback.length > 1 ? 's' : ''})` :
                  '(No feedback submitted yet)'
                }
              </span>
            </h4>

            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#374151',
                margin: 0,
                lineHeight: '1.5'
              }}>
                <strong>Project Management</strong> tracks actual project completion progress, while <strong>Leadership</strong> and <strong>Change Management</strong> reflect team feedback on those areas.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {progressCategories.map(category => {
                const Icon = category.icon;
                const percentage = Math.round((category.currentValue / category.maxValue) * 100);
                const averageScore = (category.currentValue / category.maxValue * 7).toFixed(1);

                return (
                  <div key={category.key} style={{
                    padding: '1.5rem',
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    border: `2px solid ${category.color}20`,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s'
                  }}>
                    {/* Category Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        backgroundColor: `${category.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={16} style={{ color: category.color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
                          {category.label}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {category.feedbackCount > 0 ? 'Feedback Average' : 'No feedback yet'}
                          </span>
                          <span style={{
                            fontSize: '1.125rem',
                            fontWeight: '700',
                            color: category.color,
                            backgroundColor: `${category.color}15`,
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px'
                          }}>
                            {category.feedbackCount > 0 ? `${averageScore}/7.0` : '0/7.0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Overall Progress Bar */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ width: '100%', height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            backgroundColor: category.color,
                            width: `${percentage}%`,
                            borderRadius: '9999px',
                            transition: 'width 0.8s ease-in-out'
                          }}
                        />
                      </div>
                    </div>

                    {/* Sub-Elements Breakdown - Real feedback data */}
                    {category.feedbackCount > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <h5 style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          📋 Component Breakdown
                        </h5>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {category.subElements.map((element, index) => {
                            const elementPercentage = (element.value / 7) * 100;
                            return (
                              <div key={index} style={{
                                padding: '0.75rem',
                                backgroundColor: '#f8fafc',
                                borderRadius: '0.5rem',
                                border: `1px solid ${category.color}10`
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                                    {element.name}
                                  </span>
                                  <span style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: category.color
                                  }}>
                                    {element.value.toFixed(1)}/7.0
                                  </span>
                                </div>

                                <div style={{ width: '100%', height: '0.375rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      backgroundColor: category.color,
                                      width: `${elementPercentage}%`,
                                      borderRadius: '9999px',
                                      transition: 'width 0.6s ease-in-out',
                                      opacity: 0.8
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Status Footer */}
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textAlign: 'center',
                      padding: '0.75rem',
                      backgroundColor: `${category.color}08`,
                      borderRadius: '0.5rem',
                      border: `1px solid ${category.color}15`
                    }}>
                      {category.feedbackCount > 0 ?
                        `${category.subElements.length} components • Based on ${category.feedbackCount} team feedback${category.feedbackCount > 1 ? 's' : ''}` :
                        'No feedback submitted yet'
                      }
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'linear-gradient(to right, #eff6ff, #eef2ff)',
              borderRadius: '0.5rem',
              border: '1px solid #dbeafe'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#1e40af',
                    margin: '0 0 0.25rem 0',
                    fontWeight: '600'
                  }}>
                    📝 Submit Your Feedback
                  </p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#4338ca',
                    margin: 0
                  }}>
                    Help improve this project by sharing your experience
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(project);
                  }}
                  style={{
                    background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  Go to Details →
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280' }}>
            <Users size={16} style={{ color: '#9ca3af' }} />
            <span style={{ fontWeight: '500' }}>{project.team.length} members</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} style={{ color: deadline.isOverdue ? '#ef4444' : '#9ca3af' }} />
            <span style={{ fontWeight: '500', color: deadline.isOverdue ? '#dc2626' : '#6b7280' }}>
              {deadline.text}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
            <FileText size={12} />
            <span>Updated {project.lastUpdate}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔥 View Details button clicked for:', project.name);
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
