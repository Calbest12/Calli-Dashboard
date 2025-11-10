// frontend/src/components/CareerDevelopmentTab.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  TrendingUp, Award, Target, Calendar, Plus, Edit2, Trash2, 
  CheckCircle, Activity, BookOpen, ExternalLink, Loader, 
  BarChart3, Trophy, ArrowRight, FileText, StickyNote,
  AlertCircle, RefreshCw, Heart, Eye
} from 'lucide-react';
import './CareerDevelopmentTab.css';
import CareerCategoryGraph from './CareerCategoryGraph';
import IIncTab from './IIncTab';

// All original helper functions preserved exactly as they were
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

  if (totalActive > 5) {
    insights.push({
      type: 'warning',
      message: 'Consider focusing on fewer goals simultaneously to maximize progress and avoid overwhelm.'
    });
  }

  if (totalCompleted > 0) {
    const completionRate = Math.round((totalCompleted / allGoals.length) * 100);
    if (completionRate >= 70) {
      insights.push({
        type: 'success',
        message: `Excellent progress! You've completed ${completionRate}% of your career goals.`
      });
    } else if (completionRate >= 30) {
      insights.push({
        type: 'info',
        message: `Good momentum with ${completionRate}% completion rate. Consider reviewing stalled goals.`
      });
    }
  }

  const overdueGoals = activeGoals.filter(goal => {
    if (!goal.target_date) return false;
    return new Date(goal.target_date) < new Date();
  });

  if (overdueGoals.length > 0) {
    insights.push({
      type: 'warning',
      message: `${overdueGoals.length} goal${overdueGoals.length > 1 ? 's are' : ' is'} past the target date. Consider updating timelines or prioritization.`
    });
  }

  const lowProgressGoals = activeGoals.filter(goal => (goal.current_progress || 0) < 25);
  if (lowProgressGoals.length >= 3) {
    insights.push({
      type: 'info',
      message: 'Several goals have low progress. Break them into smaller, actionable steps for better momentum.'
    });
  }

  return insights.slice(0, 3);
};

const validateFormData = (formData) => {
  const errors = [];
  
  if (!formData.title?.trim()) {
    errors.push('Goal title is required');
  }
  
  if (!formData.category) {
    errors.push('Please select a category');
  }
  
  if (!formData.currentLevel || formData.currentLevel < 1 || formData.currentLevel > 10) {
    errors.push('Current skill level must be between 1-10');
  }
  
  if (!formData.targetLevel || formData.targetLevel < 1 || formData.targetLevel > 10) {
    errors.push('Target skill level must be between 1-10');
  }
  
  if (formData.currentLevel && formData.targetLevel && 
      parseInt(formData.targetLevel) <= parseInt(formData.currentLevel)) {
    errors.push('Target level must be higher than current level');
  }
  
  if (!formData.priority) {
    errors.push('Please select a priority level');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const initialFormState = {
  title: '',
  description: '',
  category: '',
  currentLevel: '',
  targetLevel: '',
  targetDate: '',
  priority: 'medium',
  notes: '',
  resources: []
};

const categories = [
  'Technical Skills',
  'Leadership',
  'Communication',
  'Project Management',
  'Industry Knowledge',
  'Personal Development',
  'Networking',
  'Education/Certification'
];

const priorities = [
  { value: 'low', label: 'Low', color: '#10b981' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'critical', label: 'Critical', color: '#dc2626' }
];

// Modal Components
const GoalFormModal = React.memo(({ isOpen, onClose, formData, setFormData, onSubmit, isEditing }) => {
  const [newResource, setNewResource] = useState({ name: '', url: '' });

  const addResource = () => {
    if (newResource.name && newResource.url) {
      setFormData(prev => ({
        ...prev,
        resources: [...prev.resources, { ...newResource }]
      }));
      setNewResource({ name: '', url: '' });
    }
  };

  const removeResource = (index) => {
    setFormData(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Goal' : 'Create New Goal'}</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Goal Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Improve JavaScript proficiency"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your goal and what you hope to achieve..."
                rows="3"
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Priority *</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                >
                  {priorities.map(priority => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Current Skill Level (1-10) *</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.currentLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentLevel: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Target Skill Level (1-10) *</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.targetLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetLevel: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Target Date</label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes, action steps, or reminders..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Resources</label>
              
              {formData.resources.length > 0 && (
                <div className="resources-list">
                  {formData.resources.map((resource, index) => (
                    <div key={index} className="resource-item">
                      <div className="resource-info">
                        <span className="resource-name">{resource.name}</span>
                        <span className="resource-url">{resource.url}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeResource(index)}
                        className="resource-remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="resource-form">
                <input
                  type="text"
                  placeholder="Resource name"
                  value={newResource.name}
                  onChange={(e) => setNewResource(prev => ({ ...prev, name: e.target.value }))}
                />
                <input
                  type="url"
                  placeholder="Resource URL"
                  value={newResource.url}
                  onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value }))}
                />
                <button type="button" onClick={addResource} className="btn btn-secondary">
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={onSubmit} className="btn btn-primary">
            {isEditing ? 'Update Goal' : 'Create Goal'}
          </button>
        </div>
      </div>
    </div>
  );
});

const ProgressUpdateModal = React.memo(({ isOpen, goal, onClose, onUpdate }) => {
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (goal) {
      setProgress(goal.current_progress || 0);
      setNotes('');
    }
  }, [goal]);

  if (!isOpen || !goal) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content progress-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Update Progress: {goal.title}</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-body">
          <div className="progress-info">
            <p>Current Progress: {goal.current_progress || 0}%</p>
            <p>Target: Level {goal.target_level} by {formatDate(goal.target_date)}</p>
          </div>

          <div className="form-group">
            <label>New Progress ({progress}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              className="progress-slider"
            />
            <div className="progress-display">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="form-group">
            <label>Progress Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What progress did you make? What challenges did you face?"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={() => onUpdate(goal.id, progress, notes)} className="btn btn-primary">
            Update Progress
          </button>
        </div>
      </div>
    </div>
  );
});

const GoalNotesModal = React.memo(({ isOpen, goal, onClose }) => {
  if (!isOpen || !goal) return null;

  const progressHistory = Array.isArray(goal.goal_progress_history) ? goal.goal_progress_history : [];
  const hasNotes = progressHistory.some(entry => entry.notes && entry.notes.trim());

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content notes-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Progress Notes: {goal.title}</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-body">
          {!hasNotes ? (
            <div className="empty-notes">
              <StickyNote />
              <p>No progress notes yet. Add notes when updating your progress to track your journey!</p>
            </div>
          ) : (
            <div className="notes-timeline">
              {progressHistory
                .filter(entry => entry.notes && entry.notes.trim())
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((entry, index) => (
                  <div key={index} className="notes-entry">
                    <div className="notes-entry-header">
                      <span className="notes-progress-badge">
                        {entry.new_progress}%
                      </span>
                      <span className="notes-date">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                    <div className="notes-entry-content">
                      <p>{entry.notes}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
});

const CompletedGoalDetailsModal = React.memo(({ isOpen, goal, onClose }) => {
  if (!isOpen || !goal) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content completed-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Completed: {goal.title}</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-body">
          <div className="goal-summary-grid">
            <div className="summary-item">
              <label>Category</label>
              <span>{goal.category}</span>
            </div>
            <div className="summary-item">
              <label>Completed Date</label>
              <span>{formatDate(goal.completed_date)}</span>
            </div>
            <div className="summary-item">
              <label>Progress</label>
              <span>{goal.current_level} → {goal.target_level}</span>
            </div>
            <div className="summary-item">
              <label>Priority</label>
              <span className={`priority-badge priority-${goal.priority}`}>
                {goal.priority}
              </span>
            </div>
          </div>

          {goal.description && (
            <div className="summary-section">
              <label>Description</label>
              <p>{goal.description}</p>
            </div>
          )}

          {goal.notes && (
            <div className="summary-section">
              <label>Notes</label>
              <p>{goal.notes}</p>
            </div>
          )}

          {goal.resources && goal.resources.length > 0 && (
            <div className="summary-section">
              <label>Resources Used</label>
              <div className="resources-list">
                {goal.resources.map((resource, index) => (
                  <div key={index} className="resource-link">
                    <ExternalLink size={14} />
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      {resource.name}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
});

// Goal Card Components
const GoalCard = React.memo(({ goal, onEdit, onDelete, onUpdateProgress, onViewNotes }) => {
  const priority = priorities.find(p => p.value === goal.priority);
  const progressPercentage = goal.current_progress || 0;
  
  return (
    <div className="goal-card">
      <div className="goal-header">
        <div className="goal-title-section">
          <div className="goal-title-row">
            <h4 className="goal-title">{goal.title}</h4>
            <span 
              className={`priority-badge priority-${goal.priority}`}
              style={{ backgroundColor: priority?.color + '20', color: priority?.color, borderColor: priority?.color }}
            >
              {priority?.label}
            </span>
          </div>
          {goal.target_date && (
            <p className="goal-target-date">
              <Calendar size={12} />
              Target: {formatDate(goal.target_date)}
            </p>
          )}
        </div>
        
        <div className="goal-actions">
          <button 
            onClick={() => onUpdateProgress(goal)} 
            className="goal-action-btn progress"
            title="Update Progress"
          >
            <Activity />
          </button>
          <button 
            onClick={() => onViewNotes(goal)} 
            className="goal-action-btn notes"
            title="View Progress Notes"
          >
            <StickyNote />
          </button>
          <button 
            onClick={() => onEdit(goal)} 
            className="goal-action-btn edit"
            title="Edit Goal"
          >
            <Edit2 />
          </button>
          <button 
            onClick={() => onDelete(goal.id, goal.title)} 
            className="goal-action-btn delete"
            title="Delete Goal"
          >
            <Trash2 />
          </button>
        </div>
      </div>

      {goal.description && (
        <p className="goal-description">{goal.description}</p>
      )}

      <div className="goal-progress">
        <div className="progress-header">
          <span>Progress: Level {goal.current_level} → {goal.target_level}</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="goal-meta">
        <span className="goal-category">
          <BookOpen size={12} />
          {goal.category}
        </span>
        {goal.resources && goal.resources.length > 0 && (
          <span className="goal-resources">
            <ExternalLink size={12} />
            {goal.resources.length} resource{goal.resources.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
});

const CompletedGoalCard = React.memo(({ goal, onViewDetails }) => {
  return (
    <div className="completed-goal-card" onClick={() => onViewDetails(goal)}>
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
          <p className="completed-goal-description">{goal.description}</p>
          <div className="completed-goal-meta">
            <span className="completed-goal-type">{goal.category}</span>
            <span>Completed {formatDate(goal.completed_date)}</span>
            <span>Level {goal.current_level} → {goal.target_level}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// MAIN COMPONENT
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

  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState(null);

  // Generate AI insights
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
      setInsightsLoading(true);
      setAiInsightsError(null);

      const activeGoals = careerGoals.filter(goal => goal.status !== 'completed');
      const completedGoals = careerGoals.filter(goal => goal.status === 'completed');

      const prompt = `Analyze career development progress and provide 2-3 specific insights.

Current Status:
- Active Goals: ${activeGoals.length}
- Completed Goals: ${completedGoals.length}
- Categories: ${[...new Set(activeGoals.map(g => g.category))].join(', ')}

Active Goals Summary:
${activeGoals.map(goal => `• ${goal.title} (${goal.category}): ${goal.current_progress || 0}% progress, Priority: ${goal.priority}`).join('\n')}

Provide insights as JSON:
{
  "insights": [
    {"type": "success|warning|info", "message": "specific insight about progress/focus areas"},
    {"type": "success|warning|info", "message": "actionable recommendation"}
  ]
}`;

      const result = await apiService.post('/api/ai/analyze', {
        prompt: prompt,
        context: 'career_insights',
        user_id: currentUser?.id
      });

      if (result.success && result.response) {
        const aiInsights = parseAIInsights(result.response);
        if (aiInsights.length > 0) {
          setInsights(aiInsights);
        } else {
          const fallbackInsights = generateCareerInsights(activeGoals, completedGoals);
          setInsights(fallbackInsights);
        }
      } else {
        const fallbackInsights = generateCareerInsights(activeGoals, completedGoals);
        setInsights(fallbackInsights);
      }

    } catch (error) {
      console.error('Error generating AI insights:', error);
      setAiInsightsError('Unable to generate insights');
      const activeGoals = careerGoals.filter(goal => goal.status !== 'completed');
      const completedGoals = careerGoals.filter(goal => goal.status === 'completed');
      const fallbackInsights = generateCareerInsights(activeGoals, completedGoals);
      setInsights(fallbackInsights);
    } finally {
      setInsightsLoading(false);
    }
  }, [careerGoals, apiService, currentUser?.id]);

  // Load career data - FIXED API ENDPOINT
  const loadCareerData = useCallback(async () => {
    if (!currentUser?.id || !apiService) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🎯 Loading career data for user:', currentUser.id);
      
      // FIXED: Use correct API endpoint that matches the backend route
      const result = await apiService.get(`/api/career/goals/${currentUser.id}`);
      
      if (result.success && Array.isArray(result.data)) {
        console.log('✅ Loaded career goals:', result.data.length);
        
        const processedGoals = result.data.map(goal => ({
          ...goal,
          current_progress: goal.current_progress || goal.progress || 0,
          resources: Array.isArray(goal.resources) ? goal.resources : 
                    (goal.resources ? JSON.parse(goal.resources) : [])
        }));
        
        setCareerGoals(processedGoals);
        
        const activeGoals = processedGoals.filter(goal => goal.status !== 'completed');
        const completedGoals = processedGoals.filter(goal => goal.status === 'completed');
        
        setCareerStats({
          activeGoals: activeGoals.length,
          completedGoals: completedGoals.length,
          avgProgress: activeGoals.length > 0 ? 
            Math.round(activeGoals.reduce((sum, goal) => sum + (goal.current_progress || 0), 0) / activeGoals.length) : 0
        });
        
        console.log('📊 Career stats:', {
          active: activeGoals.length,
          completed: completedGoals.length
        });
      } else {
        console.log('ℹ️ No career goals found or error:', result.error);
        setCareerGoals([]);
        setCareerStats({ activeGoals: 0, completedGoals: 0, avgProgress: 0 });
      }

    } catch (error) {
      console.error('❌ Error loading career data:', error);
      setCareerGoals([]);
      setCareerStats({ activeGoals: 0, completedGoals: 0, avgProgress: 0 });
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, apiService]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadCareerData();
  }, [loadCareerData]);

  // Generate insights when goals change
  useEffect(() => {
    if (careerGoals.length > 0) {
      generateAIInsights();
    }
  }, [careerGoals, generateAIInsights]);

  // All original handlers
  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setEditingGoal(null);
    setFormData(initialFormState);
  }, []);

  const handleCreateOrUpdateGoal = async () => {
    const validation = validateFormData(formData);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    try {
      const goalData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        current_level: formData.currentLevel,
        target_level: formData.targetLevel,
        target_date: formData.targetDate || null,
        priority: formData.priority,
        notes: formData.notes.trim(),
        resources: JSON.stringify(formData.resources || []),
        user_id: currentUser.id,
        current_progress: 0,
        status: 'active'
      };

      let result;
      if (editingGoal) {
        result = await apiService.put(`/api/career/goals/${editingGoal.id}`, goalData);
      } else {
        result = await apiService.post('/api/career/goals', goalData);
      }

      if (result.success) {
        await loadCareerData();
        handleCloseAddModal();
        if (onDataChange) onDataChange();
      } else {
        alert(result.error || 'Failed to save goal');
      }
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Error saving goal. Please try again.');
    }
  };

  const handleDeleteGoal = useCallback(async (goalId, goalTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${goalTitle}"?`)) return;

    try {
      const result = await apiService.delete(`/api/career/goals/${goalId}`);
      if (result.success) {
        await loadCareerData();
        if (onDataChange) onDataChange();
      } else {
        alert(result.error || 'Failed to delete goal');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Error deleting goal. Please try again.');
    }
  }, [apiService, loadCareerData, onDataChange]);

  const handleUpdateProgress = async (goalId, newProgress, notes) => {
    try {
      const result = await apiService.put(`/api/career/goals/${goalId}/progress`, {
        progress: newProgress,
        notes: notes
      });

      if (result.success) {
        await loadCareerData();
        setShowProgressModal(false);
        setSelectedGoalForProgress(null);
        if (onDataChange) onDataChange();
      } else {
        alert(result.error || 'Failed to update progress');
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Error updating progress. Please try again.');
    }
  };

  // Modal effects
  useEffect(() => {
    if (selectedGoalForProgress) {
      setShowProgressModal(true);
    }
  }, [selectedGoalForProgress]);

  useEffect(() => {
    if (selectedGoalForNotes) {
      setShowNotesModal(true);
    }
  }, [selectedGoalForNotes]);

  useEffect(() => {
    if (selectedCompletedGoal) {
      setShowCompletedModal(true);
    }
  }, [selectedCompletedGoal]);

  const { activeGoals, completedGoals } = useMemo(() => ({
    activeGoals: careerGoals.filter(goal => goal.status !== 'completed'),
    completedGoals: careerGoals.filter(goal => goal.status === 'completed')
  }), [careerGoals]);

  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'goals', label: 'Active', icon: Target },
    { id: 'completed', label: 'Completed', icon: Award },
    { id: 'iinc', label: 'I, Inc.', icon: Heart }
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
      {/* FIXED: Conditional header - only show Add Goal button for relevant tabs */}
      <div className="career-header">
        <div className="career-header-text">
          <h2>Career Development</h2>
          <p>Track your skills, set goals, and monitor your professional growth</p>
        </div>
        {/* Only show Add Goal button on overview, goals, and completed tabs */}
        {['overview', 'goals', 'completed'].includes(activeTab) && (
          <button onClick={() => setShowAddModal(true)} className="add-goal-btn">
            <Plus />
            <span>Add Goal</span>
          </button>
        )}
      </div>

      {/* Tab Navigation */}
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
                  <CareerCategoryGraph 
                    goals={activeGoals}
                    completedGoals={completedGoals}
                  />
                )}
              </div>
            </div>

            {/* AI Insights Section */}
            <div className="insights-section">
              <div className="insights-header">
                <h3>Career Insights</h3>
                {!insightsLoading && (
                  <button 
                    onClick={generateAIInsights} 
                    className="refresh-insights-btn"
                    title="Refresh insights"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>

              {insightsLoading ? (
                <div className="insights-loading">
                  <Loader className="loading-spinner small" />
                  <span>Generating insights...</span>
                </div>
              ) : aiInsightsError ? (
                <div className="insights-error">
                  <AlertCircle />
                  <span>{aiInsightsError}</span>
                </div>
              ) : insights.length > 0 ? (
                <div className="insights-list">
                  {insights.map((insight, index) => (
                    <div key={index} className={`insight-card ${insight.type}`}>
                      {insight.type === 'success' && <CheckCircle />}
                      {insight.type === 'warning' && <AlertCircle />}
                      {insight.type === 'info' && <TrendingUp />}
                      <span>{insight.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="insights-empty">
                  <p>Create some career goals to receive personalized insights!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Goals Tab */}
        {activeTab === 'goals' && (
          <div>
            {activeGoals.length === 0 ? (
              <div className="empty-state">
                <Target />
                <h3>No Active Goals</h3>
                <p>Create your first career goal to start tracking your progress!</p>
                <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                  <Plus />
                  Add Your First Goal
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.125rem', fontWeight: '600' }}>
                    Active Goals ({activeGoals.length})
                  </h3>
                </div>
                <div className="goals-list">
                  {activeGoals.map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={(goal) => {
                        setEditingGoal(goal);
                        setFormData({
                          title: goal.title,
                          description: goal.description || '',
                          category: goal.category,
                          currentLevel: goal.current_level,
                          targetLevel: goal.target_level,
                          targetDate: goal.target_date ? goal.target_date.split('T')[0] : '',
                          priority: goal.priority,
                          notes: goal.notes || '',
                          resources: Array.isArray(goal.resources) ? goal.resources : []
                        });
                        setShowAddModal(true);
                      }}
                      onDelete={handleDeleteGoal}
                      onUpdateProgress={setSelectedGoalForProgress}
                      onViewNotes={setSelectedGoalForNotes}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completed Goals Tab */}
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
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.125rem', fontWeight: '600' }}>
                    Completed Goals ({completedGoals.length})
                  </h3>
                </div>
                <div className="completed-goals-list">
                  {completedGoals.map((goal) => (
                    <CompletedGoalCard 
                      key={goal.id} 
                      goal={goal} 
                      onViewDetails={setSelectedCompletedGoal}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* I, Inc. Tab */}
        {activeTab === 'iinc' && (
          <IIncTab 
            currentUser={currentUser}
            apiService={apiService}
            onDataChange={onDataChange}
          />
        )}
      </div>

      {/* All Modals */}
      <GoalFormModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreateOrUpdateGoal}
        isEditing={!!editingGoal}
      />

      <ProgressUpdateModal
        isOpen={showProgressModal}
        goal={selectedGoalForProgress}
        onClose={() => {
          setShowProgressModal(false);
          setSelectedGoalForProgress(null);
        }}
        onUpdate={handleUpdateProgress}
      />

      <GoalNotesModal
        isOpen={showNotesModal}
        goal={selectedGoalForNotes}
        onClose={() => {
          setShowNotesModal(false);
          setSelectedGoalForNotes(null);
        }}
      />

      <CompletedGoalDetailsModal
        isOpen={showCompletedModal}
        goal={selectedCompletedGoal}
        onClose={() => {
          setShowCompletedModal(false);
          setSelectedCompletedGoal(null);
        }}
      />
    </div>
  );
};

export default CareerDevelopmentTab;