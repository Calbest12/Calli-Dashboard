// frontend/src/components/LeadershipHistoryComponents.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  BarChart3, 
  TrendingUp,
  Eye,
  X,
  Filter,
  Users,
  Clock,
  Target,
  Shuffle
} from 'lucide-react';
import { ProgressCircle } from './EnhancedVisualizationComponents';

// Radar Chart Component for Leadership Assessment Visualization
const RadarChart = ({ data, framework, size = 300 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const dimensions = Object.keys(framework);
  
  // Calculate points for the assessment data
  const getPoint = (value, index) => {
    const numericValue = parseFloat(value) || 0;
    const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
    const distance = (numericValue / 7) * radius;
    return {
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance
    };
  };

  // Create grid circles
  const gridLevels = [1, 2, 3, 4, 5, 6, 7];
  
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* Grid circles */}
        {gridLevels.map(level => (
          <circle
            key={level}
            cx={centerX}
            cy={centerY}
            r={(level / 7) * radius}
            fill="none"
            stroke={level === 7 ? '#e5e7eb' : '#f3f4f6'}
            strokeWidth={level === 7 ? 2 : 1}
          />
        ))}
        
        {/* Grid lines to each dimension */}
        {dimensions.map((dimension, index) => {
          const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
          const endX = centerX + Math.cos(angle) * radius;
          const endY = centerY + Math.sin(angle) * radius;
          
          return (
            <line
              key={dimension}
              x1={centerX}
              y1={centerY}
              x2={endX}
              y2={endY}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
          );
        })}
        
        {/* Assessment data polygon */}
        {data && (
          <polygon
            points={dimensions.map((dimension, index) => {
              const point = getPoint(data[dimension] || 0, index);
              return `${point.x},${point.y}`;
            }).join(' ')}
            fill={`${framework[dimensions[0]]?.color}20`}
            stroke={framework[dimensions[0]]?.color || '#3b82f6'}
            strokeWidth={2}
          />
        )}
        
        {/* Data points */}
        {data && dimensions.map((dimension, index) => {
          const point = getPoint(data[dimension] || 0, index);
          return (
            <circle
              key={dimension}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={framework[dimension]?.color || '#3b82f6'}
            />
          );
        })}
        
        {/* Dimension labels */}
        {dimensions.map((dimension, index) => {
          const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
          const labelDistance = radius + 30;
          const labelX = centerX + Math.cos(angle) * labelDistance;
          const labelY = centerY + Math.sin(angle) * labelDistance;
          
          return (
            <text
              key={dimension}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#374151"
              fontSize="12"
              fontWeight="600"
            >
              {framework[dimension]?.title}
            </text>
          );
        })}
        
        {/* Score labels */}
        {data && dimensions.map((dimension, index) => {
          const score = parseFloat(data[dimension]) || 0;
          const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
          const scoreDistance = radius + 50;
          const scoreX = centerX + Math.cos(angle) * scoreDistance;
          const scoreY = centerY + Math.sin(angle) * scoreDistance;
          
          return (
            <text
              key={`score-${dimension}`}
              x={scoreX}
              y={scoreY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={framework[dimension]?.color || '#3b82f6'}
              fontSize="14"
              fontWeight="700"
            >
              {score.toFixed(1)}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// Bar Chart Component for Leadership Comparison
const BarChart = ({ data, framework, height = 300 }) => {
  const dimensions = Object.keys(framework);
  const maxValue = 7;
  const barWidth = 60;
  const barSpacing = 20;
  const chartWidth = dimensions.length * (barWidth + barSpacing) - barSpacing;
  const chartHeight = height - 60;

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={chartWidth + 60} height={height} style={{ overflow: 'visible' }}>
        {/* Y-axis grid lines */}
        {[1, 2, 3, 4, 5, 6, 7].map(value => (
          <g key={value}>
            <line
              x1={30}
              y1={40 + chartHeight - (value / maxValue) * chartHeight}
              x2={chartWidth + 30}
              y2={40 + chartHeight - (value / maxValue) * chartHeight}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
            <text
              x={25}
              y={40 + chartHeight - (value / maxValue) * chartHeight + 4}
              textAnchor="end"
              fontSize="12"
              fill="#6b7280"
            >
              {value}
            </text>
          </g>
        ))}
        
        {/* Bars */}
        {dimensions.map((dimension, index) => {
          const value = parseFloat(data[dimension]) || 0;
          const barHeight = (value / maxValue) * chartHeight;
          const barX = 30 + index * (barWidth + barSpacing);
          const barY = 40 + chartHeight - barHeight;
          
          return (
            <g key={dimension}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={framework[dimension]?.color || '#3b82f6'}
                rx={4}
              />
              <text
                x={barX + barWidth / 2}
                y={barY - 8}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="#374151"
              >
                {value.toFixed(1)}
              </text>
              <text
                x={barX + barWidth / 2}
                y={40 + chartHeight + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#6b7280"
                transform={`rotate(-45, ${barX + barWidth / 2}, ${40 + chartHeight + 20})`}
              >
                {framework[dimension]?.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Assessment Card Component for Leadership
const AssessmentCard = ({ assessment, project, framework, onClick, showProject = true }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 6) return '#10b981'; // green
    if (score >= 4) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const scores = {
    vision: parseFloat(assessment.vision_score) || 0,
    reality: parseFloat(assessment.reality_score) || 0,
    ethics: parseFloat(assessment.ethics_score) || 0,
    courage: parseFloat(assessment.courage_score) || 0
  };

  const overallScore = (scores.vision + scores.reality + scores.ethics + scores.courage) / 4;

  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        hover: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          borderColor: '#d1d5db'
        }
      }}
      onClick={() => onClick(assessment)}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.5rem'
          }}>
            <Calendar size={16} style={{ color: '#6b7280' }} />
            <span style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              {formatDate(assessment.created_at)}
            </span>
          </div>
          
          {showProject && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.5rem'
            }}>
              <Building2 size={16} style={{ color: '#6b7280' }} />
              <span style={{
                fontSize: '0.875rem',
                color: '#374151',
                fontWeight: '500'
              }}>
                {assessment.project_name || 'General Assessment'}
              </span>
            </div>
          )}
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <User size={16} style={{ color: '#6b7280' }} />
            <span style={{
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              Leadership Assessment
            </span>
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: getScoreColor(overallScore),
            lineHeight: 1
          }}>
            {overallScore.toFixed(1)}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.25rem'
          }}>
            Overall Score
          </div>
        </div>
      </div>
      
      {/* Dimension Scores */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        marginTop: '1rem'
      }}>
        {Object.entries(framework).map(([key, dimension]) => (
          <div key={key} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: dimension.color,
              marginBottom: '0.25rem'
            }}>
              {scores[key].toFixed(1)}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              {dimension.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced History Modal Component
const HistoryModal = ({ isOpen, onClose, assessments, projects, framework, onAssessmentSelect }) => {
  const [filteredAssessments, setFilteredAssessments] = useState(assessments);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterProject, setFilterProject] = useState('all');
  const [viewMode, setViewMode] = useState('cards');

  useEffect(() => {
    let filtered = [...assessments];

    // Apply project filter
    if (filterProject !== 'all') {
      filtered = filtered.filter(assessment => 
        assessment.project_id === parseInt(filterProject)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.created_at) - new Date(b.created_at);
      } else if (sortBy === 'score') {
        const aScore = (parseFloat(a.vision_score) + parseFloat(a.reality_score) + parseFloat(a.ethics_score) + parseFloat(a.courage_score)) / 4;
        const bScore = (parseFloat(b.vision_score) + parseFloat(b.reality_score) + parseFloat(b.ethics_score) + parseFloat(b.courage_score)) / 4;
        comparison = aScore - bScore;
      } else if (sortBy === 'project') {
        comparison = (a.project_name || '').localeCompare(b.project_name || '');
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredAssessments(filtered);
  }, [assessments, sortBy, sortOrder, filterProject]);

  if (!isOpen) return null;

  const uniqueProjects = [...new Set(assessments.map(a => a.project_id).filter(Boolean))];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        maxWidth: '1200px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#111827',
            margin: 0
          }}>
            Leadership Assessment History
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
            <Filter size={16} style={{ color: '#6b7280' }} />
            
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'white'
              }}
            >
              <option value="all">All Projects</option>
              <option value="">General Assessments</option>
              {uniqueProjects.map(projectId => {
                const project = projects.find(p => p.id === projectId);
                return (
                  <option key={projectId} value={projectId}>
                    {project?.name || `Project ${projectId}`}
                  </option>
                );
              })}
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'white'
              }}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="score-desc">Highest Score</option>
              <option value="score-asc">Lowest Score</option>
              <option value="project-asc">Project A-Z</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: viewMode === 'cards' ? '#3b82f6' : 'white',
                color: viewMode === 'cards' ? 'white' : '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: viewMode === 'table' ? '#3b82f6' : 'white',
                color: viewMode === 'table' ? 'white' : '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Table
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {filteredAssessments.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <Target size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                No assessments found
              </h3>
              <p style={{ fontSize: '0.875rem' }}>
                {filterProject !== 'all' ? 'Try adjusting your filters or' : 'Complete your first assessment to see it here.'}
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                  gap: '1.5rem'
                }}>
                  {filteredAssessments.map(assessment => (
                    <AssessmentCard
                      key={assessment.id}
                      assessment={assessment}
                      project={projects.find(p => p.id === assessment.project_id)}
                      framework={framework}
                      onClick={onAssessmentSelect}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Project</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Vision</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Reality</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Ethics</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Courage</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Overall</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssessments.map(assessment => {
                        const scores = {
                          vision: parseFloat(assessment.vision_score) || 0,
                          reality: parseFloat(assessment.reality_score) || 0,
                          ethics: parseFloat(assessment.ethics_score) || 0,
                          courage: parseFloat(assessment.courage_score) || 0
                        };
                        const overallScore = (scores.vision + scores.reality + scores.ethics + scores.courage) / 4;
                        
                        return (
                          <tr key={assessment.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '0.75rem' }}>
                              {new Date(assessment.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {assessment.project_name || 'General'}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: framework.vision.color, fontWeight: '600' }}>
                              {scores.vision.toFixed(1)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: framework.reality.color, fontWeight: '600' }}>
                              {scores.reality.toFixed(1)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: framework.ethics.color, fontWeight: '600' }}>
                              {scores.ethics.toFixed(1)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: framework.courage.color, fontWeight: '600' }}>
                              {scores.courage.toFixed(1)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '700' }}>
                              {overallScore.toFixed(1)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <button
                                onClick={() => onAssessmentSelect(assessment)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#3b82f6',
                                  cursor: 'pointer',
                                  padding: '0.25rem'
                                }}
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Assessment Details Modal Component
const AssessmentDetailsModal = ({ isOpen, onClose, assessment, project, framework }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!isOpen || !assessment) return null;

  // Safety check for assessment structure
  if (!assessment.id) {
    console.warn('Invalid assessment data:', assessment);
    return null;
  }

  // Parse responses from JSON with error handling
  let responses = {};
  try {
    if (assessment.responses && typeof assessment.responses === 'string') {
      responses = JSON.parse(assessment.responses);
    } else if (assessment.responses && typeof assessment.responses === 'object') {
      responses = assessment.responses;
    }
  } catch (error) {
    console.warn('Failed to parse assessment responses:', error);
    responses = {};
  }
  
  // Calculate dimension scores with safety checks
  const scores = {
    vision: parseFloat(assessment.vision_score) || 0,
    reality: parseFloat(assessment.reality_score) || 0,
    ethics: parseFloat(assessment.ethics_score) || 0,
    courage: parseFloat(assessment.courage_score) || 0
  };

  const dimensions = Object.keys(framework);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Target size={16} /> },
    { id: 'responses', label: 'Detailed Responses', icon: <Users size={16} /> },
    { id: 'visualization', label: 'Visualization', icon: <BarChart3 size={16} /> }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1001,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        maxWidth: '1000px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827',
              margin: '0 0 0.5rem 0'
            }}>
              Leadership Assessment Details
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              <span>
                {new Date(assessment.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric'
                })}
              </span>
              {project && (
                <>
                  <span>•</span>
                  <span>{project.name}</span>
                </>
              )}
              <span>•</span>
              <span>Overall: {((scores.vision + scores.reality + scores.ethics + scores.courage) / 4).toFixed(1)}/7</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 1.5rem',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', padding: '2rem' }}>
              {dimensions.map(dimension => (
                <div
                  key={dimension}
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    border: `3px solid ${framework[dimension].color}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <h4 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0
                    }}>
                      {framework[dimension].title}
                    </h4>
                    <span style={{
                      fontSize: '2rem',
                      fontWeight: '700',
                      color: framework[dimension].color
                    }}>
                      {scores[dimension]?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    lineHeight: 1.5
                  }}>
                    {framework[dimension].description}
                  </p>
                  
                  {responses[dimension] && Object.keys(responses[dimension] || {}).length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <p style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        {Object.keys(responses[dimension] || {}).length} questions answered
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'responses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
              {dimensions.map(dimension => (
                <div key={dimension}>
                  <h4 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: framework[dimension].color,
                    margin: '0 0 1rem 0',
                    borderLeft: `4px solid ${framework[dimension].color}`,
                    paddingLeft: '1rem'
                  }}>
                    {framework[dimension].title}
                  </h4>
                  
                  {framework[dimension].questions.map((question, qIndex) => {
                    const responseValue = responses[dimension]?.[question.key];
                    
                    return (
                      <div
                        key={question.key}
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          padding: '1.5rem',
                          marginBottom: '1rem'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '0.75rem'
                        }}>
                          <h5 style={{
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: '#111827',
                            margin: 0,
                            flex: 1
                          }}>
                            {question.question || 'Question not available'}
                          </h5>
                          <div style={{
                            backgroundColor: framework[dimension].color,
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '1.125rem',
                            fontWeight: '700',
                            marginLeft: '1rem'
                          }}>
                            {responseValue || 'N/A'}/7
                          </div>
                        </div>
                        
                        <p style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          margin: 0,
                          lineHeight: 1.5
                        }}>
                          {question.description || 'No description available'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'visualization' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '2rem',
              padding: '2rem'
            }}>
              {/* Progress Circles */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h4 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '2rem'
                }}>
                  Leadership Assessment Scores
                </h4>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '2rem',
                  justifyItems: 'center',
                  maxWidth: '800px',
                  margin: '0 auto'
                }}>
                  {Object.entries(framework).map(([key, dimension]) => (
                    <ProgressCircle
                      key={key}
                      value={parseFloat(scores[key]) || 0}
                      maxValue={7}
                      size={160}
                      strokeWidth={18}
                      color={dimension.color}
                      title={dimension.title}
                      subtitle="Individual Score"
                    />
                  ))}
                </div>
              </div>
              
              {/* Score Summary */}
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%'
              }}>
                <h5 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#374151',
                  margin: '0 0 1rem 0'
                }}>
                  Overall Leadership Performance
                </h5>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#3b82f6',
                  marginBottom: '0.5rem'
                }}>
                  {((parseFloat(scores.vision) + parseFloat(scores.reality) + parseFloat(scores.ethics) + parseFloat(scores.courage)) / 4).toFixed(1)}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  Average across all leadership dimensions
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export {
  RadarChart,
  BarChart,
  AssessmentCard,
  HistoryModal,
  AssessmentDetailsModal
};