// frontend/src/components/IIncTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Compass, Star, MessageCircle, Lightbulb, Target, Plus, Eye, 
  Calendar, User, ArrowRight, CheckCircle, Clock, TrendingUp,
  FileText, Award, Brain, Heart, Zap, AlertCircle
} from 'lucide-react';

const IIncTab = ({ currentUser, apiService, onDataChange }) => {
  const [responses, setResponses] = useState({});
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [allTeamSubmissions, setAllTeamSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [currentModule, setCurrentModule] = useState(null); // Changed to null for overview by default
  const [formData, setFormData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeView, setActiveView] = useState('overview'); // Added view state

  // I, Inc. Framework Structure
  const iIncModules = {
    passion: {
      title: 'Explore Your Passion',
      icon: Heart,
      color: '#e11d48',
      description: 'Discover what drives you and builds your foundation for success',
      sections: [
        {
          key: 'skills_knowledge',
          title: 'Skills and Knowledge',
          question: 'What do you need to do in order to be successful? What do you need to practice, to do it at a level of performance that will be desirable to a given employer?',
          placeholder: 'Describe the specific skills, knowledge areas, and competencies you need to develop...'
        },
        {
          key: 'track_record',
          title: 'Track Record',
          question: 'What instance can you describe when you have demonstrated the ability to perform?',
          placeholder: 'Provide specific examples of your past achievements and successful performances...'
        },
        {
          key: 'relationships',
          title: 'Relationships',
          question: 'What kind of values do you share with other people in the organization?',
          placeholder: 'Describe the values that connect you with colleagues and organizational culture...'
        }
      ]
    },
    sweetspot: {
      title: 'Find Your Career Sweet Spot',
      icon: Star,
      color: '#0ea5e9',
      description: 'Identify your unique position and value in the marketplace',
      sections: [
        {
          key: 'personal_brand',
          title: 'Personal Brand',
          question: 'What key words describe yourself?',
          placeholder: 'List the key words and phrases that best describe your professional identity...'
        },
        {
          key: 'value_proposition',
          title: 'Value Proposition',
          question: 'What "super powers" do you have that help describe the value you bring to an employer?',
          placeholder: 'Describe your unique strengths and capabilities that set you apart...'
        },
        {
          key: 'underserved_need',
          title: 'Underserved Need',
          question: 'What have you found that is not served as much as it can be? (people or customers or business)',
          placeholder: 'Identify gaps in the market or organization that you could address...'
        }
      ]
    },
    story: {
      title: 'Tell Your Story',
      icon: MessageCircle,
      color: '#10b981',
      description: 'Craft your narrative to communicate your value effectively',
      sections: [
        {
          key: 'compelling',
          title: 'Compelling',
          question: 'What are you doing that helps you overcome challenges?',
          placeholder: 'Describe your approach to overcoming obstacles and driving results...'
        },
        {
          key: 'valuable',
          title: 'Valuable',
          question: 'What phrase helps you describe the value you bring to an employer or the marketplace?',
          placeholder: 'Craft a concise statement of your professional value proposition...'
        },
        {
          key: 'engaging',
          title: 'Engaging',
          question: 'What are you bringing that is valuable and consistent with your authentic self?',
          placeholder: 'Explain how your authentic qualities create value for others...'
        }
      ]
    },
    entrepreneurial: {
      title: 'Entrepreneurial Mindset',
      icon: Lightbulb,
      color: '#8b5cf6',
      description: 'Develop the mindset to adapt, grow, and thrive in your career',
      sections: [
        {
          key: 'survive',
          title: 'Survive',
          question: 'What can you do to take care of yourself? What will help you keep a good outlook?',
          placeholder: 'Describe your strategies for maintaining resilience and well-being...'
        },
        {
          key: 'adapt',
          title: 'Adapt',
          question: 'What changes (technology, competition, processes) can you embrace? (Strive to be open, and above all else, remain authentic to who you are.)',
          placeholder: 'Identify areas where you can embrace change while staying true to yourself...'
        },
        {
          key: 'flourish',
          title: 'Flourish',
          question: 'What plans do you need to put in place so that you can be more open to positive opportunities?',
          placeholder: 'Outline your strategy for positioning yourself for growth and success...'
        }
      ]
    },
    entrepreneurial: {
      title: 'Entrepreneurial Mindset',
      icon: Lightbulb,
      color: '#8b5cf6',
      description: 'Develop the mindset to adapt, grow, and thrive in your career',
      sections: [
        {
          key: 'survive',
          title: 'Survive',
          question: 'What can you do to take care of yourself? What will help you keep a good outlook?',
          placeholder: 'Describe your strategies for maintaining resilience and well-being...'
        },
        {
          key: 'adapt',
          title: 'Adapt',
          question: 'What changes (technology, competition, processes) can you embrace? (Strive to be open, and above all else, remain authentic to who you are.)',
          placeholder: 'Identify areas where you can embrace change while staying true to yourself...'
        },
        {
          key: 'flourish',
          title: 'Flourish',
          question: 'What plans do you need to put in place so that you can be more open to positive opportunities?',
          placeholder: 'Outline your strategy for positioning yourself for growth and success...'
        },
        {
          key: 'goals',
          title: 'Goals',
          question: 'What are you finding you would like to do with your career? Your life?',
          placeholder: 'Define what you would like to achieve in your career and life...'
        }
      ]
    }
  };

  const moduleOrder = ['passion', 'sweetspot', 'story', 'entrepreneurial'];

  useEffect(() => {
    loadIIncData();
  }, [currentUser?.id]);

  const loadIIncData = async () => {
    if (!currentUser?.id || !apiService) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load current user's responses
      const responsesResult = await apiService.get(`/api/career/iinc-responses/${currentUser.id}`);
      if (responsesResult.success) {
        setResponses(responsesResult.data || {});
      }

      // Load current user's submission history
      const historyResult = await apiService.get(`/api/career/iinc-history/${currentUser.id}`);
      if (historyResult.success) {
        setSubmissionHistory(historyResult.data || []);
      }

      // If executive leader, also load all team submissions
      if (currentUser.role === 'Executive Leader') {
        const teamSubmissionsResult = await apiService.get('/api/career/iinc-summary');
        if (teamSubmissionsResult.success) {
          setAllTeamSubmissions(teamSubmissionsResult.data || []);
        }
      }

    } catch (error) {
      console.error('Error loading I, Inc. data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResponse = async (moduleKey, sectionKey, value) => {
    if (!currentUser?.id || !apiService) return;

    try {
      const updatedResponses = {
        ...responses,
        [moduleKey]: {
          ...responses[moduleKey],
          [sectionKey]: value
        }
      };

      const result = await apiService.post('/api/career/iinc-responses', {
        user_id: currentUser.id,
        responses: updatedResponses,
        module_key: moduleKey,
        section_key: sectionKey
      });

      if (result.success) {
        setResponses(updatedResponses);
        if (onDataChange) onDataChange();
      }
    } catch (error) {
      console.error('Error saving I, Inc. response:', error);
    }
  };

  const handleSubmitCompleteAssessment = async () => {
    if (!currentUser?.id || !apiService) return;

    try {
      setSaveLoading(true);
      
      // Calculate completion status
      const totalSections = 13;
      let completedSections = 0;
      
      Object.values(responses).forEach(moduleResponses => {
        if (moduleResponses && typeof moduleResponses === 'object') {
          Object.values(moduleResponses).forEach(response => {
            if (response && response.trim().length > 0) {
              completedSections++;
            }
          });
        }
      });

      const completionPercentage = Math.round((completedSections / totalSections) * 100);
      
      if (completionPercentage < 25) {
        alert('Please complete at least 25% of the assessment before submitting.');
        setSaveLoading(false);
        return;
      }

      if (!window.confirm(`Submit your I, Inc. assessment? You have completed ${completionPercentage}% of the assessment. You can continue editing after submission.`)) {
        setSaveLoading(false);
        return;
      }

      const result = await apiService.post('/api/career/iinc-submit', {
        user_id: currentUser.id,
        responses: responses,
        completion_percentage: completionPercentage
      });

      if (result.success) {
        alert(`Assessment submitted successfully! Completion: ${completionPercentage}%`);
        await loadIIncData(); // Reload data to show new submission
        if (onDataChange) onDataChange();
      } else {
        alert(result.error || 'Failed to submit assessment');
      }
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Error submitting assessment. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const getCompletionPercentage = (moduleKey) => {
    const moduleResponses = responses[moduleKey] || {};
    const sections = iIncModules[moduleKey].sections;
    const completedSections = sections.filter(section => 
      moduleResponses[section.key] && moduleResponses[section.key].trim().length > 0
    ).length;
    return Math.round((completedSections / sections.length) * 100);
  };

  const getTotalCompletionPercentage = () => {
    const totalSections = Object.values(iIncModules).reduce((total, module) => total + module.sections.length, 0);
    const completedSections = Object.keys(iIncModules).reduce((total, moduleKey) => {
      const moduleResponses = responses[moduleKey] || {};
      return total + iIncModules[moduleKey].sections.filter(section => 
        moduleResponses[section.key] && moduleResponses[section.key].trim().length > 0
      ).length;
    }, 0);
    return Math.round((completedSections / totalSections) * 100);
  };

  const renderOverviewContent = () => (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#1f2937', 
          margin: '0 0 8px 0' 
        }}>
          I, Inc. Career Development Framework
        </h2>
        <p style={{ 
          color: '#6b7280', 
          margin: 0,
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          Develop and execute your authentic career acceleration plan through our comprehensive framework.
        </p>
      </div>

      {/* Framework Introduction */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#1f2937', 
          margin: '0 0 16px 0' 
        }}>
          Framework Overview
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <p style={{ color: '#374151', margin: '0 0 16px 0', lineHeight: '1.6' }}>
              The I, Inc. framework helps you take ownership of your career development through four key areas of focus:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(iIncModules).map(([key, module]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    backgroundColor: `${module.color}15`,
                    padding: '8px',
                    borderRadius: '8px'
                  }}>
                    <module.icon style={{ color: module.color }} size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                      {module.title}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '12px' }}>
                      {module.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#1f2937', 
              margin: '0 0 12px 0' 
            }}>
              Getting Started
            </h4>
            <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
              <p style={{ margin: '0 0 12px 0' }}>
                Navigate to <strong>My Assessment</strong> to begin working through each module at your own pace.
              </p>
              <p style={{ margin: '0 0 12px 0' }}>
                Your responses are automatically saved as you type and are visible to yourself and executive leadership.
              </p>
              {currentUser?.role === 'Executive Leader' && (
                <p style={{ margin: '0', fontStyle: 'italic' }}>
                  As an Executive Leader, you can view team progress in the <strong>Team Overview</strong> tab.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Progress Summary */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <Award style={{ color: '#3b82f6', marginRight: '8px' }} size={20} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            Your Progress: {getTotalCompletionPercentage()}%
          </h3>
        </div>
        
        <div style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          height: '8px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <div style={{
            backgroundColor: '#3b82f6',
            height: '100%',
            width: `${getTotalCompletionPercentage()}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {Object.entries(iIncModules).map(([key, module]) => {
            const completion = getCompletionPercentage(key);
            return (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <module.icon style={{ color: module.color }} size={16} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    {module.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {completion}% complete
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {getTotalCompletionPercentage() > 0 && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setActiveView('myassessment')}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Continue Assessment
            </button>
          </div>
        )}
        
        {getTotalCompletionPercentage() === 0 && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setActiveView('myassessment')}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Start Your Assessment
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderTeamOverview = () => (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#1f2937', 
          margin: '0 0 8px 0' 
        }}>
          Team I, Inc. Assessments
        </h2>
        <p style={{ 
          color: '#6b7280', 
          margin: 0,
          fontSize: '16px'
        }}>
          Overview of all team member career development assessments
        </p>
      </div>

      {/* Team Submissions */}
      {allTeamSubmissions.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <FileText style={{ color: '#6b7280', margin: '0 auto 16px auto' }} size={48} />
          <h3 style={{ color: '#374151', margin: '0 0 8px 0' }}>No Team Assessments Yet</h3>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Team members haven't started their I, Inc. assessments yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {allTeamSubmissions.map((submission) => (
            <div
              key={submission.user_id}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      backgroundColor: '#3b82f615',
                      padding: '8px',
                      borderRadius: '8px'
                    }}>
                      <Heart style={{ color: '#3b82f6' }} size={16} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                        {submission.user_name}
                      </h4>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                        {submission.user_role} • {submission.user_email}
                      </p>
                    </div>
                  </div>
                  
                  {submission.latest_submission && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#374151' }}>
                          Latest Assessment: {submission.latest_submission.completion_percentage}% complete
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {new Date(submission.latest_submission.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div style={{
                        backgroundColor: '#f3f4f6',
                        borderRadius: '4px',
                        height: '6px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          backgroundColor: submission.latest_submission.completion_percentage >= 75 ? '#10b981' : 
                                         submission.latest_submission.completion_percentage >= 50 ? '#f59e0b' : '#3b82f6',
                          height: '100%',
                          width: `${submission.latest_submission.completion_percentage}%`,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )}
                  
                  {!submission.latest_submission && (
                    <div style={{
                      backgroundColor: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      marginBottom: '12px'
                    }}>
                      <span style={{ fontSize: '12px', color: '#92400e' }}>
                        No assessments completed yet
                      </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <button
                    onClick={() => {
                      // Navigate to view this user's detailed responses
                      // This would require additional implementation
                      console.log('View details for user:', submission.user_id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#374151'
                    }}
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderModuleOverview = () => (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px' 
      }}>
        <div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#1f2937', 
            margin: '0 0 8px 0' 
          }}>
            I, Inc. Career Development Framework
          </h2>
          <p style={{ 
            color: '#6b7280', 
            margin: 0,
            fontSize: '16px'
          }}>
            Develop and execute your authentic career acceleration plan
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSubmitCompleteAssessment}
            disabled={saveLoading || getTotalCompletionPercentage() === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: getTotalCompletionPercentage() >= 25 ? '#10b981' : '#9ca3af',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: getTotalCompletionPercentage() >= 25 && !saveLoading ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              opacity: saveLoading ? 0.7 : 1
            }}
          >
            <CheckCircle size={16} />
            {saveLoading ? 'Submitting...' : 'Submit Assessment'}
          </button>
          
          <button
            onClick={() => setShowAssessmentForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <Plus size={16} />
            New Assessment
          </button>
        </div>
      </div>

      {/* Progress Summary */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Award style={{ color: '#3b82f6', marginRight: '8px' }} size={20} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Overall Progress: {getTotalCompletionPercentage()}%
            </h3>
          </div>
          
          {/* Submission Status */}
          {submissionHistory.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#10b98115',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #10b981'
            }}>
              <CheckCircle style={{ color: '#10b981' }} size={14} />
              <span style={{ fontSize: '12px', color: '#065f46', fontWeight: '500' }}>
                Last submitted: {new Date(submissionHistory[0].submitted_at).toLocaleDateString()}
              </span>
            </div>
          )}
          
          {submissionHistory.length === 0 && getTotalCompletionPercentage() > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#fef3c7',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #f59e0b'
            }}>
              <AlertCircle style={{ color: '#d97706' }} size={14} />
              <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '500' }}>
                Not submitted yet
              </span>
            </div>
          )}
        </div>
        
        <div style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          height: '8px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <div style={{
            backgroundColor: '#3b82f6',
            height: '100%',
            width: `${getTotalCompletionPercentage()}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {Object.entries(iIncModules).map(([key, module]) => {
            const completion = getCompletionPercentage(key);
            return (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <module.icon style={{ color: module.color }} size={16} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    {module.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {completion}% complete
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {moduleOrder.map((moduleKey) => {
          const module = iIncModules[moduleKey];
          const completion = getCompletionPercentage(moduleKey);
          
          return (
            <div
              key={moduleKey}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px 0 rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
              }}
              onClick={() => {
                setActiveView('myassessment');
                setCurrentModule(moduleKey);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{
                  backgroundColor: `${module.color}15`,
                  padding: '8px',
                  borderRadius: '8px',
                  marginRight: '12px'
                }}>
                  <module.icon style={{ color: module.color }} size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#1f2937', 
                    margin: 0 
                  }}>
                    {module.title}
                  </h4>
                </div>
                <ArrowRight style={{ color: '#6b7280' }} size={16} />
              </div>
              
              <p style={{ 
                color: '#6b7280', 
                fontSize: '14px', 
                margin: '0 0 16px 0',
                lineHeight: '1.5'
              }}>
                {module.description}
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {module.sections.length} sections
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '500',
                    color: completion === 100 ? '#10b981' : '#6b7280'
                  }}>
                    {completion}%
                  </span>
                  <div style={{
                    width: '40px',
                    height: '4px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      backgroundColor: completion === 100 ? '#10b981' : module.color,
                      height: '100%',
                      width: `${completion}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Submissions */}
      {submissionHistory.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Clock style={{ color: '#3b82f6', marginRight: '8px' }} size={20} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                Submission History
              </h3>
            </div>
            
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {submissionHistory.length} submission{submissionHistory.length > 1 ? 's' : ''}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {submissionHistory.slice(0, 5).map((submission, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: index === 0 ? '#f0f9ff' : '#f9fafb',
                borderRadius: '8px',
                border: `1px solid ${index === 0 ? '#e0f2fe' : '#f3f4f6'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle style={{ color: '#10b981' }} size={16} />
                  <div>
                    <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                      Assessment submitted
                      {index === 0 && (
                        <span style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          marginLeft: '8px'
                        }}>
                          Latest
                        </span>
                      )}
                    </span>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {submission.completion_percentage}% completed
                      {submission.focus_area && ` • Focus: ${submission.focus_area}`}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
          
          {submissionHistory.length > 0 && getTotalCompletionPercentage() > submissionHistory[0].completion_percentage && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fed7aa',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp style={{ color: '#d97706' }} size={16} />
                <span style={{ fontSize: '14px', color: '#92400e', fontWeight: '500' }}>
                  You've made progress since your last submission!
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#92400e', margin: '4px 0 0 24px' }}>
                Submit again to save your latest responses and notify leadership of your updates.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderModuleDetail = () => {
    const module = iIncModules[currentModule];
    if (!module) return null;

    return (
      <div style={{ padding: '24px' }}>
        {/* Module Header */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => setCurrentModule(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '4px 0',
              marginBottom: '16px'
            }}
          >
            ← Back to Overview
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{
              backgroundColor: `${module.color}15`,
              padding: '12px',
              borderRadius: '12px',
              marginRight: '16px'
            }}>
              <module.icon style={{ color: module.color }} size={24} />
            </div>
            <div>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#1f2937', 
                margin: '0 0 4px 0' 
              }}>
                {module.title}
              </h2>
              <p style={{ 
                color: '#6b7280', 
                margin: 0,
                fontSize: '16px'
              }}>
                {module.description}
              </p>
            </div>
          </div>
          
          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            height: '8px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              backgroundColor: module.color,
              height: '100%',
              width: `${getCompletionPercentage(currentModule)}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            {getCompletionPercentage(currentModule)}% complete
          </span>
        </div>

        {/* Module Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {module.sections.map((section, index) => {
            const currentValue = responses[currentModule]?.[section.key] || '';
            
            return (
              <div
                key={section.key}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '24px'
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{
                      backgroundColor: currentValue ? '#10b98115' : '#f3f4f6',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px'
                    }}>
                      {currentValue ? (
                        <CheckCircle style={{ color: '#10b981' }} size={14} />
                      ) : (
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: 'bold', 
                          color: '#6b7280' 
                        }}>
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <h4 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#1f2937', 
                      margin: 0 
                    }}>
                      {section.title}
                    </h4>
                  </div>
                  
                  <p style={{ 
                    color: '#374151', 
                    fontSize: '14px', 
                    margin: '0 0 16px 36px',
                    lineHeight: '1.5'
                  }}>
                    {section.question}
                  </p>
                </div>

                <div style={{ marginLeft: '36px' }}>
                  <textarea
                    value={currentValue}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const updatedResponses = {
                        ...responses,
                        [currentModule]: {
                          ...responses[currentModule],
                          [section.key]: newValue
                        }
                      };
                      setResponses(updatedResponses);
                    }}
                    onBlur={(e) => {
                      handleSaveResponse(currentModule, section.key, e.target.value);
                    }}
                    placeholder={section.placeholder}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = module.color;
                      e.target.style.boxShadow = `0 0 0 3px ${module.color}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAssessmentForm = () => (
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
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h3 style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          color: '#1f2937', 
          margin: '0 0 16px 0' 
        }}>
          New I, Inc. Assessment
        </h3>
        
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Complete this comprehensive assessment to develop your career acceleration plan. 
          Your responses will be visible to executive leaders and yourself.
        </p>

        {/* Quick form for demonstration - in real implementation, this would be more comprehensive */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#374151',
            marginBottom: '8px'
          }}>
            Key Focus Area
          </label>
          <select
            value={formData.focus_area || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, focus_area: e.target.value }))}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          >
            <option value="">Select focus area...</option>
            <option value="passion">Explore Your Passion</option>
            <option value="sweetspot">Find Your Career Sweet Spot</option>
            <option value="story">Tell Your Story</option>
            <option value="entrepreneurial">Entrepreneurial Mindset</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={() => setShowAssessmentForm(false)}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitCompleteAssessment}
            disabled={saveLoading}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: 'white',
              cursor: saveLoading ? 'not-allowed' : 'pointer',
              opacity: saveLoading ? 0.7 : 1
            }}
          >
            {saveLoading ? 'Saving...' : 'Complete Assessment'}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        color: '#6b7280'
      }}>
        <TrendingUp size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '12px' }} />
        <span>Loading I, Inc. framework...</span>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Navigation Tabs */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px'
      }}>
        <div style={{
          display: 'flex',
          gap: '32px'
        }}>
          <button
            onClick={() => {
              setActiveView('overview');
              setCurrentModule(null);
            }}
            style={{
              padding: '12px 4px',
              borderBottom: activeView === 'overview' ? '2px solid #3b82f6' : '2px solid transparent',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: activeView === 'overview' ? '#3b82f6' : '#6b7280',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            Overview
          </button>
          
          <button
            onClick={() => setActiveView('myassessment')}
            style={{
              padding: '12px 4px',
              borderBottom: activeView === 'myassessment' ? '2px solid #3b82f6' : '2px solid transparent',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: activeView === 'myassessment' ? '#3b82f6' : '#6b7280',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            My Assessment
          </button>
          
          {currentUser?.role === 'Executive Leader' && (
            <button
              onClick={() => setActiveView('teamoverview')}
              style={{
                padding: '12px 4px',
                borderBottom: activeView === 'teamoverview' ? '2px solid #3b82f6' : '2px solid transparent',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: activeView === 'teamoverview' ? '#3b82f6' : '#6b7280',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              Team Overview
            </button>
          )}
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'overview' && renderOverviewContent()}
      {activeView === 'myassessment' && (currentModule ? renderModuleDetail() : renderModuleOverview())}
      {activeView === 'teamoverview' && currentUser?.role === 'Executive Leader' && renderTeamOverview()}
      
      {showAssessmentForm && renderAssessmentForm()}
    </div>
  );
};

export default IIncTab;