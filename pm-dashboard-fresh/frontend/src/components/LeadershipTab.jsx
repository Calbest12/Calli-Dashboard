import React, { useState, useEffect } from 'react';
import { Brain, History, Plus, Eye, BarChart3, AlertCircle } from 'lucide-react';

const LeadershipTab = ({ currentUser, apiService, onDataChange }) => {
  const [assessments, setAssessments] = useState([]);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAssessmentDetails, setSelectedAssessmentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Chart visibility controls
  const [chartVisibility, setChartVisibility] = useState({
    task: true,
    team: true,
    individual: true,
    organization: true
  });
  
  // Form state for multi-step Leadership Diamond assessment
  const [responses, setResponses] = useState({});
  const [currentDimension, setCurrentDimension] = useState('task');

  // Leadership Diamond framework
  const diamondFramework = {
    task: {
      title: 'Task Focus',
      description: 'Your ability to define, plan, and execute objectives effectively',
      questions: [
        {
          key: 'clarity',
          question: 'How clearly are your team\'s objectives defined?',
          description: 'Consider specificity, measurability, and time-bound nature of goals',
          scale: 'Rate from 1 (very unclear) to 10 (exceptionally clear and compelling)'
        },
        {
          key: 'understanding',
          question: 'How well does your team understand what is expected of them?',
          description: 'Assess team comprehension of roles, responsibilities, and standards',
          scale: 'Rate from 1 (team often confused) to 10 (team intuitively knows expectations)'
        },
        {
          key: 'progress',
          question: 'How effectively do you monitor and adjust progress toward objectives?',
          description: 'Consider tracking methods, frequency of reviews, and course corrections',
          scale: 'Rate from 1 (no progress tracking) to 10 (predictive tracking with early intervention)'
        },
        {
          key: 'completion',
          question: 'What is your track record for completing objectives on time and within scope?',
          description: 'Reflect on recent projects and deliverables',
          scale: 'Rate from 1 (frequently miss deadlines) to 10 (consistently exceed expectations)'
        }
      ]
    },
    team: {
      title: 'Team Focus',
      description: 'Your effectiveness in building and maintaining high-performing teams',
      questions: [
        {
          key: 'cohesion',
          question: 'How well does your team work together?',
          description: 'Assess collaboration, communication, and mutual support',
          scale: 'Rate from 1 (team works in silos) to 10 (exceptional synergy and mutual support)'
        },
        {
          key: 'development',
          question: 'How effectively do you develop team members?',
          description: 'Consider skill building, growth opportunities, and mentoring',
          scale: 'Rate from 1 (little focus on development) to 10 (transformative development that inspires growth)'
        },
        {
          key: 'motivation',
          question: 'How well do you motivate and engage your team?',
          description: 'Assess your ability to inspire, energize, and maintain engagement',
          scale: 'Rate from 1 (team shows low engagement) to 10 (inspiring leader who energizes others)'
        },
        {
          key: 'performance',
          question: 'How consistently does your team deliver high-quality results?',
          description: 'Consider output quality, consistency, and continuous improvement',
          scale: 'Rate from 1 (inconsistent quality) to 10 (exceptional performance that exceeds expectations)'
        }
      ]
    },
    individual: {
      title: 'Individual Focus',
      description: 'Your personal leadership qualities and self-awareness',
      questions: [
        {
          key: 'self_awareness',
          question: 'How well do you understand your strengths and weaknesses?',
          description: 'Self-awareness is fundamental to effective leadership',
          scale: 'Rate from 1 (limited self-awareness) to 10 (exceptional self-awareness that guides growth)'
        },
        {
          key: 'decision_making',
          question: 'How effectively do you make decisions under pressure?',
          description: 'Consider quality, timeliness, and confidence in decisions',
          scale: 'Rate from 1 (struggle with decisions) to 10 (exceptional judgment under extreme pressure)'
        },
        {
          key: 'adaptability',
          question: 'How well do you adapt to change and uncertainty?',
          description: 'Assess flexibility, resilience, and ability to navigate ambiguity',
          scale: 'Rate from 1 (struggle with change) to 10 (thrive in change and lead others through it)'
        },
        {
          key: 'growth',
          question: 'How committed are you to continuous learning and personal development?',
          description: 'Consider your approach to skill development and learning from experience',
          scale: 'Rate from 1 (rarely seek learning) to 10 (continuous learner who seeks growth opportunities)'
        }
      ]
    },
    organization: {
      title: 'Organization Focus',
      description: 'Your effectiveness in understanding and influencing organizational dynamics',
      questions: [
        {
          key: 'strategic_thinking',
          question: 'How well do you think strategically about organizational goals?',
          description: 'Consider long-term perspective, systems thinking, and big-picture view',
          scale: 'Rate from 1 (focus mainly on tactical issues) to 10 (visionary strategic thinking)'
        },
        {
          key: 'influence',
          question: 'How effectively do you influence across the organization?',
          description: 'Assess ability to build relationships and drive change beyond your team',
          scale: 'Rate from 1 (limited influence) to 10 (recognized organizational leader and influencer)'
        },
        {
          key: 'culture',
          question: 'How well do you contribute to organizational culture?',
          description: 'Consider your role in shaping values, behaviors, and environment',
          scale: 'Rate from 1 (follow existing culture) to 10 (champion and exemplar of organizational values)'
        },
        {
          key: 'systems_awareness',
          question: 'How well do you understand and work within organizational systems?',
          description: 'Consider your understanding of processes, politics, and interconnections',
          scale: 'Rate from 1 (limited understanding) to 10 (help design and improve organizational systems)'
        }
      ]
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.id) {
      loadAssessments();
    }
  }, [currentUser]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDiamondAssessments(currentUser.id);
      if (response && response.success && response.data) {
        // Sort by created_at descending (newest first)
        const sortedAssessments = response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setAssessments(sortedAssessments);
      } else if (response && Array.isArray(response)) {
        // Fallback for direct array response
        const sortedAssessments = response.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setAssessments(sortedAssessments);
      } else {
        setAssessments([]);
      }
    } catch (error) {
      console.error('Error loading Leadership Diamond assessments:', error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const getLatestScores = () => {
    if (!assessments || assessments.length === 0) return null;
    return assessments[0];
  };

  const getProgressChartData = () => {
    const sortedAssessments = assessments
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    return sortedAssessments.map((assessment, index) => {
      let assessmentDate;
      if (assessment.created_at) {
        const dateObj = new Date(assessment.created_at);
        const year = dateObj.getFullYear();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        assessmentDate = `${year}-${month}-${day}`;
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        assessmentDate = `${year}-${month}-${day}`;
      }
      
      return {
        date: assessmentDate,
        task: assessment.task_score || 0,
        team: assessment.team_score || 0,
        individual: assessment.individual_score || 0,
        organization: assessment.organization_score || 0
      };
    });
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
  };

  const handleNext = async () => {
    const dimensions = Object.keys(diamondFramework);
    const currentIndex = dimensions.indexOf(currentDimension);
    const isLastDimension = currentIndex === dimensions.length - 1;

    if (!isLastDimension) {
      setCurrentDimension(dimensions[currentIndex + 1]);
    } else {
      // Calculate scores and save assessment
      const assessment = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0]
      };
      
      dimensions.forEach(dim => {
        const dimResponses = responses[dim] || {};
        const questions = diamondFramework[dim].questions;
        let totalScore = 0;
        let responseCount = 0;
        
        questions.forEach(q => {
          const score = dimResponses[q.key];
          if (score) {
            totalScore += parseInt(score);
            responseCount++;
          }
        });
        
        assessment[dim] = {
          score: responseCount > 0 ? Math.round(totalScore / responseCount) : 0,
          responses: dimResponses
        };
      });

      try {
        const assessmentPayload = {
          user_id: currentUser.id,
          task_score: assessment.task.score,
          team_score: assessment.team.score,
          individual_score: assessment.individual.score,
          organization_score: assessment.organization.score,
          responses: JSON.stringify(responses)
        };

        const saveResponse = await apiService.saveDiamondAssessment(assessmentPayload);

        if (saveResponse && (saveResponse.success || saveResponse.id || saveResponse.data)) {
          await loadAssessments();
          setResponses({});
          setCurrentDimension('task');
          setShowAssessmentForm(false);
          if (onDataChange) onDataChange();
        } else {
          throw new Error('Assessment save failed');
        }
        
      } catch (error) {
        console.error('Error saving Leadership Diamond assessment:', error);
        alert('Error saving assessment. Please try again.');
      }
    }
  };

  // Simple CSS-based chart component
  const SimpleChart = ({ data, title }) => {
    if (!data || data.length === 0) return null;

    const maxValue = 10;
    const chartHeight = 200;
    const chartWidth = 600;
    const padding = 40;

    const dimensions = [
      { key: 'task', name: 'Task', color: '#3b82f6' },
      { key: 'team', name: 'Team', color: '#10b981' },
      { key: 'individual', name: 'Individual', color: '#f59e0b' },
      { key: 'organization', name: 'Organization', color: '#ef4444' }
    ];

    const visibleDimensions = dimensions.filter(dim => chartVisibility[dim.key]);

    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <BarChart3 size={20} />
          {title}
        </h3>
        
        <div style={{
          width: '100%',
          overflowX: 'auto'
        }}>
          <svg width={Math.max(chartWidth, data.length * 80)} height={chartHeight + padding * 2}>
            {/* Grid lines */}
            {[0, 2, 4, 6, 8, 10].map(value => (
              <g key={value}>
                <line
                  x1={padding}
                  y1={padding + (chartHeight - (value / maxValue) * chartHeight)}
                  x2={chartWidth - padding}
                  y2={padding + (chartHeight - (value / maxValue) * chartHeight)}
                  stroke="#e5e7eb"
                  strokeDasharray="3,3"
                />
                <text
                  x={padding - 10}
                  y={padding + (chartHeight - (value / maxValue) * chartHeight) + 5}
                  fontSize="12"
                  fill="#6b7280"
                  textAnchor="end"
                >
                  {value}
                </text>
              </g>
            ))}

            {/* Lines for visible dimensions only */}
            {visibleDimensions.map((dimension) => {
              const points = data.map((point, index) => ({
                x: padding + (index / (data.length - 1)) * (chartWidth - padding * 2),
                y: padding + (chartHeight - (point[dimension.key] / maxValue) * chartHeight)
              }));

              const pathData = points.map((point, index) => 
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
              ).join(' ');

              return (
                <g key={dimension.key}>
                  <path
                    d={pathData}
                    stroke={dimension.color}
                    strokeWidth="2"
                    fill="none"
                  />
                  {points.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill={dimension.color}
                    />
                  ))}
                </g>
              );
            })}

            {/* X-axis labels */}
            {data.map((point, index) => (
              <text
                key={index}
                x={padding + (index / (data.length - 1)) * (chartWidth - padding * 2)}
                y={chartHeight + padding + 20}
                fontSize="12"
                fill="#6b7280"
                textAnchor="middle"
              >
                {point.date}
              </text>
            ))}
          </svg>
        </div>

        {/* Single Interactive Legend */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '16px',
          flexWrap: 'wrap'
        }}>
          {dimensions.map(dimension => (
            <div 
              key={dimension.key} 
              onClick={() => setChartVisibility(prev => ({
                ...prev,
                [dimension.key]: !prev[dimension.key]
              }))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                opacity: chartVisibility[dimension.key] ? 1 : 0.5,
                padding: '8px 12px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                border: chartVisibility[dimension.key] 
                  ? `2px solid ${dimension.color}` 
                  : '2px solid #d1d5db',
                backgroundColor: chartVisibility[dimension.key] 
                  ? `${dimension.color}10` 
                  : '#f9fafb',
                fontSize: '12px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                if (chartVisibility[dimension.key]) {
                  e.currentTarget.style.backgroundColor = `${dimension.color}20`;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                } else {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#9ca3af';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = chartVisibility[dimension.key] 
                  ? `${dimension.color}10` 
                  : '#f9fafb';
                e.currentTarget.style.borderColor = chartVisibility[dimension.key] 
                  ? dimension.color 
                  : '#d1d5db';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: dimension.color,
                borderRadius: '3px',
                border: chartVisibility[dimension.key] 
                  ? 'none' 
                  : '1px solid #d1d5db'
              }} />
              <span style={{
                color: chartVisibility[dimension.key] ? '#1f2937' : '#6b7280',
                userSelect: 'none'
              }}>
                {dimension.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const latestScores = getLatestScores();
  const avgScore = latestScores 
    ? ((latestScores.task_score + latestScores.team_score + 
        latestScores.individual_score + latestScores.organization_score) / 4).toFixed(1)
    : '0';

  const chartData = getProgressChartData();

  // Close modal handler
  const closeModal = () => {
    setShowHistoryModal(false);
    setSelectedAssessmentDetails(null);
  };

  const goBackToList = () => {
    setSelectedAssessmentDetails(null);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '16px',
        color: '#6b7280'
      }}>
        Loading Leadership Diamond assessments...
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Brain size={32} style={{ color: '#3b82f6' }} />
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#1f2937' 
              }}>
                Leadership Diamond Assessment
              </h1>
              <p style={{ 
                margin: 0, 
                color: '#6b7280', 
                fontSize: '14px' 
              }}>
                Vision | Reality | Ethics | Courage
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowHistoryModal(true)}
              disabled={assessments.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: assessments.length === 0 ? '#9ca3af' : '#374151',
                cursor: assessments.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <Eye size={16} />
              View Past Submissions
            </button>
            <button
              onClick={() => setShowAssessmentForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#3b82f6',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <Plus size={16} />
              Take Assessment
            </button>
          </div>
        </div>
      </div>

      {/* Current Scores Overview */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#1f2937' 
          }}>
            Current Leadership Diamond Scores
          </h3>
          {latestScores && (
            <span style={{
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              Assessed on: {new Date(latestScores.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
        
        {latestScores ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '20px'
          }}>
            <div style={{
              textAlign: 'center',
              padding: '16px'
            }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: getScoreColor(latestScores.task_score),
                marginBottom: '8px'
              }}>
                {latestScores.task_score}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#1e40af',
                marginBottom: '4px'
              }}>
                Task
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Objective execution
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '16px'
            }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: getScoreColor(latestScores.team_score),
                marginBottom: '8px'
              }}>
                {latestScores.team_score}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#059669',
                marginBottom: '4px'
              }}>
                Team
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Team effectiveness
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '16px'
            }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: getScoreColor(latestScores.individual_score),
                marginBottom: '8px'
              }}>
                {latestScores.individual_score}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#92400e',
                marginBottom: '4px'
              }}>
                Individual
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Personal leadership
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '16px'
            }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: getScoreColor(latestScores.organization_score),
                marginBottom: '8px'
              }}>
                {latestScores.organization_score}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#dc2626',
                marginBottom: '4px'
              }}>
                Organization
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Organizational impact
              </div>
            </div>

            <div style={{ 
              textAlign: 'center',
              padding: '16px'
            }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: getScoreColor(parseFloat(avgScore)),
                marginBottom: '8px'
              }}>
                {avgScore}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#475569',
                marginBottom: '4px'
              }}>
                Overall
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Average score
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#6b7280'
          }}>
            <Brain size={48} style={{ 
              color: '#6b7280', 
              marginBottom: '16px' 
            }} />
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
              No Leadership Diamond assessments yet
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              How are WE as a team leading the project?
            </p>
          </div>
        )}
      </div>

      {/* Progress Chart */}
      {chartData.length > 1 && (
        <SimpleChart 
          data={chartData} 
          title="Leadership Diamond Assessment Progress Over Time" 
        />
      )}

      {/* AI Insights Section */}
      {latestScores && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <div style={{
              padding: '8px',
              backgroundColor: '#eff6ff',
              borderRadius: '8px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 3.94-3.04Z"/>
                <path d="M14 13.5h6a3 3 0 0 0 0-6h-.28a3 3 0 0 0-2.4-5 3 3 0 0 0-5.2 2.5"/>
              </svg>
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: 0,
              color: '#1f2937'
            }}>
              AI Leadership Insights
            </h3>
          </div>

          <div style={{
            display: 'grid',
            gap: '16px'
          }}>
            {/* Overall Performance Insight */}
            <div style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              borderLeft: '4px solid #3b82f6'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#1e40af',
                margin: 0,
                fontWeight: '500'
              }}>
                Overall Leadership Diamond Performance: Your average score of {avgScore}/10 places you in the{' '}
                {parseFloat(avgScore) >= 8 ? 'excellent' : parseFloat(avgScore) >= 6 ? 'good' : 'developing'}{' '}
                leadership range. {parseFloat(avgScore) >= 8 
                  ? 'You demonstrate strong consistency across all Diamond dimensions.'
                  : parseFloat(avgScore) >= 6 
                    ? 'You show solid leadership capabilities with room for targeted improvement.'
                    : 'Focus on building foundational leadership skills across all dimensions.'
                }
              </p>
            </div>

            {/* Dimension-Specific Insights */}
            {(() => {
              const scores = [
                { name: 'Task', score: latestScores.task_score, description: 'objective definition and execution' },
                { name: 'Team', score: latestScores.team_score, description: 'team building and development' },
                { name: 'Individual', score: latestScores.individual_score, description: 'personal leadership qualities' },
                { name: 'Organization', score: latestScores.organization_score, description: 'organizational influence and systems thinking' }
              ];
              
              const highest = scores.reduce((prev, current) => (prev.score > current.score) ? prev : current);
              const lowest = scores.reduce((prev, current) => (prev.score < current.score) ? prev : current);
              
              return (
                <>
                  {highest.score !== lowest.score && (
                    <>
                      {/* Strength Insight */}
                      <div style={{
                        padding: '16px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '8px',
                        borderLeft: '4px solid #10b981'
                      }}>
                        <p style={{
                          fontSize: '14px',
                          color: '#166534',
                          margin: 0,
                          fontWeight: '500'
                        }}>
                          Leadership Strength: Your strongest dimension is {highest.name} ({highest.score}/10). 
                          This indicates excellent capabilities in {highest.description}. 
                          {highest.score >= 8 
                            ? ' Consider mentoring others in this area and sharing your expertise.'
                            : ' Continue building on this strength to achieve mastery level.'
                          }
                        </p>
                      </div>

                      {/* Development Opportunity */}
                      <div style={{
                        padding: '16px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '8px',
                        borderLeft: '4px solid #f59e0b'
                      }}>
                        <p style={{
                          fontSize: '14px',
                          color: '#92400e',
                          margin: 0,
                          fontWeight: '500'
                        }}>
                          Development Focus: Your {lowest.name} score ({lowest.score}/10) presents the greatest opportunity for growth. 
                          Improving {lowest.description} will have a significant impact on your overall leadership effectiveness.
                          {lowest.score < 6 
                            ? ' Consider this your primary development priority.'
                            : ' Small improvements here will enhance your leadership balance.'
                          }
                        </p>
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            {/* Progress Insight (if multiple assessments) */}
            {assessments.length > 1 && (() => {
              const previousAssessment = assessments[1];
              const currentTotal = latestScores.task_score + latestScores.team_score + 
                                 latestScores.individual_score + latestScores.organization_score;
              const previousTotal = previousAssessment.task_score + previousAssessment.team_score + 
                                   previousAssessment.individual_score + previousAssessment.organization_score;
              const trend = currentTotal - previousTotal;
              
              return (
                <div style={{
                  padding: '16px',
                  backgroundColor: trend > 0 ? '#f0fdf4' : trend < 0 ? '#fef2f2' : '#f9fafb',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#6b7280'}`
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: trend > 0 ? '#166534' : trend < 0 ? '#dc2626' : '#374151',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    Progress Trend: Since your last assessment, your total Leadership Diamond score has{' '}
                    {trend > 0 ? `improved by ${trend} points` : trend < 0 ? `decreased by ${Math.abs(trend)} points` : 'remained stable'}.
                    {trend > 0 
                      ? ' You\'re moving in the right direction - keep up the excellent progress!'
                      : trend < 0 
                        ? ' Consider reviewing what factors might have contributed to this change and adjust your approach.'
                        : ' Consistency is valuable - focus on targeted improvements in your lowest-scoring areas.'
                    }
                  </p>
                </div>
              );
            })()}

            {/* Action-Oriented Insight */}
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              borderLeft: '4px solid #6b7280',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#475569',
                margin: 0,
                fontWeight: '500'
              }}>
                Next Steps: {parseFloat(avgScore) >= 8 
                  ? 'Focus on maintaining your high standards while helping others develop their leadership capabilities. Consider taking on mentoring or coaching responsibilities.'
                  : parseFloat(avgScore) >= 6 
                    ? 'Identify 1-2 specific questions where you scored lowest and create targeted development plans. Regular reassessment will help track your progress.'
                    : 'Start with foundational leadership development in your lowest-scoring dimension. Consider seeking mentorship, training, or coaching to accelerate your growth.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Form Modal */}
      {showAssessmentForm && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '24px' 
            }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                margin: 0, 
                color: '#111827' 
              }}>
                Leadership Diamond Assessment - {diamondFramework[currentDimension].title}
              </h3>
              <button
                onClick={() => {
                  setShowAssessmentForm(false);
                  setResponses({});
                  setCurrentDimension('task');
                }}
                style={{
                  padding: '8px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#f3f4f6',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                Ｘ
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                marginBottom: '8px', 
                color: '#1f2937' 
              }}>
                {diamondFramework[currentDimension].title}
              </h4>
              <p style={{ 
                color: '#6b7280', 
                fontSize: '14px', 
                margin: 0 
              }}>
                {diamondFramework[currentDimension].description}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {diamondFramework[currentDimension].questions.map((question) => {
                const currentResponses = responses[currentDimension] || {};
                const responseValue = currentResponses[question.key];

                return (
                  <div key={question.key} style={{
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb'
                  }}>
                    <h5 style={{ 
                      fontSize: '16px', 
                      fontWeight: '500', 
                      marginBottom: '8px', 
                      color: '#1f2937' 
                    }}>
                      {question.question}
                    </h5>
                    <p style={{ 
                      color: '#6b7280', 
                      fontSize: '14px', 
                      marginBottom: '16px' 
                    }}>
                      {question.description}
                    </p>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={responseValue || 5}
                        onChange={(e) => {
                          const newResponses = { ...responses };
                          if (!newResponses[currentDimension]) {
                            newResponses[currentDimension] = {};
                          }
                          newResponses[currentDimension][question.key] = e.target.value;
                          setResponses(newResponses);
                        }}
                        style={{
                          width: '100%',
                          height: '6px',
                          background: '#e5e7eb',
                          borderRadius: '3px',
                          outline: 'none',
                          marginBottom: '8px'
                        }}
                      />
                      {/* Numbers under slider */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#6b7280',
                        paddingLeft: '2px',
                        paddingRight: '2px'
                      }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <span key={num} style={{ 
                            width: '10px', 
                            textAlign: 'center',
                            fontWeight: responseValue == num ? '600' : '400',
                            color: responseValue == num ? '#3b82f6' : '#6b7280'
                          }}>
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {question.scale}
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: responseValue >= 8 ? '#10b981' : responseValue >= 6 ? '#f59e0b' : '#ef4444' 
                      }}>
                        Rating: {responseValue || 'No response'}/10
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {Object.keys(diamondFramework).indexOf(currentDimension) + 1} of {Object.keys(diamondFramework).length} sections
              </div>
              <button
                onClick={handleNext}
                disabled={diamondFramework[currentDimension].questions.some(q => !responses[currentDimension]?.[q.key])}
                style={{
                  padding: '8px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: diamondFramework[currentDimension].questions.some(q => !responses[currentDimension]?.[q.key]) 
                    ? '#d1d5db' : '#3b82f6',
                  color: 'white',
                  cursor: diamondFramework[currentDimension].questions.some(q => !responses[currentDimension]?.[q.key]) 
                    ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {Object.keys(diamondFramework).indexOf(currentDimension) === Object.keys(diamondFramework).length - 1 
                  ? 'Complete Assessment' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '90%',
            maxWidth: selectedAssessmentDetails ? '1000px' : '800px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '20px',
                fontWeight: '600',
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <History size={20} />
                {selectedAssessmentDetails 
                  ? `Assessment ${selectedAssessmentDetails.number} - Detailed Responses`
                  : 'Leadership Diamond Assessment History'
                }
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedAssessmentDetails && (
                  <button
                    onClick={goBackToList}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ◀︎ Back to List
                  </button>
                )}
                <button
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '0',
                    color: '#6b7280'
                  }}
                >
                  Ｘ
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div style={{ 
              padding: '20px', 
              overflowY: 'auto', 
              flex: 1 
            }}>
              {assessments.length === 0 ? (
                <p style={{ 
                  textAlign: 'center', 
                  color: '#6b7280',
                  fontSize: '16px'
                }}>
                  No assessments found
                </p>
              ) : selectedAssessmentDetails ? (
                // DETAILED VIEW
                <div>
                  {/* Overall Scores Summary */}
                  <div style={{
                    marginBottom: '24px',
                    padding: '20px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe'
                  }}>
                    <h4 style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      Overall Scores - {new Date(selectedAssessmentDetails.assessment.created_at).toLocaleDateString()}
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '16px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Task</div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: getScoreColor(selectedAssessmentDetails.assessment.task_score) 
                        }}>
                          {selectedAssessmentDetails.assessment.task_score}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Team</div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: getScoreColor(selectedAssessmentDetails.assessment.team_score) 
                        }}>
                          {selectedAssessmentDetails.assessment.team_score}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Individual</div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: getScoreColor(selectedAssessmentDetails.assessment.individual_score) 
                        }}>
                          {selectedAssessmentDetails.assessment.individual_score}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Organization</div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: getScoreColor(selectedAssessmentDetails.assessment.organization_score) 
                        }}>
                          {selectedAssessmentDetails.assessment.organization_score}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', borderLeft: '1px solid #bfdbfe', paddingLeft: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Average</div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: getScoreColor(
                            (selectedAssessmentDetails.assessment.task_score + 
                             selectedAssessmentDetails.assessment.team_score + 
                             selectedAssessmentDetails.assessment.individual_score + 
                             selectedAssessmentDetails.assessment.organization_score) / 4
                          ) 
                        }}>
                          {((selectedAssessmentDetails.assessment.task_score + 
                             selectedAssessmentDetails.assessment.team_score + 
                             selectedAssessmentDetails.assessment.individual_score + 
                             selectedAssessmentDetails.assessment.organization_score) / 4).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Question Responses */}
                  {selectedAssessmentDetails.assessment.responses && (
                    <div>
                      <h5 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: '16px'
                      }}>
                        Individual Question Responses
                      </h5>
                      
                      {Object.keys(diamondFramework).map(dimensionKey => {
                        const dimension = diamondFramework[dimensionKey];
                        const dimensionResponses = typeof selectedAssessmentDetails.assessment.responses === 'string' 
                          ? JSON.parse(selectedAssessmentDetails.assessment.responses)[dimensionKey] || {}
                          : selectedAssessmentDetails.assessment.responses[dimensionKey] || {};
                        
                        return (
                          <div key={dimensionKey} style={{
                            marginBottom: '24px',
                            padding: '20px',
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}>
                            <h6 style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#1f2937',
                              marginBottom: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px'
                            }}>
                              {dimension.title}
                              <span style={{
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#6b7280',
                                backgroundColor: '#f3f4f6',
                                padding: '4px 8px',
                                borderRadius: '4px'
                              }}>
                                Dimension Average: {selectedAssessmentDetails.assessment[`${dimensionKey}_score`]}
                              </span>
                            </h6>
                            
                            <div style={{
                              display: 'grid',
                              gap: '16px'
                            }}>
                              {dimension.questions.map(question => {
                                const responseValue = dimensionResponses[question.key];
                                return (
                                  <div key={question.key} style={{
                                    padding: '16px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '6px',
                                    border: '1px solid #f3f4f6'
                                  }}>
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'flex-start',
                                      marginBottom: '8px'
                                    }}>
                                      <div style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#374151',
                                        flex: 1,
                                        marginRight: '16px'
                                      }}>
                                        {question.question}
                                      </div>
                                      <div style={{
                                        fontSize: '20px',
                                        fontWeight: '700',
                                        color: getScoreColor(responseValue || 0),
                                        minWidth: '40px',
                                        textAlign: 'center',
                                        backgroundColor: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #e5e7eb'
                                      }}>
                                        {responseValue || 'N/A'}
                                      </div>
                                    </div>
                                    <div style={{
                                      fontSize: '12px',
                                      color: '#6b7280',
                                      fontStyle: 'italic',
                                      marginBottom: '8px'
                                    }}>
                                      {question.description}
                                    </div>
                                    <div style={{
                                      fontSize: '11px',
                                      color: '#9ca3af',
                                      backgroundColor: 'white',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid #f3f4f6'
                                    }}>
                                      {question.scale}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // BASIC OVERVIEW LIST
                <div>
                  <div style={{
                    marginBottom: '16px',
                    padding: '12px 16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      Click on any assessment below to view detailed question responses
                    </p>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px' 
                  }}>
                    {assessments.map((assessment, index) => (
                      <div 
                        key={assessment.id} 
                        onClick={() => {
                          setSelectedAssessmentDetails({
                            assessment,
                            number: assessments.length - index
                          });
                        }}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '20px',
                          backgroundColor: index === 0 ? '#f0f9ff' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index === 0 ? '#f0f9ff' : 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '16px'
                        }}>
                          <h4 style={{ margin: 0, color: '#1f2937', fontSize: '16px', fontWeight: '600' }}>
                            Assessment {assessments.length - index}
                            {index === 0 && (
                              <span style={{ 
                                color: '#3b82f6', 
                                fontSize: '12px', 
                                marginLeft: '8px',
                                fontWeight: '500'
                              }}>
                                (Latest)
                              </span>
                            )}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ 
                              color: '#6b7280', 
                              fontSize: '14px' 
                            }}>
                              {new Date(assessment.created_at).toLocaleDateString()}
                            </span>
                            <span style={{
                              fontSize: '12px',
                              color: '#3b82f6',
                              fontWeight: '500',
                              padding: '4px 8px',
                              backgroundColor: '#eff6ff',
                              borderRadius: '4px'
                            }}>
                              Click for details
                            </span>
                          </div>
                        </div>
                        
                        {/* Overall Scores Grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                          gap: '16px'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6b7280', 
                              marginBottom: '4px',
                              fontWeight: '500'
                            }}>
                              Task
                            </div>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold', 
                              color: getScoreColor(assessment.task_score) 
                            }}>
                              {assessment.task_score}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6b7280', 
                              marginBottom: '4px',
                              fontWeight: '500'
                            }}>
                              Team
                            </div>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold', 
                              color: getScoreColor(assessment.team_score) 
                            }}>
                              {assessment.team_score}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6b7280', 
                              marginBottom: '4px',
                              fontWeight: '500'
                            }}>
                              Individual
                            </div>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold', 
                              color: getScoreColor(assessment.individual_score) 
                            }}>
                              {assessment.individual_score}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6b7280', 
                              marginBottom: '4px',
                              fontWeight: '500'
                            }}>
                              Organization
                            </div>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold', 
                              color: getScoreColor(assessment.organization_score) 
                            }}>
                              {assessment.organization_score}
                            </div>
                          </div>
                          <div style={{ 
                            textAlign: 'center', 
                            borderLeft: '1px solid #e5e7eb', 
                            paddingLeft: '16px' 
                          }}>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6b7280', 
                              marginBottom: '4px',
                              fontWeight: '500'
                            }}>
                              Average
                            </div>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold', 
                              color: getScoreColor(
                                (assessment.task_score + assessment.team_score + 
                                 assessment.individual_score + assessment.organization_score) / 4
                              ) 
                            }}>
                              {((assessment.task_score + assessment.team_score + 
                                 assessment.individual_score + assessment.organization_score) / 4).toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadershipTab;