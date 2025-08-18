import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  TrendingUp, Award, Target, Calendar, Plus, Edit2, Trash2, 
  CheckCircle, Activity, BookOpen, ExternalLink, Loader, 
  BarChart3, Trophy, ArrowRight, FileText, StickyNote
} from 'lucide-react';
import './CareerDevelopmentTab.css';
import CareerCategoryGraph from './CareerCategoryGraph';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getResourcesArray = (resources) => {
  if (!resources) return [];
  if (Array.isArray(resources)) return resources;
  
  if (typeof resources === 'string') {
    try {
      const parsed = JSON.parse(resources);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  
  return [];
};

const validateGoalForm = (formData) => {
  const requiredFields = ['title', 'category', 'currentLevel', 'targetLevel', 'targetDate', 'priority'];
  
  for (let field of requiredFields) {
    if (!formData[field] || formData[field].trim() === '') {
      const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase();
      return {
        isValid: false,
        error: `Please fill in the ${fieldName} field.`
      };
    }
  }

  const targetDate = new Date(formData.targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (targetDate < today) {
    return {
      isValid: false,
      error: 'Target date must be in the future.'
    };
  }

  return { isValid: true };
};

// ============================================================================
// INITIAL FORM STATE
// ============================================================================

const initialFormState = {
  title: '',
  description: '',
  category: '',
  currentLevel: '',
  targetLevel: '',
  targetDate: '',
  priority: '',
  notes: '',
  resources: []
};

// ============================================================================
// PROGRESS HISTORY PROCESSING
// ============================================================================

const processProgressHistory = (rawHistory) => {
  if (!Array.isArray(rawHistory)) return [];
  
  const processedEntries = rawHistory.map((entry, index) => {
    // Determine if this is an initial note
    const isInitial = entry.isInitialNote || entry.is_initial_note || false;
    
    const processed = {
      id: entry.id || `entry-${index}`,
      type: isInitial ? 'initial' : 'progress',
      notes: entry.notes || '',
      previousProgress: entry.previousProgress || entry.previous_progress || 0,
      newProgress: entry.newProgress || entry.new_progress || entry.progress || 0,
      createdAt: entry.created_at || entry.createdAt || entry.updatedAt || entry.updated_at,
      originalEntry: entry
    };
    
    return processed;
  });
  
  // Sort by creation date (newest first for display)
  return processedEntries.sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA;
  });
};

// ============================================================================
// GOAL CARD COMPONENT
// ============================================================================

const GoalCard = React.memo(({ goal, onEdit, onDelete, onUpdateProgress, onViewNotes }) => {
  const progress = goal.progress || goal.current_progress || 0;
  const isCompleted = goal.status === 'completed';

  const handleEdit = useCallback(() => onEdit(goal), [onEdit, goal]);
  const handleDelete = useCallback(() => onDelete(goal.id, goal.title), [onDelete, goal.id, goal.title]);
  const handleProgress = useCallback(() => onUpdateProgress(goal), [onUpdateProgress, goal]);
  const handleViewNotes = useCallback(() => onViewNotes(goal), [onViewNotes, goal]);

  return (
    <div className="goal-card">
      <div className="goal-header">
        <div className="goal-title-section">
          <div className="goal-title-row">
            <h3 className="goal-title">{goal.title}</h3>
            <span className={`priority-badge priority-${goal.priority}`}>
              {goal.priority}
            </span>
            <span className={`category-badge category-${goal.category}`}>
              {goal.category}
            </span>
            {isCompleted && (
              <span className="priority-badge" style={{
                background: '#10b981', 
                color: 'white', 
                border: 'none'
              }}>
                ✅ Completed
              </span>
            )}
          </div>
          
          <div className="goal-meta">
            <span className="goal-meta-item">
              {isCompleted ? 
                `${goal.targetLevel || goal.target_level} (Completed)` :
                `${goal.currentLevel || goal.current_level} → ${goal.targetLevel || goal.target_level}`
              }
            </span>
            {(goal.targetDate || goal.target_date) && (
              <span className="goal-meta-item">
                <Calendar />
                {new Date(goal.targetDate || goal.target_date).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="goal-progress-section">
            <div className="goal-progress-header">
              <span className="goal-progress-label">Progress</span>
              <span className="goal-progress-value">{progress}%</span>
            </div>
            <div className="goal-progress-bar">
              <div
                className="goal-progress-fill"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: isCompleted ? '#10b981' : '#3b82f6'
                }}
              />
            </div>
          </div>

          {goal.description && (
            <div className="goal-notes">
              <p><span>Description:</span> {goal.description}</p>
            </div>
          )}

          {goal.notes && (
            <div className="goal-notes">
              <p><span>Notes:</span> {goal.notes}</p>
            </div>
          )}

          {getResourcesArray(goal.resources).length > 0 && (
            <div className="goal-resources">
              <p>Learning Resources:</p>
              <div className="resources-list">
                {getResourcesArray(goal.resources).map((resource, index) => (
                  <div key={index} className="resource-item">
                    <BookOpen />
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-link"
                    >
                      {resource.name}
                      <ExternalLink />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="goal-actions">
          {!isCompleted && (
            <>
              <button
                onClick={handleProgress}
                className="goal-action-btn progress"
                title="Update Progress"
              >
                <Activity />
              </button>
              <button
                onClick={handleViewNotes}
                className="goal-action-btn notes"
                title="View Progress Notes"
              >
                <StickyNote />
              </button>
              <button
                onClick={handleEdit}
                className="goal-action-btn edit"
                title="Edit Goal"
              >
                <Edit2 />
              </button>
            </>
          )}
          <button
            onClick={handleDelete}
            className="goal-action-btn delete"
            title="Delete Goal"
          >
            <Trash2 />
          </button>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// COMPLETED GOAL CARD COMPONENT
// ============================================================================

const CompletedGoalCard = React.memo(({ goal, onViewDetails }) => {
  const handleClick = useCallback(() => {
    onViewDetails(goal);
  }, [onViewDetails, goal]);

  return (
    <div className="completed-goal-card" onClick={handleClick}>
      <div className="completed-goal-content">
        <div className="completed-goal-icon">
          <Trophy />
        </div>
        <div className="completed-goal-details">
          <div className="completed-goal-header">
            <h4 className="completed-goal-title">{goal.title}</h4>
            <div className="completed-goal-arrow">
              <ArrowRight />
            </div>
          </div>
          <p className="completed-goal-description">
            {goal.description || `Successfully achieved ${goal.targetLevel || goal.target_level || 'target'} level in ${goal.category}`}
          </p>
          <div className="completed-goal-meta">
            <span className="completed-goal-type">
              Completed
            </span>
            {goal.category && (
              <span className={`category-badge category-${goal.category}`}>
                {goal.category}
              </span>
            )}
            <span>{new Date(goal.completed_date || goal.updated_at || goal.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// PROGRESS NOTES TIMELINE COMPONENT
// ============================================================================

const ProgressNotesTimeline = React.memo(({ entries }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="notes-empty">
        <StickyNote className="notes-empty-icon" />
        <h4>No Progress Notes Yet</h4>
        <p>Progress notes will appear here as you update your goal progress.</p>
      </div>
    );
  }

  // Calculate progress update numbers (chronological order)
  const progressUpdates = entries.filter(entry => entry.type === 'progress');
  
  return (
    <div className="notes-timeline">
      {entries.map((entry, index) => {
        const isInitial = entry.type === 'initial';
        const isCompletion = entry.newProgress >= 100;
        
        // Calculate progress update number (reverse index for newest first display)
        let updateNumber = null;
        if (!isInitial) {
          const entryIndex = progressUpdates.findIndex(p => p.id === entry.id);
          updateNumber = progressUpdates.length - entryIndex;
        }

        return (
          <div key={entry.id} className="notes-entry">
            <div className="notes-entry-header">
              <div className="notes-entry-progress">
                <span className={`notes-progress-badge ${
                  isInitial ? 'goal-created-badge' : 
                  isCompletion ? 'completion-badge' : 
                  'progress-badge'
                }`}>
                  {isInitial ? 
                    'Goal Created' : 
                    isCompletion ?
                      `${entry.previousProgress}% → ${entry.newProgress}% (COMPLETED)` :
                      `${entry.previousProgress}% → ${entry.newProgress}%`
                  }
                </span>
                <span className="notes-entry-date">
                  {new Date(entry.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
            <div className="notes-entry-content">
              <p>{entry.notes || (isInitial ? 'Goal created' : 'No notes provided for this update')}</p>
              {!isInitial && updateNumber && (
                <div className="notes-entry-meta">
                  <small>
                    {isCompletion ? 
                      `Progress Update #${updateNumber} (COMPLETED)` :
                      `Progress Update #${updateNumber}`
                    }
                  </small>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ============================================================================
// NOTES HISTORY MODAL
// ============================================================================

const NotesHistoryModal = React.memo(({ goal, isOpen, onClose, apiService }) => {
  const [progressHistory, setProgressHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && goal && apiService) {
      loadProgressHistory();
    }
  }, [isOpen, goal, apiService]);

  const loadProgressHistory = async () => {
    try {
      setLoading(true);
      
      const response = await apiService.getGoalProgressHistory(goal.id);
      
      let historyData = [];
      if (response?.data?.data && Array.isArray(response.data.data)) {
        historyData = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        historyData = response.data;
      } else if (response && Array.isArray(response)) {
        historyData = response;
      }
      
      const processedHistory = processProgressHistory(historyData);
      setProgressHistory(processedHistory);
      
    } catch (error) {
      console.error('Error loading progress history:', error);
      setProgressHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !goal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content notes-modal">
        <div className="modal-header-section">
          <h3 className="modal-header">Progress Notes History</h3>
          <button onClick={onClose} className="modal-close-btn" title="Close">×</button>
        </div>
        
        <div className="notes-goal-info">
          <h4 className="notes-goal-title">{goal.title}</h4>
          <p className="notes-goal-meta">
            {goal.currentLevel || goal.current_level} → {goal.targetLevel || goal.target_level}
          </p>
          <p className="notes-goal-category">
            <span className={`category-badge category-${goal.category}`}>
              {goal.category}
            </span>
            <span className={`priority-badge priority-${goal.priority}`}>
              {goal.priority}
            </span>
          </p>
        </div>

        <div className="notes-content">
          {loading ? (
            <div className="notes-loading">
              <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
              Loading progress history...
            </div>
          ) : (
            <ProgressNotesTimeline entries={progressHistory} />
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="modal-submit-btn">Close</button>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// COMPLETED GOAL DETAILS MODAL
// ============================================================================

const CompletedGoalDetailsModal = React.memo(({ 
  goal, 
  isOpen, 
  onClose, 
  apiService,
  onDeleteGoal
}) => {
  const [goalDetails, setGoalDetails] = useState(null);
  const [progressHistory, setProgressHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && goal && apiService) {
      loadCompletedGoalData();
    }
  }, [isOpen, goal, apiService]);

  const loadCompletedGoalData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🏆 Loading completed goal data for:', goal.title);
      console.log('🔍 Completed goal object:', goal);
      
      // TEMPORARY FIX: For completed goals without goal_id, find the correct goal by title
      let goalId = goal.goal_id;
      
      if (!goalId) {
        console.log('⚠️ No goal_id found, searching for goal by title...');
        try {
          const goalsResponse = await apiService.getCareerGoals();
          const allGoals = goalsResponse.data || [];
          
          // Try to find the goal by matching the title (remove "Completed: " prefix)
          const goalTitle = goal.title.replace('Completed: ', '');
          const matchingGoal = allGoals.find(g => 
            g.title === goalTitle || 
            g.title.toLowerCase() === goalTitle.toLowerCase()
          );
          
          if (matchingGoal) {
            goalId = matchingGoal.id;
            console.log('✅ Found matching goal by title:', goalTitle, '-> Goal ID:', goalId);
          } else {
            console.log('🔍 Available goals:', allGoals.map(g => ({ id: g.id, title: g.title })));
            
            // Fallback: find the most recent completed goal with matching category
            const completedGoals = allGoals.filter(g => 
              g.status === 'completed' && 
              g.category === goal.skillCategory
            ).sort((a, b) => new Date(b.updated_at || b.updatedAt) - new Date(a.updated_at || a.updatedAt));
            
            if (completedGoals.length > 0) {
              goalId = completedGoals[0].id;
              console.log('🎯 Using most recent completed goal with matching category:', goalId);
            } else {
              goalId = goal.id; // Final fallback
              console.log('⚠️ No matching goal found, using goal ID as fallback:', goalId);
            }
          }
        } catch (goalSearchError) {
          console.error('❌ Error searching for matching goal:', goalSearchError);
          goalId = goal.id; // Fallback to goal ID
        }
      }
      
      console.log('🎯 Final goal ID to use:', goalId);

      // Load progress history
      try {
        const historyResponse = await apiService.getGoalProgressHistory(goalId);
        
        let historyData = [];
        if (historyResponse?.data?.data && Array.isArray(historyResponse.data.data)) {
          historyData = historyResponse.data.data;
        } else if (historyResponse?.data && Array.isArray(historyResponse.data)) {
          historyData = historyResponse.data;
        } else if (historyResponse && Array.isArray(historyResponse)) {
          historyData = historyResponse;
        }
        
        console.log('📊 Raw progress history for goal', goalId, ':', historyData);
        const processedHistory = processProgressHistory(historyData);
        setProgressHistory(processedHistory);
        
      } catch (historyError) {
        console.error('❌ Error loading progress history:', historyError);
        setProgressHistory([]);
      }

      // Try to load goal details
      try {
        const goalsResponse = await apiService.getCareerGoals();
        const allGoals = goalsResponse.data || [];
        
        let goalDetail = allGoals.find(g => g.id === goalId);
        
        if (!goalDetail) {
          // Create fallback goal data from completed goal
          goalDetail = {
            id: goalId,
            title: goal.title.replace('Completed: ', ''),
            description: goal.description || '',
            category: goal.skillCategory || 'unknown',
            currentLevel: 'completed',
            targetLevel: 'advanced',
            priority: 'completed',
            progress: 100,
            status: 'completed',
            resources: '[]'
          };
        }
        
        setGoalDetails(goalDetail);
        
      } catch (goalError) {
        console.error('❌ Error loading goal details:', goalError);
        setGoalDetails(null);
      }

    } catch (err) {
      console.error('❌ Error loading completed goal data:', err);
      setError('Failed to load completed goal details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the completed goal "${goal.title}"?`)) {
      onDeleteGoal && onDeleteGoal(goal.id, goal.title);
    }
  };

  if (!isOpen || !goal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content completed-goal-details-modal">
        <div className="modal-header-section">
          <h3 className="modal-header">Completed Goal Details</h3>
          <button onClick={onClose} className="modal-close-btn" title="Close">×</button>
        </div>

        <div className="completed-goal-info">
          <div className="completed-goal-info-header">
            <Trophy className="completed-goal-info-icon" />
            <h4 className="completed-goal-info-title">{goal.title}</h4>
          </div>
          <p className="completed-goal-info-description">
            {goal.description || `Successfully completed goal: ${goal.title}`}
          </p>
          <div className="completed-goal-info-meta">
            <span>{goal.completedType?.replace('_', ' ') || 'completed goal'}</span>
            {goal.skillCategory && (
              <span className={`category-badge category-${goal.skillCategory}`}>
                {goal.skillCategory}
              </span>
            )}
            <span>Completed on {new Date(goal.dateCompleted || goal.completed_date || goal.updated_at || goal.updatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
        </div>

        {loading ? (
          <div className="completed-goal-loading">
            <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
            Loading completed goal details...
          </div>
        ) : error ? (
          <div className="completed-goal-error">
            <p>{error}</p>
          </div>
        ) : (
          <div>
            {goalDetails && (
              <div className="goal-summary">
                <h4>Goal Summary</h4>
                <div className="goal-summary-grid">
                  <div className="goal-summary-item">
                    <strong>Skill Level:</strong> {goalDetails.currentLevel || goalDetails.current_level} → {goalDetails.targetLevel || goalDetails.target_level}
                  </div>
                  <div className="goal-summary-item">
                    <strong>Priority:</strong> 
                    <span className={`priority-badge priority-${goalDetails.priority}`} style={{ marginLeft: '0.5rem' }}>
                      {goalDetails.priority}
                    </span>
                  </div>
                  <div className="goal-summary-item">
                    <strong>Target Date:</strong> {goalDetails.targetDate ? new Date(goalDetails.targetDate).toLocaleDateString() : 'Not set'}
                  </div>
                  <div className="goal-summary-item">
                    <strong>Final Progress:</strong> {goalDetails.progress || goalDetails.current_progress || 100}%
                  </div>
                </div>
                {goalDetails.description && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <strong>Description:</strong> {goalDetails.description}
                  </div>
                )}
              </div>
            )}

            <div className="completed-goal-progress-history">
              <h4>Progress Notes History</h4>
              <ProgressNotesTimeline entries={progressHistory} />
            </div>

            {goalDetails && goalDetails.resources && JSON.parse(goalDetails.resources || '[]').length > 0 && (
              <div className="completed-goal-resources">
                <h4>Learning Resources Used</h4>
                <div>
                  {JSON.parse(goalDetails.resources).map((resource, index) => (
                    <div key={index} className="completed-goal-resource-item">
                      <BookOpen size={16} />
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        {resource.name}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="modal-cancel-btn">Close</button>
          {onDeleteGoal && (
            <button
              onClick={handleDelete}
              className="modal-cancel-btn"
              style={{ backgroundColor: '#dc2626', color: 'white', marginLeft: '8px' }}
            >
              Delete Completed Goal
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// PROGRESS UPDATE MODAL
// ============================================================================

const ProgressUpdateModal = React.memo(({ goal, isOpen, onClose, onUpdate }) => {
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (goal && isOpen) {
      setProgress(goal.progress || goal.current_progress || 0);
      setNotes('');
    }
  }, [goal, isOpen]);

  const handleUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      await onUpdate(goal.id, progress, notes);
    } finally {
      setUpdating(false);
    }
  }, [onUpdate, goal?.id, progress, notes]);

  if (!isOpen || !goal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content progress-modal">
        <h3 className="modal-header">Update Progress</h3>
        
        <div>
          <div className="form-group">
            <p><strong>Goal:</strong> {goal.title}</p>
            <p className="completed-goal-meta">
              {goal.currentLevel || goal.current_level} → {goal.targetLevel || goal.target_level}
            </p>
            <p className="completed-goal-meta">
              Current Progress: {goal.progress || goal.current_progress || 0}%
            </p>
          </div>

          <div className="progress-slider-container">
            <label className="progress-slider-label">
              New Progress: {progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              className="progress-slider"
            />
            <div className="progress-ticks">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Progress Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-textarea"
              rows="3"
              placeholder="What progress have you made? Any challenges or insights?"
            />
          </div>

          {progress >= 100 && (
            <div className="completion-notice">
              <p>
                <CheckCircle />
                🎉 Congratulations! This goal will be marked as completed!
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button
              onClick={onClose}
              disabled={updating}
              className="modal-cancel-btn"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="modal-submit-btn"
            >
              {updating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Progress'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// GOAL FORM MODAL
// ============================================================================

const GoalFormModal = React.memo(({ 
  isOpen, 
  onClose, 
  formData, 
  setFormData, 
  onSubmit, 
  isEditing, 
  newResource, 
  setNewResource 
}) => {
  const handleAddResource = useCallback(() => {
    if (newResource.name.trim() && newResource.url.trim()) {
      const resourceToAdd = { 
        ...newResource, 
        id: Date.now().toString()
      };
      setFormData(prev => ({
        ...prev,
        resources: [...(prev.resources || []), resourceToAdd]
      }));
      setNewResource({ name: '', url: '' });
    }
  }, [newResource, setFormData, setNewResource]);

  const handleRemoveResource = useCallback((resourceId) => {
    setFormData(prev => ({
      ...prev,
      resources: (prev.resources || []).filter(r => r.id !== resourceId)
    }));
  }, [setFormData]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-header">
          {isEditing ? 'Edit Career Goal' : 'Add New Career Goal'}
        </h3>
        
        <div>
          <div className="form-group">
            <label className="form-label">
              Goal Title <span className="form-required">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
              className="form-input"
              placeholder="e.g., Master React.js, Leadership Skills"
            />
          </div>

          // FIXED Category Dropdown - Replace this section in your GoalFormModal

            <div className="form-group">
            <label className="form-label">
                Category <span className="form-required">*</span>
            </label>
            <select 
                value={formData.category}
                onChange={(e) => setFormData(prev => ({...prev, category: e.target.value}))}
                className="form-select"
            >
                <option value="">Select a category...</option>
                <option value="technical">Technical Skills</option>
                <option value="management">Management</option>
                <option value="communication">Communication</option>
                <option value="design">Design</option>
                <option value="analytics">Data Analytics</option>
                <option value="leadership">Leadership</option>
                <option value="business strategy">Business Strategy</option>
                <option value="team building">Team Building</option>
                <option value="innovation">Innovation</option>
            </select>
            </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Current Level <span className="form-required">*</span>
              </label>
              <select 
                value={formData.currentLevel}
                onChange={(e) => setFormData(prev => ({...prev, currentLevel: e.target.value}))}
                className="form-select"
              >
                <option value="">Select current level...</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Target Level <span className="form-required">*</span>
              </label>
              <select 
                value={formData.targetLevel}
                onChange={(e) => setFormData(prev => ({...prev, targetLevel: e.target.value}))}
                className="form-select"
              >
                <option value="">Select target level...</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Target Date <span className="form-required">*</span>
              </label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData(prev => ({...prev, targetDate: e.target.value}))}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Priority <span className="form-required">*</span>
              </label>
              <select 
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value}))}
                className="form-select"
              >
                <option value="">Select priority...</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              className="form-textarea"
              rows="3"
              placeholder="Describe your goal and what you want to achieve..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
              className="form-textarea"
              rows="2"
              placeholder="Any additional notes about this goal..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Learning Resources</label>
            
            <div className="resource-form">
              <input
                type="text"
                value={newResource.name}
                onChange={(e) => setNewResource(prev => ({...prev, name: e.target.value}))}
                placeholder="Resource name"
                className="form-input"
              />
              <input
                type="url"
                value={newResource.url}
                onChange={(e) => setNewResource(prev => ({...prev, url: e.target.value}))}
                placeholder="https://..."
                className="form-input"
              />
              <button
                type="button"
                onClick={handleAddResource}
                className="resource-add-btn"
              >
                Add
              </button>
            </div>

            {getResourcesArray(formData.resources).length > 0 && (
              <div className="resource-list">
                {getResourcesArray(formData.resources).map((resource, index) => (
                  <div key={resource.id || index} className="resource-list-item">
                    <div className="resource-list-info">
                      <BookOpen />
                      <div>
                        <div className="resource-list-name">{resource.name}</div>
                        <div className="resource-list-url">({resource.url})</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveResource(resource.id || index)}
                      className="resource-remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="modal-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="modal-submit-btn"
            >
              {isEditing ? 'Update Goal' : 'Add Goal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CareerDevelopmentTab = ({ currentUser, apiService, onDataChange }) => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [careerGoals, setCareerGoals] = useState([]);
  const [careerStats, setCareerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoalForProgress, setSelectedGoalForProgress] = useState(null);
  const [selectedGoalForNotes, setSelectedGoalForNotes] = useState(null);
  const [selectedCompletedGoal, setSelectedCompletedGoal] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState(initialFormState);
  const [newResource, setNewResource] = useState({ name: '', url: '' });

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadCareerData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Add cache-busting parameter to force fresh data
      const timestamp = Date.now();
      
      const [goalsResponse, statsResponse] = await Promise.all([
        apiService.getCareerGoals(),
        apiService.getCareerStats().catch(err => ({ 
          data: { totalGoals: 0, completedGoals: 0, activeGoals: 0 } 
        }))
      ]);
      
      console.log('🔄 Fresh goals loaded:', goalsResponse.data?.length, 'goals');
      
      setCareerGoals(goalsResponse.data || []);
      setCareerStats(statsResponse.data || { totalGoals: 0, completedGoals: 0, activeGoals: 0 });
      
    } catch (error) {
      console.error('Error loading career data:', error);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Data change tracking
  const dataHash = useMemo(() => {
    return JSON.stringify({
      goalCount: careerGoals.length,
      statsHash: careerStats ? JSON.stringify(careerStats) : null
    });
  }, [careerGoals.length, careerStats]);

  const prevDataHashRef = useRef();
  useEffect(() => {
    if (prevDataHashRef.current !== dataHash && prevDataHashRef.current !== undefined) {
      onDataChange && onDataChange();
    }
    prevDataHashRef.current = dataHash;
  }, [dataHash, onDataChange]);

  useEffect(() => {
    loadCareerData();
  }, [loadCareerData]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const resetForm = useCallback(() => {
    setFormData(initialFormState);
    setEditingGoal(null);
    setNewResource({ name: '', url: '' });
  }, []);

  const handleCreateOrUpdateGoal = useCallback(async () => {
    const validation = validateGoalForm(formData);
    
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    try {
      const goalData = {
        title: formData.title,
        description: formData.description || '',
        category: formData.category,
        currentLevel: formData.currentLevel,
        targetLevel: formData.targetLevel,
        targetDate: formData.targetDate,
        priority: formData.priority,
        notes: formData.notes || '',
        resources: formData.resources || []
      };
      
      let response;
      if (editingGoal) {
        response = await apiService.updateCareerGoal(editingGoal.id, goalData);
      } else {
        response = await apiService.createCareerGoal(goalData);
      }
      
      if (response.success) {
        await loadCareerData();
        setShowAddModal(false);
        resetForm();
      }
    } catch (error) {
      console.error(`Error ${editingGoal ? 'updating' : 'creating'} goal:`, error);
      alert(`Failed to ${editingGoal ? 'update' : 'create'} goal: ${error.message}`);
    }
  }, [formData, editingGoal, apiService, loadCareerData, resetForm]);

  const handleEditGoal = useCallback((goal) => {
    setFormData({
      title: goal.title || '',
      description: goal.description || '',
      category: goal.category || '',
      currentLevel: goal.currentLevel || goal.current_level || '',
      targetLevel: goal.targetLevel || goal.target_level || '',
      targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : 
                   (goal.target_date ? goal.target_date.split('T')[0] : ''),
      priority: goal.priority || '',
      notes: goal.notes || '',
      resources: getResourcesArray(goal.resources)
    });
    setEditingGoal(goal);
    setShowAddModal(true);
  }, []);

  const handleDeleteGoal = useCallback(async (goalId, goalTitle) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to delete "${goalTitle}"?`)) {
      return;
    }

    try {
      const response = await apiService.deleteCareerGoal(goalId);
      
      if (response.success) {
        await loadCareerData();
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Failed to delete goal: ' + error.message);
    }
  }, [apiService, loadCareerData]);

  const handleViewNotes = useCallback((goal) => {
    setSelectedGoalForNotes(goal);
    setShowNotesModal(true);
  }, []);

  const handleProgressUpdate = useCallback(async (goalId, newProgress, notes = '') => {
    try {
      const response = await apiService.updateGoalProgress(goalId, newProgress, notes);
      
      if (response.success) {
        // Add a small delay to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await loadCareerData();
        setShowProgressModal(false);
        setSelectedGoalForProgress(null);
        
        if (newProgress >= 100) {
          alert('🎉 Congratulations! Goal completed!');
        }
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Failed to update progress: ' + error.message);
    }
  }, [apiService, loadCareerData]);

  const handleDeleteCompletedGoal = useCallback(async (goalId, goalTitle) => {
    try {
      const response = await apiService.deleteCareerGoal(goalId);
      
      if (response.success) {
        await loadCareerData();
        setShowCompletedModal(false);
        setSelectedCompletedGoal(null);
        alert(`Completed goal "${goalTitle}" has been deleted successfully.`);
      }
    } catch (error) {
      console.error('Error deleting completed goal:', error);
      alert('Failed to delete completed goal: ' + error.message);
    }
  }, [apiService, loadCareerData]);

  const handleViewCompletedGoalDetails = useCallback((goal) => {
    setSelectedCompletedGoal(goal);
    setShowCompletedModal(true);
  }, []);

  // Modal handlers
  const handleShowAddModal = useCallback(() => setShowAddModal(true), []);
  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    resetForm();
  }, [resetForm]);

  const handleCloseProgressModal = useCallback(() => {
    setShowProgressModal(false);
    setSelectedGoalForProgress(null);
  }, []);

  const handleCloseNotesModal = useCallback(() => {
    setShowNotesModal(false);
    setSelectedGoalForNotes(null);
  }, []);

  const handleCloseCompletedModal = useCallback(() => {
    setShowCompletedModal(false);
    setSelectedCompletedGoal(null);
  }, []);

  // Handle progress modal opening
  useEffect(() => {
    if (selectedGoalForProgress) {
      setShowProgressModal(true);
    } else {
      setShowProgressModal(false);
    }
  }, [selectedGoalForProgress]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const { activeGoals, completedGoals } = useMemo(() => ({
    activeGoals: careerGoals.filter(goal => goal.status !== 'completed'),
    completedGoals: careerGoals.filter(goal => goal.status === 'completed')
  }), [careerGoals]);

  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'goals', label: 'Active', icon: Target },
    { id: 'completed', label: 'Completed', icon: Award }
  ], []);

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <Loader className="loading-spinner" />
        <span className="loading-text">Loading career development data...</span>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="career-development-container">
      {/* Header */}
      <div className="career-header">
        <div className="career-header-text">
          <h2>Career Development</h2>
          <p>Track your skills, set goals, and monitor your professional growth</p>
        </div>
        <button onClick={handleShowAddModal} className="add-goal-btn">
          <Plus />
          <span>Add Goal</span>
        </button>
      </div>



      {/* Tabs */}
      <div className="tab-navigation">
        <nav className="tab-nav-list">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-icon target">
                    <Target />
                  </div>
                  <div className="stat-text">
                    <p>Total Goals</p>
                    <p>{(careerStats?.activeGoals || 0) + (careerStats?.completedGoals || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-icon target">
                    <Activity />
                  </div>
                  <div className="stat-text">
                    <p>Active Goals</p>
                    <p>{careerStats?.activeGoals || 0}</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-icon completed">
                    <Award />
                  </div>
                  <div className="stat-text">
                    <p>Completed Goals</p>
                    <p>{careerStats?.completedGoals || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="progress-overview">
              <h3>Active Goals Progress</h3>
              <div>
                {activeGoals.length === 0 ? (
                  <p style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                    No active goals to display. Create a new goal to start tracking progress!
                  </p>
                ) : (
                  activeGoals.slice(0, 5).map((goal) => (
                    <div key={goal.id} className="progress-item">
                      <div className="progress-info">
                        <p>{goal.title}</p>
                        <p>{goal.currentLevel || goal.current_level} → {goal.targetLevel || goal.target_level}</p>
                      </div>
                      <div className="progress-display">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${goal.progress || goal.current_progress || 0}%` }}
                          />
                        </div>
                        <span className="progress-percentage">
                          {goal.progress || goal.current_progress || 0}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <CareerCategoryGraph 
                goals={careerGoals} 
                completedGoals={completedGoals}
                />
            </div>
          </div>
        )}

        {/* Goals Tab - Only Active Goals */}
        {activeTab === 'goals' && (
          <div>
            {activeGoals.length === 0 ? (
              <div className="goals-empty">
                <Target />
                <h3>No Active Goals</h3>
                <p>Start by creating your first career development goal!</p>
                <button onClick={handleShowAddModal} className="add-first-goal-btn">
                  Add Your First Goal
                </button>
              </div>
            ) : (
              <div>
                <h3 style={{marginBottom: '16px', color: '#1f2937', fontSize: '18px', fontWeight: '600'}}>
                  Active Goals ({activeGoals.length})
                </h3>
                <div className="goals-list">
                  {activeGoals.map((goal) => (
                    <GoalCard 
                      key={goal.id} 
                      goal={goal} 
                      onEdit={handleEditGoal}
                      onDelete={handleDeleteGoal}
                      onUpdateProgress={setSelectedGoalForProgress}
                      onViewNotes={handleViewNotes}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completed Tab - Only Completed Goals */}
        {activeTab === 'completed' && (
          <div>
            {completedGoals.length === 0 ? (
              <div className="completed-goals-empty">
                <Award />
                <h3>No Completed Goals Yet</h3>
                <p>Complete career goals to see them here!</p>
              </div>
            ) : (
              <div>
                <div style={{ 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.125rem', fontWeight: '600' }}>
                    Completed Goals ({completedGoals.length})
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                    Click on any completed goal to view detailed progress history
                  </p>
                </div>
                <div className="completed-goals-list">
                  {completedGoals.map((goal) => (
                    <CompletedGoalCard 
                      key={goal.id} 
                      goal={goal} 
                      onViewDetails={handleViewCompletedGoalDetails}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <GoalFormModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreateOrUpdateGoal}
        isEditing={!!editingGoal}
        newResource={newResource}
        setNewResource={setNewResource}
      />

      <ProgressUpdateModal
        goal={selectedGoalForProgress}
        isOpen={showProgressModal}
        onClose={handleCloseProgressModal}
        onUpdate={handleProgressUpdate}
      />

      <NotesHistoryModal
        goal={selectedGoalForNotes}
        isOpen={showNotesModal}
        onClose={handleCloseNotesModal}
        apiService={apiService}
      />

      <CompletedGoalDetailsModal
        goal={selectedCompletedGoal}
        isOpen={showCompletedModal}
        onClose={handleCloseCompletedModal}
        apiService={apiService}
        onDeleteGoal={handleDeleteCompletedGoal}
      />
    </div>
  );
};

export default CareerDevelopmentTab;