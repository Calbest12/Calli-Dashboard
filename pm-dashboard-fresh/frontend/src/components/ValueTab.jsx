import React, { useState, useEffect } from 'react';
import { Target, History, Plus, Eye, BarChart3, AlertCircle } from 'lucide-react';

const ValueTab = ({ currentUser, apiService, onDataChange }) => {
  const [assessments, setAssessments] = useState([]);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAssessmentDetails, setSelectedAssessmentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Chart visibility controls
  const [chartVisibility, setChartVisibility] = useState({
    vision: true,
    alignment: true,
    understanding: true,
    enactment: true
  });
  
  // Form state for multi-step VALUE assessment
  const [responses, setResponses] = useState({});
  const [currentDimension, setCurrentDimension] = useState('vision');

  // VALUE Assessment framework - exact copy from LeadershipTab
  const valueFramework = {
    vision: {
      title: 'Vision',
      description: 'Your ability to create, communicate, and sustain an inspiring direction',
      questions: [
        {
          key: 'clarity',
          question: 'How clear and compelling is your leadership vision?',
          description: 'A strong vision provides clear direction and inspires action',
          scale: 'Rate from 1 (very unclear) to 10 (exceptionally clear and compelling)'
        },
        {
          key: 'communication',
          question: 'How effectively do you communicate your vision?',
          description: 'Consider frequency, clarity, and methods of vision communication',
          scale: 'Rate from 1 (rarely communicated) to 10 (consistently and effectively communicated)'
        },
        {
          key: 'alignment',
          question: 'How well does your vision align with organizational strategy?',
          description: 'Strong alignment ensures coherent direction across levels',
          scale: 'Rate from 1 (misaligned) to 10 (perfectly aligned)'
        },
        {
          key: 'inspiration',
          question: 'How inspiring and motivating is your vision to others?',
          description: 'An inspiring vision energizes people and drives commitment',
          scale: 'Rate from 1 (not inspiring) to 10 (highly inspiring and motivating)'
        }
      ]
    },
    alignment: {
      title: 'Alignment',
      description: 'Your effectiveness in creating organizational alignment to support the vision',
      questions: [
        {
          key: 'processes',
          question: 'How well do organizational processes support your vision?',
          description: 'Processes should enable rather than hinder vision achievement',
          scale: 'Rate from 1 (processes hinder vision) to 10 (processes strongly support vision)'
        },
        {
          key: 'structure',
          question: 'How well does organizational structure enable vision achievement?',
          description: 'Structure includes reporting relationships, decision-making, and authority',
          scale: 'Rate from 1 (structure blocks progress) to 10 (structure perfectly enables vision)'
        },
        {
          key: 'resources',
          question: 'How adequately are resources allocated to support the vision?',
          description: 'Resources include budget, people, tools, and time',
          scale: 'Rate from 1 (severely under-resourced) to 10 (optimally resourced)'
        },
        {
          key: 'systems',
          question: 'How well do information and communication systems support alignment?',
          description: 'Systems should facilitate coordination and information flow',
          scale: 'Rate from 1 (systems create misalignment) to 10 (systems ensure perfect alignment)'
        }
      ]
    },
    understanding: {
      title: 'Understanding',
      description: 'Your grasp of stakeholder perspectives, resistance, and change dynamics',
      questions: [
        {
          key: 'stakeholder',
          question: 'How well do you understand stakeholder needs and concerns?',
          description: 'Stakeholders include team members, customers, executives, and partners',
          scale: 'Rate from 1 (little understanding) to 10 (deep understanding of all stakeholders)'
        },
        {
          key: 'resistance',
          question: 'How well do you identify and address resistance to change?',
          description: 'Understanding resistance sources helps in developing effective responses',
          scale: 'Rate from 1 (unaware of resistance) to 10 (expertly identify and address resistance)'
        },
        {
          key: 'culture',
          question: 'How well do you understand cultural factors affecting your leadership?',
          description: 'Culture includes organizational, team, and individual cultural dynamics',
          scale: 'Rate from 1 (limited cultural awareness) to 10 (deep cultural understanding)'
        },
        {
          key: 'dynamics',
          question: 'How well do you understand team and organizational dynamics?',
          description: 'Dynamics include power structures, informal networks, and relationships',
          scale: 'Rate from 1 (poor understanding) to 10 (expert understanding of dynamics)'
        }
      ]
    },
    enactment: {
      title: 'Enactment',
      description: 'Your consistency and effectiveness in translating vision into action',
      questions: [
        {
          key: 'consistency',
          question: 'How consistently do your actions align with your stated vision?',
          description: 'Consistency builds trust and credibility in your leadership',
          scale: 'Rate from 1 (actions often contradict vision) to 10 (perfect consistency between vision and actions)'
        },
        {
          key: 'adaptation',
          question: 'How effectively do you adapt your approach while maintaining vision integrity?',
          description: 'Good leaders adapt tactics while maintaining strategic direction',
          scale: 'Rate from 1 (rigid or constantly changing) to 10 (perfectly adaptive while maintaining direction)'
        },
        {
          key: 'measurement',
          question: 'How effectively do you measure progress toward your vision?',
          description: 'Measurement enables course correction and demonstrates progress',
          scale: 'Rate from 1 (no measurement) to 10 (comprehensive and effective measurement)'
        },
        {
          key: 'feedback',
          question: 'How well do you incorporate feedback to improve your leadership?',
          description: 'Feedback helps refine approach and demonstrates commitment to growth',
          scale: 'Rate from 1 (ignore feedback) to 10 (actively seek and effectively use feedback)'
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
      const response = await apiService.getValueAssessments(currentUser.id);
      if (response && response.success) {
        setAssessments(response.data || []);
      }
    } catch (error) {
      console.error('Error loading VALUE assessments:', error);
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
        vision: assessment.vision_score || 0,
        alignment: assessment.alignment_score || 0,
        understanding: assessment.understanding_score || 0,
        enactment: assessment.enactment_score || 0
      };
    });
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
  };

  const handleNext = async () => {
    const dimensions = Object.keys(valueFramework);
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
        const questions = valueFramework[dim].questions;
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
          vision_score: assessment.vision.score,
          alignment_score: assessment.alignment.score,
          understanding_score: assessment.understanding.score,
          enactment_score: assessment.enactment.score,
          responses: JSON.stringify(responses)
        };

        const saveResponse = await apiService.saveValueAssessment(assessmentPayload);

        if (saveResponse && saveResponse.success) {
          await loadAssessments();
          setResponses({});
          setCurrentDimension('vision');
          setShowAssessmentForm(false);
          if (onDataChange) onDataChange();
        }
        
      } catch (error) {
        console.error('Error saving VALUE assessment:', error);
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
      { key: 'vision', name: 'Vision', color: '#f59e0b' },
      { key: 'alignment', name: 'Alignment', color: '#3b82f6' },
      { key: 'understanding', name: 'Understanding', color: '#8b5cf6' },
      { key: 'enactment', name: 'Enactment', color: '#10b981' }
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
    ? ((latestScores.vision_score + latestScores.alignment_score + 
        latestScores.understanding_score + latestScores.enactment_score) / 4).toFixed(1)
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
        Loading VALUE assessments...
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
            <Target size={32} style={{ color: '#3b82f6' }} />
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#1f2937' 
              }}>
                VALUE Assessment
              </h1>
              <p style={{ 
                margin: 0, 
                color: '#6b7280', 
                fontSize: '14px' 
              }}>
                Vision | Alignment | Understanding | Enactment
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
            Current VALUE Scores
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
                color: getScoreColor(latestScores.vision_score),
                marginBottom: '8px'
              }}>
                {latestScores.vision_score}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#92400e',
                marginBottom: '4px'
              }}>
                Vision
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Creating direction
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '16px'
            }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: getScoreColor(latestScores.alignment_score),
                marginBottom: '8px'
              }}>
                {latestScores.alignment_score}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#1e40af',
                marginBottom: '4px'
              }}>
                Alignment
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Organizational support
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '16px'
            }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: getScoreColor(latestScores.understanding_score),
                marginBottom: '8px'
              }}>
                {latestScores.understanding_score}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#7c3aed',
                marginBottom: '4px'
              }}>
                Understanding
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Stakeholder awareness
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '16px'
            }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: getScoreColor(latestScores.enactment_score),
                marginBottom: '8px'
              }}>
                {latestScores.enactment_score}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#059669',
                marginBottom: '4px'
              }}>
                Enactment
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Action consistency
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
            <Target size={48} style={{ 
              color: '#6b7280', 
              marginBottom: '16px' 
            }} />
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
              No VALUE assessments yet
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Take your first VALUE assessment to evaluate your Vision, Alignment, Understanding, and Enactment capabilities.
            </p>
          </div>
        )}
      </div>

      {/* Progress Chart */}
      {chartData.length > 1 && (
        <SimpleChart 
          data={chartData} 
          title="VALUE Assessment Progress Over Time" 
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
                Overall VALUE Performance: Your average score of {avgScore}/10 places you in the{' '}
                {parseFloat(avgScore) >= 8 ? 'excellent' : parseFloat(avgScore) >= 6 ? 'good' : 'developing'}{' '}
                leadership range. {parseFloat(avgScore) >= 8 
                  ? 'You demonstrate strong consistency across all VALUE dimensions.'
                  : parseFloat(avgScore) >= 6 
                    ? 'You show solid leadership capabilities with room for targeted improvement.'
                    : 'Focus on building foundational leadership skills across all dimensions.'
                }
              </p>
            </div>

            {/* Dimension-Specific Insights */}
            {(() => {
              const scores = [
                { name: 'Vision', score: latestScores.vision_score, description: 'creating and communicating direction' },
                { name: 'Alignment', score: latestScores.alignment_score, description: 'organizational support and structure' },
                { name: 'Understanding', score: latestScores.understanding_score, description: 'stakeholder and cultural awareness' },
                { name: 'Enactment', score: latestScores.enactment_score, description: 'consistent action and execution' }
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
              const currentTotal = latestScores.vision_score + latestScores.alignment_score + 
                                 latestScores.understanding_score + latestScores.enactment_score;
              const previousTotal = previousAssessment.vision_score + previousAssessment.alignment_score + 
                                   previousAssessment.understanding_score + previousAssessment.enactment_score;
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
                    Progress Trend: Since your last assessment, your total VALUE score has{' '}
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
                VALUE Assessment - {valueFramework[currentDimension].title}
              </h3>
              <button
                onClick={() => {
                  setShowAssessmentForm(false);
                  setResponses({});
                  setCurrentDimension('vision');
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
                X
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                marginBottom: '8px', 
                color: '#1f2937' 
              }}>
                {valueFramework[currentDimension].title}
              </h4>
              <p style={{ 
                color: '#6b7280', 
                fontSize: '14px', 
                margin: 0 
              }}>
                {valueFramework[currentDimension].description}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {valueFramework[currentDimension].questions.map((question) => {
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
                {Object.keys(valueFramework).indexOf(currentDimension) + 1} of {Object.keys(valueFramework).length} sections
              </div>
              <button
                onClick={handleNext}
                disabled={valueFramework[currentDimension].questions.some(q => !responses[currentDimension]?.[q.key])}
                style={{
                  padding: '8px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: valueFramework[currentDimension].questions.some(q => !responses[currentDimension]?.[q.key]) 
                    ? '#d1d5db' : '#3b82f6',
                  color: 'white',
                  cursor: valueFramework[currentDimension].questions.some(q => !responses[currentDimension]?.[q.key]) 
                    ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {Object.keys(valueFramework).indexOf(currentDimension) === Object.keys(valueFramework).length - 1 
                  ? 'Complete Assessment' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal - COMPLETELY REWRITTEN */}
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
                  : 'VALUE Assessment History'
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
                  X
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
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Vision</div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: getScoreColor(selectedAssessmentDetails.assessment.vision_score) 
                        }}>
                          {selectedAssessmentDetails.assessment.vision_score}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Alignment</div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: getScoreColor(selectedAssessmentDetails.assessment.alignment_score) 
                        }}>
                          {selectedAssessmentDetails.assessment.alignment_score}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Understanding</div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: getScoreColor(selectedAssessmentDetails.assessment.understanding_score) 
                        }}>
                          {selectedAssessmentDetails.assessment.understanding_score}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Enactment</div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: getScoreColor(selectedAssessmentDetails.assessment.enactment_score) 
                        }}>
                          {selectedAssessmentDetails.assessment.enactment_score}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', borderLeft: '1px solid #bfdbfe', paddingLeft: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Average</div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: getScoreColor(
                            (selectedAssessmentDetails.assessment.vision_score + 
                             selectedAssessmentDetails.assessment.alignment_score + 
                             selectedAssessmentDetails.assessment.understanding_score + 
                             selectedAssessmentDetails.assessment.enactment_score) / 4
                          ) 
                        }}>
                          {((selectedAssessmentDetails.assessment.vision_score + 
                             selectedAssessmentDetails.assessment.alignment_score + 
                             selectedAssessmentDetails.assessment.understanding_score + 
                             selectedAssessmentDetails.assessment.enactment_score) / 4).toFixed(1)}
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
                      
                      {Object.keys(valueFramework).map(dimensionKey => {
                        const dimension = valueFramework[dimensionKey];
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
                              Click for details ►
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
                              Vision
                            </div>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold', 
                              color: getScoreColor(assessment.vision_score) 
                            }}>
                              {assessment.vision_score}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6b7280', 
                              marginBottom: '4px',
                              fontWeight: '500'
                            }}>
                              Alignment
                            </div>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold', 
                              color: getScoreColor(assessment.alignment_score) 
                            }}>
                              {assessment.alignment_score}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6b7280', 
                              marginBottom: '4px',
                              fontWeight: '500'
                            }}>
                              Understanding
                            </div>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold', 
                              color: getScoreColor(assessment.understanding_score) 
                            }}>
                              {assessment.understanding_score}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6b7280', 
                              marginBottom: '4px',
                              fontWeight: '500'
                            }}>
                              Enactment
                            </div>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: 'bold', 
                              color: getScoreColor(assessment.enactment_score) 
                            }}>
                              {assessment.enactment_score}
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
                                (assessment.vision_score + assessment.alignment_score + 
                                 assessment.understanding_score + assessment.enactment_score) / 4
                              ) 
                            }}>
                              {((assessment.vision_score + assessment.alignment_score + 
                                 assessment.understanding_score + assessment.enactment_score) / 4).toFixed(1)}
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

export default ValueTab;