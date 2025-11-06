import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, MessageSquare, Clock, Users, BarChart3, Calendar,
  Target, Send, Info, Zap, Flag, CheckCircle, Activity, TrendingUp
} from 'lucide-react';

import ProgressUpdateSection from './ProgressUpdateSection';
import LikertFeedbackSection from './ProjectFeedbackSection';
import ProjectDetailsOverview from './ProjectDetailsOverview';
import ProjectCommentsSection from './ProjectCommentsSection';
import ProjectTeamSection from './ProjectTeamSection';
import ProjectHistorySection from './ProjectHistorySection';
import ProjectAnalyticsSection from './ProjectAnalyticsSection';
import apiService from '../services/apiService';

const ProjectDetails = ({ project, onBack, onUpdateProject, onEditProject, currentUser }) => {
  console.log('ðŸ” ProjectDetails Full Debug:', {
    'project exists': !!project,
    'project.id': project?.id,
    'project.name': project?.name,
    'project.teamMembers exists': !!project?.teamMembers,
    'project.teamMembers length': project?.teamMembers?.length,
    'project.team_size': project?.team_size,
    'project keys': project ? Object.keys(project) : 'null',
    'full project object': project
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [projectHistory, setProjectHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [teamMembersFromAPI, setTeamMembersFromAPI] = useState([]);

  useEffect(() => {
    const loadTeamData = async () => {
      if (!project?.id) return;
      
      try {
        console.log('ðŸ”„ Loading team data for project:', project.id);
        const teamResponse = await apiService.getProjectTeam(project.id);
        console.log('ðŸ“¡ Team API response:', teamResponse);
        
        if (teamResponse && teamResponse.success && teamResponse.data) {
          console.log('âœ… Team members loaded:', teamResponse.data.length);
          setTeamMembersFromAPI(teamResponse.data);
        }
      } catch (error) {
        console.error('âŒ Failed to load team data:', error);
        setTeamMembersFromAPI([]);
      }
    };
  
    loadTeamData();
  }, [project?.id]);

  const createSafeCurrentUser = () => {

    const hasValidId = currentUser && currentUser.id;
    const hasValidName = currentUser && currentUser.name;
    
    if (hasValidId && hasValidName) {
      const result = {
        ...currentUser,
        id: typeof currentUser.id === 'string' ? parseInt(currentUser.id) || 1 : currentUser.id
      };
      return result;
    }
    
    if (currentUser && typeof currentUser === 'object') {
      const fixedUser = {
        id: currentUser.id || currentUser.userId || 1,
        name: currentUser.name || currentUser.username || currentUser.displayName || 'Fixed User Name',
        email: currentUser.email || currentUser.emailAddress || 'user@company.com',
        ...currentUser
      };
      
      if (typeof fixedUser.id === 'string') {
        fixedUser.id = parseInt(fixedUser.id) || 1;
      }
      
      return fixedUser;
    }
    
    return {
      id: 1,
      name: 'FALLBACK USER (Fix the currentUser prop!)',
      email: 'fallback@company.com',
      isFallback: true
    };
  };
  
  const safeCurrentUser = createSafeCurrentUser();
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'overview', label: 'Overview', icon: Info },
      { id: 'comments', label: 'Comments', icon: MessageSquare },
      { id: 'team', label: 'Team', icon: Users },
      { id: 'history', label: 'History', icon: Clock },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 }
    ];
  
    // ONLY show these tabs to Team Members and Project Managers
    if (safeCurrentUser.role !== 'Executive Leader') {
      baseTabs.splice(1, 0, { id: 'progress', label: 'Update Progress', icon: Target });
      baseTabs.push({ id: 'feedback', label: 'Feedback', icon: Send });
    }
  
    return baseTabs;
  }, [safeCurrentUser.role]);
  const safeProject = useMemo(() => {
    if (!project) return null;
    
    return {
      id: project.id || Date.now(),
      name: project.name || 'Unnamed Project',
      description: project.description || 'No description available',
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      deadline: project.deadline || '',
      team: project.team || [],
      lastUpdate: project.lastUpdate || 'Unknown',
      progress: {
        PM: project.progress?.PM || 0,
        Leadership: project.progress?.Leadership || 0,
        ChangeMgmt: project.progress?.ChangeMgmt || 0,
        CareerDev: project.progress?.CareerDev || 0
      }
    };
  }, [project]);

  const teamMembersDetailed = useMemo(() => {
    // First try the API data
    if (teamMembersFromAPI && teamMembersFromAPI.length > 0) {
      return teamMembersFromAPI;
    }
    
    // Fallback to computed data from project.team if available
    if (!safeProject?.team || !Array.isArray(safeProject.team)) {
      return [];
    }
  
    return safeProject.team.map((teamMember, index) => {
      if (typeof teamMember === 'object' && teamMember.name) {
        return teamMember;
      }
  
      if (typeof teamMember === 'string') {
        return {
          name: teamMember,
          role: 'Team Member',
          email: `${teamMember.toLowerCase().replace(' ', '.')}@company.com`,
          avatar: teamMember.split(' ').map(n => n[0]).join('').toUpperCase(),
          status: 'active',
          contribution: Math.floor(Math.random() * 20) + 80, 
          tasksCompleted: Math.floor(Math.random() * 15) + 5, 
          joinedDate: '2024-07-20',
          skills: ['Project Management', 'Communication']
        };
      }
      
      return {
        name: 'Unknown Member',
        role: 'Team Member',
        email: 'unknown@company.com',
        avatar: 'UM',
        status: 'active',
        contribution: 75,
        tasksCompleted: 5,
        joinedDate: '2024-07-20',
        skills: []
      };
    });
  }, [safeProject?.team, teamMembersFromAPI]);

  useEffect(() => {
    console.log('ðŸ” ProjectDetails currentUser debugging:', {
      'currentUser prop received': currentUser,
      'currentUser is null/undefined': currentUser == null,
      'currentUser has id': !!currentUser?.id,
      'currentUser has name': !!currentUser?.name,
      'safeCurrentUser being used': safeCurrentUser,
      'using fallback': safeCurrentUser.isFallback
    });
  }, [currentUser, safeCurrentUser]);


  const refreshProjectHistory = async () => {
    if (!safeProject?.id) {
      console.log('âš ï¸ No project ID available for history refresh');
      return;
    }
    
    try {
      setHistoryLoading(true);
      console.log('ðŸ”„ Refreshing project history for project:', safeProject.id);
      
      const response = await apiService.getProjectHistory(safeProject.id);
      console.log('âœ… History refresh response:', response);
      
      if (response && response.success && response.data) {
        setProjectHistory(response.data);
        console.log('âœ… Project history refreshed with', response.data.length, 'entries');
      } else {
        console.warn('âš ï¸ Invalid history refresh response:', response);
        setProjectHistory([]);
      }
    } catch (error) {
      console.error('âŒ Failed to refresh project history:', error);
      setProjectHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const fetchProjectHistory = async () => {
      if (!safeProject?.id) {
        console.log('âš ï¸ No project ID available for history fetch');
        setProjectHistory([]);
        return;
      }
      
      try {
        setHistoryLoading(true);
        console.log('ðŸ”„ Initial fetch of project history for project:', safeProject.id, 'Name:', safeProject.name);
        
        const response = await apiService.getProjectHistory(safeProject.id);
        console.log('âœ… Raw history API response:', response);
        
        if (response && response.success && response.data) {
          setProjectHistory(response.data);
          console.log('âœ… Project history state updated with', response.data.length, 'entries');
        } else {
          console.warn('âš ï¸ Invalid history response format:', response);
          setProjectHistory([]);
        }
      } catch (error) {
        console.error('âŒ Failed to load project history:', error);
        setProjectHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    window.forceRefreshHistory = refreshProjectHistory;
    window.currentProjectDebug = {
      project,
      projectId: safeProject?.id,
      projectIdType: typeof safeProject?.id,
      refreshHistory: refreshProjectHistory
    };

    fetchProjectHistory();
  }, [safeProject?.id]);

  const handleCommentsCountChange = (count) => {
    console.log('ðŸ”„ Comments count updated:', count);
    setCommentsCount(count);
  };

  if (!project || !safeProject) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Error: No project data</h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Project information is missing.</p>
          <button
            onClick={onBack}
            style={{
              background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            â† Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const ComprehensiveDebugger = () => (
    <div style={{
      backgroundColor: '#fee2e2',
      padding: '1rem',
      borderRadius: '0.5rem',
      margin: '1rem 0',
      border: '2px solid #ef4444',
      fontSize: '0.75rem'
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b' }}>
        ðŸ› COMPREHENSIVE DEBUG INFO
      </h4>
      <div style={{ color: '#991b1b' }}>
        <div><strong>1. Raw currentUser prop:</strong></div>
        <pre style={{ backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '0.25rem', overflow: 'auto' }}>
          {JSON.stringify(currentUser, null, 2)}
        </pre>
        
        <div><strong>2. currentUser checks:</strong></div>
        <ul>
          <li>currentUser exists: {currentUser ? 'YES' : 'NO'}</li>
          <li>currentUser.id: {currentUser?.id || 'MISSING'}</li>
          <li>currentUser.name: {currentUser?.name || 'MISSING'}</li>
          <li>currentUser.email: {currentUser?.email || 'MISSING'}</li>
          <li>typeof currentUser: {typeof currentUser}</li>
          <li>typeof currentUser.id: {typeof currentUser?.id}</li>
        </ul>
        
        <div><strong>3. safeCurrentUser result:</strong></div>
        <pre style={{ backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '0.25rem', overflow: 'auto' }}>
          {JSON.stringify(safeCurrentUser, null, 2)}
        </pre>
        
        <div><strong>4. Is using fallback:</strong> {safeCurrentUser.isFallback ? 'YES - THIS IS THE PROBLEM!' : 'NO'}</div>
      </div>
    </div>
  );

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'active': { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
      'planning': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
      'completed': { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
      'on_hold': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' }
    };
    return statusColors[status] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
  };

  const getPriorityColor = (priority) => {
    const priorityColors = {
      'low': { bg: '#f3f4f6', text: '#6b7280', icon: Flag },
      'medium': { bg: '#fef3c7', text: '#92400e', icon: Flag },
      'high': { bg: '#fecaca', text: '#991b1b', icon: Flag },
      'critical': { bg: '#fee2e2', text: '#7f1d1d', icon: Zap }
    };
    return priorityColors[priority] || { bg: '#f3f4f6', text: '#6b7280', icon: Flag };
  };

  const getActionIcon = (type) => {
    const icons = {
      'created': CheckCircle,
      'team_change': Users,
      'status_change': Flag,
      'progress_update': TrendingUp,
      'project_update': TrendingUp,
      'deadline_change': Calendar,
      'comment': MessageSquare,
      'feedback_submitted': Send
    };
    return icons[type] || Activity;
  };

  const getActionColor = (type) => {
    const colors = {
      'created': '#10b981',
      'team_change': '#3b82f6',
      'status_change': '#f59e0b',
      'progress_update': '#8b5cf6',
      'project_update': '#8b5cf6',
      'deadline_change': '#ef4444',
      'comment': '#6b7280',
      'feedback_submitted': '#10b981'
    };
    return colors[type] || '#6b7280';
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: Date.now(),
        author: safeCurrentUser?.name || 'Current User',
        avatar: safeCurrentUser.name?.split(' ').map(n => n[0]).join('') || 'CU',
        content: newComment,
        timestamp: new Date().toISOString(),
        type: 'comment'
      };
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    
    if (newTab === 'history') {
      console.log('ðŸ”„ Switching to history tab - auto-refreshing...');
      setTimeout(() => refreshProjectHistory(), 100);
    }
  };

  const handleProgressUpdate = async (updatedProject) => {
    console.log('ðŸ”„ Progress updated:', updatedProject);

    if (onUpdateProject) {
      onUpdateProject(updatedProject);
    }

    console.log('ðŸ”„ Auto-refreshing history after progress update...');
    await refreshProjectHistory();
    
    console.log('âœ… Progress update complete with history refresh');
  };

  const handleFeedbackSubmission = async (feedbackRecord) => {
    try {
      console.log('ðŸ“ Submitting feedback to backend:', feedbackRecord);
      
      const feedbackWithUser = {
        ...feedbackRecord,
        userName: safeCurrentUser?.name || feedbackRecord.userName || 'Current User',
        currentUser: safeCurrentUser
      };
      
      await apiService.submitProjectFeedback(safeProject.id, feedbackWithUser);
      console.log('âœ… Feedback submitted to backend successfully');
      
      try {
        const updatedProjectResponse = await apiService.getProject(safeProject.id);
        console.log('ðŸ”„ Refreshed project data:', updatedProjectResponse.data);
        
        if (onUpdateProject) {
          onUpdateProject(updatedProjectResponse.data);
        }
      } catch (error) {
        console.error('âŒ Failed to refresh project data:', error);
      }

      console.log('ðŸ”„ Auto-refreshing history after feedback submission...');
      await refreshProjectHistory();

      alert('Feedback submitted successfully!');
      
    } catch (error) {
      console.error('âŒ Failed to submit feedback:', error);
      alert(`Failed to submit feedback: ${error.message || 'Please try again.'}`);
    }
  };

  const handleProjectUpdate = async (updatedData) => {
    try {
      console.log('ðŸ”„ Updating project:', updatedData);
      
      const response = await apiService.updateProject(safeProject.id, updatedData);
      console.log('âœ… Project update response:', response);
      
      if (response && response.success) {
        if (onUpdateProject) {
          onUpdateProject(response.data);
        }
        
        console.log('ðŸ”„ Auto-refreshing history after project update...');
        await refreshProjectHistory();
        
        console.log('âœ… Project update complete with history refresh');
      }
    } catch (error) {
      console.error('âŒ Failed to update project:', error);
      alert(`Failed to update project: ${error.message || 'Please try again.'}`);
    }
  };

  const avgProgress = Math.round((safeProject.progress.PM) * 100 / 7);
  const statusColors = getStatusColor(safeProject.status);
  const priorityColors = getPriorityColor(safeProject.priority);
  const PriorityIcon = priorityColors.icon;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <ProjectDetailsOverview
            project={safeProject}
            statusColors={statusColors}
            priorityColors={priorityColors}
            PriorityIcon={PriorityIcon}
            avgProgress={avgProgress}
            teamMembersDetailed={teamMembersDetailed}
            projectHistory={projectHistory}
            formatTimestamp={formatTimestamp}
            getActionIcon={getActionIcon}
            getActionColor={getActionColor}
            onEditProject={onEditProject}
            onUpdateProject={handleProjectUpdate}
            refreshHistory={refreshProjectHistory}
            setActiveTab={handleTabChange}
          />
        );
      case 'progress':
        return (
          <ProgressUpdateSection
            project={safeProject}
            onUpdateProgress={handleProgressUpdate}
            currentUser={safeCurrentUser}
            refreshHistory={refreshProjectHistory}
          />
        );
      case 'comments':
        return (
          <ProjectCommentsSection
            project={safeProject}
            currentUser={safeCurrentUser}
            refreshHistory={refreshProjectHistory}
            onCommentsCountChange={handleCommentsCountChange}
          />
        );
      case 'team':
        return (
          <ProjectTeamSection
            teamMembersDetailed={teamMembersDetailed}
            project={safeProject}
            currentUser={safeCurrentUser}
            onTeamUpdate={(updatedTeam) => {
              const updatedProject = { ...safeProject, team: updatedTeam };
              if (onUpdateProject) {
                onUpdateProject(updatedProject);
              }
            }}
            refreshHistory={refreshProjectHistory}
          />
        );
      case 'history':
        return (
          <ProjectHistorySection
            projectHistory={projectHistory}
            formatTimestamp={formatTimestamp}
            getActionIcon={getActionIcon}
            getActionColor={getActionColor}
            historyLoading={historyLoading}
            onRefresh={refreshProjectHistory}
          />
        );
        case 'analytics':
          return (
            <ProjectAnalyticsSection
              teamMembersDetailed={teamMembersDetailed}
              project={safeProject}  // This must be safeProject, not project
              currentUser={safeCurrentUser}
            />
          );
      case 'feedback':
        return (
          <LikertFeedbackSection
            project={safeProject}
            onSubmitFeedback={handleFeedbackSubmission}
            currentUser={safeCurrentUser}
            refreshHistory={refreshProjectHistory}
          />
        );
      default:
        return (
          <ProjectDetailsOverview
            project={safeProject}
            statusColors={statusColors}
            priorityColors={priorityColors}
            PriorityIcon={PriorityIcon}
            avgProgress={avgProgress}
            teamMembersDetailed={teamMembersDetailed}
            projectHistory={projectHistory}
            formatTimestamp={formatTimestamp}
            getActionIcon={getActionIcon}
            getActionColor={getActionColor}
            onEditProject={onEditProject}
            onUpdateProject={handleProjectUpdate}
            refreshHistory={refreshProjectHistory}
            setActiveTab={handleTabChange}
          />
        );
    }
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('â¬…ï¸ Back button clicked in ProjectDetails');
                onBack();
              }}
              style={{
                padding: '0.75rem',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.borderColor = '#e5e7eb';
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
                {safeProject.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                  border: `1px solid ${statusColors.border}`
                }}>
                  {safeProject.status.replace('_', ' ')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PriorityIcon size={16} style={{ color: priorityColors.text }} />
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: priorityColors.bg,
                    color: priorityColors.text
                  }}>
                    {safeProject.priority} priority
                  </span>
                </div>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Updated {safeProject.lastUpdate}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    style={{
                      padding: '0.75rem 1rem',
                      border: 'none',
                      borderRadius: '0.5rem',
                      background: isActive ? '#eff6ff' : 'transparent',
                      color: isActive ? '#2563eb' : '#6b7280',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.target.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.target.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span style={{
                        backgroundColor: isActive ? '#2563eb' : '#e5e7eb',
                        color: isActive ? 'white' : '#6b7280',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        minWidth: '1.25rem',
                        textAlign: 'center'
                      }}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '2rem' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;