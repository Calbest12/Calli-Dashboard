// frontend/src/components/OrganizationalChangeManagementTab.jsx
import React, { useState, useEffect } from 'react';
import { Target, History, Plus, Eye, BarChart3, AlertCircle, Filter, TrendingUp } from 'lucide-react';

const OrganizationalChangeManagementTab = ({ currentUser, apiService, onDataChange }) => {
  const [assessments, setAssessments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAssessmentDetails, setSelectedAssessmentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Chart visibility controls
  const [chartVisibility, setChartVisibility] = useState({
    vision: true,
    reality: true,
    ethics: true,
    courage: true
  });
  
  // Form state for multi-step Organizational Change Management assessment
  const [responses, setResponses] = useState({});
  const [currentDimension, setCurrentDimension] = useState('vision');

  // Organizational Change Management Assessment framework
  const organizationalChangeFramework = {
    vision: {
      title: 'Vision',
      description: 'Your ability to create and communicate clear organizational direction during change',
      questions: [
        {
          key: 'change_clarity',
          question: 'How clear and compelling is your change vision?',
          description: 'A strong change vision provides clear direction and inspires commitment',
          scale: 'Rate from 1 (very unclear) to 7 (exceptionally clear and compelling)'
        },
        {
          key: 'stakeholder_communication',
          question: 'How effectively do you communicate the change vision to stakeholders?',
          description: 'Consider frequency, clarity, and methods of change communication',
          scale: 'Rate from 1 (rarely communicated) to 7 (consistently and effectively communicated)'
        },
        {
          key: 'organizational_alignment',
          question: 'How well does your change vision align with organizational strategy?',
          description: 'Strong alignment ensures coherent direction across all levels',
          scale: 'Rate from 1 (misaligned) to 7 (perfectly aligned)'
        },
        {
          key: 'change_inspiration',
          question: 'How inspiring and motivating is your change vision to the organization?',
          description: 'An inspiring change vision energizes people and drives commitment',
          scale: 'Rate from 1 (not inspiring) to 7 (highly inspiring and motivating)'
        }
      ]
    },
    reality: {
      title: 'Reality',
      description: 'Your effectiveness in assessing current state and managing change implementation',
      questions: [
        {
          key: 'current_assessment',
          question: 'How accurately do you assess the current organizational state?',
          description: 'Realistic assessment is crucial for effective change planning',
          scale: 'Rate from 1 (poor assessment) to 7 (highly accurate assessment)'
        },
        {
          key: 'resource_management',
          question: 'How effectively do you manage resources during change?',
          description: 'Consider budget, time, personnel, and other organizational resources',
          scale: 'Rate from 1 (poor resource management) to 7 (excellent resource management)'
        },
        {
          key: 'milestone_tracking',
          question: 'How well do you track progress against change milestones?',
          description: 'Consistent tracking enables timely adjustments and course corrections',
          scale: 'Rate from 1 (poor tracking) to 7 (excellent milestone tracking)'
        },
        {
          key: 'obstacle_identification',
          question: 'How effectively do you identify and address change obstacles?',
          description: 'Proactive obstacle management is key to successful change implementation',
          scale: 'Rate from 1 (reactive approach) to 7 (highly proactive obstacle management)'
        }
      ]
    },
    ethics: {
      title: 'Ethics',
      description: 'Your commitment to ethical principles and fairness during organizational change',
      questions: [
        {
          key: 'stakeholder_fairness',
          question: 'How fairly do you treat all stakeholders during change?',
          description: 'Ethical change management ensures equitable treatment of all affected parties',
          scale: 'Rate from 1 (unfair treatment) to 7 (consistently fair treatment)'
        },
        {
          key: 'transparency',
          question: 'How transparent are you about change impacts and decisions?',
          description: 'Transparency builds trust and reduces resistance to change',
          scale: 'Rate from 1 (not transparent) to 7 (highly transparent)'
        },
        {
          key: 'ethical_decisions',
          question: 'How consistently do you make ethical decisions during change?',
          description: 'Ethical decision-making maintains organizational integrity',
          scale: 'Rate from 1 (inconsistent ethics) to 7 (consistently ethical)'
        },
        {
          key: 'social_responsibility',
          question: 'How well do you consider broader social impacts of change?',
          description: 'Responsible change management considers community and societal effects',
          scale: 'Rate from 1 (no consideration) to 7 (strong social responsibility)'
        }
      ]
    },
    courage: {
      title: 'Courage',
      description: 'Your willingness to make difficult decisions and drive necessary change',
      questions: [
        {
          key: 'difficult_decisions',
          question: 'How willing are you to make difficult change decisions?',
          description: 'Change often requires courage to make unpopular but necessary decisions',
          scale: 'Rate from 1 (avoids difficult decisions) to 7 (consistently makes tough decisions)'
        },
        {
          key: 'resistance_management',
          question: 'How effectively do you address resistance to change?',
          description: 'Managing resistance requires courage and skilled communication',
          scale: 'Rate from 1 (avoids resistance) to 7 (effectively addresses resistance)'
        },
        {
          key: 'innovation_support',
          question: 'How willing are you to support innovative approaches during change?',
          description: 'Courage enables leaders to embrace new and untested solutions',
          scale: 'Rate from 1 (risk-averse) to 7 (strongly supports innovation)'
        },
        {
          key: 'change_persistence',
          question: 'How persistent are you in driving change despite setbacks?',
          description: 'Successful change requires courage to persist through challenges',
          scale: 'Rate from 1 (gives up easily) to 7 (highly persistent)'
        }
      ]
    }
  };

  useEffect(() => {
    loadAssessments();
    loadProjects();
  }, []);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading organizational change management assessments...');
      
      const response = await apiService.getOrganizationalChangeAssessments();
      
      if (response && response.success) {
        console.log('✅ Organizational change assessments loaded:', response.assessments);
        setAssessments(response.assessments || []);
      } else {
        console.warn('⚠️ Organizational change assessments loading response:', response);
        setAssessments([]);
      }
    } catch (error) {
      console.error('❌ Failed to load organizational change assessments:', error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      console.log('📊 Loading projects for filtering...');
      
      const response = await apiService.getAllProjects();
      
      if (response && response.success) {
        console.log('✅ Projects loaded:', response.data);
        setProjects(response.data || []);
      } else {
        console.warn('⚠️ Projects loading response:', response);
        setProjects([]);
      }
    } catch (error) {
      console.error('❌ Failed to load projects:', error);
      setProjects([]);
    }
  };

  const calculateAverageScores = () => {
    const filteredAssessments = selectedProject === 'all' 
      ? assessments 
      : assessments.filter(assessment => assessment.project_id === parseInt(selectedProject));

    if (filteredAssessments.length === 0) {
      return {
        vision: 0,
        reality: 0,
        ethics: 0,
        courage: 0,
        overall: 0
      };
    }

    const totals = { vision: 0, reality: 0, ethics: 0, courage: 0 };
    const counts = { vision: 0, reality: 0, ethics: 0, courage: 0 };

    filteredAssessments.forEach(assessment => {
      Object.keys(totals).forEach(dimension => {
        if (assessment[dimension] && assessment[dimension] > 0) {
          totals[dimension] += assessment[dimension];
          counts[dimension]++;
        }
      });
    });

    const averages = {};
    Object.keys(totals).forEach(dimension => {
      averages[dimension] = counts[dimension] > 0 ? totals[dimension] / counts[dimension] : 0;
    });

    const overall = Object.values(averages).reduce((sum, val) => sum + val, 0) / 4;

    return {
      ...averages,
      overall
    };
  };

  const handleSubmitAssessment = async (projectId, responses, notes = '') => {
    try {
      console.log('📝 Submitting organizational change assessment:', { projectId, responses, notes });

      // Calculate dimension scores
      const dimensionScores = {};
      Object.keys(organizationalChangeFramework).forEach(dimension => {
        const dimensionQuestions = organizationalChangeFramework[dimension].questions;
        let total = 0;
        let count = 0;
        
        dimensionQuestions.forEach(question => {
          if (responses[question.key] && responses[question.key] > 0) {
            total += responses[question.key];
            count++;
          }
        });
        
        dimensionScores[dimension] = count > 0 ? total / count : 0;
      });

      const assessmentData = {
        project_id: projectId,
        user_id: currentUser.id,
        vision: dimensionScores.vision,
        reality: dimensionScores.reality,
        ethics: dimensionScores.ethics,
        courage: dimensionScores.courage,
        responses: responses,
        notes: notes,
        assessment_type: 'organizational_change_management'
      };

      const response = await apiService.submitOrganizationalChangeAssessment(assessmentData);

      if (response && response.success) {
        console.log('✅ Organizational change assessment submitted successfully');
        await loadAssessments();
        setShowAssessmentForm(false);
        setResponses({});
        setCurrentDimension('vision');

        if (onDataChange) {
          onDataChange();
        }
      } else {
        throw new Error(response?.error || 'Failed to submit assessment');
      }
    } catch (error) {
      console.error('❌ Failed to submit organizational change assessment:', error);
      throw error;
    }
  };

  const averageScores = calculateAverageScores();
  const filteredAssessments = selectedProject === 'all' 
    ? assessments 
    : assessments.filter(assessment => assessment.project_id === parseInt(selectedProject));

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading organizational change management data...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              Organizational Change Management
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1.125rem', margin: 0 }}>
              Full summary of all averages across projects and teams
            </p>
          </div>

          <button
            onClick={() => setShowAssessmentForm(true)}
            style={{
              background: 'linear-gradient(to right, #7c3aed, #5b21b6)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px rgba(124, 58, 237, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={20} />
            New Assessment
          </button>
        </div>

        {/* Project Filter */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: '#6b7280' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                Filter by Project:
              </span>
            </div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: 'white',
                minWidth: '200px'
              }}
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Showing {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Diamond Chart and Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          {/* Bar Chart Visualization */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
              Organizational Change Management Overview
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries({
                vision: { label: 'Vision', color: '#3b82f6' },
                reality: { label: 'Reality', color: '#10b981' },
                ethics: { label: 'Ethics', color: '#f59e0b' },
                courage: { label: 'Courage', color: '#ef4444' }
              }).map(([key, config]) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                      {config.label}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#111827' }}>
                      {averageScores[key].toFixed(1)}/7
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(averageScores[key] / 7) * 100}%`,
                      height: '100%',
                      backgroundColor: config.color,
                      borderRadius: '6px',
                      transition: 'width 0.8s ease-out'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Statistics */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
              Summary Statistics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries({
                vision: { label: 'Vision', color: '#3b82f6' },
                reality: { label: 'Reality', color: '#10b981' },
                ethics: { label: 'Ethics', color: '#f59e0b' },
                courage: { label: 'Courage', color: '#ef4444' }
              }).map(([key, config]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
                    {config.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '80px',
                      height: '6px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(averageScores[key] / 7) * 100}%`,
                        height: '100%',
                        backgroundColor: config.color,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      color: '#111827',
                      minWidth: '40px',
                      textAlign: 'right'
                    }}>
                      {averageScores[key].toFixed(1)}/7
                    </span>
                  </div>
                </div>
              ))}
              
              <div style={{ 
                borderTop: '1px solid #e5e7eb', 
                paddingTop: '1rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ fontSize: '1rem', color: '#111827', fontWeight: '600' }}>
                  Overall Average
                </span>
                <span style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '700', 
                  color: '#7c3aed',
                  backgroundColor: '#f3e8ff',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px'
                }}>
                  {averageScores.overall.toFixed(1)}/7
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Assessment History */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Recent Assessments
            </h3>
            <button
              onClick={() => setShowHistoryModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#374151',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <History size={16} />
              View All
            </button>
          </div>

          {filteredAssessments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#6b7280' }}>
              <BarChart3 size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
              <p style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                No assessments yet
              </p>
              <p style={{ fontSize: '0.875rem', margin: 0 }}>
                {selectedProject === 'all' 
                  ? 'Start by creating your first organizational change assessment'
                  : 'No assessments for the selected project'
                }
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredAssessments.slice(0, 5).map((assessment, index) => (
                <AssessmentCard
                  key={assessment.id || index}
                  assessment={assessment}
                  project={projects.find(p => p.id === assessment.project_id)}
                  onClick={() => setSelectedAssessmentDetails(assessment)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Assessment Form Modal */}
        {showAssessmentForm && (
          <AssessmentFormModal
            isOpen={showAssessmentForm}
            onClose={() => {
              setShowAssessmentForm(false);
              setResponses({});
              setCurrentDimension('vision');
            }}
            onSubmit={handleSubmitAssessment}
            framework={organizationalChangeFramework}
            projects={projects}
            responses={responses}
            setResponses={setResponses}
            currentDimension={currentDimension}
            setCurrentDimension={setCurrentDimension}
          />
        )}

        {/* History Modal */}
        {showHistoryModal && (
          <HistoryModal
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            assessments={filteredAssessments}
            projects={projects}
            onAssessmentSelect={setSelectedAssessmentDetails}
          />
        )}

        {/* Assessment Details Modal */}
        {selectedAssessmentDetails && (
          <AssessmentDetailsModal
            isOpen={!!selectedAssessmentDetails}
            onClose={() => setSelectedAssessmentDetails(null)}
            assessment={selectedAssessmentDetails}
            project={projects.find(p => p.id === selectedAssessmentDetails.project_id)}
            framework={organizationalChangeFramework}
          />
        )}
      </div>
    </div>
  );
};

// Helper components (simplified versions)
const AssessmentCard = ({ assessment, project, onClick }) => (
  <div 
    onClick={onClick}
    style={{
      padding: '1rem',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      backgroundColor: '#fafafa',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
          {project?.name || 'Unknown Project'}
        </h4>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
          {new Date(assessment.created_at || assessment.submission_date).toLocaleDateString()}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {['vision', 'reality', 'ethics', 'courage'].map(dimension => (
          <div key={dimension} style={{
            width: '8px',
            height: '40px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            position: 'relative'
          }}>
            <div style={{
              width: '100%',
              height: `${(assessment[dimension] || 0) / 7 * 100}%`,
              backgroundColor: getDimensionColor(dimension),
              borderRadius: '4px',
              position: 'absolute',
              bottom: 0
            }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const getDimensionColor = (dimension) => {
  const colors = {
    vision: '#3b82f6',
    reality: '#10b981',
    ethics: '#f59e0b',
    courage: '#ef4444'
  };
  return colors[dimension] || '#6b7280';
};

// Placeholder modal components
const AssessmentFormModal = ({ isOpen, onClose, onSubmit, framework, projects, responses, setResponses, currentDimension, setCurrentDimension }) => {
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        padding: '2rem'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
          New Organizational Change Assessment
        </h2>
        <p>Assessment form would be implemented here with project selection and multi-step questions.</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button onClick={onClose} style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}>
            Cancel
          </button>
          <button onClick={() => onSubmit(projects[0]?.id || 1, responses, '')} style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

const HistoryModal = ({ isOpen, onClose, assessments, projects, onAssessmentSelect }) => {
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflow: 'auto',
        padding: '2rem'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
          Assessment History
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {assessments.map((assessment, index) => (
            <AssessmentCard
              key={assessment.id || index}
              assessment={assessment}
              project={projects.find(p => p.id === assessment.project_id)}
              onClick={() => {
                onAssessmentSelect(assessment);
                onClose();
              }}
            />
          ))}
        </div>
        <button 
          onClick={onClose}
          style={{
            marginTop: '2rem',
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const AssessmentDetailsModal = ({ isOpen, onClose, assessment, project, framework }) => {
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        padding: '2rem'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
          Assessment Details
        </h2>
        <p><strong>Project:</strong> {project?.name || 'Unknown Project'}</p>
        <p><strong>Date:</strong> {new Date(assessment.created_at || assessment.submission_date).toLocaleDateString()}</p>
        <div style={{ marginTop: '1rem' }}>
          <h4>Scores:</h4>
          {['vision', 'reality', 'ethics', 'courage'].map(dimension => (
            <p key={dimension}>
              <strong>{dimension.charAt(0).toUpperCase() + dimension.slice(1)}:</strong> {assessment[dimension] || 0}/7
            </p>
          ))}
        </div>
        <button 
          onClick={onClose}
          style={{
            marginTop: '2rem',
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default OrganizationalChangeManagementTab;