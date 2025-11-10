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
  Loader,
  X,
  ChevronLeft,
  ChevronRight
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
  const [submitting, setSubmitting] = useState(false);
  
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

  // Leadership Diamond Assessment framework based on the PDF
  const leadershipDiamondFramework = {
    vision: {
      title: 'Vision',
      description: 'Do we have a strong vision which will bring powerful things to the organization and customer?',
      details: 'We understand the big picture of a genius vision, with smart thinking creating a strategy to move forward.',
      color: '#3b82f6',
      questions: [
        {
          key: 'clarity',
          question: 'How clear and compelling is your project vision?',
          description: 'A strong vision provides clear direction and inspires commitment to achieving project goals.',
          scale: 'Rate from 1 (very unclear) to 7 (exceptionally clear and compelling)'
        },
        {
          key: 'communication',
          question: 'How effectively do you communicate your vision to stakeholders?',
          description: 'Consider frequency, clarity, and methods of vision communication across all project stakeholders.',
          scale: 'Rate from 1 (rarely communicated) to 7 (consistently and effectively communicated)'
        },
        {
          key: 'alignment',
          question: 'How well does your vision align with organizational strategy?',
          description: 'Strong alignment ensures coherent direction across all organizational levels and departments.',
          scale: 'Rate from 1 (misaligned) to 7 (perfectly aligned)'
        },
        {
          key: 'inspiration',
          question: 'How inspiring and motivating is your vision to the team?',
          description: 'An inspiring vision energizes people and drives commitment to the project mission.',
          scale: 'Rate from 1 (not inspiring) to 7 (highly inspiring and motivating)'
        }
      ]
    },
    reality: {
      title: 'Reality',
      description: 'Do we have a strong reality that is pulling back from the vision?',
      details: 'We recognize the organization\'s image and branding holds the organizational culture to "the way we\'ve always done it".',
      color: '#10b981',
      questions: [
        {
          key: 'assessment',
          question: 'How accurately do you assess the current project state?',
          description: 'Realistic assessment of current conditions is crucial for effective project planning and execution.',
          scale: 'Rate from 1 (poor assessment) to 7 (highly accurate assessment)'
        },
        {
          key: 'resource_management',
          question: 'How effectively do you manage project resources?',
          description: 'Consider management of budget, time, personnel, and other critical project resources.',
          scale: 'Rate from 1 (poor resource management) to 7 (excellent resource management)'
        },
        {
          key: 'milestone_tracking',
          question: 'How well do you track progress against project milestones?',
          description: 'Consistent progress tracking enables timely adjustments and course corrections throughout the project.',
          scale: 'Rate from 1 (poor tracking) to 7 (excellent milestone tracking)'
        },
        {
          key: 'problem_solving',
          question: 'How effectively do you identify and address project obstacles?',
          description: 'Proactive problem identification and resolution is key to successful project delivery.',
          scale: 'Rate from 1 (reactive approach) to 7 (highly proactive problem-solving)'
        }
      ]
    },
    ethics: {
      title: 'Ethics',
      description: 'Are we providing service while caring for people, the environment, and society?',
      details: 'We have empathy and follow principled guidelines to do the right thing, striving toward the ideal.',
      color: '#8b5cf6',
      questions: [
        {
          key: 'fairness',
          question: 'How fairly do you treat all team members and stakeholders?',
          description: 'Ethical leadership ensures equitable treatment of all parties involved in the project.',
          scale: 'Rate from 1 (unfair treatment) to 7 (consistently fair treatment)'
        },
        {
          key: 'transparency',
          question: 'How transparent are you about decisions and project status?',
          description: 'Transparency in communication builds trust and reduces uncertainty among stakeholders.',
          scale: 'Rate from 1 (not transparent) to 7 (highly transparent)'
        },
        {
          key: 'integrity',
          question: 'How consistently do you demonstrate integrity in your actions?',
          description: 'Integrity in leadership maintains credibility and organizational trust throughout the project.',
          scale: 'Rate from 1 (inconsistent integrity) to 7 (consistently demonstrates integrity)'
        },
        {
          key: 'responsibility',
          question: 'How well do you take responsibility for project outcomes?',
          description: 'Responsible leadership involves owning both project successes and failures.',
          scale: 'Rate from 1 (avoids responsibility) to 7 (consistently takes responsibility)'
        }
      ]
    },
    courage: {
      title: 'Courage',
      description: 'Are we driven by the will to make this project happen?',
      details: 'We have initiative and drive to keep on target while managing anxiety. We take personal responsibility, while being free to make daring choices.',
      color: '#f59e0b',
      questions: [
        {
          key: 'difficult_decisions',
          question: 'How willing are you to make difficult project decisions?',
          description: 'Courage enables leaders to make unpopular but necessary decisions for project success.',
          scale: 'Rate from 1 (avoids difficult decisions) to 7 (consistently makes tough decisions)'
        },
        {
          key: 'risk_taking',
          question: 'How appropriately do you take calculated risks?',
          description: 'Courageous leaders balance caution with necessary risk-taking to advance the project.',
          scale: 'Rate from 1 (risk-averse) to 7 (appropriately takes calculated risks)'
        },
        {
          key: 'innovation',
          question: 'How willing are you to support innovative approaches?',
          description: 'Courage enables leaders to embrace new and untested solutions when appropriate.',
          scale: 'Rate from 1 (resists innovation) to 7 (strongly supports innovation)'
        },
        {
          key: 'persistence',
          question: 'How persistent are you in driving project success despite setbacks?',
          description: 'Courageous leaders persevere through challenges and obstacles to achieve project goals.',
          scale: 'Rate from 1 (gives up easily) to 7 (highly persistent through difficulties)'
        }
      ]
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [currentUser]);

  // Reload data when selected project changes
  useEffect(() => {
    if (selectedProject !== null) {
      loadAssessments();
    }
  }, [selectedProject]);

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
      const projectsData = await apiService.getProjects();
      if (projectsData && projectsData.projects) {
        setProjects(projectsData.projects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      // Don't set error state here as projects might be optional
    }
  };

  const loadAssessments = async () => {
    try {
      // Use the extended API service for leadership assessments
      const params = {};
      if (selectedProject && selectedProject !== 'all') {
        params.project_id = selectedProject;
      }
      
      const assessmentsData = await apiService.getLeadershipAssessments(params);
      if (assessmentsData && assessmentsData.assessments) {
        setAssessments(assessmentsData.assessments);
      }
    } catch (error) {
      console.error('Error loading leadership assessments:', error);
      setError('Failed to load assessments. Please try again.');
    }
  };

  const handleStartAssessment = () => {
    setResponses({});
    setCurrentDimension('vision');
    setSelectedProjectForAssessment('');
    setShowAssessmentForm(true);
  };

  const handleResponseChange = (dimensionKey, questionKey, value) => {
    setResponses(prev => ({
      ...prev,
      [dimensionKey]: {
        ...prev[dimensionKey],
        [questionKey]: parseInt(value)
      }
    }));
  };

  const submitAssessment = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const assessmentData = {
        project_id: selectedProjectForAssessment || null,
        type: 'leadership_diamond',
        responses
      };

      await apiService.submitLeadershipAssessment(assessmentData);
      
      setShowAssessmentForm(false);
      setResponses({});
      setCurrentDimension('vision');
      setSelectedProjectForAssessment('');
      
      // Reload assessments to show the new one
      await loadAssessments();
      
      if (onDataChange) {
        onDataChange();
      }
      
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setError('Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if current dimension is complete
  const isDimensionComplete = (dimensionKey) => {
    const questions = leadershipDiamondFramework[dimensionKey].questions;
    return questions.every(question => {
      return responses[dimensionKey] && responses[dimensionKey][question.key] && 
             responses[dimensionKey][question.key] >= 1 && responses[dimensionKey][question.key] <= 7;
    });
  };

  const canProceed = isDimensionComplete(currentDimension);
  const dimensions = Object.keys(leadershipDiamondFramework);
  const currentDimensionIndex = dimensions.indexOf(currentDimension);
  const isLastDimension = currentDimensionIndex === dimensions.length - 1;

  const handleNextDimension = () => {
    if (canProceed && !isLastDimension) {
      setCurrentDimension(dimensions[currentDimensionIndex + 1]);
    }
  };

  const handlePreviousDimension = () => {
    if (currentDimensionIndex > 0) {
      setCurrentDimension(dimensions[currentDimensionIndex - 1]);
    }
  };

  // Calculate diamond metrics for visualization
  const calculateDiamondMetrics = () => {
    if (!assessments || assessments.length === 0) {
      return {
        vision: 0,
        reality: 0,
        ethics: 0,
        courage: 0,
        overall: 0,
        count: 0
      };
    }

    let filteredAssessments = assessments;
    if (selectedProject !== 'all') {
      filteredAssessments = assessments.filter(assessment => 
        assessment.project_id === parseInt(selectedProject)
      );
    }

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

    // Get the most recent assessment
    const latestAssessment = filteredAssessments.reduce((latest, current) => {
      return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
    });

    return {
      vision: latestAssessment.vision_score || 0,
      reality: latestAssessment.reality_score || 0,
      ethics: latestAssessment.ethics_score || 0,
      courage: latestAssessment.courage_score || 0,
      overall: latestAssessment.overall_score || 0,
      count: filteredAssessments.length
    };
  };

  const getScoreColor = (score) => {
    if (score >= 6) return '#22c55e';
    if (score >= 4) return '#eab308';
    if (score >= 2) return '#f97316';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 6) return 'Excellent';
    if (score >= 4) return 'Good';
    if (score >= 2) return 'Developing';
    return 'Needs Improvement';
  };

  // Render Likert scale slider
  const renderLikertSlider = (dimension, question) => {
    const value = responses[dimension]?.[question.key] || 1;
    
    return (
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ 
            fontSize: '1.1rem', 
            fontWeight: '600', 
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            {question.question}
          </h4>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#6b7280',
            marginBottom: '0.5rem'
          }}>
            {question.description}
          </p>
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#9ca3af',
            fontStyle: 'italic'
          }}>
            {question.scale}
          </p>
        </div>
        
        <div style={{ position: 'relative' }}>
          <input
            type="range"
            min="1"
            max="7"
            value={value}
            onChange={(e) => handleResponseChange(dimension, question.key, e.target.value)}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: `linear-gradient(to right, #ef4444 0%, #f97316 28%, #eab308 57%, #22c55e 100%)`,
              outline: 'none',
              WebkitAppearance: 'none',
              cursor: 'pointer'
            }}
          />
          
          {/* Slider thumb styling */}
          <style jsx>{`
            input[type="range"]::-webkit-slider-thumb {
              appearance: none;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: white;
              border: 2px solid ${leadershipDiamondFramework[dimension].color};
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            input[type="range"]::-moz-range-thumb {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: white;
              border: 2px solid ${leadershipDiamondFramework[dimension].color};
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
          `}</style>
          
          {/* Scale markers */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            {[1, 2, 3, 4, 5, 6, 7].map(num => (
              <span key={num} style={{ 
                fontWeight: value == num ? '600' : '400',
                color: value == num ? leadershipDiamondFramework[dimension].color : '#6b7280'
              }}>
                {num}
              </span>
            ))}
          </div>
          
          {/* Current value display */}
          <div style={{ 
            textAlign: 'center', 
            marginTop: '1rem',
            padding: '0.5rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '0.375rem'
          }}>
            <span style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600',
              color: leadershipDiamondFramework[dimension].color
            }}>
              {value}
            </span>
            <span style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              marginLeft: '0.5rem'
            }}>
              - {getScoreLabel(value)}
            </span>
          </div>
        </div>
      </div>
    );
  };

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

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {/* Diamond SVG */}
          <div style={{ position: 'relative' }}>
            <svg width={size} height={size} style={{ display: 'block' }}>
              {/* Grid lines */}
              {[1, 2, 3, 4, 5, 6, 7].map(level => {
                const gridRadius = (radius * level / 7);
                const gridPoints = {
                  vision: { x: center, y: center - gridRadius },
                  reality: { x: center + gridRadius, y: center },
                  ethics: { x: center, y: center + gridRadius },
                  courage: { x: center - gridRadius, y: center }
                };
                const gridPath = `M ${gridPoints.vision.x},${gridPoints.vision.y} L ${gridPoints.reality.x},${gridPoints.reality.y} L ${gridPoints.ethics.x},${gridPoints.ethics.y} L ${gridPoints.courage.x},${gridPoints.courage.y} Z`;
                
                return (
                  <path
                    key={level}
                    d={gridPath}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    opacity={level % 2 === 0 ? 0.5 : 0.3}
                  />
                );
              })}
              
              {/* Axis lines */}
              <line x1={center} y1="20" x2={center} y2={size - 20} stroke="#d1d5db" strokeWidth="1" />
              <line x1="20" y1={center} x2={size - 20} y2={center} stroke="#d1d5db" strokeWidth="1" />
              
              {/* Data polygon */}
              <path
                d={pathData}
                fill={`rgba(59, 130, 246, 0.3)`}
                stroke="#3b82f6"
                strokeWidth="2"
              />
              
              {/* Data points */}
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
              
              {/* Labels */}
              <text x={center} y="15" textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151">Vision</text>
              <text x={size - 10} y={center + 5} textAnchor="end" fontSize="12" fontWeight="600" fill="#374151">Reality</text>
              <text x={center} y={size - 5} textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151">Ethics</text>
              <text x="10" y={center + 5} textAnchor="start" fontSize="12" fontWeight="600" fill="#374151">Courage</text>
            </svg>
          </div>

          {/* Metrics display */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {Object.entries(leadershipDiamondFramework).map(([key, dimension]) => (
                <div key={key} style={{
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <h4 style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: dimension.color,
                      margin: 0
                    }}>
                      {dimension.title}
                    </h4>
                    <span style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: getScoreColor(metrics[key])
                    }}>
                      {metrics[key].toFixed(1)}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(metrics[key] / 7) * 100}%`,
                      backgroundColor: dimension.color,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    {getScoreLabel(metrics[key])}
                  </span>
                </div>
              ))}
            </div>
            
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: getScoreColor(metrics.overall)
              }}>
                {metrics.overall.toFixed(1)}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                Overall Leadership Score
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <Loader size={48} className="animate-spin" color="#3b82f6" />
        <p style={{ color: '#6b7280' }}>Loading leadership data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#111827',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Award size={32} color="#3b82f6" />
            Leadership Diamond
          </h2>
          <p style={{
            fontSize: '1rem',
            color: '#6b7280',
            margin: '0.5rem 0 0 0'
          }}>
            Assess your leadership across Vision, Reality, Ethics, and Courage
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setShowHistoryModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            <History size={16} />
            View History
          </button>
          
          <button
            onClick={handleStartAssessment}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            New Assessment
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          color: '#dc2626',
          marginBottom: '2rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Leadership Diamond Visualization */}
        {renderDiamond()}

        {/* Recent Assessments */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '1.5rem'
          }}>
            Recent Assessments
          </h3>
          
          {assessments.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <Award size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>No assessments yet. Take your first Leadership Diamond assessment!</p>
              <button
                onClick={handleStartAssessment}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                Start Assessment
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {assessments.slice(0, 5).map(assessment => (
                <div key={assessment.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '500',
                      color: '#111827'
                    }}>
                      {assessment.project_title || 'General Assessment'}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {new Date(assessment.created_at).toLocaleDateString()} • 
                      Overall Score: {assessment.overall_score?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: getScoreColor(assessment.vision_score),
                      color: 'white',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}>
                      V: {assessment.vision_score?.toFixed(1) || 'N/A'}
                    </div>
                    <div style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: getScoreColor(assessment.reality_score),
                      color: 'white',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}>
                      R: {assessment.reality_score?.toFixed(1) || 'N/A'}
                    </div>
                    <div style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: getScoreColor(assessment.ethics_score),
                      color: 'white',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}>
                      E: {assessment.ethics_score?.toFixed(1) || 'N/A'}
                    </div>
                    <div style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: getScoreColor(assessment.courage_score),
                      color: 'white',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}>
                      C: {assessment.courage_score?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Leadership Diamond Assessment
              </h3>
              <button
                onClick={() => setShowAssessmentForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              marginBottom: '2rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.5rem',
              padding: '0.25rem'
            }}>
              {dimensions.map((dimension, index) => (
                <div
                  key={dimension}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    borderRadius: '0.375rem',
                    backgroundColor: index <= currentDimensionIndex ? leadershipDiamondFramework[dimension].color : 'transparent',
                    color: index <= currentDimensionIndex ? 'white' : '#6b7280',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {leadershipDiamondFramework[dimension].title}
                </div>
              ))}
            </div>

            {/* Project selection (only shown on first dimension) */}
            {currentDimension === 'vision' && (
              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Project (Optional)
                </label>
                <select
                  value={selectedProjectForAssessment}
                  onChange={(e) => setSelectedProjectForAssessment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">No specific project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Current dimension */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '60px',
                  backgroundColor: leadershipDiamondFramework[currentDimension].color,
                  borderRadius: '2px'
                }} />
                <div>
                  <h4 style={{
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: leadershipDiamondFramework[currentDimension].color,
                    margin: 0
                  }}>
                    {leadershipDiamondFramework[currentDimension].title}
                  </h4>
                  <p style={{
                    fontSize: '1rem',
                    color: '#374151',
                    margin: '0.5rem 0',
                    fontWeight: '500'
                  }}>
                    {leadershipDiamondFramework[currentDimension].description}
                  </p>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    fontStyle: 'italic'
                  }}>
                    {leadershipDiamondFramework[currentDimension].details}
                  </p>
                </div>
              </div>

              {/* Questions for current dimension */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {leadershipDiamondFramework[currentDimension].questions.map(question => 
                  renderLikertSlider(currentDimension, question)
                )}
              </div>
            </div>

            {/* Navigation buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #e5e7eb',
              paddingTop: '1.5rem'
            }}>
              <button
                onClick={handlePreviousDimension}
                disabled={currentDimensionIndex === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: currentDimensionIndex === 0 ? '#f3f4f6' : 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  color: currentDimensionIndex === 0 ? '#9ca3af' : '#374151',
                  cursor: currentDimensionIndex === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span style={{ 
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                {currentDimensionIndex + 1} of {dimensions.length}
              </span>

              {isLastDimension ? (
                <button
                  onClick={submitAssessment}
                  disabled={!canProceed || submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: canProceed && !submitting ? '#22c55e' : '#f3f4f6',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: canProceed && !submitting ? 'white' : '#9ca3af',
                    cursor: canProceed && !submitting ? 'pointer' : 'not-allowed',
                    fontWeight: '500'
                  }}
                >
                  {submitting ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {submitting ? 'Submitting...' : 'Submit Assessment'}
                </button>
              ) : (
                <button
                  onClick={handleNextDimension}
                  disabled={!canProceed}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: canProceed ? '#3b82f6' : '#f3f4f6',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: canProceed ? 'white' : '#9ca3af',
                    cursor: canProceed ? 'pointer' : 'not-allowed',
                    fontWeight: '500'
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              )}
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
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '900px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Assessment History
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {assessments.map(assessment => (
                <div key={assessment.id} style={{
                  padding: '1.5rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <h4 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 0.5rem 0'
                      }}>
                        {assessment.project_title || 'General Assessment'}
                      </h4>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        margin: 0
                      }}>
                        Completed on {new Date(assessment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: getScoreColor(assessment.overall_score)
                    }}>
                      {assessment.overall_score?.toFixed(1) || 'N/A'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#3b82f6'
                      }}>
                        {assessment.vision_score?.toFixed(1) || 'N/A'}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        Vision
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#10b981'
                      }}>
                        {assessment.reality_score?.toFixed(1) || 'N/A'}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        Reality
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#8b5cf6'
                      }}>
                        {assessment.ethics_score?.toFixed(1) || 'N/A'}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        Ethics
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#f59e0b'
                      }}>
                        {assessment.courage_score?.toFixed(1) || 'N/A'}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        Courage
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadershipTab;