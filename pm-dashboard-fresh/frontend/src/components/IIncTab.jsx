import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, Users, FileText, PlusCircle, Eye, MessageSquare, Calendar, Filter, Download, Search, ChevronRight, ChevronDown, Award, Target, BookOpen, Lightbulb, Star } from 'lucide-react';
import './IIncTab.css'; // Import the CSS file

const IIncTab = ({ userRole, currentUser, apiService }) => {
  const [activeView, setActiveView] = useState('forms');
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [teamSubmissions, setTeamSubmissions] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUsers, setExpandedUsers] = useState(new Set());

  const isExecutiveLeader = userRole === 'executive_leader' || userRole === 'Executive Leader' || userRole === 'admin';

  // Get auth token helper
  const getAuthToken = () => {
    return localStorage.getItem('authToken') || localStorage.getItem('currentUserId') || localStorage.getItem('token');
  };

  // Generic API call helper
  const apiCall = async (endpoint, options = {}) => {
    const authToken = getAuthToken();
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await fetch(endpoint, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  // Fetch form templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall('/api/iinc/templates');
      setTemplates(data.data || []);
    } catch (err) {
      setError('Failed to load form templates');
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user submissions
  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/api/iinc/submissions');
      setSubmissions(data.data || []);
    } catch (err) {
      setError('Failed to load submissions');
      console.error('Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch team submissions (for executives)
  const fetchTeamSubmissions = async () => {
    if (!isExecutiveLeader) return;
    
    try {
      setLoading(true);
      const data = await apiCall('/api/iinc/team-submissions');
      setTeamSubmissions(data.data || []);
    } catch (err) {
      setError('Failed to load team submissions');
      console.error('Error fetching team submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Submit form data
  const submitForm = async (templateId, formData, notes = '') => {
    try {
      setLoading(true);
      const data = await apiCall('/api/iinc/submissions', {
        method: 'POST',
        body: JSON.stringify({
          template_id: templateId,
          submission_data: formData,
          notes: notes,
          status: 'submitted'
        })
      });
      
      // Refresh submissions
      await fetchSubmissions();
      
      // Close form and show success
      setSelectedTemplate(null);
      setError(null);
      
      return data;
    } catch (err) {
      setError('Failed to submit form');
      console.error('Error submitting form:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add review to submission
  const addReview = async (submissionId, reviewNotes) => {
    try {
      setLoading(true);
      await apiCall(`/api/iinc/submissions/${submissionId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          review_notes: reviewNotes
        })
      });
      
      // Refresh team submissions
      await fetchTeamSubmissions();
      setSelectedSubmission(null);
      
    } catch (err) {
      setError('Failed to add review');
      console.error('Error adding review:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    if (activeView === 'submissions') {
      fetchSubmissions();
    } else if (activeView === 'team-review' && isExecutiveLeader) {
      fetchTeamSubmissions();
    }
  }, [activeView, isExecutiveLeader]);

  // Toggle user expansion in team view
  const toggleUserExpansion = (userId) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  // Filter team submissions based on search and status
  const filteredTeamSubmissions = teamSubmissions.filter(userGroup => {
    const matchesSearch = searchTerm === '' || 
      userGroup.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userGroup.user.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    
    const hasMatchingSubmissions = userGroup.submissions.some(sub => {
      if (filterStatus === 'pending') return sub.status === 'submitted';
      if (filterStatus === 'reviewed') return sub.status === 'reviewed';
      return false;
    });
    
    return matchesSearch && hasMatchingSubmissions;
  });

  // Get module icon
  const getModuleIcon = (moduleName) => {
    const iconMap = {
      'Exploring Your Passion': Target,
      'Context Before Content': Star,
      'Think Like an Entrepreneur': Lightbulb,
      'Discovering the Opportunities': BookOpen,
      'Telling Your Story': Award
    };
    return iconMap[moduleName] || FileText;
  };

  if (loading && templates.length === 0) {
    return (
      <div className="iinc-loading">
        <div className="iinc-spinner"></div>
        <span className="iinc-loading-text">Loading I, Inc. content...</span>
      </div>
    );
  }

  return (
    <div className="iinc-tab">
      {/* Simple Header */}
      <div className="iinc-simple-header">
        <h2>I, Inc. Career Planning</h2>
        <p>Personal Entrepreneurship & Career Development</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="iinc-error">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="iinc-error-dismiss">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="iinc-nav">
        <nav className="iinc-nav-list">
          <button
            onClick={() => setActiveView('forms')}
            className={`iinc-nav-button ${activeView === 'forms' ? 'active' : ''}`}
          >
            <FileText />
            Assessment Forms
          </button>
          
          <button
            onClick={() => setActiveView('submissions')}
            className={`iinc-nav-button ${activeView === 'submissions' ? 'active' : ''}`}
          >
            <Clock />
            My Submissions
          </button>

          {isExecutiveLeader && (
            <button
              onClick={() => setActiveView('team-review')}
              className={`iinc-nav-button ${activeView === 'team-review' ? 'active' : ''}`}
            >
              <Users />
              Team Review
            </button>
          )}
        </nav>
      </div>

      {/* Assessment Forms View */}
      {activeView === 'forms' && (
        <div className="iinc-forms-view">
          <div className="iinc-forms-intro">
            <h3>I, Inc. Assessment Modules</h3>
            <p>Complete these self-assessment modules to develop your career planning and personal entrepreneurship skills.</p>
          </div>
          
          <div className="iinc-form-grid">
            {templates.map((template) => {
              const Icon = getModuleIcon(template.module_name);
              const hasSubmission = submissions.some(sub => sub.template_id === template.id);
              
              return (
                <div key={template.id} className="iinc-form-card">
                  <div className="iinc-form-card-header">
                    <div className="iinc-form-icons">
                      <div className={`iinc-form-icon ${hasSubmission ? 'completed' : 'default'}`}>
                        <Icon />
                      </div>
                      {hasSubmission && (
                        <CheckCircle className="iinc-completion-badge" />
                      )}
                    </div>
                  </div>
                  
                  <h4 className="iinc-form-title">{template.template_name}</h4>
                  <p className="iinc-form-module">{template.module_name}</p>
                  <p className="iinc-form-description">{template.description}</p>
                  
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className={`iinc-form-button ${hasSubmission ? 'completed' : 'primary'}`}
                  >
                    {hasSubmission ? 'Update Assessment' : 'Start Assessment'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Submissions View */}
      {activeView === 'submissions' && (
        <div className="iinc-submissions-view">
          <div className="iinc-submissions-header">
            <h3>My Submissions</h3>
            <div className="iinc-submissions-count">
              {submissions.length} total submissions
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="iinc-empty-state">
              <FileText className="iinc-empty-icon" />
              <h3 className="iinc-empty-title">No submissions yet</h3>
              <p className="iinc-empty-description">Complete your first I, Inc. assessment to get started.</p>
              <button
                onClick={() => setActiveView('forms')}
                className="iinc-empty-action"
              >
                View Assessment Forms
              </button>
            </div>
          ) : (
            <div className="iinc-submissions-list">
              {submissions.map((submission) => (
                <div key={submission.id} className="iinc-submission-card">
                  <div className="iinc-submission-header">
                    <div className="iinc-submission-info">
                      <div className={`iinc-status-icon ${submission.status}`}>
                        {submission.status === 'reviewed' ? (
                          <CheckCircle />
                        ) : submission.status === 'submitted' ? (
                          <Clock />
                        ) : (
                          <FileText />
                        )}
                      </div>
                      
                      <div className="iinc-submission-details">
                        <h4>{submission.template_name}</h4>
                        <p>{submission.module_name}</p>
                        <div className="iinc-submission-meta">
                          <span className={`iinc-status-badge ${submission.status}`}>
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                          <span className="iinc-date">
                            {new Date(submission.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setSelectedSubmission(submission)}
                      className="iinc-view-button"
                    >
                      <Eye />
                    </button>
                  </div>
                  
                  {submission.review_notes && (
                    <div className="iinc-review-feedback">
                      <div className="iinc-feedback-header">
                        <MessageSquare />
                        <div>
                          <p className="iinc-feedback-title">Manager Feedback</p>
                          <p className="iinc-feedback-content">{submission.review_notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team Review View (Executive Leaders Only) */}
      {activeView === 'team-review' && isExecutiveLeader && (
        <div className="iinc-team-view">
          <div className="iinc-team-header">
            <h3>Team Submissions</h3>
            <div className="iinc-team-controls">
              <div className="iinc-search-input">
                <Search />
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="iinc-filter-select"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Review</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>
          </div>

          {filteredTeamSubmissions.length === 0 ? (
            <div className="iinc-empty-state">
              <Users className="iinc-empty-icon" />
              <h3 className="iinc-empty-title">No team submissions</h3>
              <p className="iinc-empty-description">Team members haven't submitted any I, Inc. assessments yet.</p>
            </div>
          ) : (
            <div className="iinc-team-list">
              {filteredTeamSubmissions.map((userGroup) => (
                <div key={userGroup.user.id} className="iinc-user-group">
                  <div 
                    className="iinc-user-header"
                    onClick={() => toggleUserExpansion(userGroup.user.id)}
                  >
                    <div className="iinc-user-info-section">
                      <div className="iinc-user-details">
                        <div className="iinc-user-avatar">
                          <User />
                        </div>
                        <div className="iinc-user-meta">
                          <h4>{userGroup.user.name}</h4>
                          <p>{userGroup.user.title} â€¢ {userGroup.user.department}</p>
                          <div className="iinc-user-stats">
                            <span>{userGroup.submissions.length} submissions</span>
                            <span>{userGroup.submissions.filter(s => s.status === 'submitted').length} pending review</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="iinc-expand-controls">
                        <div className="iinc-status-dots">
                          {userGroup.submissions.map((submission) => (
                            <div
                              key={submission.id}
                              className={`iinc-status-dot ${submission.status}`}
                              title={`${submission.template_name} - ${submission.status}`}
                            />
                          ))}
                        </div>
                        <div className={`iinc-expand-icon ${expandedUsers.has(userGroup.user.id) ? 'expanded' : ''}`}>
                          {expandedUsers.has(userGroup.user.id) ? <ChevronDown /> : <ChevronRight />}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {expandedUsers.has(userGroup.user.id) && (
                    <div className="iinc-user-submissions">
                      {userGroup.submissions.map((submission) => (
                        <div key={submission.id} className="iinc-submission-item">
                          <div className="iinc-submission-item-info">
                            <div className={`iinc-submission-item-icon ${submission.status}`}>
                              {submission.status === 'reviewed' ? (
                                <CheckCircle />
                              ) : submission.status === 'submitted' ? (
                                <Clock />
                              ) : (
                                <FileText />
                              )}
                            </div>
                            <div className="iinc-submission-item-details">
                              <h5>{submission.template_name}</h5>
                              <p>{submission.module_name}</p>
                              <div className="iinc-submission-item-meta">
                                <span className={`iinc-status-badge ${submission.status}`}>
                                  {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                                </span>
                                <span className="iinc-date">
                                  {new Date(submission.submission_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setSelectedSubmission(submission)}
                            className="iinc-view-button"
                          >
                            <Eye />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {selectedTemplate && (
        <FormModal
          template={selectedTemplate}
          existingSubmission={submissions.find(s => s.template_id === selectedTemplate.id)}
          onClose={() => setSelectedTemplate(null)}
          onSubmit={submitForm}
          loading={loading}
        />
      )}

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onAddReview={isExecutiveLeader ? addReview : null}
          loading={loading}
        />
      )}
    </div>
  );
};

// Enhanced Form Modal Component with proper question handling
const FormModal = ({ template, existingSubmission, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({});
  const [notes, setNotes] = useState('');
  const [currentSection, setCurrentSection] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (existingSubmission) {
      setFormData(existingSubmission.submission_data || {});
      setNotes(existingSubmission.notes || '');
    }
  }, [existingSubmission]);

  const handleSubmit = async () => {
    try {
      await onSubmit(template.id, formData, notes);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleFieldChange = (questionId, value) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear validation error when user starts typing/selecting
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  // Parse form structure safely
  let formStructure;
  try {
    formStructure = typeof template.form_structure === 'string' 
      ? JSON.parse(template.form_structure) 
      : template.form_structure;
  } catch (error) {
    console.error('Error parsing form structure:', error);
    formStructure = { sections: [] };
  }

  const sections = formStructure.sections || [];
  const isLastSection = currentSection === sections.length - 1;
  const isFirstSection = currentSection === 0;

  // Validation function for current section
  const validateCurrentSection = () => {
    if (!sections[currentSection] || !sections[currentSection].questions) {
      return true; // No questions to validate
    }

    const currentQuestions = sections[currentSection].questions;
    const errors = {};
    let isValid = true;

    currentQuestions.forEach(question => {
      if (question.required) {
        const value = formData[question.id];
        let hasError = false;
        let errorMessage = '';

        switch (question.type) {
          case 'textarea':
          case 'text':
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              hasError = true;
              errorMessage = 'This field is required';
            }
            break;

          case 'radio':
            if (!value) {
              hasError = true;
              errorMessage = 'Please select an option';
            }
            break;

          case 'multiselect':
            const selectedValues = Array.isArray(value) ? value : [];
            
            // Check if question specifies a required number (e.g., "Select up to 5")
            const questionText = question.question.toLowerCase();
            let requiredCount = 1; // Default minimum
            
            if (questionText.includes('top 5') || questionText.includes('up to 5')) {
              requiredCount = 5;
            } else if (questionText.includes('top 7') || questionText.includes('up to 7')) {
              requiredCount = 7;
            } else if (questionText.includes('top 3') || questionText.includes('up to 3')) {
              requiredCount = 3;
            }
            
            if (selectedValues.length === 0) {
              hasError = true;
              errorMessage = 'Please select at least one option';
            } else if (questionText.includes('top 5') && selectedValues.length !== 5) {
              hasError = true;
              errorMessage = 'Please select exactly 5 options';
            } else if (questionText.includes('top 7') && selectedValues.length !== 7) {
              hasError = true;
              errorMessage = 'Please select exactly 7 options';
            } else if (questionText.includes('top 3') && selectedValues.length !== 3) {
              hasError = true;
              errorMessage = 'Please select exactly 3 options';
            }
            break;

          case 'scale':
            if (!value || value === '') {
              hasError = true;
              errorMessage = 'Please select a rating';
            }
            break;

          case 'ranking':
            const rankings = Array.isArray(value) ? value : [];
            const totalOptions = question.options ? question.options.length : 0;
            
            if (rankings.length === 0) {
              hasError = true;
              errorMessage = 'Please rank at least one item';
            } else if (rankings.length !== totalOptions) {
              hasError = true;
              errorMessage = `Please rank all ${totalOptions} items`;
            }
            break;

          default:
            if (!value) {
              hasError = true;
              errorMessage = 'This field is required';
            }
            break;
        }

        if (hasError) {
          errors[question.id] = errorMessage;
          isValid = false;
        }
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleNext = () => {
    if (validateCurrentSection()) {
      setCurrentSection(Math.min(sections.length - 1, currentSection + 1));
    }
  };

  const handlePrevious = () => {
    setCurrentSection(Math.max(0, currentSection - 1));
    // Clear validation errors when going back
    setValidationErrors({});
  };

  const handleFinalSubmit = () => {
    if (validateCurrentSection()) {
      handleSubmit();
    }
  };

  const renderQuestion = (question) => {
    const value = formData[question.id] || '';
    const hasError = validationErrors[question.id];

    switch (question.type) {
      case 'textarea':
        return (
          <div>
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              rows={4}
              className={`iinc-textarea ${hasError ? 'iinc-field-error' : ''}`}
            />
            {hasError && <div className="iinc-error-message">{hasError}</div>}
          </div>
        );

      case 'radio':
        return (
          <div>
            <div className={`iinc-radio-group ${hasError ? 'iinc-field-error' : ''}`}>
              {question.options.map((option) => (
                <label key={option.value} className="iinc-radio-option">
                  <input
                    type="radio"
                    name={question.id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleFieldChange(question.id, e.target.value)}
                    className="iinc-radio-input"
                  />
                  <div className="iinc-option-label">
                    <div className="iinc-option-title">{option.label}</div>
                  </div>
                </label>
              ))}
            </div>
            {hasError && <div className="iinc-error-message">{hasError}</div>}
          </div>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        
        // Determine if this is a "select exactly X" question
        const questionText = question.question.toLowerCase();
        let maxSelections = null;
        let selectionText = '';
        
        if (questionText.includes('top 5') || questionText.includes('up to 5')) {
          maxSelections = 5;
          selectionText = 'exactly 5';
        } else if (questionText.includes('top 7') || questionText.includes('up to 7')) {
          maxSelections = 7;
          selectionText = 'exactly 7';
        } else if (questionText.includes('top 3') || questionText.includes('up to 3')) {
          maxSelections = 3;
          selectionText = 'exactly 3';
        }
        
        return (
          <div>
            {maxSelections && (
              <div className="iinc-selection-counter">
                <span className={`iinc-counter-text ${selectedValues.length === maxSelections ? 'complete' : selectedValues.length > maxSelections ? 'over' : 'under'}`}>
                  Selected: {selectedValues.length} of {maxSelections}
                  {selectedValues.length !== maxSelections && (
                    <span className="iinc-counter-warning"> (Select {selectionText})</span>
                  )}
                </span>
              </div>
            )}
            <div className={`iinc-checkbox-group ${hasError ? 'iinc-field-error' : ''}`}>
              {question.options.map((option) => {
                const isSelected = selectedValues.includes(option);
                const isDisabled = maxSelections && !isSelected && selectedValues.length >= maxSelections;
                
                return (
                  <label key={option} className={`iinc-checkbox-option ${isDisabled ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={(e) => {
                        const newValues = e.target.checked
                          ? [...selectedValues, option]
                          : selectedValues.filter(v => v !== option);
                        handleFieldChange(question.id, newValues);
                      }}
                      className="iinc-checkbox-input"
                    />
                    <span className="iinc-option-label">{option}</span>
                  </label>
                );
              })}
            </div>
            {hasError && <div className="iinc-error-message">{hasError}</div>}
          </div>
        );

      case 'scale':
        const scaleConfig = question.scale || { min: 1, max: 5, labels: [] };
        return (
          <div>
            <div className={`iinc-scale-group ${hasError ? 'iinc-field-error' : ''}`}>
              <div className="iinc-scale-labels">
                <span>{scaleConfig.labels[0] || `${scaleConfig.min}`}</span>
                <span>{scaleConfig.labels[scaleConfig.labels.length - 1] || `${scaleConfig.max}`}</span>
              </div>
              <div className="iinc-scale-options">
                {Array.from({ length: scaleConfig.max - scaleConfig.min + 1 }, (_, i) => {
                  const scaleValue = scaleConfig.min + i;
                  return (
                    <label key={scaleValue} className="iinc-scale-option">
                      <input
                        type="radio"
                        name={question.id}
                        value={scaleValue}
                        checked={parseInt(value) === scaleValue}
                        onChange={(e) => handleFieldChange(question.id, parseInt(e.target.value))}
                        className="iinc-scale-input"
                      />
                      <span className="iinc-scale-value">{scaleValue}</span>
                    </label>
                  );
                })}
              </div>
              {scaleConfig.labels && parseInt(value) && (
                <div className="iinc-scale-description">
                  {scaleConfig.labels[parseInt(value) - 1] || ''}
                </div>
              )}
            </div>
            {hasError && <div className="iinc-error-message">{hasError}</div>}
          </div>
        );

      case 'ranking':
        const rankings = Array.isArray(value) ? value : [];
        
        // Create a simpler ranking system
        const handleRankingChange = (option, rank) => {
          const newRankings = [...rankings];
          
          // Remove any existing ranking for this option
          const existingIndex = newRankings.findIndex(item => item.option === option);
          if (existingIndex >= 0) {
            newRankings.splice(existingIndex, 1);
          }
          
          // Remove any existing ranking for this rank position
          const existingRankIndex = newRankings.findIndex(item => item.rank === rank);
          if (existingRankIndex >= 0) {
            newRankings.splice(existingRankIndex, 1);
          }
          
          // Add the new ranking if rank is valid
          if (rank >= 1 && rank <= question.options.length) {
            newRankings.push({ option, rank });
          }
          
          // Sort by rank
          newRankings.sort((a, b) => a.rank - b.rank);
          handleFieldChange(question.id, newRankings);
        };
        
        const getRankForOption = (option) => {
          const item = rankings.find(item => item.option === option);
          return item ? item.rank : '';
        };
        
        const getOptionForRank = (rank) => {
          const item = rankings.find(item => item.rank === rank);
          return item ? item.option : '';
        };
        
        return (
          <div>
            <div className={`iinc-rank-group ${hasError ? 'iinc-field-error' : ''}`}>
              <div className="iinc-rank-instruction">
                <p>Rank these values from 1 (most important) to {question.options.length} (least important):</p>
              </div>
              
              {/* Show current rankings in order */}
              <div className="iinc-current-rankings">
                <h6 className="iinc-rankings-title">Current Rankings:</h6>
                <div className="iinc-rankings-list">
                  {Array.from({ length: question.options.length }, (_, i) => {
                    const rank = i + 1;
                    const option = getOptionForRank(rank);
                    return (
                      <div key={rank} className="iinc-ranking-display">
                        <span className="iinc-rank-number">{rank}.</span>
                        <span className="iinc-rank-value">
                          {option || '(Not ranked yet)'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Options to rank */}
              <div className="iinc-ranking-options">
                <h6 className="iinc-rankings-title">Assign Rankings:</h6>
                {question.options.map((option) => {
                  const currentRank = getRankForOption(option);
                  return (
                    <div key={option} className="iinc-rank-item">
                      <div className="iinc-rank-option-text">{option}</div>
                      <div className="iinc-rank-controls">
                        <label className="iinc-rank-label">Rank:</label>
                        <select
                          value={currentRank}
                          onChange={(e) => {
                            const newRank = e.target.value ? parseInt(e.target.value) : null;
                            if (newRank) {
                              handleRankingChange(option, newRank);
                            } else {
                              // Remove ranking if empty value selected
                              const newRankings = rankings.filter(item => item.option !== option);
                              handleFieldChange(question.id, newRankings);
                            }
                          }}
                          className="iinc-rank-select"
                        >
                          <option value="">-- Select Rank --</option>
                          {Array.from({ length: question.options.length }, (_, i) => {
                            const rank = i + 1;
                            const isOccupied = getOptionForRank(rank) && getOptionForRank(rank) !== option;
                            return (
                              <option 
                                key={rank} 
                                value={rank}
                                disabled={isOccupied}
                              >
                                {rank} {isOccupied ? `(${getOptionForRank(rank)})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Progress indicator */}
              <div className="iinc-ranking-progress">
                <p className="iinc-progress-text">
                  {rankings.length} of {question.options.length} values ranked
                  {rankings.length < question.options.length && (
                    <span className="iinc-incomplete-warning"> - Please rank all values</span>
                  )}
                </p>
              </div>
            </div>
            {hasError && <div className="iinc-error-message">{hasError}</div>}
          </div>
        );

      default:
        return (
          <div>
            <input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              className={`iinc-text-input ${hasError ? 'iinc-field-error' : ''}`}
            />
            {hasError && <div className="iinc-error-message">{hasError}</div>}
          </div>
        );
    }
  };

  return (
    <div className="iinc-modal-overlay">
      <div className="iinc-modal iinc-modal-large">
        <div className="iinc-modal-header">
          <div className="iinc-modal-title">
            <div>
              <h3>{template.template_name}</h3>
              <p>{template.module_name}</p>
              <p className="iinc-modal-description">{template.description}</p>
            </div>
            <button onClick={onClose} className="iinc-close-button">
              âœ•
            </button>
          </div>
          
          {/* Progress indicator */}
          {sections.length > 1 && (
            <div className="iinc-progress-indicator">
              <div className="iinc-progress-text">
                <span>Section {currentSection + 1} of {sections.length}</span>
                <span>{Math.round(((currentSection + 1) / sections.length) * 100)}% Complete</span>
              </div>
              <div className="iinc-progress-bar">
                <div
                  className="iinc-progress-fill"
                  style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="iinc-modal-content">
          {sections.length > 0 && sections[currentSection] && (
            <div className="iinc-form-section">
              <div className="iinc-section-header">
                <h4 className="iinc-section-title">{sections[currentSection].title}</h4>
                {sections[currentSection].description && (
                  <p className="iinc-section-description">{sections[currentSection].description}</p>
                )}
              </div>
              
              <div className="iinc-questions-container">
                {sections[currentSection].questions?.map((question) => (
                  <div key={question.id} className="iinc-field-group">
                    <label className="iinc-field-label">
                      {question.question}
                      {question.required && <span className="iinc-field-required">*</span>}
                    </label>
                    {renderQuestion(question)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes section - only show on last section */}
          {isLastSection && (
            <div className="iinc-form-section">
              <h4 className="iinc-section-title">Additional Notes</h4>
              <div className="iinc-field-group">
                <label className="iinc-field-label">
                  Any additional thoughts or context you'd like to share?
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional: Add any additional insights, questions, or reflections..."
                  rows={3}
                  className="iinc-textarea"
                />
              </div>
            </div>
          )}
        </div>

        <div className="iinc-modal-footer">
          <div className="iinc-modal-nav">
            <button
              onClick={handlePrevious}
              disabled={isFirstSection}
              className="iinc-button outline"
              style={{ opacity: isFirstSection ? 0.5 : 1 }}
            >
              Previous
            </button>

            <div className="iinc-modal-actions">
              <button onClick={onClose} className="iinc-button outline">
                Cancel
              </button>

              {isLastSection ? (
                <button
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="iinc-button primary"
                >
                  {loading ? 'Submitting...' : existingSubmission ? 'Update Assessment' : 'Submit Assessment'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="iinc-button primary"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Submission Detail Modal Component
const SubmissionDetailModal = ({ submission, onClose, onAddReview, loading }) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const handleAddReview = async () => {
    if (reviewNotes.trim() && onAddReview) {
      await onAddReview(submission.id, reviewNotes);
      setReviewNotes('');
      setShowReviewForm(false);
    }
  };

  // Helper function to render submission data properly
  const renderSubmissionData = (data) => {
    console.log('Rendering submission data:', data);
    
    if (!data || typeof data !== 'object') {
      return <p className="iinc-no-data">No response data available</p>;
    }

    // Handle simple form responses (current format)
    if (data.response && typeof data.response === 'string') {
      return (
        <div className="iinc-response-content">
          <p>{data.response}</p>
        </div>
      );
    }

    // Handle complex form responses (future format)
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <p className="iinc-no-data">No responses provided</p>;
    }

    return (
      <div className="iinc-responses-list">
        {entries.map(([key, value]) => (
          <div key={key} className="iinc-response-item">
            <h5 className="iinc-response-label">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h5>
            <div className="iinc-response-value">
              {Array.isArray(value) ? (
                <ul className="iinc-response-list">
                  {value.map((item, index) => (
                    <li key={index}>
                      {typeof item === 'object' ? `${item.option} (Rank: ${item.rank})` : item}
                    </li>
                  ))}
                </ul>
              ) : typeof value === 'object' ? (
                <pre className="iinc-response-object">{JSON.stringify(value, null, 2)}</pre>
              ) : (
                <p className="iinc-response-text">{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="iinc-modal-overlay">
      <div className="iinc-modal iinc-modal-large">
        <div className="iinc-modal-header">
          <div className="iinc-modal-title">
            <div>
              <h3>{submission.template_name}</h3>
              <p>{submission.module_name}</p>
              {submission.user_name && (
                <p className="iinc-modal-description">Submitted by: {submission.user_name}</p>
              )}
              <div className="iinc-submission-meta">
                <span className={`iinc-status-badge ${submission.status}`}>
                  {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                </span>
                <span className="iinc-date">
                  Submitted: {new Date(submission.submission_date).toLocaleDateString()}
                </span>
                {submission.updated_at !== submission.submission_date && (
                  <span className="iinc-date">
                    Updated: {new Date(submission.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="iinc-close-button">
              âœ•
            </button>
          </div>
        </div>

        <div className="iinc-modal-content">
          {/* Submission Content */}
          <div className="iinc-content-section">
            <h4>Assessment Response</h4>
            <div className="iinc-content-box">
              {renderSubmissionData(submission.submission_data)}
            </div>
          </div>

          {/* User Notes */}
          {submission.notes && (
            <div className="iinc-content-section">
              <h4>Additional Notes</h4>
              <div className="iinc-content-box">
                <p>{submission.notes}</p>
              </div>
            </div>
          )}

          {/* Existing Review */}
          {submission.review_notes && (
            <div className="iinc-content-section">
              <h4>Manager Feedback</h4>
              <div className="iinc-content-box iinc-review-box">
                <div className="iinc-feedback-header">
                  <MessageSquare />
                  <div>
                    <p>{submission.review_notes}</p>
                    {submission.reviewed_at && (
                      <p className="iinc-review-date">
                        Reviewed on {new Date(submission.reviewed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Review Form */}
          {onAddReview && submission.status === 'submitted' && (
            <div className="iinc-content-section">
              {!showReviewForm ? (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="iinc-add-review-button"
                >
                  <PlusCircle />
                  Add Manager Feedback
                </button>
              ) : (
                <div className="iinc-review-form">
                  <h4>Add Manager Feedback</h4>
                  <div className="iinc-field-group">
                    <label className="iinc-field-label">
                      Feedback and Recommendations
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Provide feedback, suggestions, or recommendations based on this assessment..."
                      rows={4}
                      className="iinc-textarea"
                    />
                  </div>
                  <div className="iinc-review-actions">
                    <button
                      onClick={handleAddReview}
                      disabled={loading || !reviewNotes.trim()}
                      className="iinc-button primary"
                    >
                      {loading ? 'Adding...' : 'Add Feedback'}
                    </button>
                    <button
                      onClick={() => {
                        setShowReviewForm(false);
                        setReviewNotes('');
                      }}
                      className="iinc-button outline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="iinc-modal-footer">
          <button onClick={onClose} className="iinc-button outline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IIncTab;