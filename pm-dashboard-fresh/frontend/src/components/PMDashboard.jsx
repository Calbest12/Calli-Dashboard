import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Home, Folder, BarChart3, Users, Settings, Brain, TrendingUp, Calendar, Award, RefreshCw, Loader } from 'lucide-react';
import LoginPage from './LoginPage';
import ProjectManager from './ProjectManager';
import apiService from '../services/apiService';
import CareerDevelopmentTab from './CareerDevelopmentTab';

const PMDashboard = ({ onUserChange, onProjectChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  
  // AI Insights state
  const [dashboardInsights, setDashboardInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [lastInsightsUpdate, setLastInsightsUpdate] = useState(null);

  const [careerData, setCareerData] = useState({
    goals: [],
    completedGoals: [],
    stats: null
  });

  useEffect(() => {
    if (onUserChange && currentUser) {
      onUserChange(currentUser);
    }
  }, [currentUser, onUserChange]);

  // Load projects when user logs in
  useEffect(() => {
    const loadAllData = async () => {
      if (isAuthenticated && currentUser) {
        await Promise.all([
          loadUserProjects(),
          loadCareerData()
        ]);
      }
    };
    loadAllData();
  }, [isAuthenticated, currentUser]);

  // AUTO-REFRESH insights when projects or career data change
  useEffect(() => {
    if ((projects.length > 0 || careerData.goals.length > 0) && activeSection === 'overview') {
      console.log('🔄 Dashboard data changed, auto-refreshing insights...');
      generateDashboardInsights(projects);
    }
  }, [projects.length, careerData.goals.length, careerData.completedGoals.length, activeSection]);

  

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (onUserChange) onUserChange(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveSection('overview');
    setProjects([]);
    setDashboardInsights([]);
    setLastInsightsUpdate(null);
    setCareerData({ goals: [], completedGoals: [], stats: null });
    if (onUserChange) onUserChange(null);
    if (onProjectChange) onProjectChange(null);
  };

  const loadCareerData = async () => {
    if (!currentUser) return;
    
    try {
      console.log('📊 Loading career data for dashboard overview...');
      
      // Load all career data in parallel
      const [goalsResponse, completedResponse, statsResponse] = await Promise.all([
        apiService.getCareerGoals().catch(err => {
          console.error('Failed to load goals:', err);
          return { data: [] };
        }),
        apiService.getUserCompletedGoals().catch(err => {
          console.error('Failed to load completed goals:', err);
          return { data: [] };
        }), 
        apiService.getCareerStats().catch(err => {
          console.error('Failed to load stats:', err);
          return { data: null };
        })
      ]);
      
      console.log('Raw API Responses:', {
        goals: goalsResponse,
        completed: completedResponse,
        stats: statsResponse
      });
      
      // Handle the response structure properly
      let goalsArray = [];
      let completedArray = [];
      let statsData = null;
      
      // Extract goals data
      if (goalsResponse?.success && goalsResponse?.data) {
        goalsArray = Array.isArray(goalsResponse.data) ? goalsResponse.data : [];
      } else if (Array.isArray(goalsResponse)) {
        goalsArray = goalsResponse;
      }
      
      // Extract completed goals data  
      if (completedResponse?.success && completedResponse?.data) {
        completedArray = Array.isArray(completedResponse.data) ? completedResponse.data : [];
      } else if (Array.isArray(completedResponse)) {
        completedArray = completedResponse;
      }
      
      // Extract stats data
      if (statsResponse?.success && statsResponse?.data) {
        statsData = statsResponse.data;
      } else if (statsResponse && !statsResponse.success) {
        statsData = statsResponse;
      }
      
      // Additional check: if completedArray is empty, try to get completed goals from goalsArray
      if (completedArray.length === 0 && goalsArray.length > 0) {
        const completedFromGoals = goalsArray.filter(g => g.status === 'completed');
        if (completedFromGoals.length > 0) {
          console.log('Found completed goals in goals array:', completedFromGoals.length);
          completedArray = completedFromGoals;
        }
      }
      
      // Update state with the extracted data
      setCareerData({
        goals: goalsArray,
        completedGoals: completedArray,
        stats: statsData
      });
      
      console.log('✅ Career data processed and set:', {
        goalsCount: goalsArray.length,
        activeGoalsCount: goalsArray.filter(g => g.status === 'active').length,
        completedCount: completedArray.length,
        completedFromStats: statsData?.completedGoals,
        completedFromGoalsArray: goalsArray.filter(g => g.status === 'completed').length,
        statsData: statsData
      });
      
    } catch (error) {
      console.error('❌ Failed to load career data for dashboard:', error);
      setCareerData({ goals: [], completedGoals: [], stats: null });
    }
  };


  // ENHANCED Load user's projects with proper state management
  const loadUserProjects = async (showLoading = true) => {
    try {
      if (showLoading) console.log('📊 Loading projects for dashboard...');
      
      const response = await apiService.getAllProjects();
      console.log('Projects API Response:', response);
      
      if (response && response.success && response.data) {
        const newProjects = response.data;
        console.log(`✅ Loaded ${newProjects.length} projects`);
        console.log('Project details:', newProjects.map(p => ({
          name: p.name,
          status: p.status,
          priority: p.priority,
          pm_progress: p.pm_progress,
          progress: p.progress
        })));
        
        // Update projects state
        setProjects(newProjects);
        
        // Auto-generate insights if we're on overview
        if (activeSection === 'overview') {
          console.log('🧠 Auto-generating insights for updated projects...');
          await generateDashboardInsights(newProjects);
        }
        
        return newProjects;
      } else {
        console.warn('⚠️ Invalid projects response:', response);
        setProjects([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to load projects:', error);
      setProjects([]);
      return [];
    }
  };

  // ENHANCED Generate AI insights for the dashboard
  const generateDashboardInsights = async (userProjects = projects) => {
    if (!currentUser) {
      console.log('⚠️ No current user for insights generation');
      return;
    }

    if (userProjects.length === 0 && careerData.goals.length === 0) {
      setDashboardInsights([
        {
          type: 'info',
          icon: Folder,
          message: 'Create your first project or goal to start getting AI insights'
        }
      ]);
      setLastInsightsUpdate(new Date());
      return;
    }

    try {
      setInsightsLoading(true);
      console.log('🧠 Generating dashboard AI insights for full dashboard context...');

      // Try to get AI insights from backend first
      let aiGeneratedInsights = null;
      
      try {
        console.log('🚀 Attempting to get AI insights from backend...');
        
        // Create a comprehensive context for AI analysis including career data
        const activeProjects = userProjects.filter(p => p.status === 'active');
        const activeGoals = careerData.goals.filter(g => g.status === 'active');
        
        // Calculate average goal progress correctly
        const totalGoalProgress = activeGoals.reduce((sum, g) => {
          const progress = g.progress || g.current_progress || g.currentProgress || 0;
          return sum + progress;
        }, 0);
        const calculatedAvgGoalProgress = activeGoals.length > 0 ? 
          Math.round(totalGoalProgress / activeGoals.length) : 0;
        
        // Get completed goals count from multiple possible sources
        const completedGoalsCount = careerData.stats?.completedGoals || 
                                   careerData.completedGoals?.length || 
                                   careerData.goals?.filter(g => g.status === 'completed')?.length || 
                                   0;
        
        console.log('Portfolio context career data:', {
          stats: careerData.stats,
          completedGoalsArray: careerData.completedGoals,
          completedFromGoals: careerData.goals?.filter(g => g.status === 'completed'),
          finalCompletedCount: completedGoalsCount
        });
        
        const portfolioContext = {
          user: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role
          },
          portfolio: {
            totalProjects: userProjects.length,
            activeProjects: activeProjects.length,
            criticalProjects: userProjects.filter(p => p.priority === 'critical').length,
            avgProjectProgress: activeProjects.length > 0 
              ? (activeProjects.reduce((sum, p) => sum + (p.progress?.PM || p.pm_progress || 0), 0) / activeProjects.length)
              : 0,
            projects: userProjects.map(p => ({
              id: p.id,
              name: p.name,
              status: p.status,
              priority: p.priority,
              progress: p.progress || { PM: p.pm_progress || 0 }
            }))
          },
          career: {
            totalGoals: careerData.goals.length,
            activeGoals: activeGoals.length,
            completedGoals: completedGoalsCount,  // Use the calculated count
            avgGoalProgress: careerData.stats?.overview?.overallProgress || calculatedAvgGoalProgress,
            goalCategories: [...new Set(careerData.goals.map(g => g.category))],
            criticalGoals: careerData.goals.filter(g => g.priority === 'critical').length
          }
        };

        const insightPrompt = `Analyze this complete dashboard including projects and career development, and provide exactly 3 detailed, actionable insights in JSON format:

Portfolio Summary:
- Total Projects: ${portfolioContext.portfolio.totalProjects} (${portfolioContext.portfolio.activeProjects} active)
- Critical Projects: ${portfolioContext.portfolio.criticalProjects}
- Average Project Progress: ${portfolioContext.portfolio.avgProjectProgress.toFixed(1)}/7 (${Math.round((portfolioContext.portfolio.avgProjectProgress/7)*100)}%)

Career Development:
- Active Goals: ${portfolioContext.career.activeGoals}
- Completed Goals: ${portfolioContext.career.completedGoals}
- Average Goal Progress: ${portfolioContext.career.avgGoalProgress}%
- Skill Categories: ${portfolioContext.career.goalCategories.join(', ') || 'None'}

Individual Projects:
${userProjects.slice(0, 5).map(p => `- "${p.name}": ${p.status}, ${p.priority} priority, PM progress ${p.progress?.PM || 0}/7 (${Math.round(((p.progress?.PM || 0)/7)*100)}%)`).join('\n')}

Active Career Goals:
${activeGoals.slice(0, 5).map(g => `- "${g.title}": ${g.category}, ${g.progress || 0}% complete`).join('\n') || '- No active goals'}

Provide response as JSON with detailed, specific insights:
{
  "insights": [
    {"type": "success|warning|info", "message": "detailed insight with specific numbers and actionable advice"},
    {"type": "success|warning|info", "message": "detailed insight with specific numbers and actionable advice"},
    {"type": "success|warning|info", "message": "detailed insight with specific numbers and actionable advice"}
  ]
}

Focus on providing insights that:
- Include specific percentages, counts, or progress metrics
- Identify concrete risks, opportunities, or patterns
- Suggest specific actions the user should take
- Balance between project execution and career growth
- Highlight critical items needing immediate attention
- Note achievements worth celebrating
- Flag resource allocation or priority conflicts
- Identify skill gaps between goals and project needs
Each message should be 100-120 characters with specific data points and clear recommendations.`;

        const aiResponse = await apiService.sendAIChat({
          message: insightPrompt,
          context: portfolioContext
        });

        if (aiResponse && aiResponse.success) {
          console.log('✅ AI response received:', aiResponse.response.substring(0, 200) + '...');
          
          // Try to parse as JSON
          try {
            const parsed = JSON.parse(aiResponse.response);
            if (parsed.insights && Array.isArray(parsed.insights)) {
              aiGeneratedInsights = parsed.insights.map(insight => ({
                type: insight.type || 'info',
                icon: getInsightIcon(insight.type),
                message: insight.message || 'AI analysis completed',
                source: 'ai'
              }));
              console.log('✅ AI insights parsed successfully:', aiGeneratedInsights.length);
            }
          } catch (parseError) {
            console.log('⚠️ Could not parse AI response as JSON, extracting from text...');
            aiGeneratedInsights = extractInsightsFromText(aiResponse.response);
          }
        }
      } catch (aiError) {
        console.log('⚠️ AI service error, using fallback insights:', aiError.message);
      }

      // Generate rule-based insights as fallback
      const ruleBasedInsights = generateRuleBasedDashboardInsights(userProjects);

      // Use AI insights if available, otherwise use rule-based
      const finalInsights = aiGeneratedInsights && aiGeneratedInsights.length > 0 
        ? aiGeneratedInsights.slice(0, 3)
        : ruleBasedInsights.slice(0, 3);

      setDashboardInsights(finalInsights);
      setLastInsightsUpdate(new Date());
      console.log('✅ Dashboard insights set:', finalInsights.length, 'insights');

    } catch (error) {
      console.error('❌ Failed to generate dashboard insights:', error);
      
      // Fallback to basic insights
      const fallbackInsights = generateRuleBasedDashboardInsights(userProjects);
      setDashboardInsights(fallbackInsights.slice(0, 3));
      setLastInsightsUpdate(new Date());
    } finally {
      setInsightsLoading(false);
    }
  };

  // Helper to get insight icons
  const getInsightIcon = (type) => {
    const icons = {
      'success': Award,
      'warning': Calendar,
      'info': TrendingUp,
      'error': Calendar
    };
    return icons[type] || TrendingUp;
  };

  // Helper to extract insights from AI text
  const extractInsightsFromText = (text) => {
    const insights = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    for (const sentence of sentences.slice(0, 3)) {
      let type = 'info';
      if (sentence.toLowerCase().includes('excellent') || sentence.toLowerCase().includes('strong') || sentence.toLowerCase().includes('good')) {
        type = 'success';
      } else if (sentence.toLowerCase().includes('warning') || sentence.toLowerCase().includes('attention') || sentence.toLowerCase().includes('concern') || sentence.toLowerCase().includes('risk')) {
        type = 'warning';
      }
      
      // Allow longer messages for more detailed insights
      const trimmedMessage = sentence.trim();
      const finalMessage = trimmedMessage.length > 120 ? 
        trimmedMessage.substring(0, 117) + '...' : 
        trimmedMessage;
      
      insights.push({
        type,
        icon: getInsightIcon(type),
        message: finalMessage,
        source: 'ai_text'
      });
    }
    
    return insights;
  };

  // ENHANCED Generate rule-based dashboard insights
  const generateRuleBasedDashboardInsights = (allProjects) => {
    const insights = [];
    const activeProjects = allProjects.filter(p => p.status === 'active');
    const criticalProjects = allProjects.filter(p => p.priority === 'critical');
    const completedProjects = allProjects.filter(p => p.status === 'completed');
    
    // Calculate project progress correctly
    const totalProjectProgress = activeProjects.reduce((sum, p) => {
      const pmProgress = p.progress?.PM || p.pm_progress || 0;
      return sum + pmProgress;
    }, 0);
    const avgProjectProgress = activeProjects.length > 0 ? totalProjectProgress / activeProjects.length : 0;
    const avgProjectPercentage = Math.round((avgProjectProgress / 7) * 100);
    
    // Career data calculations with null checks
    const activeGoals = careerData.goals?.filter(g => g.status === 'active') || [];
    const totalGoalProgress = activeGoals.reduce((sum, g) => {
      // Check multiple possible property names for progress
      const progress = g.progress || g.current_progress || g.currentProgress || 0;
      console.log(`Goal "${g.title || g.name}" progress:`, progress);
      return sum + progress;
    }, 0);
    const avgGoalProgress = activeGoals.length > 0 ? totalGoalProgress / activeGoals.length : 0;
    
    // Get completed goals count from multiple possible sources
    const completedGoalsCount = careerData.stats?.completedGoals || 
                                careerData.completedGoals?.length || 
                                careerData.goals?.filter(g => g.status === 'completed')?.length || 
                                0;
    
    console.log('Goal progress calculation:', {
      activeGoalsCount: activeGoals.length,
      totalProgress: totalGoalProgress,
      avgProgress: avgGoalProgress,
      completedGoalsCount: completedGoalsCount
    });
    
    // Combined portfolio and career health insight with specific metrics
    if (avgProjectProgress >= 5.5 && avgGoalProgress >= 70) {
      insights.push({
        type: 'success',
        icon: Award,
        message: `Excellence: Projects at ${avgProjectPercentage}% & goals at ${Math.round(avgGoalProgress)}% - maintain momentum!`
      });
    } else if (avgProjectProgress >= 5.5 && avgGoalProgress < 40) {
      insights.push({
        type: 'warning',
        icon: TrendingUp,
        message: `Projects strong (${avgProjectPercentage}%) but goals lagging (${Math.round(avgGoalProgress)}%) - allocate 2hrs/week to skills`
      });
    } else if (avgProjectProgress < 3 && avgGoalProgress >= 70) {
      insights.push({
        type: 'warning',
        icon: Calendar,
        message: `Goals advancing (${Math.round(avgGoalProgress)}%) but projects at risk (${avgProjectPercentage}%) - focus on deliverables`
      });
    } else if (avgProjectProgress < 3 && avgGoalProgress < 40) {
      insights.push({
        type: 'warning',
        icon: Calendar,
        message: `Critical: Projects (${avgProjectPercentage}%) & goals (${Math.round(avgGoalProgress)}%) both <40% - prioritize top 3 items`
      });
    } else {
      const totalInitiatives = activeProjects.length + activeGoals.length;
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `${totalInitiatives} active items: Projects ${avgProjectPercentage}%, Goals ${Math.round(avgGoalProgress)}% - steady progress`
      });
    }

    // Priority and resource balance insight with specific recommendations
    const criticalGoals = activeGoals.filter(g => g.priority === 'critical');
    const totalCritical = criticalProjects.length + criticalGoals.length;
    
    if (totalCritical > 3) {
      insights.push({
        type: 'warning',
        icon: Calendar,
        message: `${totalCritical} critical priorities competing - reduce to max 3 for 25% better completion rate`
      });
    } else if (criticalProjects.length > 0) {
      const criticalAvg = criticalProjects.reduce((sum, p) => sum + (p.progress?.PM || p.pm_progress || 0), 0) / criticalProjects.length;
      const criticalPercentage = Math.round((criticalAvg / 7) * 100);
      if (criticalAvg < 4) {
        const daysToDeadline = 14; // Estimate
        insights.push({
          type: 'warning',
          icon: Calendar,
          message: `${criticalProjects.length} critical projects at ${criticalPercentage}% - need ${Math.round((7-criticalAvg)*2)}hrs/week to hit targets`
        });
      } else {
        insights.push({
          type: 'success',
          icon: Award,
          message: `Critical projects at ${criticalPercentage}% progress - on track for successful delivery`
        });
      }
    } else if (activeGoals.length > 5) {
      const topGoalsProgress = activeGoals
        .sort((a, b) => (b.progress || 0) - (a.progress || 0))
        .slice(0, 3)
        .reduce((sum, g) => sum + (g.progress || 0), 0) / 3;
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `${activeGoals.length} goals active (top 3 at ${Math.round(topGoalsProgress)}%) - consider archiving lowest priority`
      });
    } else {
      const projectVelocity = completedProjects.length > 0 ? 
        `${completedProjects.length} completed, ` : '';
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `Balanced workload: ${projectVelocity}${activeProjects.length} active, ${activeGoals.length} goals progressing`
      });
    }

    // Growth, completion and velocity insight with specific metrics
    const projectCompletionRate = allProjects.length > 0 ? 
      Math.round((completedProjects.length / allProjects.length) * 100) : 0;
    
    if (completedGoalsCount > 0 && projectCompletionRate > 50) {
      insights.push({
        type: 'success',
        icon: Award,
        message: `Strong delivery: ${completedGoalsCount} goals done, ${projectCompletionRate}% project completion rate`
      });
    } else if (completedGoalsCount === 0 && activeGoals.length > 0) {
      const nearestGoalProgress = Math.max(...activeGoals.map(g => g.progress || 0));
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `Nearest goal at ${nearestGoalProgress}% - push to 100% for momentum boost & confidence`
      });
    } else if (activeProjects.length === 0 && allProjects.length > 0) {
      insights.push({
        type: 'warning',
        icon: Calendar,
        message: `No active projects! Reactivate or archive ${allProjects.length} stalled projects to clear backlog`
      });
    } else if (activeProjects.length === 0 && activeGoals.length === 0) {
      insights.push({
        type: 'info',
        icon: Folder,
        message: `Empty portfolio - start with 1 quick-win project or skill goal for momentum`
      });
    } else {
      const totalActive = activeProjects.length + activeGoals.length;
      const weeklyHoursNeeded = Math.round(totalActive * 3); // Estimate 3hrs per initiative
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `${totalActive} initiatives need ~${weeklyHoursNeeded}hrs/week - block calendar time for focus work`
      });
    }

    return insights;
  };

  // MANUAL refresh insights with user feedback
  const handleRefreshInsights = async () => {
    console.log('🔄 Manual refresh requested...');
    setInsightsLoading(true);
    
    try {
      // First refresh projects to get latest data
      const updatedProjects = await loadUserProjects(false);
      
      // Then generate insights with the fresh data
      await generateDashboardInsights(updatedProjects);
      
      console.log('✅ Manual refresh complete');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    } finally {
      setInsightsLoading(false);
    }
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'projects', label: 'Projects', icon: Folder, badge: projects.length },
    { id: 'collective', label: 'Collective', icon: BarChart3 },
    { id: 'leadership', label: 'Leadership', icon: Award },
    { id: 'career', label: 'Career Development', icon: TrendingUp },
    { id: 'ai-insights', label: 'AI Insights', icon: Brain },
    { id: 'team', label: 'Team', icon: Users, roles: ['Manager', 'Executive Leader'] },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const renderOverview = () => (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
              Welcome back, {currentUser.name}! 👋
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
              Here's your project management overview for today.
            </p>
          </div>
          <button
            onClick={async () => {
              console.log('Manual refresh triggered');
              await Promise.all([loadUserProjects(), loadCareerData()]);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <RefreshCw size={16} />
            Refresh Data
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Active Projects</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            {projects.filter(p => p.status === 'active').length}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#111827', marginTop: '0.25rem' }}>
            {(() => {
              const activeProjects = projects.filter(p => p.status === 'active');
              if (activeProjects.length === 0) return '0% avg progress';
              
              // Calculate total PM progress percentage for active projects
              let totalPercentage = 0;
              activeProjects.forEach(p => {
                // The progress bar shows 71% for Team Member, so we need to use that value
                // This might be calculated from pm_progress (5/7 = 71%)
                const pmProgress = p.pm_progress || p.progress?.PM || 0;
                const percentage = Math.round((pmProgress / 7) * 100);
                totalPercentage += percentage;
              });
              
              const avgProgress = Math.round(totalPercentage / activeProjects.length);
              return `${avgProgress}% avg progress`;
            })()}
          </p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Total Projects</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            {projects.length}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#111827', marginTop: '0.25rem' }}>
            {(() => {
              if (projects.length === 0) return '0% avg progress';
              
              // Calculate total progress percentage for ALL projects
              let totalPercentage = 0;
              projects.forEach(p => {
                const pmProgress = p.pm_progress || p.progress?.PM || 0;
                const percentage = Math.round((pmProgress / 7) * 100);
                totalPercentage += percentage;
              });
              
              const avgProgress = Math.round(totalPercentage / projects.length);
              return `${avgProgress}% avg progress`;
            })()}
          </p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Career Goals</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            {(() => {
              // First check if we have stats with the correct structure
              if (careerData.stats?.activeGoals !== undefined) {
                return careerData.stats.activeGoals;
              }
              // Fall back to counting from goals array
              if (Array.isArray(careerData.goals)) {
                const activeCount = careerData.goals.filter(g => g.status === 'active').length;
                return activeCount;
              }
              return 0;
            })()}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#111827', marginTop: '0.25rem' }}>
            {(() => {
              // Calculate average progress for active goals
              if (careerData.stats?.avgProgress !== undefined) {
                return `${Math.round(careerData.stats.avgProgress)}% avg progress`;
              }
              
              const activeGoals = Array.isArray(careerData.goals) 
                ? careerData.goals.filter(g => g.status === 'active')
                : [];
                
              if (activeGoals.length === 0) return '0% avg progress';
              
              const totalProgress = activeGoals.reduce((sum, g) => {
                // Check multiple possible property names for progress
                const progress = g.progress || g.current_progress || g.currentProgress || 0;
                return sum + progress;
              }, 0);
              
              const avgProgress = Math.round(totalProgress / activeGoals.length);
              return `${avgProgress}% avg progress`;
            })()}
          </p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Completed Goals</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            {(() => {
              // Prioritize stats, then fall back to array
              if (careerData.stats?.completedGoals !== undefined) {
                return careerData.stats.completedGoals;
              }
              if (Array.isArray(careerData.completedGoals)) {
                return careerData.completedGoals.length;
              }
              return 0;
            })()}
          </p>
          
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => setActiveSection('projects')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Folder size={20} style={{ color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Manage Projects
              </h3>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
              Create, edit, and track all your projects in one place
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => setActiveSection('career')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={20} style={{ color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Career Development
              </h3>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
              Track skills, set goals, and manage your professional growth
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BarChart3 size={20} style={{ color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                View Analytics
              </h3>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
              Get insights into team performance and project metrics
            </p>
          </div>
        </div>
      </div>

      {/* ENHANCED AI INSIGHTS SECTION */}
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
            AI Portfolio Insights
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
            <span style={{ marginLeft: '0.5rem' }}>Analyzing your project portfolio...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {dashboardInsights.map((insight, index) => {
              const IconComponent = insight.icon;
              const iconColor = insight.type === 'success' ? '#10b981' : 
                               insight.type === 'warning' ? '#f59e0b' : '#2563eb';
              
              return (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <IconComponent size={16} style={{ color: iconColor, marginTop: '0.125rem' }} />
                  <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
                    {insight.message}
                  </p>
                </div>
              );
            })}
            {dashboardInsights.length === 0 && !insightsLoading && (
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                No insights available. Create some projects to get started!
              </p>
            )}
            {lastInsightsUpdate && (
              <p style={{ 
                fontSize: '0.75rem', 
                color: '#64748b', 
                margin: '0.5rem 0 0 0',
                fontStyle: 'italic'
              }}>
                Last updated: {lastInsightsUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'projects':
        return (
          <ProjectManager 
            currentUser={currentUser} 
            onProjectSelect={(project) => {
              if (onProjectChange) onProjectChange(project);
            }}
            onProjectsChange={loadUserProjects} // Pass refresh function
          />
        );
      case 'career':
       return (
         <CareerDevelopmentTab 
           currentUser={currentUser}
           apiService={apiService}
           onDataChange={async () => {
             console.log('Career data changed, refreshing dashboard...');
             await loadCareerData();
           }}
         />
       );
      default:
        return (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
              {navigationItems.find(item => item.id === activeSection)?.label}
            </h2>
            <p style={{ color: '#6b7280', margin: 0 }}>This section is coming soon...</p>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarCollapsed ? '4rem' : '16rem',
        backgroundColor: 'white',
        borderRight: '1px solid #e5e7eb',
        transition: 'width 0.3s ease',
        flexShrink: 0
      }}>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Brain size={24} style={{ color: '#2563eb' }} />
              {!sidebarCollapsed && <span style={{ fontWeight: '700', color: '#111827' }}>PMgt Dashboard</span>}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                padding: '0.5rem',
                background: 'transparent',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <nav>
            {navigationItems.map(item => {
              if (item.roles && !item.roles.includes(currentUser.role)) {
                return null;
              }

              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    marginBottom: '0.25rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: isActive ? '#eff6ff' : 'transparent',
                    color: isActive ? '#2563eb' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && (
                    <>
                      <span>{item.label}</span>
                      {item.badge && (
                        <span style={{
                          marginLeft: 'auto',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          minWidth: '1.25rem',
                          textAlign: 'center'
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid #f3f4f6', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              {currentUser.name.charAt(0)}
            </div>
            {!sidebarCollapsed && (
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: 0 }}>{currentUser.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{currentUser.role}</p>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                color: '#991b1b',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#fecaca';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#fee2e2';
              }}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default PMDashboard;