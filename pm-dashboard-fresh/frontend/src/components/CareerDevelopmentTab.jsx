import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  TrendingUp, Award, Target, Calendar, Plus, Edit2, Trash2, 
  CheckCircle, Activity, BookOpen, ExternalLink, Loader, 
  BarChart3, Trophy, ArrowRight, FileText, StickyNote,
  AlertCircle, RefreshCw
} from 'lucide-react';
import './CareerDevelopmentTab.css';
import CareerCategoryGraph from './CareerCategoryGraph';

const cleanInsightMessage = (message) => {
    if (!message) return 'Career analysis completed';
  
    return message
      .replace(/\b\w+\.(js|jsx|ts|tsx|json|md|txt|csv)\b/gi, '')
      .replace(/\/api\/[a-zA-Z\/\-_]+/gi, '')
      .replace(/\b(apiService|database|query|response|endpoint)\b/gi, '')
      .replace(/\b(function|method|console|error|log)\b/gi, '')
      .replace(/\b(training materials?|knowledge base|document)\b/gi, 'professional expertise')
      .replace(/\b(based on the training materials)\b/gi, 'based on best practices')
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*,/g, ',')
      .trim();
  };

const parseAIInsights = (responseText) => {
  try {
    console.log('Parsing AI response (first 300 chars):', responseText.substring(0, 300));
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('Found JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.insights && Array.isArray(parsed.insights)) {
        return parsed.insights.slice(0, 3).map(insight => ({
          type: insight.type || 'info',
          message: cleanInsightMessage(insight.message || 'AI analysis completed')
        }));
      }
    }
    
    const lines = responseText.split('\n')
      .filter(line => line.trim() && !line.includes('{') && !line.includes('}'))
      .filter(line => line.length > 10)
      .slice(0, 3);
    
    return lines.map(line => ({
      type: line.includes('warning') || line.includes('critical') || line.includes('urgent') ? 'warning' :
            line.includes('success') || line.includes('opportunity') || line.includes('excellent') ? 'success' : 'info',
        message: cleanInsightMessage(line.replace(/^[-•*]\s*/, '').trim().substring(0, 150))
    }));
    
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return [];
  }
};

const generateCareerInsights = (goals, completedGoals) => {
  const insights = [];
  
  const allGoals = [...goals, ...completedGoals];
  const activeGoals = goals.filter(goal => goal.status !== 'completed');
  const totalActive = activeGoals.length;
  const totalCompleted = completedGoals.length;
  
  if (allGoals.length === 0) {
    insights.push({
      type: 'info',
      message: 'Start your career development journey by creating 2-3 specific, measurable goals in your priority skill areas.'
    });
    return insights;
  }

  const categories = {};
  allGoals.forEach(goal => {
    const category = goal.category || 'uncategorized';
    if (!categories[category]) {
      categories[category] = {
        active: 0,
        completed: 0,
        totalProgress: 0,
        count: 0,
        hasRecentActivity: false
      };
    }
    
    if (goal.status === 'completed') {
      categories[category].completed += 1;
    } else {
      categories[category].active += 1;
      const progress = goal.current_progress || goal.progress || 0;
      categories[category].totalProgress += progress;
    }
    
    categories[category].count += 1;
    
    if (goal.updated_at) {
      const lastUpdate = new Date(goal.updated_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (lastUpdate > weekAgo) {
        categories[category].hasRecentActivity = true;
      }
    }
  });

  Object.keys(categories).forEach(category => {
    const cat = categories[category];
    cat.avgProgress = cat.active > 0 ? Math.round(cat.totalProgress / cat.active) : 0;
  });

  if (totalActive === 0) {
    insights.push({
      type: 'info',
      message: `Great job completing ${totalCompleted} goals! Consider setting new challenges to continue your growth momentum.`
    });
  } else if (totalActive > 12) {
    insights.push({
      type: 'warning',
      message: `${totalActive} active goals may reduce focus effectiveness. Solution: Choose your top 5 priorities and move others to a "future focus" list.`
    });
  } else {
    const strugglingCategories = Object.entries(categories)
      .filter(([_, cat]) => cat.active > 0 && cat.avgProgress < 30)
      .sort((a, b) => a[1].avgProgress - b[1].avgProgress);
    
    if (strugglingCategories.length > 0) {
      const [categoryName, categoryData] = strugglingCategories[0];
      insights.push({
        type: 'warning',
        message: `${categoryName} goals need attention at ${categoryData.avgProgress}% average progress. Solution: Break goals into smaller weekly milestones and set up progress reminders.`
      });
    } else {
      const avgProgress = Math.round(activeGoals.reduce((sum, goal) => sum + (goal.current_progress || goal.progress || 0), 0) / totalActive);
      insights.push({
        type: 'success',
        message: `Strong portfolio performance with ${avgProgress}% average progress across ${totalActive} active goals. Keep up the excellent momentum!`
      });
    }
  }

  const performingCategories = Object.entries(categories)
    .filter(([_, cat]) => cat.active > 0 && cat.avgProgress > 60)
    .sort((a, b) => b[1].avgProgress - a[1].avgProgress);

  if (performingCategories.length > 0) {
    const [categoryName, categoryData] = performingCategories[0];
    insights.push({
      type: 'success',
      message: `${categoryName} is excelling at ${categoryData.avgProgress}% progress. Strategy: Document your successful approach here and apply it to other skill areas.`
    });
  } else if (totalCompleted > 0) {
    insights.push({
      type: 'success',
      message: `${totalCompleted} completed goals show your ability to deliver results. Strategy: Analyze what worked and replicate those patterns in current goals.`
    });
  }

  const inactiveCategories = Object.entries(categories)
    .filter(([_, cat]) => cat.active > 0 && !cat.hasRecentActivity);

  if (inactiveCategories.length > 0) {
    insights.push({
      type: 'info',
      message: `${inactiveCategories.length} skill areas haven't been updated recently. Strategy: Schedule weekly 15-minute review sessions to maintain momentum across all goals.`
    });
  } else if (totalActive > 0) {
    const completionRate = totalCompleted > 0 ? Math.round((totalCompleted / allGoals.length) * 100) : 0;
    if (completionRate < 30) {
      insights.push({
        type: 'info',
        message: `${completionRate}% completion rate suggests ambitious goals. Strategy: Consider reducing scope or breaking goals into smaller milestones to build momentum.`
      });
    } else {
      insights.push({
        type: 'info',
        message: `Consistent tracking shows discipline. Strategy: Schedule monthly goal review sessions to adjust priorities and celebrate achievements.`
      });
    }
  }

  return insights.slice(0, 3);
};

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

const processProgressHistory = (rawHistory) => {
  if (!Array.isArray(rawHistory)) return [];
  
  const processedEntries = rawHistory.map((entry, index) => {
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
  
  return processedEntries.sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA;
  });
};

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
                âœ… Completed
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

  const progressUpdates = entries.filter(entry => entry.type === 'progress');
  
  return (
    <div className="notes-timeline">
      {entries.map((entry, index) => {
        const isInitial = entry.type === 'initial';
        const isCompletion = entry.newProgress >= 100;
        
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
          <button onClick={onClose} className="modal-close-btn" title="Close">X</button>
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
      
      console.log('Loading completed goal data for:', goal.title);
      console.log('Completed goal object:', goal);
      
      let goalId = goal.goal_id;
      
      if (!goalId) {
        console.log('No goal_id found, searching for goal by title...');
        try {
          const goalsResponse = await apiService.getCareerGoals();
          const allGoals = goalsResponse.data || [];
          
          const goalTitle = goal.title.replace('Completed: ', '');
          const matchingGoal = allGoals.find(g => 
            g.title === goalTitle || 
            g.title.toLowerCase() === goalTitle.toLowerCase()
          );
          
          if (matchingGoal) {
            goalId = matchingGoal.id;
            console.log('Found matching goal by title:', goalTitle, '-> Goal ID:', goalId);
          } else {
            console.log('Available goals:', allGoals.map(g => ({ id: g.id, title: g.title })));
            
            const completedGoals = allGoals.filter(g => 
              g.status === 'completed' && 
              g.category === goal.skillCategory
            ).sort((a, b) => new Date(b.updated_at || b.updatedAt) - new Date(a.updated_at || a.updatedAt));
            
            if (completedGoals.length > 0) {
              goalId = completedGoals[0].id;
              console.log('Using most recent completed goal with matching category:', goalId);
            } else {
              goalId = goal.id; 
              console.log('No matching goal found, using goal ID as fallback:', goalId);
            }
          }
        } catch (goalSearchError) {
          console.error('Error searching for matching goal:', goalSearchError);
          goalId = goal.id;
        }
      }
      
      console.log('Final goal ID to use:', goalId);

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
        
        console.log('Raw progress history for goal', goalId, ':', historyData);
        const processedHistory = processProgressHistory(historyData);
        setProgressHistory(processedHistory);
        
      } catch (historyError) {
        console.error('Error loading progress history:', historyError);
        setProgressHistory([]);
      }

      try {
        const goalsResponse = await apiService.getCareerGoals();
        const allGoals = goalsResponse.data || [];
        
        let goalDetail = allGoals.find(g => g.id === goalId);
        
        if (!goalDetail) {
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
        console.error('Error loading goal details:', goalError);
        setGoalDetails(null);
      }

    } catch (err) {
      console.error('Error loading completed goal data:', err);
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
          <button onClick={onClose} className="modal-close-btn" title="Close">X</button>
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
                Congratulations! This goal will be marked as completed!
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

const CareerDevelopmentTab = ({ currentUser, apiService, onDataChange }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [careerGoals, setCareerGoals] = useState([]);
  const [careerStats, setCareerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoalForProgress, setSelectedGoalForProgress] = useState(null);
  const [selectedGoalForNotes, setSelectedGoalForNotes] = useState(null);
  const [selectedCompletedGoal, setSelectedCompletedGoal] = useState(null);
  
  const [formData, setFormData] = useState(initialFormState);
  const [newResource, setNewResource] = useState({ name: '', url: '' });

  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState(null);

  const generateAIInsights = useCallback(async () => {
    if (!apiService) {
      console.log('No apiService provided, using fallback insights');
      const activeGoals = careerGoals.filter(goal => goal.status !== 'completed');
      const completedGoals = careerGoals.filter(goal => goal.status === 'completed');
      const fallbackInsights = generateCareerInsights(activeGoals, completedGoals);
      setInsights(fallbackInsights);
      return;
    }

    try {
      setAiInsightsError(null);
      
      const activeGoals = careerGoals.filter(goal => goal.status !== 'completed');
      const completedGoals = careerGoals.filter(goal => goal.status === 'completed');
      
      if (careerGoals.length === 0) {
        console.log('No goals found');
        setInsights([{
          type: 'info',
          message: 'Start your career development journey by creating 2-3 specific, measurable goals in your priority skill areas.'
        }]);
        return;
      }

      console.log('Generating AI career insights for', activeGoals.length, 'active goals and', completedGoals.length, 'completed goals');

      const allGoals = [...careerGoals];
      
      const analysisData = {
        totalGoals: allGoals.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        completionRate: allGoals.length > 0 ? Math.round((completedGoals.length / allGoals.length) * 100) : 0,
        avgProgress: activeGoals.length > 0 ? Math.round(activeGoals.reduce((sum, goal) => sum + (goal.current_progress || goal.progress || 0), 0) / activeGoals.length) : 0,
        
        categories: (() => {
          const categoryMap = {};
          allGoals.forEach(goal => {
            const category = goal.category || 'uncategorized';
            if (!categoryMap[category]) {
              categoryMap[category] = { active: 0, completed: 0, totalProgress: 0, activeCount: 0 };
            }
            
            if (goal.status === 'completed') {
              categoryMap[category].completed += 1;
            } else {
              categoryMap[category].active += 1;
              categoryMap[category].totalProgress += (goal.current_progress || goal.progress || 0);
              categoryMap[category].activeCount += 1;
            }
          });
          
          return Object.entries(categoryMap).map(([name, data]) => ({
            name,
            active: data.active,
            completed: data.completed,
            avgProgress: data.activeCount > 0 ? Math.round(data.totalProgress / data.activeCount) : 0
          }));
        })(),
        
        goals: allGoals.map(goal => ({
          title: goal.title,
          category: goal.category,
          progress: goal.current_progress || goal.progress || 0,
          status: goal.status,
          priority: goal.priority,
          updated_at: goal.updated_at
        }))
      };

      console.log('Analysis data prepared:', analysisData);

      const prompt = `You are an expert career development coach analyzing real career progress data. Provide exactly 3 strategic insights based on this actual data:

CAREER PORTFOLIO ANALYSIS:
- ${analysisData.totalGoals} total career goals: ${analysisData.activeGoals} active, ${analysisData.completedGoals} completed
- ${analysisData.completionRate}% completion rate, ${analysisData.avgProgress}% average progress across active goals

CATEGORY BREAKDOWN:
${analysisData.categories.map(cat => 
  `${cat.name}: ${cat.active} active, ${cat.completed} completed, ${cat.avgProgress}% avg progress`
).join('\n')}

GOAL DETAILS:
${analysisData.goals.slice(0, 10).map(g => `"${g.title}" (${g.category}): ${g.progress}% - ${g.status} - ${g.priority} priority`).join('\n')}

Provide specific, data-driven insights in JSON format:
{
  "insights": [
    {"type": "warning", "message": "[specific issue with solution] - Solution: [actionable recommendation]"},
    {"type": "success", "message": "[specific success pattern] - Strategy: [growth recommendation]"},
    {"type": "info", "message": "[strategic recommendation with specific next steps]"}
  ]
}

Requirements:
- Reference actual category names, goal titles, and metrics from the data
- Include "Solution:" or "Strategy:" with actionable recommendations
- Focus on the most critical issues and biggest opportunities
- Use natural, professional language
- Keep under 120 characters per insight to include solutions`;

      console.log('Sending career analysis prompt to AI...');

      try {
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
        
        console.log('Auth token found:', !!authToken);
        console.log('Sending request to /api/ai/chat...');
        
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'X-Context-Type': 'career-insights'
          },
          body: JSON.stringify({
            message: prompt,
            context: {
              type: 'career_insights',
              source: 'career_development_analysis',
              data: analysisData,
              analysisLevel: 'comprehensive',
              dataType: 'career'
            }
          })
        });

        console.log('Career analysis response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI service error details:', {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText,
            headers: Object.fromEntries(response.headers.entries())
          });
          throw new Error(`AI service error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('AI career analysis response received:', result);
        console.log('Full AI response structure:', {
          hasResponse: !!result.response,
          hasContent: !!result.content,
          hasMessage: !!result.message,
          keys: Object.keys(result)
        });

        const responseText = result.response || result.content || result.message || result.data || '';
        console.log('Response text length:', responseText.length);
        console.log('Response text preview:', responseText.substring(0, 500));
        
        if (!responseText) {
          console.warn('Empty AI response, using fallback');
          throw new Error('Empty response from AI service');
        }
        
        const parsedInsights = parseAIInsights(responseText);
        console.log('Parsed insights:', parsedInsights);
        
        if (parsedInsights.length > 0) {
          setInsights(parsedInsights);
          console.log('Career AI insights successfully generated:', parsedInsights.length, parsedInsights);
        } else {
          console.warn('AI analysis returned empty insights, using fallback');
          const fallbackInsights = generateCareerInsights(activeGoals, completedGoals);
          setInsights(fallbackInsights);
          console.log('Fallback insights generated:', fallbackInsights.length);
        }

      } catch (aiError) {
        console.error('AI service failed with error:', {
          name: aiError.name,
          message: aiError.message,
          stack: aiError.stack
        });
        console.log('Using fallback insights due to AI failure...');
        
        const fallbackInsights = generateCareerInsights(activeGoals, completedGoals);
        setInsights(fallbackInsights);
        console.log('Fallback insights generated after AI failure:', fallbackInsights.length);
      }

    } catch (error) {
      console.error('Failed to generate career insights:', error);
      setAiInsightsError('Unable to generate insights at this time');
      
      try {
        const activeGoals = careerGoals.filter(goal => goal.status !== 'completed');
        const completedGoals = careerGoals.filter(goal => goal.status === 'completed');
        const fallbackInsights = generateCareerInsights(activeGoals, completedGoals);
        setInsights(fallbackInsights);
      } catch (fallbackError) {
        console.error('Even fallback insights failed:', fallbackError);
        setInsights([]);
      }
    }
  }, [careerGoals, apiService]);

  const handleRefreshInsights = useCallback(async () => {
    console.log('Manual career insights refresh triggered');
    setInsightsLoading(true);
    setAiInsightsError(null);
    
    try {
      await generateAIInsights();
      console.log('Career insights refresh completed successfully');
    } catch (error) {
      console.error('Failed to refresh career insights:', error);
      setAiInsightsError('Failed to refresh insights - please try again');
    } finally {
      setInsightsLoading(false);
    }
  }, [generateAIInsights]);

  const loadCareerData = useCallback(async () => {
    try {
      setLoading(true);
      
      const timestamp = Date.now();
      
      const [goalsResponse, statsResponse] = await Promise.all([
        apiService.getCareerGoals(),
        apiService.getCareerStats().catch(err => ({ 
          data: { totalGoals: 0, completedGoals: 0, activeGoals: 0 } 
        }))
      ]);
      
      console.log('Fresh goals loaded:', goalsResponse.data?.length, 'goals');
      
      setCareerGoals(goalsResponse.data || []);
      setCareerStats(statsResponse.data || { totalGoals: 0, completedGoals: 0, activeGoals: 0 });
      
    } catch (error) {
      console.error('Error loading career data:', error);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

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

  useEffect(() => {
  const shouldGenerateInsights = () => {
    if (careerGoals.length === 0 && insights.length === 0) {
      console.log('First load - generating default insights');
      return true;
    }
    
    if (careerGoals.length > 0) {
      console.log('Career goals loaded - generating insights');
      return true;
    }
    
    return false;
  };

  const timer = setTimeout(() => {
    if (shouldGenerateInsights()) {
      console.log('Auto-generating career insights...');
      setInsightsLoading(true);
      generateAIInsights().finally(() => {
        setInsightsLoading(false);
      });
    } else {
      console.log('Setting default insight for empty state');
      setInsights([{
        type: 'info',
        message: 'Create your first career goal to start getting AI insights and personalized recommendations.'
      }]);
    }
  }, 1000); 

  return () => clearTimeout(timer);
}, [careerGoals.length, generateAIInsights]); 
useEffect(() => {
    if (activeTab === 'overview' && careerGoals.length > 0 && insights.length === 0) {
      console.log('Switched to overview tab - auto-generating insights');
      const timer = setTimeout(() => {
        setInsightsLoading(true);
        generateAIInsights().finally(() => {
          setInsightsLoading(false);
        });
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, careerGoals.length, insights.length, generateAIInsights]);

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
    if (window.confirm(`Are you sure you want to delete "${goalTitle}"?`)) {
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
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await loadCareerData();
        setShowProgressModal(false);
        setSelectedGoalForProgress(null);
        
        if (newProgress >= 100) {
          alert('Congratulations! Goal completed!');
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

  useEffect(() => {
    if (selectedGoalForProgress) {
      setShowProgressModal(true);
    } else {
      setShowProgressModal(false);
    }
  }, [selectedGoalForProgress]);

  const { activeGoals, completedGoals } = useMemo(() => ({
    activeGoals: careerGoals.filter(goal => goal.status !== 'completed'),
    completedGoals: careerGoals.filter(goal => goal.status === 'completed')
  }), [careerGoals]);

  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'goals', label: 'Active', icon: Target },
    { id: 'completed', label: 'Completed', icon: Award }
  ], []);


  if (loading) {
    return (
      <div className="loading-container">
        <Loader className="loading-spinner" />
        <span className="loading-text">Loading career development data...</span>
      </div>
    );
  }

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

            {/* Career Category Graph */}
            <div style={{ marginBottom: '2rem' }}>
              <CareerCategoryGraph 
                goals={careerGoals} 
                completedGoals={completedGoals}
              />
            </div>

            {/* AI Career Insights Section */}
            <div style={{
              background: 'linear-gradient(to right, #eff6ff, #eef2ff)',
              borderRadius: '0.75rem',
              border: '1px solid #dbeafe',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#1e40af',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Activity size={20} />
                  AI Career Intelligence
                </h3>
                <button
                  onClick={handleRefreshInsights}
                  disabled={insightsLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(37, 99, 235, 0.1)',
                    border: '1px solid rgba(37, 99, 235, 0.2)',
                    borderRadius: '0.5rem',
                    color: '#1e40af',
                    cursor: insightsLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: insightsLoading ? 0.6 : 1
                  }}
                >
                  {insightsLoading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
                  {insightsLoading ? 'Analyzing...' : 'Refresh Insights'}
                </button>
              </div>
              
              {insightsLoading ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '2rem',
                  color: '#1e40af'
                }}>
                  <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ marginLeft: '0.5rem' }}>Analyzing your career progress...</span>
                </div>
              ) : aiInsightsError ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '1rem',
                  color: '#dc2626',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  borderRadius: '0.5rem'
                }}>
                  <AlertCircle size={16} />
                  <span style={{ fontSize: '0.875rem' }}>{aiInsightsError}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {insights.map((insight, index) => {
                    const getIcon = (type) => {
                      switch(type) {
                        case 'warning': return <AlertCircle size={16} style={{ color: '#f59e0b', marginTop: '0.125rem' }} />;
                        case 'success': return <Target size={16} style={{ color: '#10b981', marginTop: '0.125rem' }} />;
                        case 'info': return <TrendingUp size={16} style={{ color: '#2563eb', marginTop: '0.125rem' }} />;
                        default: return <Activity size={16} style={{ color: '#2563eb', marginTop: '0.125rem' }} />;
                      }
                    };
                    
                    return (
                      <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        {getIcon(insight.type)}
                        <p style={{ 
                          fontSize: '0.875rem', 
                          color: '#1e40af', 
                          margin: 0,
                          lineHeight: '1.4'
                        }}>
                          {insight.message}
                        </p>
                      </div>
                    );
                  })}
                  {insights.length === 0 && !insightsLoading && (
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                      No insights available. Create some career goals to get started!
                    </p>
                  )}
                </div>
              )}
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