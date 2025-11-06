// frontend/src/components/LeadershipTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Award, 
  History, 
  Plus, 
  Eye, 
  BarChart3, 
  AlertCircle, 
  Filter, 
  TrendingUp, 
  Users, 
  Target,
  Brain,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Activity,
  Loader
} from 'lucide-react';

const LeadershipTab = ({ currentUser, apiService, onDataChange }) => {
  const [assessments, setAssessments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAssessmentDetails, setSelectedAssessmentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Chart visibility controls
  const [chartVisibility, setChartVisibility] = useState({
    vision: true,
    reality: true,
    ethics: true,
    courage: true
  });
  
  // Form state for multi-step Leadership Diamond assessment
  const [responses, setResponses] = useState({});
  const [currentDimension, setCurrentDimension] = useState('vision');
  const [selectedProjectForAssessment, setSelectedProjectForAssessment] = useState('');

  // Leadership Diamond Assessment framework (Vision, Reality, Ethics, Courage)
  const leadershipDiamondFramework = {
    vision: {
      title: 'Vision',
      description: 'Your ability to create and communicate clear direction and inspire others',
      color: '#3b82f6',
      questions: [
        {
          key: 'clarity',
          question: 'How clear and compelling is your project vision?',
          description: 'A strong vision provides clear direction and inspires commitment',
          scale: 'Rate from 1 (very unclear) to 7 (exceptionally clear and compelling)'
        },
        {
          key: 'communication',
          question: 'How effectively do you communicate your vision to stakeholders?',
          description: 'Consider frequency, clarity, and methods of communication',
          scale: 'Rate from 1 (rarely communicated) to 7 (consistently and effectively communicated)'
        },
        {
          key: 'alignment',
          question: 'How well does your vision align with organizational strategy?',
          description: 'Strong alignment ensures coherent direction across all levels',
          scale: 'Rate from 1 (misaligned) to 7 (perfectly aligned)'
        },
        {
          key: 'inspiration',
          question: 'How inspiring and motivating is your vision to the team?',
          description: 'An inspiring vision energizes people and drives commitment',
          scale: 'Rate from 1 (not inspiring) to 7 (highly inspiring and motivating)'
        }
      ]
    },
    reality: {
      title: 'Reality',
      description: 'Your effectiveness in assessing current state and managing practical implementation',
      color: '#10b981',
      questions: [
        {
          key: 'assessment',
          question: 'How accurately do you assess the current project state?',
          description: 'Realistic assessment is crucial for effective planning',
          scale: 'Rate from 1 (poor assessment) to 7 (highly accurate assessment)'
        },
        {
          key: 'resource_management',
          question: 'How effectively do you manage project resources?',
          description: 'Consider budget, time, personnel, and other resources',
          scale: 'Rate from 1 (poor resource management) to 7 (excellent resource management)'
        },
        {
          key: 'milestone_tracking',
          question: 'How well do you track progress against milestones?',
          description: 'Consistent tracking enables timely adjustments and course corrections',
          scale: 'Rate from 1 (poor tracking) to 7 (excellent milestone tracking)'
        },
        {
          key: 'problem_solving',
          question: 'How effectively do you identify and address project obstacles?',
          description: 'Proactive problem-solving is key to successful project delivery',
          scale: 'Rate from 1 (reactive approach) to 7 (highly proactive problem-solving)'
        }
      ]
    },
    ethics: {
      title: 'Ethics',
      description: 'Your commitment to ethical principles and fairness in leadership',
      color: '#8b5cf6',
      questions: [
        {
          key: 'fairness',
          question: 'How fairly do you treat all team members and stakeholders?',
          description: 'Ethical leadership ensures equitable treatment of all parties',
          scale: 'Rate from 1 (unfair treatment) to 7 (consistently fair treatment)'
        },
        {
          key: 'transparency',
          question: 'How transparent are you about decisions and project status?',
          description: 'Transparency builds trust and reduces uncertainty',
          scale: 'Rate from 1 (not transparent) to 7 (highly transparent)'
        },
        {
          key: 'integrity',
          question: 'How consistently do you demonstrate integrity in your actions?',
          description: 'Integrity maintains credibility and organizational trust',
          scale: 'Rate from 1 (inconsistent integrity) to 7 (consistently demonstrates integrity)'
        },
        {
          key: 'responsibility',
          question: 'How well do you take responsibility for project outcomes?',
          description: 'Responsible leadership owns both successes and failures',
          scale: 'Rate from 1 (avoids responsibility) to 7 (consistently takes responsibility)'
        }
      ]
    },
    courage: {
      title: 'Courage',
      description: 'Your willingness to make difficult decisions and drive necessary change',
      color: '#f59e0b',
      questions: [
        {
          key: 'difficult_decisions',
          question: 'How willing are you to make difficult project decisions?',
          description: 'Courage enables leaders to make unpopular but necessary decisions',
          scale: 'Rate from 1 (avoids difficult decisions) to 7 (consistently makes tough decisions)'
        },
        {
          key: 'risk_taking',
          question: 'How appropriately do you take calculated risks?',
          description: 'Courageous leaders balance caution with necessary risk-taking',
          scale: 'Rate from 1 (risk-averse) to 7 (appropriately takes calculated risks)'
        },
        {
          key: 'innovation',
          question: 'How willing are you to support innovative approaches?',
          description: 'Courage enables leaders to embrace new and untested solutions',
          scale: 'Rate from 1 (resists innovation) to 7 (strongly supports innovation)'
        },
        {
          key: 'persistence',
          question: 'How persistent are you in driving project success despite setbacks?',
          description: 'Courageous leaders persevere through challenges and obstacles',
          scale: 'Rate from 1 (gives up easily) to 7 (highly persistent through difficulties)'
        }
      ]
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [currentUser]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadProjects(),
        loadAssessments()
      ]);
    } catch (error) {
      console.error('Error loading leadership data:', error);
      setError('Failed to load leadership data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await apiService.getUserProjects();
      if (response.success) {
        setProjects(response.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadAssessments = async () => {
    try {
      const response = await apiService.getLeadershipAssessments();
      if (response.success) {
        setAssessments(response.assessments || []);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
    }
  };

  // Filter assessments based on selected project
  const getFilteredAssessments = () => {
    if (selectedProject === 'all') {
      return assessments;
    }
    return assessments.filter(assessment => 
      assessment.project_id === parseInt(selectedProject)
    );
  };

  // Calculate diamond metrics from assessments
  const calculateDiamondMetrics = () => {
    const filteredAssessments = getFilteredAssessments();
    
    if (filteredAssessments.length === 0) {
      return {
        vision: 0,
        reality: 0,
        ethics: 0,
        courage: 0,
        overall: 0,
        count: 0
      };
    }

    const totals = filteredAssessments.reduce((acc, assessment) => {
      if (assessment.responses) {
        const responses = typeof assessment.responses === 'string' 
          ? JSON.parse(assessment.responses) 
          : assessment.responses;
        
        // Calculate averages for each dimension
        const visionAvg = Object.keys(responses)
          .filter(key => key.startsWith('vision_'))
          .reduce((sum, key) => sum + (parseInt(responses[key]) || 0), 0) / 4;
        
        const realityAvg = Object.keys(responses)
          .filter(key => key.startsWith('reality_'))
          .reduce((sum, key) => sum + (parseInt(responses[key]) || 0), 0) / 4;
        
        const ethicsAvg = Object.keys(responses)
          .filter(key => key.startsWith('ethics_'))
          .reduce((sum, key) => sum + (parseInt(responses[key]) || 0), 0) / 4;
        
        const courageAvg = Object.keys(responses)
          .filter(key => key.startsWith('courage_'))
          .reduce((sum, key) => sum + (parseInt(responses[key]) || 0), 0) / 4;

        acc.vision += visionAvg;
        acc.reality += realityAvg;
        acc.ethics += ethicsAvg;
        acc.courage += courageAvg;
      }
      return acc;
    }, { vision: 0, reality: 0, ethics: 0, courage: 0 });

    const count = filteredAssessments.length;
    const vision = Math.round((totals.vision / count) * 10) / 10;
    const reality = Math.round((totals.reality / count) * 10) / 10;
    const ethics = Math.round((totals.ethics / count) * 10) / 10;
    const courage = Math.round((totals.courage / count) * 10) / 10;
    const overall = Math.round(((vision + reality + ethics + courage) / 4) * 10) / 10;

    return { vision, reality, ethics, courage, overall, count };
  };

  const handleStartAssessment = () => {
    setResponses({});
    setCurrentDimension('vision');
    setSelectedProjectForAssessment(projects.length > 0 ? projects[0].id.toString() : '');
    setShowAssessmentForm(true);
  };

  const handleDimensionResponse = (dimensionKey, questionKey, value) => {
    const responseKey = `${dimensionKey}_${questionKey}`;
    setResponses(prev => ({
      ...prev,
      [responseKey]: parseInt(value)
    }));
  };

  const handleNextDimension = () => {
    const dimensions = Object.keys(leadershipDiamondFramework);
    const currentIndex = dimensions.indexOf(currentDimension);
    
    if (currentIndex < dimensions.length - 1) {
      setCurrentDimension(dimensions[currentIndex + 1]);
    } else {
      // Assessment complete, submit
      handleSubmitAssessment();
    }
  };

  const handlePreviousDimension = () => {
    const dimensions = Object.keys(leadershipDiamondFramework);
    const currentIndex = dimensions.indexOf(currentDimension);
    
    if (currentIndex > 0) {
      setCurrentDimension(dimensions[currentIndex - 1]);
    }
  };

  const handleSubmitAssessment = async () => {
    try {
      const assessmentData = {
        project_id: selectedProjectForAssessment ? parseInt(selectedProjectForAssessment) : null,
        responses: responses,
        type: 'leadership_diamond'
      };

      const response = await apiService.submitLeadershipAssessment(assessmentData);
      
      if (response.success) {
        setShowAssessmentForm(false);
        setResponses({});
        setCurrentDimension('vision');
        await loadAssessments(); // Reload assessments
        if (onDataChange) onDataChange();
      } else {
        setError('Failed to submit assessment. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setError('Failed to submit assessment. Please try again.');
    }
  };

  // Check if current dimension is complete
  const isDimensionComplete = (dimensionKey) => {
    const questions = leadershipDiamondFramework[dimensionKey].questions;
    return questions.every(question => {
      const responseKey = `${dimensionKey}_${question.key}`;
      return responses[responseKey] && responses[responseKey] >= 1 && responses[responseKey] <= 7;
    });
  };

  const canProceed = isDimensionComplete(currentDimension);
  const dimensions = Object.keys(leadershipDiamondFramework);
  const isLastDimension = currentDimension === dimensions[dimensions.length - 1];

  // Render diamond visualization
  const renderDiamond = () => {
    const metrics = calculateDiamondMetrics();
    const size = 300;
    const center = size / 2;
    const radius = size / 3;

    // Calculate points for diamond shape
    const points = {
      vision: { x: center, y: center - (radius * metrics.vision / 7) },
      reality: { x: center + (radius * metrics.reality / 7), y: center },
      ethics: { x: center, y: center + (radius * metrics.ethics / 7) },
      courage: { x: center - (radius * metrics.courage / 7), y: center }
    };

    const pathData = `M ${points.vision.x},${points.vision.y} L ${points.reality.x},${points.reality.y} L ${points.ethics.x},${points.ethics.y} L ${points.courage.x},${points.courage.y} Z`;

    return (
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Leadership Diamond
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem'
              }}
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Filter size={16} />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {metrics.count} assessment{metrics.count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {metrics.count > 0 ? (
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {/* Diamond Chart */}
            <div style={{ position: 'relative' }}>
              <svg width={size} height={size} style={{ overflow: 'visible' }}>
                {/* Grid lines */}
                {[1, 2, 3, 4, 5, 6, 7].map(level => {
                  const r = (radius * level) / 7;
                  const gridPoints = {
                    vision: { x: center, y: center - r },
                    reality: { x: center + r, y: center },
                    ethics: { x: center, y: center + r },
                    courage: { x: center - r, y: center }
                  };
                  const gridPath = `M ${gridPoints.vision.x},${gridPoints.vision.y} L ${gridPoints.reality.x},${gridPoints.reality.y} L ${gridPoints.ethics.x},${gridPoints.ethics.y} L ${gridPoints.courage.x},${gridPoints.courage.y} Z`;
                  
                  return (
                    <path
                      key={level}
                      d={gridPath}
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Main diamond shape */}
                <path
                  d={pathData}
                  fill="rgba(59, 130, 246, 0.3)"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />

                {/* Dimension points */}
                {Object.entries(points).map(([dimension, point]) => (
                  <circle
                    key={dimension}
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    fill={leadershipDiamondFramework[dimension].color}
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}

                {/* Dimension labels */}
                <text x={center} y={center - radius - 20} textAnchor="middle" fontSize="14" fontWeight="600" fill="#374151">
                  Vision ({metrics.vision})
                </text>
                <text x={center + radius + 20} y={center + 5} textAnchor="start" fontSize="14" fontWeight="600" fill="#374151">
                  Reality ({metrics.reality})
                </text>
                <text x={center} y={center + radius + 35} textAnchor="middle" fontSize="14" fontWeight="600" fill="#374151">
                  Ethics ({metrics.ethics})
                </text>
                <text x={center - radius - 20} y={center + 5} textAnchor="end" fontSize="14" fontWeight="600" fill="#374151">
                  Courage ({metrics.courage})
                </text>
              </svg>
            </div>

            {/* Metrics Summary */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#111827',
                  textAlign: 'center'
                }}>
                  {metrics.overall}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  textAlign: 'center'
                }}>
                  Overall Leadership Score
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {Object.entries(leadershipDiamondFramework).map(([key, dimension]) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: 'white',
                      borderRadius: '0.375rem',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: dimension.color
                      }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                      {dimension.title}: {metrics[key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6b7280'
          }}>
            <Award size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p style={{ fontSize: '1.125rem', margin: 0 }}>
              No leadership assessments yet
            </p>
            <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              Complete your first assessment to see your leadership diamond
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render assessment form
  const renderAssessmentForm = () => {
    const currentDimensionData = leadershipDiamondFramework[currentDimension];
    const currentIndex = Object.keys(leadershipDiamondFramework).indexOf(currentDimension);
    const totalDimensions = Object.keys(leadershipDiamondFramework).length;

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
        padding: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 0.5rem 0'
              }}>
                Leadership Assessment
              </h3>
              <div style={{
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                Step {currentIndex + 1} of {totalDimensions}: {currentDimensionData.title}
              </div>
            </div>
            <button
              onClick={() => setShowAssessmentForm(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '0.5rem'
              }}
            >
              ×
            </button>
          </div>

          {/* Project Selection */}
          {currentIndex === 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Select Project for Assessment:
              </label>
              <select
                value={selectedProjectForAssessment}
                onChange={(e) => setSelectedProjectForAssessment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
                required
              >
                <option value="">Select a project...</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#f3f4f6',
            borderRadius: '3px',
            marginBottom: '2rem'
          }}>
            <div style={{
              width: `${((currentIndex + 1) / totalDimensions) * 100}%`,
              height: '100%',
              backgroundColor: currentDimensionData.color,
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Dimension Info */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 0.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: currentDimensionData.color
                }}
              />
              {currentDimensionData.title}
            </h4>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: 0
            }}>
              {currentDimensionData.description}
            </p>
          </div>

          {/* Questions */}
          <div style={{ marginBottom: '2rem' }}>
            {currentDimensionData.questions.map((question, index) => {
              const responseKey = `${currentDimension}_${question.key}`;
              const currentValue = responses[responseKey] || '';

              return (
                <div key={question.key} style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    marginBottom: '0.75rem'
                  }}>
                    <h5 style={{
                      fontSize: '1rem',
                      fontWeight: '500',
                      color: '#374151',
                      margin: '0 0 0.25rem 0'
                    }}>
                      {index + 1}. {question.question}
                    </h5>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      margin: '0 0 0.25rem 0'
                    }}>
                      {question.description}
                    </p>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      margin: 0,
                      fontStyle: 'italic'
                    }}>
                      {question.scale}
                    </p>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '0.5rem'
                  }}>
                    {[1, 2, 3, 4, 5, 6, 7].map(value => (
                      <button
                        key={value}
                        onClick={() => handleDimensionResponse(currentDimension, question.key, value)}
                        style={{
                          padding: '0.75rem',
                          border: currentValue === value ? `2px solid ${currentDimensionData.color}` : '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          backgroundColor: currentValue === value ? `${currentDimensionData.color}20` : 'white',
                          color: currentValue === value ? currentDimensionData.color : '#374151',
                          fontWeight: currentValue === value ? '600' : '500',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={handlePreviousDimension}
              disabled={currentIndex === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: currentIndex === 0 ? '#f9fafb' : 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                color: currentIndex === 0 ? '#9ca3af' : '#374151',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem'
              }}
            >
              <ArrowLeft size={16} />
              Previous
            </button>

            <button
              onClick={isLastDimension ? handleSubmitAssessment : handleNextDimension}
              disabled={!canProceed || (currentIndex === 0 && !selectedProjectForAssessment)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: (!canProceed || (currentIndex === 0 && !selectedProjectForAssessment)) 
                  ? '#f9fafb' 
                  : currentDimensionData.color,
                border: 'none',
                borderRadius: '0.375rem',
                color: (!canProceed || (currentIndex === 0 && !selectedProjectForAssessment)) 
                  ? '#9ca3af' 
                  : 'white',
                cursor: (!canProceed || (currentIndex === 0 && !selectedProjectForAssessment)) 
                  ? 'not-allowed' 
                  : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {isLastDimension ? 'Complete Assessment' : 'Next'}
              {!isLastDimension && <ArrowRight size={16} />}
              {isLastDimension && <CheckCircle size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render assessment history
  const renderAssessmentHistory = () => {
    const filteredAssessments = getFilteredAssessments();

    return (
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Assessment History
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem'
              }}
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredAssessments.length > 0 ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredAssessments.map((assessment) => {
              const project = projects.find(p => p.id === assessment.project_id);
              const date = new Date(assessment.created_at);
              
              // Calculate scores from responses
              let scores = { vision: 0, reality: 0, ethics: 0, courage: 0 };
              if (assessment.responses) {
                const responses = typeof assessment.responses === 'string' 
                  ? JSON.parse(assessment.responses) 
                  : assessment.responses;
                
                Object.keys(leadershipDiamondFramework).forEach(dimension => {
                  const dimensionResponses = Object.keys(responses)
                    .filter(key => key.startsWith(`${dimension}_`))
                    .map(key => parseInt(responses[key]) || 0);
                  
                  if (dimensionResponses.length > 0) {
                    scores[dimension] = Math.round(
                      (dimensionResponses.reduce((sum, score) => sum + score, 0) / dimensionResponses.length) * 10
                    ) / 10;
                  }
                });
              }

              return (
                <div
                  key={assessment.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '1rem'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.75rem'
                  }}>
                    <div>
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '500',
                        color: '#111827',
                        margin: '0 0 0.25rem 0'
                      }}>
                        {project ? project.title : 'Unknown Project'}
                      </h4>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        margin: 0
                      }}>
                        Completed {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedAssessmentDetails(assessment)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.375rem 0.75rem',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        color: '#374151',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {Object.entries(leadershipDiamondFramework).map(([key, dimension]) => (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '0.375rem'
                        }}
                      >
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: dimension.color
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                          {dimension.title}: {scores[key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280'
          }}>
            <History size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p style={{ fontSize: '1rem', margin: 0 }}>
              No assessments found
            </p>
            <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              {selectedProject === 'all' 
                ? 'Complete your first leadership assessment to see history'
                : 'No assessments for the selected project'
              }
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '1rem'
      }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280' }}>Loading leadership assessments...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 0.5rem 0'
          }}>
            Leadership Assessment
          </h1>
          <p style={{
            color: '#6b7280',
            margin: 0
          }}>
            Assess your leadership effectiveness across vision, reality, ethics, and courage
          </p>
        </div>

        <button
          onClick={handleStartAssessment}
          disabled={projects.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: projects.length === 0 ? '#f9fafb' : '#3b82f6',
            color: projects.length === 0 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: projects.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={16} />
          New Assessment
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>
            {error}
          </span>
        </div>
      )}

      {/* No Projects Warning */}
      {projects.length === 0 && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
          <span style={{ color: '#d97706', fontSize: '0.875rem' }}>
            You need to create at least one project before taking a leadership assessment.
          </span>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Leadership Diamond */}
        {renderDiamond()}
        
        {/* Assessment History */}
        {renderAssessmentHistory()}
      </div>

      {/* Assessment Form Modal */}
      {showAssessmentForm && renderAssessmentForm()}

      {/* Assessment Details Modal */}
      {selectedAssessmentDetails && (
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
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Assessment Details
              </h3>
              <button
                onClick={() => setSelectedAssessmentDetails(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                ×
              </button>
            </div>

            {/* Assessment Details Content */}
            <div>
              {/* Project info */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
                  Project: {projects.find(p => p.id === selectedAssessmentDetails.project_id)?.title || 'Unknown'}
                </h4>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  Completed: {new Date(selectedAssessmentDetails.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Detailed responses */}
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {Object.entries(leadershipDiamondFramework).map(([dimensionKey, dimension]) => {
                  const responses = selectedAssessmentDetails.responses 
                    ? (typeof selectedAssessmentDetails.responses === 'string' 
                        ? JSON.parse(selectedAssessmentDetails.responses) 
                        : selectedAssessmentDetails.responses)
                    : {};

                  return (
                    <div key={dimensionKey} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      padding: '1rem'
                    }}>
                      <h5 style={{
                        fontSize: '1rem',
                        fontWeight: '500',
                        color: dimension.color,
                        margin: '0 0 1rem 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: dimension.color
                        }} />
                        {dimension.title}
                      </h5>
                      
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {dimension.questions.map((question, index) => {
                          const responseKey = `${dimensionKey}_${question.key}`;
                          const score = responses[responseKey] || 'Not answered';
                          
                          return (
                            <div key={question.key} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '1rem'
                            }}>
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  color: '#374151',
                                  margin: '0 0 0.25rem 0'
                                }}>
                                  {index + 1}. {question.question}
                                </p>
                                <p style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280',
                                  margin: 0
                                }}>
                                  {question.description}
                                </p>
                              </div>
                              <div style={{
                                padding: '0.5rem',
                                backgroundColor: '#f9fafb',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#111827',
                                minWidth: '2rem',
                                textAlign: 'center'
                              }}>
                                {score}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadershipTab;