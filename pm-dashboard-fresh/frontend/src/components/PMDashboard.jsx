// frontend/src/components/PMDashboard.jsx
// MINIMAL UPDATE - Only adds Leadership tab, preserves all original styling

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Home, Folder, BarChart3, Users, Settings, Target, TrendingUp, Calendar, Award, RefreshCw, Loader } from 'lucide-react';
import LoginPage from './LoginPage';
import ProjectManager from './ProjectManager';
import apiService from '../services/apiService';
import CareerDevelopmentTab from './CareerDevelopmentTab';
import LeadershipTab from './LeadershipTab';
import ExecutiveTeamTab from './ExecutiveTeamTab';
import OrganizationalChangeManagementTab from './organizationChangeManagementTab';
import logo from '../assets/logo.png';

const PMDashboard = ({ onUserChange, onProjectChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  
  const [dashboardInsights, setDashboardInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [lastInsightsUpdate, setLastInsightsUpdate] = useState(null);

  const [careerData, setCareerData] = useState({
    goals: [],
    completedGoals: [],
    stats: null
  });

  // ONLY CHANGE: Updated navigation order per meeting notes, preserved original structure
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'leadership', label: 'Leadership', icon: Award }, // ADDED
    { id: 'org-change-mgmt', label: 'Org Change Mgmt', icon: Target }, // MOVED UP per meeting notes
    { id: 'career', label: 'Career Development', icon: TrendingUp },
    
    // Add Team Management tab ONLY for Executive Leaders - PRESERVED ORIGINAL LOGIC
    ...(currentUser?.role === 'Executive Leader' ? [{
      id: 'team',
      label: 'Team Management', 
      icon: Users,
      description: 'Manage your team members and track their projects'
    }] : []),
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // PRESERVED: All original useEffect and data loading functions exactly as they were
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        setIsAuthenticated(true);
        if (onUserChange) onUserChange(user);
        loadUserData();
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        handleLogout();
      }
    }
  }, []);

  const loadUserData = async () => {
    try {
      await Promise.all([
        loadUserProjects(),
        loadCareerData()
      ]);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadUserProjects = async (generateInsights = true) => {
    try {
      console.log('📂 Loading user projects...');
      const response = await apiService.getUserProjects();
      
      if (response.success) {
        const projectsWithProgress = response.projects.map(project => ({
          ...project,
          overall_progress: Math.round((
            (project.pm_progress || 0) + 
            (project.leadership_progress || 0) + 
            (project.change_mgmt_progress || 0) +
            (project.career_dev_progress || 0)
          ) / 4)
        }));
        
        setProjects(projectsWithProgress);
        
        if (generateInsights) {
          await generateDashboardInsights(projectsWithProgress);
        }
        
        return projectsWithProgress;
      } else {
        console.error('Failed to load projects:', response.error);
        setProjects([]);
        return [];
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
      return [];
    }
  };

  const loadCareerData = async () => {
    try {
      console.log('🎯 Loading career data...');
      const [goalsResponse, completedResponse, statsResponse] = await Promise.all([
        apiService.getCareerGoals(),
        apiService.getUserCompletedGoals(),
        apiService.getCareerStats()
      ]);

      const newCareerData = {
        goals: goalsResponse.success ? goalsResponse.goals : [],
        completedGoals: completedResponse.success ? completedResponse.completedGoals : [],
        stats: statsResponse.success ? statsResponse.stats : null
      };

      setCareerData(newCareerData);
      return newCareerData;
    } catch (error) {
      console.error('Error loading career data:', error);
      setCareerData({ goals: [], completedGoals: [], stats: null });
    }
  };

  const generateDashboardInsights = async (allProjects) => {
    try {
      setInsightsLoading(true);
      const insights = generateInsights(allProjects, careerData.goals || []);
      setDashboardInsights(insights);
      setLastInsightsUpdate(new Date());
    } catch (error) {
      console.error('Error generating insights:', error);
      setDashboardInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  };

  const generateInsights = (allProjects, allGoals) => {
    const insights = [];
    
    const activeProjects = allProjects.filter(p => p.status === 'active');
    const activeGoals = allGoals.filter(g => g.status === 'active');
    
    // Project insights
    const stuckProjects = activeProjects.filter(p => p.overall_progress < 25);
    if (stuckProjects.length > 0) {
      insights.push({
        type: 'warning',
        icon: Target,
        message: `${stuckProjects.length} project${stuckProjects.length > 1 ? 's' : ''} need attention - progress below 25%`
      });
    }

    // Goal insights
    if (activeGoals.length > 5) {
      insights.push({
        type: 'warning',
        icon: TrendingUp,
        message: `${activeGoals.length} active goals may be overwhelming - consider prioritizing 3-5 key objectives`
      });
    }

    // Overall portfolio health
    if (allProjects.length > 10) {
      insights.push({
        type: 'info',
        icon: RefreshCw,
        message: `Reactivate or archive ${allProjects.length} stalled projects to clear backlog`
      });
    } else if (activeProjects.length === 0 && activeGoals.length === 0) {
      insights.push({
        type: 'info',
        icon: Folder,
        message: `Empty portfolio - start with 1 quick-win project or skill goal for momentum`
      });
    } else {
      const totalActive = activeProjects.length + activeGoals.length;
      const weeklyHoursNeeded = Math.round(totalActive * 3);
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `${totalActive} initiatives need ~${weeklyHoursNeeded}hrs/week - block calendar time for focus work`
      });
    }

    return insights;
  };

  const handleLogin = async (userData) => {
      try {
        console.log('🔄 PMDashboard handleLogin called with:', userData);
        console.log('👤 Setting current user:', userData.name);
        
        setCurrentUser(userData);
        console.log('✅ Current user state updated');
        
        setIsAuthenticated(true);
        console.log('✅ Authentication state set to true');
        
        if (onUserChange) {
          console.log('📡 Calling onUserChange callback');
          onUserChange(userData);
        }
        
        console.log('🔄 Loading user data...');
        await loadUserData();
        console.log('✅ User data loaded');
        
        console.log('🎉 Login flow completed successfully');
      } catch (error) {
        console.error('❌ Error in handleLogin:', error);
      }
    };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setProjects([]);
    setCareerData({ goals: [], completedGoals: [], stats: null });
    setDashboardInsights([]);
    if (onUserChange) onUserChange(null);
  };

  const handleRefreshInsights = async () => {
    console.log('🔄 Manual refresh requested...');
    setInsightsLoading(true);
    
    try {
      const updatedProjects = await loadUserProjects(false);
      await generateDashboardInsights(updatedProjects);
      console.log('✅ Manual refresh complete');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    } finally {
      setInsightsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // PRESERVED: Original renderOverview function with minimal null check fix
  const renderOverview = () => (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
          Welcome back, {currentUser.name}!
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
          Here's your {currentUser.role === 'Executive Leader' ? 'executive leadership' : 'project management'} overview for today.
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Manage Projects Card - PRESERVED ORIGINAL */}
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

          {/* Career Development Card - PRESERVED ORIGINAL */}
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
                background: 'linear-gradient(135deg, #10b981, #059669)',
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
              Set goals, track progress, and develop your professional skills
            </p>
          </div>

          {/* ONLY NEW ADDITION: Leadership Assessment Card */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => setActiveSection('leadership')}
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
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Award size={20} style={{ color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Leadership Assessment
              </h3>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
              Evaluate your leadership diamond and track development
            </p>
          </div>

          {/* PRESERVED: Original Team Management Card for Executive Leaders */}
          {currentUser.role === 'Executive Leader' && (
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => setActiveSection('team')}
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
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={20} style={{ color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  Team Management
                </h3>
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                Manage your team members and track their project assignments
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PRESERVED: Original AI Insights section exactly as it was */}
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
            <BarChart3 size={20} />
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
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
            <p style={{ margin: 0 }}>Analyzing your portfolio...</p>
          </div>
        ) : (
          <div>
            {dashboardInsights.length > 0 ? (
              dashboardInsights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    backgroundColor: insight.type === 'warning' ? '#fef3f2' : '#f0f9ff',
                    border: `1px solid ${insight.type === 'warning' ? '#fecaca' : '#bae6fd'}`,
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    marginBottom: index < dashboardInsights.length - 1 ? '0.75rem' : '0'
                  }}>
                    <Icon size={20} style={{
                      color: insight.type === 'warning' ? '#dc2626' : '#0ea5e9',
                      flexShrink: 0
                    }} />
                    <span style={{
                      color: insight.type === 'warning' ? '#991b1b' : '#0c4a6e',
                      fontSize: '0.875rem'
                    }}>
                      {insight.message}
                    </span>
                  </div>
                );
              })
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', margin: 0 }}>
                Create some projects to get started!
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

  // ONLY ADDITIONS: Add leadership case, preserve all other cases exactly as they were
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
            onProjectsChange={loadUserProjects}
          />
        );
      case 'leadership':  // ONLY NEW CASE ADDED
        return (
          <LeadershipTab 
            currentUser={currentUser}
            apiService={apiService}
            onDataChange={loadUserData}
          />
        );
      case 'org-change-mgmt':  // UPDATED case ID to match navigation
        return (
          <OrganizationalChangeManagementTab 
            currentUser={currentUser}
            apiService={apiService}
            onDataChange={loadUserData}
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
       case 'team':
        if (currentUser?.role !== 'Executive Leader') {
          return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h3>Access Denied</h3>
              <p>Only Executive Leaders can access Team Management.</p>
            </div>
          );
        }
        return <ExecutiveTeamTab currentUser={currentUser} />;
      default:
        return (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
              {tabs.find(item => item.id === activeSection)?.label}
            </h2>
            <p style={{ color: '#6b7280', margin: 0 }}>This section is coming soon...</p>
          </div>
        );
    }
  };

  // PRESERVED: Original return structure and styling exactly as it was
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* PRESERVED: Original sidebar structure and styling */}
      <div style={{
        width: sidebarCollapsed ? '5rem' : '16rem',
        backgroundColor: 'white',
        borderRight: '1px solid #e5e7eb',
        transition: 'width 0.3s ease',
        flexShrink: 0
      }}>
        <div style={{ padding: '1rem' }}>
          {/* UPDATED: Fixed logo display for collapsed/expanded states */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img 
                src={logo}
                alt="Logo" 
                style={{ 
                  height: sidebarCollapsed ? '30px' : '100px',
                  width: 'auto',
                  transition: 'height 0.3s ease'
                }} 
              />
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

          {/* PRESERVED: Original navigation structure */}
          <nav>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
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
                  <Icon size={sidebarCollapsed ? 20 : 18} />
                  {!sidebarCollapsed && (
                    <>
                      <span>{tab.label}</span>
                      {tab.badge && (
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
                          {tab.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* PRESERVED: Original user info section */}
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

      {/* PRESERVED: Original main content area */}
      <div style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default PMDashboard;