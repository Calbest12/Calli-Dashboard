import React, { useState, useEffect, useMemo } from 'react';
import { Target, Award, Activity, Edit, CheckCircle, AlertCircle, TrendingUp, Brain, RefreshCw, Loader, MessageSquare, Users, Star, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import apiService from '../services/apiService';
import AccessNotification from './AccessNotification';

const ProjectDetailsOverview = ({ 
  project, 
  statusColors, 
  priorityColors, 
  PriorityIcon, 
  avgProgress, 
  teamMembersDetailed, 
  projectHistory, 
  formatTimestamp, 
  getActionIcon, 
  getActionColor, 
  onEditProject,
  setActiveTab,
  currentUser
}) => {

  
  const [aiInsights, setAiInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Feedback state
  const [feedbackData, setFeedbackData] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [averagedFeedback, setAveragedFeedback] = useState(null);
  
  // Expansion state for feedback categories
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // Modal states for feedback drill-down
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showUserSubmissionsModal, setShowUserSubmissionsModal] = useState(false);
  const [showSubmissionDetailsModal, setShowSubmissionDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Feedback category definitions with subcategories
  const feedbackCategories = [
    {
      key: 'PM',
      label: 'Project Management',
      color: '#3b82f6',
      icon: Target,
      subcategories: [
        { key: 'PM_Vision', name: 'Vision', description: 'Clear project vision and goals' },
        { key: 'PM_Time', name: 'Time', description: 'Time management and scheduling' },
        { key: 'PM_Quality', name: 'Quality', description: 'Quality standards and deliverables' },
        { key: 'PM_Cost', name: 'Cost', description: 'Budget management and cost control' }
      ]
    },
    {
      key: 'Leadership',
      label: 'Leadership',
      color: '#10b981',
      icon: Award,
      subcategories: [
        { key: 'Leadership_Vision', name: 'Vision', description: 'Leadership vision and direction' },
        { key: 'Leadership_Reality', name: 'Reality', description: 'Realistic expectations and planning' },
        { key: 'Leadership_Ethics', name: 'Ethics', description: 'Ethical decision-making and integrity' },
        { key: 'Leadership_Courage', name: 'Courage', description: 'Bold decisions and risk-taking' }
      ]
    },
    {
      key: 'ChangeMgmt',
      label: 'Change Management',
      color: '#8b5cf6',
      icon: Activity,
      subcategories: [
        { key: 'ChangeMgmt_Alignment', name: 'Alignment', description: 'Team and stakeholder alignment' },
        { key: 'ChangeMgmt_Understand', name: 'Understand', description: 'Understanding of change impacts' },
        { key: 'ChangeMgmt_Enact', name: 'Enact', description: 'Implementation of change initiatives' }
      ]
    },
    {
      key: 'CareerDev',
      label: 'Career Development',
      color: '#f59e0b',
      icon: Users,
      subcategories: [
        { key: 'CareerDev_KnowYourself', name: 'Know Yourself', description: 'Self-awareness and personal growth' },
        { key: 'CareerDev_KnowYourMarket', name: 'Know Your Market', description: 'Market and industry knowledge gained' },
        { key: 'CareerDev_TellYourStory', name: 'Tell Your Story', description: 'Ability to articulate your contributions' }
      ]
    }
  ];

  useEffect(() => {
    if (project?.id) {
      console.log('ProjectDetailsOverview mounted/project changed, auto-loading insights and feedback...');
      loadAIInsights();
      loadProjectFeedback();
    }
  }, [project?.id]);
  
  // Toggle category expansion
  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  // Get unique users who submitted feedback
  const getUniqueSubmitters = () => {
    if (!feedbackData || feedbackData.length === 0) return [];
    
    const userMap = new Map();
    feedbackData.forEach(feedback => {
      const userId = feedback.userId || 'anonymous';
      const userName = feedback.userName || 'Anonymous User';
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName,
          submissions: []
        });
      }
      userMap.get(userId).submissions.push(feedback);
    });
    
    return Array.from(userMap.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  };

  // Handle opening submissions modal
  const handleOpenSubmissionsModal = () => {
    setShowSubmissionsModal(true);
  };

  // Handle clicking on a user to see their submissions
  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowSubmissionsModal(false);
    setShowUserSubmissionsModal(true);
  };

  // Handle clicking on a specific submission to see details
  const handleSubmissionClick = (submission) => {
    setSelectedSubmission(submission);
    setShowUserSubmissionsModal(false);
    setShowSubmissionDetailsModal(true);
  };

  // Close all modals
  const closeAllModals = () => {
    setShowSubmissionsModal(false);
    setShowUserSubmissionsModal(false);
    setShowSubmissionDetailsModal(false);
    setSelectedUser(null);
    setSelectedSubmission(null);
  };

  // Format timestamp for display
  const formatDetailedTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get Likert scale label
  const getLikertScaleLabel = (value) => {
    const labels = {
      1: 'Strongly Disagree',
      2: 'Disagree', 
      3: 'Somewhat Disagree',
      4: 'Neutral',
      5: 'Somewhat Agree',
      6: 'Agree',
      7: 'Strongly Agree'
    };
    return labels[value] || 'Unknown';
  };

  // Load project feedback function
  const loadProjectFeedback = async () => {
    if (!project?.id) {
      console.log('No project ID for feedback');
      return;
    }

    try {
      setFeedbackLoading(true);
      setFeedbackError(null);
      
      console.log('Loading project feedback for project:', project.name);
      
      const response = await apiService.getProjectFeedback(project.id);
      
      if (response && response.success && response.data) {
        console.log('Feedback loaded:', response.data.length, 'submissions');
        console.log('Raw feedback data:', response.data);
        setFeedbackData(response.data);
        
        // Calculate averaged feedback
        if (response.data.length > 0) {
          const averaged = calculateAveragedFeedback(response.data);
          setAveragedFeedback(averaged);
          console.log('Averaged feedback calculated:', averaged);
        } else {
          setAveragedFeedback(null);
        }
      } else {
        console.warn('Invalid feedback response:', response);
        setFeedbackData([]);
        setAveragedFeedback(null);
      }
    } catch (error) {
      console.error('Failed to load project feedback:', error);
      setFeedbackError(error.message);
      setFeedbackData([]);
      setAveragedFeedback(null);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Calculate averaged feedback from all submissions
  const calculateAveragedFeedback = (feedbackArray) => {
    if (!feedbackArray || feedbackArray.length === 0) return null;

    console.log('Calculating averaged feedback from', feedbackArray.length, 'submissions');
    console.log('Sample feedback data:', feedbackArray[0]);

    // Calculate category averages
    const categoryTotals = {
      PM: 0,
      Leadership: 0,
      ChangeMgmt: 0,
      CareerDev: 0
    };

    // Calculate subcategory averages
    const subcategoryTotals = {};
    const subcategoryKeys = [];
    
    // Collect all subcategory keys
    feedbackCategories.forEach(category => {
      category.subcategories.forEach(sub => {
        subcategoryKeys.push(sub.key);
        subcategoryTotals[sub.key] = 0;
      });
    });

    // Sum up all values with detailed logging
    feedbackArray.forEach((feedback, index) => {
      console.log(`Processing feedback ${index + 1}:`, {
        id: feedback.id,
        averages: feedback.averages,
        overall: feedback.overall
      });
      
      if (feedback.averages) {
        Object.keys(categoryTotals).forEach(key => {
          const value = parseFloat(feedback.averages[key]);
          if (isNaN(value)) {
            console.warn(`Invalid ${key} average in feedback ${feedback.id}: ${feedback.averages[key]}`);
            categoryTotals[key] += 0;
          } else {
            categoryTotals[key] += value;
            console.log(`Adding ${key}: ${value} (running total: ${categoryTotals[key]})`);
          }
        });
      } else {
        console.warn(`No averages found in feedback ${feedback.id}`);
      }
      
      if (feedback.data) {
        subcategoryKeys.forEach(key => {
          const value = parseInt(feedback.data[key]);
          if (isNaN(value)) {
            console.warn(`Invalid ${key} subcategory in feedback ${feedback.id}: ${feedback.data[key]}`);
            subcategoryTotals[key] += 0;
          } else {
            subcategoryTotals[key] += value;
          }
        });
      } else {
        console.warn(`No data found in feedback ${feedback.id}`);
      }
    });

    const count = feedbackArray.length;
    console.log('Category totals before averaging:', categoryTotals);
    console.log('Feedback count:', count);
    
    // Calculate averages with validation
    const categoryAverages = {};
    Object.keys(categoryTotals).forEach(key => {
      const average = categoryTotals[key] / count;
      if (isNaN(average) || !isFinite(average)) {
        console.warn(`Invalid average calculated for ${key}: ${average}, using 0`);
        categoryAverages[key] = 0;
      } else {
        categoryAverages[key] = Math.round(average * 100) / 100;
      }
    });

    const subcategoryAverages = {};
    subcategoryKeys.forEach(key => {
      const average = subcategoryTotals[key] / count;
      if (isNaN(average) || !isFinite(average)) {
        console.warn(`Invalid subcategory average calculated for ${key}: ${average}, using 0`);
        subcategoryAverages[key] = 0;
      } else {
        subcategoryAverages[key] = Math.round(average * 100) / 100;
      }
    });

    // Calculate overall from category averages with validation
    const overallSum = categoryAverages.PM + categoryAverages.Leadership + categoryAverages.ChangeMgmt + categoryAverages.CareerDev;
    const overall = isNaN(overallSum) || !isFinite(overallSum) ? 0 : Math.round((overallSum / 4) * 100) / 100;

    console.log('Final calculated averages:', {
      categories: categoryAverages,
      overall: overall,
      overallSum: overallSum
    });

    // Validate that Leadership category exists and has a valid value
    if (categoryAverages.Leadership === undefined || isNaN(categoryAverages.Leadership)) {
      console.error('Leadership category average is invalid:', categoryAverages.Leadership);
      categoryAverages.Leadership = 0;
    }

    return {
      categories: categoryAverages,
      subcategories: subcategoryAverages,
      overall: overall,
      submissionCount: count,
      submissions: feedbackArray
    };
  };
// AI Insights functions
const loadAIInsights = async () => {
  if (!project?.id) {
    console.log('No project ID for insights');
    return;
  }

  try {
    setInsightsLoading(true);
    setInsightsError(null);
    
    console.log('Loading BASIC AI insights for project:', project.name);
    
    try {
      const response = await apiService.getAIInsights(project.id);
      
      if (response && response.success && response.insights) {
        console.log('Dedicated insights loaded:', response.insights);
        setAiInsights(formatInsightsFromAPI(response.insights));
        setLastUpdated(new Date());
        return;
      }
    } catch (insightsError) {
      console.log('Dedicated insights failed, trying basic AI chat:', insightsError.message);
    }

    await generateBasicInsights();
    
  } catch (error) {
    console.error('Failed to load AI insights:', error);
    setInsightsError(error.message);

    const fallbackInsights = generateFallbackInsights();
    setAiInsights(fallbackInsights);
    setLastUpdated(new Date());
  } finally {
    setInsightsLoading(false);
  }
};

const generateBasicInsights = async () => {
  try {
    console.log('Generating basic AI insights...');
    
    const insightContext = {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        priority: project.priority,
        progress: project.progress,
        teamSize: teamMembersDetailed?.length || 0
      },
      user: currentUser,
      analysisType: 'basic_overview'
    };
    
    const pmProgress = project.progress?.PM || 0;
    const leadershipProgress = project.progress?.Leadership || 0;
    const changeMgmtProgress = project.progress?.ChangeMgmt || 0;
    const careerDevProgress = project.progress?.CareerDev || 0;
    const avgProgressCalc = (pmProgress + leadershipProgress + changeMgmtProgress + careerDevProgress) / 4;
    
    const message = `Provide a basic overview analysis of this project with exactly 3 high-level insights in JSON format:

PROJECT OVERVIEW:
- Name: "${project.name}"
- Status: ${project.status}
- Priority: ${project.priority}
- Team Size: ${teamMembersDetailed?.length || 0} members
- Average Progress: ${avgProgressCalc.toFixed(1)}/7

PROGRESS SCORES:
- PM Skills: ${pmProgress}/7
- Leadership: ${leadershipProgress}/7  
- Change Management: ${changeMgmtProgress}/7
- Career Development: ${careerDevProgress}/7

Provide response as JSON:
{
"insights": [
  {"type": "success|warning|info", "message": "high-level observation 1"},
  {"type": "success|warning|info", "message": "high-level observation 2"},
  {"type": "success|warning|info", "message": "high-level observation 3"}
]
}

Guidelines for BASIC insights:
- Focus on overall project health and status
- Identify general strengths and areas needing attention
- Keep observations high-level and descriptive
- success: Overall strong performance or good status
- warning: General areas that need attention
- info: Neutral observations about project state
- Keep messages under 70 characters
- Avoid specific implementation details`;
    
    const response = await apiService.sendAIChat({
      message,
      context: insightContext,
      projectId: project.id
    });
    
    if (response && response.success) {
      console.log('Basic AI response received');
      const parsedInsights = parseAIInsights(response.response);
      
      if (parsedInsights.length > 0) {
        const basicInsights = parsedInsights.map(insight => ({
          ...insight,
          isEnhanced: false
        }));
        
        setAiInsights(basicInsights);
        setLastUpdated(new Date());
        console.log('Basic AI insights generated:', basicInsights.length);
      } else {
        throw new Error('Could not parse basic AI insights');
      }
    } else {
      throw new Error('AI service unavailable for basic insights');
    }
  } catch (error) {
    console.error('Basic insights failed, using fallback:', error);
    
    const fallbackInsights = generateFallbackInsights();
    setAiInsights(fallbackInsights.map(insight => ({ ...insight, isEnhanced: false })));
    setLastUpdated(new Date());
  }
};

const formatInsightsFromAPI = (insights) => {
  if (insights.detailedInsights && Array.isArray(insights.detailedInsights)) {
    return insights.detailedInsights.map(insight => ({
      type: insight.type,
      icon: getInsightIcon(insight.type),
      message: insight.message
    }));
  }
  
  if (insights.recommendations && Array.isArray(insights.recommendations)) {
    return insights.recommendations.map((rec, index) => ({
      type: index === 0 ? 'success' : index === 1 ? 'warning' : 'info',
      icon: getInsightIcon(index === 0 ? 'success' : index === 1 ? 'warning' : 'info'),
      message: rec
    }));
  }
  
  return [];
};

const getInsightIcon = (type) => {
  const icons = {
    success: CheckCircle,
    warning: AlertCircle,
    info: TrendingUp,
    error: AlertCircle
  };
  return icons[type] || TrendingUp;
};

const generateFallbackInsights = () => {
  const insights = [];

  const pmProgress = project.progress?.PM || 0;
  const leadershipProgress = project.progress?.Leadership || 0;
  const changeMgmtProgress = project.progress?.ChangeMgmt || 0;
  const careerDevProgress = project.progress?.CareerDev || 0;
  
  const avgScore = (pmProgress + leadershipProgress + changeMgmtProgress + careerDevProgress) / 4;

  if (avgScore >= 5.5) {
    insights.push({
      type: 'success',
      icon: CheckCircle,
      message: `Strong overall performance with ${avgScore.toFixed(1)}/7 average score`
    });
  } else if (avgScore >= 4) {
    insights.push({
      type: 'info',
      icon: TrendingUp,
      message: `Moderate progress across areas - room for improvement`
    });
  } else {
    insights.push({
      type: 'warning',
      icon: AlertCircle,
      message: `Multiple areas need attention - focus on skill development`
    });
  }

  const teamSize = teamMembersDetailed?.length || 0;
  if (teamSize === 0) {
    insights.push({
      type: 'warning',
      icon: AlertCircle,
      message: 'Project lacks team members - consider staffing'
    });
  } else if (teamSize <= 3) {
    insights.push({
      type: 'info',
      icon: TrendingUp,
      message: `Small team of ${teamSize} - good for agility`
    });
  } else if (teamSize > 8) {
    insights.push({
      type: 'info',
      icon: TrendingUp,
      message: `Large team of ${teamSize} members - coordination important`
    });
  }

  if (project.priority === 'critical' && avgScore < 4.5) {
    insights.push({
      type: 'warning',
      icon: AlertCircle,
      message: 'Critical priority project showing low progress scores'
    });
  } else if (project.status === 'active' && avgScore >= 5) {
    insights.push({
      type: 'success',
      icon: CheckCircle,
      message: 'Active project showing positive momentum'
    });
  } else if (project.status === 'planning') {
    insights.push({
      type: 'info',
      icon: TrendingUp,
      message: 'Project in planning phase - good foundation building'
    });
  }

  if (careerDevProgress === 0 && teamSize > 0) {
    insights.push({
      type: 'info',
      icon: Award,
      message: 'No career development tracking - opportunity for growth'
    });
  }

  const historyLength = projectHistory?.length || 0;
  if (historyLength === 0) {
    insights.push({
      type: 'info',
      icon: TrendingUp,
      message: 'Limited activity recorded - consider regular updates'
    });
  } else if (historyLength > 15) {
    insights.push({
      type: 'success',
      icon: CheckCircle,
      message: 'High activity level - team appears engaged'
    });
  }
  
  return insights.slice(0, 3); 
};

const generateEnhancedInsights = async () => {
  console.log('Enhanced insights functionality not implemented yet');
};

const parseAIInsights = (aiText) => {
  const insights = [];
  
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.insights && Array.isArray(parsed.insights)) {
        return parsed.insights.map(insight => ({
          type: insight.type || 'info',
          icon: getInsightIcon(insight.type || 'info'),
          message: insight.message || 'AI analysis completed'
        }));
      }
    }
  } catch (jsonError) {
    console.log('JSON parsing failed, extracting from text');
  }
  
  const lines = aiText.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.match(/^\d+\./) || trimmedLine.includes('insight') || trimmedLine.includes('recommendation')) {
      let type = 'info';
      
      if (trimmedLine.toLowerCase().includes('excellent') || 
          trimmedLine.toLowerCase().includes('strong') ||
          trimmedLine.toLowerCase().includes('good') ||
          trimmedLine.toLowerCase().includes('performing well')) {
        type = 'success';
      } else if (trimmedLine.toLowerCase().includes('warning') || 
                 trimmedLine.toLowerCase().includes('attention') ||
                 trimmedLine.toLowerCase().includes('concern') ||
                 trimmedLine.toLowerCase().includes('needs')) {
        type = 'warning';
      }
      
      let message = trimmedLine
        .replace(/^\d+\.\s*/, '')
        .replace(/\[Type:.*?\]\s*/, '')
        .replace(/^(insight|recommendation):\s*/i, '');
      
      if (message.length > 10 && message.length < 150) {
        insights.push({
          type,
          icon: getInsightIcon(type),
          message: message.substring(0, 80) + (message.length > 80 ? '...' : '')
        });
      }
    }
  });
  
  return insights.slice(0, 3); 
};

const getInsightColor = (type) => {
  const colors = {
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
    error: '#ef4444'
  };
  return colors[type] || '#6b7280';
};

const handleManualRefresh = async () => {
  console.log('Manual refresh requested...');
  await loadAIInsights();
  await loadProjectFeedback();
};

return (
  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
    {/* Left Column */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Project Description */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
          Project Description
        </h3>
        <p style={{ color: '#6b7280', lineHeight: '1.625', margin: 0 }}>
          {project?.description || 'No description provided'}
        </p>
      </div>

      {/* Executive Leader Read-Only Notification */}
      {currentUser?.role === 'Executive Leader' && (
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '0.75rem',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Shield size={20} style={{ color: '#0ea5e9', flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', margin: '0 0 0.25rem 0' }}>
              Executive View - Read Only Access
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#075985', margin: 0 }}>
              You can view and comment but cannot edit project details.
            </p>
          </div>
        </div>
      )}

      {/* Progress Breakdown */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
          Project Metrics
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
          Track both project completion and team feedback across different areas
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[
            { key: 'PM', label: 'Project Management (Actual Progress)', color: '#3b82f6', icon: Target, isMainProgress: true },
            { key: 'Leadership', label: 'Leadership (Team Feedback)', color: '#10b981', icon: Award, isMainProgress: false },
            { key: 'ChangeMgmt', label: 'Change Management (Team Feedback)', color: '#8b5cf6', icon: Activity, isMainProgress: false }
          ].map(category => {
            const Icon = category.icon;
            const progress = project?.progress?.[category.key] || 0;
            const percentage = (progress / 7) * 100;

            return (
              <div key={category.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon size={16} style={{ color: category.color }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                      {category.label}
                    </span>
                    {category.isMainProgress && (
                      <span style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontWeight: '500'
                      }}>
                        Main Progress
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: category.color,
                    backgroundColor: `${category.color}15`,
                    padding: '0.25rem 0.5rem',
                    borderRadius: '9999px'
                  }}>
                    {progress}/7
                  </span>
                </div>
                <div style={{ width: '100%', height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: category.color,
                      width: `${percentage}%`,
                      borderRadius: '9999px',
                      transition: 'width 0.8s ease-in-out'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Feedback Results Section */}
      {averagedFeedback && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Team Feedback Results
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} style={{ color: '#6b7280' }} />
              <button
                onClick={handleOpenSubmissionsModal}
                style={{
                  fontSize: '0.875rem',
                  color: '#2563eb',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#eff6ff'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                {averagedFeedback.submissionCount} submission{averagedFeedback.submissionCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
          
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
                Overall Team Rating
              </span>
              <span style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '0.5rem 1rem',
                borderRadius: '9999px'
              }}>
                {averagedFeedback.overall ? averagedFeedback.overall.toFixed(1) : '0.0'}/7.0
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {feedbackCategories.map(category => {
              const Icon = category.icon;
              const categoryScore = averagedFeedback?.categories?.[category.key] ?? 0;
              
              let safeScore = 0;
              if (typeof categoryScore === 'number' && !isNaN(categoryScore) && isFinite(categoryScore)) {
                safeScore = categoryScore;
              } else if (typeof categoryScore === 'string' && !isNaN(parseFloat(categoryScore))) {
                safeScore = parseFloat(categoryScore);
              }
              
              const percentage = Math.max(0, Math.min(100, (safeScore / 7) * 100));
              const isExpanded = expandedCategories[category.key];

              return (
                <div 
                  key={`${category.key}-${averagedFeedback?.submissionCount || 0}`}
                  style={{
                    backgroundColor: '#fafbfc',
                    borderRadius: '0.75rem',
                    border: `2px solid ${category.color}20`,
                    overflow: 'hidden',
                    minHeight: '80px'
                  }}
                >
                  <div 
                    onClick={() => toggleCategory(category.key)}
                    style={{
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      backgroundColor: isExpanded ? `${category.color}10` : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!isExpanded) e.currentTarget.style.backgroundColor = `${category.color}05`;
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Icon size={20} style={{ color: category.color }} />
                        <span style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                          {category.label}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {isExpanded ? 
                            <ChevronDown size={16} style={{ color: category.color }} /> : 
                            <ChevronRight size={16} style={{ color: category.color }} />
                          }
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: category.color,
                        backgroundColor: `${category.color}15`,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px'
                      }}>
                        {safeScore.toFixed(1)}/7
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '0.375rem', 
                      backgroundColor: '#e5e7eb', 
                      borderRadius: '9999px', 
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: category.color,
                          width: `${percentage}%`,
                          borderRadius: '9999px',
                          transition: 'width 0.8s ease-in-out',
                          minWidth: safeScore === 0 ? '2px' : '0'
                        }}
                      />
                      {safeScore === 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '8px',
                          transform: 'translateY(-50%)',
                          fontSize: '0.6rem',
                          color: '#9ca3af',
                          fontWeight: '500'
                        }}>
                          No data
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{
                      padding: '0 1rem 1rem 1rem',
                      borderTop: `1px solid ${category.color}20`
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        {category.subcategories.map(subcategory => {
                          const subScore = averagedFeedback?.subcategories?.[subcategory.key] ?? 0;
                          let safeSubScore = 0;
                          if (typeof subScore === 'number' && !isNaN(subScore) && isFinite(subScore)) {
                            safeSubScore = subScore;
                          } else if (typeof subScore === 'string' && !isNaN(parseFloat(subScore))) {
                            safeSubScore = parseFloat(subScore);
                          }
                          const subPercentage = Math.max(0, Math.min(100, (safeSubScore / 7) * 100));

                          return (
                            <div key={subcategory.key} style={{
                              padding: '0.75rem',
                              backgroundColor: 'white',
                              borderRadius: '0.5rem',
                              border: `1px solid ${category.color}15`
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div>
                                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                                    {subcategory.name}
                                  </span>
                                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                                    {subcategory.description}
                                  </p>
                                </div>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: category.color,
                                  backgroundColor: `${category.color}10`,
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '9999px'
                                }}>
                                  {safeSubScore.toFixed(1)}/7
                                </span>
                              </div>
                              <div style={{ width: '100%', height: '0.25rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    backgroundColor: category.color,
                                    width: `${subPercentage}%`,
                                    borderRadius: '9999px',
                                    transition: 'width 0.8s ease-in-out'
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            backgroundColor: '#eff6ff', 
            borderRadius: '0.5rem',
            border: '1px solid #dbeafe'
          }}>
            <p style={{ 
              fontSize: '0.75rem', 
              color: '#1e40af', 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Star size={12} />
              Team feedback is averaged from all submissions and updates project progress scores automatically
            </p>
          </div>
        </div>
      )}

      {/* Show loading state when feedback is loading */}
      {feedbackLoading && !averagedFeedback && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
            Team Feedback Results
          </h3>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Loading feedback data...
          </p>
        </div>
      )}

      {/* Show no feedback state when no data */}
      {!feedbackLoading && !averagedFeedback && feedbackData.length === 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
            Team Feedback Results
          </h3>
          <p style={{ color: '#6b7280', margin: 0 }}>
            No feedback submissions yet. Team members can submit feedback using the Feedback tab.
          </p>
        </div>
      )}

      {/* Recent Activity */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
          Recent Activity
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(projectHistory || []).slice(0, 3).map((item, index) => {
            const Icon = getActionIcon ? getActionIcon(item.type) : Activity;
            const actionColor = getActionColor ? getActionColor(item.type) : '#6b7280';
            return (
              <div key={item.id || index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  backgroundColor: `${actionColor}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={14} style={{ color: actionColor }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', color: '#111827', margin: '0 0 0.25rem 0' }}>
                    {item.description || 'Activity description'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                    {formatTimestamp ? formatTimestamp(item.timestamp) : new Date(item.timestamp).toLocaleString()} by {item.user || 'Unknown'}
                  </p>
                </div>
              </div>
            );
          })}
          {(!projectHistory || projectHistory.length === 0) && (
            <p style={{ color: '#6b7280', textAlign: 'center', margin: 0 }}>
              No recent activity to display
            </p>
          )}
        </div>
      </div>
    </div>

    {/* Right Column */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Project Stats */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
          Project Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Status</span>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor: statusColors?.bg || '#f3f4f6',
              color: statusColors?.text || '#374151',
              border: `1px solid ${statusColors?.border || '#d1d5db'}`
            }}>
              {project?.status?.replace('_', ' ') || 'Unknown'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Priority</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {PriorityIcon && <PriorityIcon size={14} style={{ color: priorityColors?.text || '#6b7280' }} />}
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: priorityColors?.bg || '#f3f4f6',
                color: priorityColors?.text || '#374151'
              }}>
                {project?.priority || 'Unknown'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Progress</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
              {avgProgress || 0}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Team Size</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
              {project?.team_size || teamMembersDetailed?.length || 0} members
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Deadline</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
              {project?.deadline ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline set'}
            </span>
          </div>
          {averagedFeedback && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Team Rating</span>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem'
              }}>
                {averagedFeedback.overall.toFixed(1)}/7
              </span>
            </div>
          )}
        </div>

        {/* Edit Project Button */}
        <button
          onClick={() => {
            if (!project?.userAccess?.canEdit) {
              alert('You do not have permission to edit this project.');
              return;
            }
            console.log('Edit button clicked in ProjectDetails');
            if (onEditProject) {
              onEditProject();
            }
          }}
          disabled={!project?.userAccess?.canEdit}
          style={{
            width: '100%',
            marginTop: '1.5rem',
            background: project?.userAccess?.canEdit 
              ? 'linear-gradient(to right, #2563eb, #1d4ed8)' 
              : '#e5e7eb',
            color: project?.userAccess?.canEdit ? 'white' : '#9ca3af',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontWeight: '600',
            cursor: project?.userAccess?.canEdit ? 'pointer' : 'not-allowed',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <Edit size={16} />
          {project?.userAccess?.canEdit ? 'Edit Project' : 'View Only Access'}
        </button>
      </div>

      {/* Team Preview */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Team Members
          </h3>
          <button
            onClick={() => setActiveTab && setActiveTab('team')}
            style={{
              fontSize: '0.75rem',
              color: '#2563eb',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            View All
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(teamMembersDetailed || []).slice(0, 4).map((member, index) => (
            <div key={member.id || member.name || index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {member.avatar || member.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                  {member.name || 'Unknown Member'}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                  {member.role || 'Team Member'}
                </p>
              </div>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: member.status === 'active' ? '#10b981' : '#f59e0b'
              }} />
            </div>
          ))}
          {(!teamMembersDetailed || teamMembersDetailed.length === 0) && (
            <p style={{ color: '#6b7280', textAlign: 'center', margin: 0, fontSize: '0.875rem' }}>
              No team members assigned
            </p>
          )}
          {teamMembersDetailed && teamMembersDetailed.length > 4 && (
            <p style={{ color: '#2563eb', fontSize: '0.75rem', textAlign: 'center', margin: '0.5rem 0 0 0' }}>
              +{teamMembersDetailed.length - 4} more members
            </p>
          )}
        </div>
      </div>

      {/* AI INSIGHTS */}
      <div style={{
        background: 'linear-gradient(to right, #eff6ff, #eef2ff)',
        borderRadius: '0.75rem',
        border: '1px solid #dbeafe',
        padding: '1.5rem'
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
            <Brain size={20} />
            AI Insights
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={generateEnhancedInsights}
              disabled={insightsLoading}
              style={{
                padding: '0.25rem 0.5rem',
                background: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                borderRadius: '0.375rem',
                color: '#1e40af',
                cursor: insightsLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                opacity: insightsLoading ? 0.6 : 1
              }}
              title="Generate enhanced AI insights"
            >
              {insightsLoading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Brain size={12} />}
              {insightsLoading ? 'Thinking...' : 'Enhance'}
            </button>
            <button
              onClick={handleManualRefresh}
              disabled={insightsLoading}
              style={{
                padding: '0.25rem 0.5rem',
                background: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                borderRadius: '0.375rem',
                color: '#1e40af',
                cursor: insightsLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                opacity: insightsLoading ? 0.6 : 1
              }}
              title="Refresh insights"
            >
              {insightsLoading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
              Refresh
            </button>
          </div>
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
            <span style={{ marginLeft: '0.5rem' }}>Analyzing project...</span>
          </div>
        ) : insightsError ? (
          <div style={{ 
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '0.5rem',
            color: '#991b1b'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              {insightsError}
            </p>
          </div>
        ) : aiInsights && aiInsights.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {aiInsights.map((insight, index) => {
              const IconComponent = insight.icon;
              return (
                <div 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '0.5rem',
                    padding: '0.5rem'
                  }}
                >
                  <IconComponent 
                    size={16} 
                    style={{ 
                      color: getInsightColor(insight.type), 
                      marginTop: '0.125rem',
                      flexShrink: 0
                    }} 
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#1e40af', 
                      margin: 0, 
                      lineHeight: '1.4'
                    }}>
                      {insight.message}
                    </p>
                  </div>
                </div>
              );
            })}
            {lastUpdated && (
              <p style={{ 
                fontSize: '0.75rem', 
                color: '#64748b', 
                margin: '0.5rem 0 0 0',
                fontStyle: 'italic'
              }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        ) : (
          <div style={{ 
            padding: '1rem',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Loading insights automatically...
            </p>
          </div>
        )}
      </div>
    </div>

    {/* Feedback Modals */}
    {showSubmissionsModal && (
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
          padding: '2rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Feedback Submissions ({averagedFeedback?.submissionCount || 0})
            </h3>
            <button
              onClick={closeAllModals}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0.25rem'
              }}
            >
              Ｘ
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {getUniqueSubmitters().map(user => (
              <div
                key={user.userId}
                onClick={() => handleUserClick(user)}
                style={{
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: 'white'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      {user.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {user.userName}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                        {user.submissions.length} submission{user.submissions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} style={{ color: '#6b7280' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* User Submissions Modal */}
    {showUserSubmissionsModal && selectedUser && (
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
          padding: '2rem',
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowUserSubmissionsModal(false);
                  setShowSubmissionsModal(true);
                  setSelectedUser(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem'
                }}
              >
                ◀︎ Back
              </button>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {selectedUser.userName}'s Submissions
              </h3>
            </div>
            <button
              onClick={closeAllModals}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0.25rem'
              }}
            >
              Ｘ
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedUser.submissions
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((submission, index) => (
              <div
                key={submission.id}
                onClick={() => handleSubmissionClick(submission)}
                style={{
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: 'white'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Submission #{selectedUser.submissions.length - index}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0.5rem 0' }}>
                      {formatDetailedTimestamp(submission.timestamp)}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {feedbackCategories.map(category => {
                        const score = submission.averages?.[category.key] || 0;
                        return (
                          <div key={category.key} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: category.color
                            }} />
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {category.key}: {score.toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <ChevronRight size={20} style={{ color: '#6b7280' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Submission Details Modal */}
    {showSubmissionDetailsModal && selectedSubmission && (
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
          padding: '2rem',
          maxWidth: '900px',
          width: '95%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowSubmissionDetailsModal(false);
                  setShowUserSubmissionsModal(true);
                  setSelectedSubmission(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem'
                }}
              >
                ◀︎ Back
              </button>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  {selectedSubmission.userName}'s Feedback
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  Submitted: {formatDetailedTimestamp(selectedSubmission.timestamp)}
                </p>
              </div>
            </div>
            <button
              onClick={closeAllModals}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0.25rem'
              }}
            >
              Ｘ
            </button>
          </div>

          {/* Overall Score */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1rem', color: '#374151', fontWeight: '600' }}>
                Overall Rating
              </span>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '0.5rem 1rem',
                borderRadius: '9999px'
              }}>
                {selectedSubmission.overall ? selectedSubmission.overall.toFixed(1) : 
                 ((selectedSubmission.averages?.PM + selectedSubmission.averages?.Leadership + selectedSubmission.averages?.ChangeMgmt + selectedSubmission.averages?.CareerDev) / 4).toFixed(1)
                }/7.0
              </span>
            </div>
          </div>
          
          {/* Detailed Responses by Category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {feedbackCategories.map(category => {
              const Icon = category.icon;
              const categoryAverage = selectedSubmission.averages?.[category.key] || 0;
              
              return (
                <div key={category.key} style={{
                  padding: '1.5rem',
                  backgroundColor: '#fafbfc',
                  borderRadius: '0.75rem',
                  border: `2px solid ${category.color}20`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      backgroundColor: `${category.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={20} style={{ color: category.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                        {category.label}
                      </h4>
                    </div>
                    <div style={{
                      backgroundColor: `${category.color}15`,
                      color: category.color,
                      padding: '0.5rem 1rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      Average: {categoryAverage.toFixed(1)}/7.0
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    {category.subcategories.map(subcategory => {
                      const value = selectedSubmission.data?.[subcategory.key] || 0;
                      const label = getLikertScaleLabel(value);
                      
                      return (
                        <div key={subcategory.key} style={{
                          padding: '1rem',
                          backgroundColor: 'white',
                          borderRadius: '0.5rem',
                          border: `1px solid ${category.color}15`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                              <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                                {subcategory.name}
                              </h5>
                              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0.75rem 0' }}>
                                {subcategory.description}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {label}
                            </span>
                            <span style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: category.color,
                              backgroundColor: `${category.color}15`,
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px'
                            }}>
                              {value}/7
                            </span>
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
    )}

    <AccessNotification 
      userAccess={project?.userAccess || { level: 'viewer' }} 
      action="viewing"
    />
  </div>
);
};

export default ProjectDetailsOverview;