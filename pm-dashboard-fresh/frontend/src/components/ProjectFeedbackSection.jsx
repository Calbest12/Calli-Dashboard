// frontend/src/components/ProjectFeedbackSection.jsx
import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, TrendingUp, Users, Target, Award, Activity } from 'lucide-react';

const ProjectFeedbackSection = ({ project, currentUser, onUpdateProject, isReadOnly }) => {
  const [feedback, setFeedback] = useState({
    projectManagement: {
      planning: 1,
      execution: 1,
      communication: 1,
      resourceManagement: 1
    },
    leadership: {
      guidance: 1,
      motivation: 1,
      decisionMaking: 1,
      teamSupport: 1
    },
    organizationalChangeManagement: {
      vision: 1,
      changeExecution: 1,
      stakeholderEngagement: 1,
      adaptability: 1
    }
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (project) {
      // Initialize feedback values if they exist
      const initialFeedback = { ...feedback };
      
      // You can load existing feedback here if available
      // For now, we'll keep default values
      setFeedback(initialFeedback);
    }
  }, [project]);

  const handleSliderChange = (category, dimension, value) => {
    setFeedback(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [dimension]: parseInt(value)
      }
    }));
  };

  const handleSubmitFeedback = async () => {
    if (isReadOnly) return;

    setIsSubmitting(true);
    try {
      console.log('📝 Submitting project feedback:', feedback);

      // Calculate category averages
      const pmAverage = Object.values(feedback.projectManagement).reduce((sum, val) => sum + val, 0) / 4;
      const leadershipAverage = Object.values(feedback.leadership).reduce((sum, val) => sum + val, 0) / 4;
      const changeManagementAverage = Object.values(feedback.organizationalChangeManagement).reduce((sum, val) => sum + val, 0) / 4;

      // Update project progress based on feedback
      const updatedProject = {
        ...project,
        progress: {
          ...project.progress,
          PM: project.progress?.PM || 1, // Keep existing PM progress (actual project progress)
          Leadership: Math.round(leadershipAverage),
          ChangeMgmt: Math.round(changeManagementAverage)
        }
      };

      // Submit feedback (you'll need to implement this API endpoint)
      const feedbackData = {
        project_id: project.id,
        user_id: currentUser.id,
        feedback_data: feedback,
        notes: notes,
        submission_date: new Date().toISOString()
      };

      // Simulate API call - replace with actual API call
      console.log('Feedback data:', feedbackData);
      
      // Update the project with new progress values
      if (onUpdateProject) {
        onUpdateProject(updatedProject);
      }

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);

    } catch (error) {
      console.error('❌ Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFeedbackCategory = (categoryKey, categoryData, icon, title, description, color) => {
    const Icon = icon;
    const categoryFeedback = feedback[categoryKey];
    const average = Object.values(categoryFeedback).reduce((sum, val) => sum + val, 0) / Object.keys(categoryFeedback).length;

    return (
      <div key={categoryKey} style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: color + '20',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={20} style={{ color: color }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
              {title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              {description}
            </p>
          </div>
          <div style={{
            marginLeft: 'auto',
            backgroundColor: color + '10',
            color: color,
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            {average.toFixed(1)}/7
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(categoryData).map(([dimensionKey, dimensionLabel]) => (
            <div key={dimensionKey}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  {dimensionLabel}
                </label>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                  {categoryFeedback[dimensionKey]}/7
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="7"
                value={categoryFeedback[dimensionKey]}
                onChange={(e) => handleSliderChange(categoryKey, dimensionKey, e.target.value)}
                disabled={isReadOnly || isSubmitting}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${color}20 0%, ${color} ${((categoryFeedback[dimensionKey] - 1) / 6) * 100}%, #e5e7eb ${((categoryFeedback[dimensionKey] - 1) / 6) * 100}%, #e5e7eb 100%)`,
                  outline: 'none',
                  opacity: isReadOnly || isSubmitting ? 0.6 : 1,
                  cursor: isReadOnly || isSubmitting ? 'not-allowed' : 'pointer'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '0.25rem'
              }}>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Poor</span>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Excellent</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!project) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        textAlign: 'center'
      }}>
        <p style={{ color: '#6b7280', margin: 0 }}>No project selected</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
            Project Feedback
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            Provide feedback on different aspects of this project's management and leadership
          </p>
        </div>
        {submitSuccess && (
          <div style={{
            backgroundColor: '#dcfce7',
            color: '#16a34a',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            ✅ Feedback submitted successfully!
          </div>
        )}
      </div>

      {/* Feedback Categories */}
      <div>
        {/* Project Management (without vision) */}
        {renderFeedbackCategory(
          'projectManagement',
          {
            planning: 'Planning & Strategy',
            execution: 'Execution & Delivery',
            communication: 'Communication & Updates',
            resourceManagement: 'Resource Management'
          },
          Target,
          'Project Management',
          'Evaluate the core project management capabilities',
          '#3b82f6'
        )}

        {/* Leadership */}
        {renderFeedbackCategory(
          'leadership',
          {
            guidance: 'Guidance & Direction',
            motivation: 'Team Motivation',
            decisionMaking: 'Decision Making',
            teamSupport: 'Team Support & Development'
          },
          Award,
          'Leadership',
          'Assess leadership effectiveness and team guidance',
          '#10b981'
        )}

        {/* Organizational Change Management (with vision) */}
        {renderFeedbackCategory(
          'organizationalChangeManagement',
          {
            vision: 'Vision & Change Direction',
            changeExecution: 'Change Implementation',
            stakeholderEngagement: 'Stakeholder Engagement',
            adaptability: 'Adaptability & Flexibility'
          },
          Activity,
          'Organizational Change Management',
          'Rate change management and organizational transformation capabilities',
          '#8b5cf6'
        )}
      </div>

      {/* Notes Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <MessageSquare size={20} style={{ color: '#6b7280' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
            Additional Comments
          </h3>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isReadOnly || isSubmitting}
          placeholder="Share any additional thoughts, suggestions, or feedback about this project..."
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            resize: 'vertical',
            outline: 'none',
            opacity: isReadOnly || isSubmitting ? 0.6 : 1,
            fontFamily: 'inherit'
          }}
          onFocus={(e) => !isReadOnly && (e.target.style.borderColor = '#3b82f6')}
          onBlur={(e) => !isReadOnly && (e.target.style.borderColor = '#d1d5db')}
        />
      </div>

      {/* Submit Button */}
      {!isReadOnly && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleSubmitFeedback}
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? '#9ca3af' : 'linear-gradient(to right, #3b82f6, #1d4ed8)',
              color: 'white',
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto',
              boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <Star size={16} />
            {isSubmitting ? 'Submitting Feedback...' : 'Submit Feedback'}
          </button>
        </div>
      )}

      {/* Read-only notice */}
      {isReadOnly && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '0.5rem',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#92400e',
            margin: 0,
            fontWeight: '500'
          }}>
            👁️ You are viewing this project in read-only mode
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectFeedbackSection;