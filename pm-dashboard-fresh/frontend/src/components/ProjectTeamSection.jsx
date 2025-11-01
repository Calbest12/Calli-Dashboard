import React, { useState, useEffect } from 'react';
import { Edit3, Trash2, Mail, Calendar, Award, Users, UserPlus, Search, Filter, MoreVertical } from 'lucide-react';
import TeamMemberModal from './TeamMemberModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import apiService from '../services/apiService';

const ProjectTeamSection = ({ 
  teamMembersDetailed, 
  project, 
  currentUser, 
  onTeamUpdate,
  refreshHistory 
}) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const loadTeamMembers = async () => {
    if (!project?.id) {
      console.warn('âš ï¸ No project ID available for team loading');
      return;
    }
    
    try {
      console.log('ðŸ”„ Loading fresh team data for project:', project.id);
      console.log('ðŸ” Project details:', { id: project.id, name: project.name });
      
      const response = await apiService.getProjectTeam(project.id);
      console.log('ðŸ“¡ Team API response:', response);
      
      if (response && response.success) {
        console.log('âœ… Loaded team members from API:', response.data.length);
        console.log('ðŸ“‹ Team member details:', response.data.map(m => ({
          id: m.id,
          name: m.name,
          contribution: m.contribution,
          tasksCompleted: m.tasksCompleted,
          skills: m.skills
        })));
        setTeamMembers(response.data);
      } else {
        console.warn('âš ï¸ Failed to load team members:', response);
        console.log('ðŸ”„ Using fallback prop data:', teamMembersDetailed?.length || 0);
        setTeamMembers(teamMembersDetailed || []);
      }
    } catch (error) {
      console.error('âŒ Error loading team members:', error);
      console.error('âŒ Error details:', {
        message: error.message,
        stack: error.stack,
        projectId: project.id
      });
      console.log('ðŸ”„ Using fallback prop data after error:', teamMembersDetailed?.length || 0);
      setTeamMembers(teamMembersDetailed || []);
    }
  };

  useEffect(() => {
    console.log('ðŸ”„ TeamSection useEffect triggered');
    console.log('ðŸ” Project data:', { id: project?.id, name: project?.name });
    console.log('ðŸ” Current team members count:', teamMembers.length);
    
    loadTeamMembers();
  }, [project?.id]); 

  useEffect(() => {
    console.log('ðŸ”„ TeamSection props sync useEffect');
    console.log('ðŸ” teamMembersDetailed prop:', teamMembersDetailed?.length || 0);
    console.log('ðŸ” current teamMembers state:', teamMembers.length);
    
    if (teamMembersDetailed && teamMembersDetailed.length > 0 && teamMembers.length === 0) {
      console.log('ðŸ“‹ Using prop team data as fallback:', teamMembersDetailed.length);
      setTeamMembers(teamMembersDetailed);
    }
  }, [teamMembersDetailed]); 

  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const response = await apiService.getAllUsers();
        if (response && response.success) {
          setAllUsers(response.data);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };
    loadAllUsers();
  }, []);

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(member.role);
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = [...new Set(teamMembers.map(member => member.role))];

  const handleAddMember = () => {
    setEditingMember(null);
    setShowAddMemberModal(true);
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setShowEditMemberModal(true);
  };

  const handleDeleteMember = (member) => {
    setDeletingMember(member);
    setShowDeleteConfirm(true);
  };

  const handleSubmitMember = async (memberData) => {
    try {
      setLoading(true);
      
      if (editingMember) {
        console.log('ðŸ”„ Updating team member:', memberData.name);
        console.log('ðŸ“Š Update data being sent:', {
          contribution: memberData.contribution,
          tasksCompleted: memberData.tasksCompleted,
          skills: memberData.skills
        });
        
        const response = await apiService.updateTeamMember(project.id, editingMember.id, memberData);
        console.log('âœ… Update response:', response.data);

        setTeamMembers(prev => prev.map(m => 
          m.id === editingMember.id ? response.data : m
        ));
        
        setShowEditMemberModal(false);
        
      } else {
        console.log('ðŸ†• Adding team member:', memberData.name);
        console.log('ðŸ” Current team members before add:', teamMembers.length);
        console.log('ðŸ“Š New member data:', {
          contribution: memberData.contribution,
          tasksCompleted: memberData.tasksCompleted,
          skills: memberData.skills
        });

        const memberDataWithId = {
          ...memberData,
          id: memberData.id
        };
        
        const response = await apiService.addTeamMember(project.id, memberDataWithId);
        console.log('âœ… Add member API response:', response);

        setTeamMembers(prev => {
          const newTeamMembers = [...prev, response.data];
          console.log('âœ… Updated team members count:', newTeamMembers.length);
          return newTeamMembers;
        });
        
        setShowAddMemberModal(false);
      }
      
      await refreshHistory?.();
      
      setEditingMember(null);
      
    } catch (error) {
      console.error('âŒ Failed to save team member:', error);
      alert(`Failed to save team member: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      console.log('ðŸ—‘ï¸ Removing team member:', deletingMember.name);
      console.log('ðŸ” Current team members before delete:', teamMembers.length);
      
      await apiService.removeTeamMember(project.id, deletingMember.id);

      const updatedTeamMembers = teamMembers.filter(m => m.id !== deletingMember.id);
      setTeamMembers(updatedTeamMembers);
      console.log('âœ… Updated team members count after delete:', updatedTeamMembers.length);
      
      setShowDeleteConfirm(false);
      setDeletingMember(null);

      await refreshHistory?.();
      
    } catch (error) {
      console.error('âŒ Failed to remove team member:', error);
      alert(`Failed to remove team member: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const DebugTeamData = () => (
    <div style={{
      backgroundColor: '#fef3c7',
      border: '2px solid #f59e0b',
      borderRadius: '0.5rem',
      padding: '1rem',
      margin: '1rem 0',
      fontSize: '0.875rem'
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: '#92400e', fontWeight: '600' }}>
        ðŸ› DEBUG: Team Data Analysis
      </h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <strong>Props Data:</strong>
          <ul style={{ margin: '0.25rem 0', paddingLeft: '1rem' }}>
            <li>teamMembersDetailed length: {teamMembersDetailed?.length || 0}</li>
            <li>project.id: {project?.id || 'undefined'}</li>
            <li>project.name: {project?.name || 'undefined'}</li>
            <li>project.team length: {project?.team?.length || 0}</li>
          </ul>
          
          {teamMembersDetailed && teamMembersDetailed.length > 0 && (
            <div>
              <strong>Props Team Members:</strong>
              <ul style={{ margin: '0.25rem 0', paddingLeft: '1rem', fontSize: '0.75rem' }}>
                {teamMembersDetailed.map((member, index) => (
                  <li key={index}>
                    {member.name} ({member.email}) - {member.role}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div>
          <strong>State Data:</strong>
          <ul style={{ margin: '0.25rem 0', paddingLeft: '1rem' }}>
            <li>teamMembers length: {teamMembers.length}</li>
            <li>filteredMembers length: {filteredMembers.length}</li>
            <li>loading: {loading.toString()}</li>
            <li>searchTerm: "{searchTerm}"</li>
            <li>filterRole: "{filterRole}"</li>
          </ul>
          
          {teamMembers && teamMembers.length > 0 && (
            <div>
              <strong>State Team Members:</strong>
              <ul style={{ margin: '0.25rem 0', paddingLeft: '1rem', fontSize: '0.75rem' }}>
                {teamMembers.map((member, index) => (
                  <li key={index}>
                    ID: {member.id} - {member.name} ({member.email}) - {member.role}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '0.25rem' }}>
        <strong>API Test:</strong>
        <button
          onClick={() => {
            console.log('ðŸ”§ Manual API test triggered');
            loadTeamMembers();
          }}
          style={{
            marginLeft: '0.5rem',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer'
          }}
        >
          Reload Team Data
        </button>
      </div>
    </div>
  );

  const getStatusColor = (status) => {
    const colors = {
      'active': '#10b981',
      'away': '#f59e0b',
      'offline': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getRoleColor = (role) => {
    const colors = {
      'Project Manager': '#8b5cf6',
      'Developer': '#3b82f6',
      'Designer': '#ec4899',
      'QA Engineer': '#10b981',
      'Business Analyst': '#f59e0b',
      'Team Lead': '#ef4444'
    };
    return colors[role] || '#6b7280';
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      padding: '1.5rem'
    }}>
      {/* Header with Search and Controls */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Team Members ({filteredMembers.length})
          </h3>
          <button
            onClick={handleAddMember}
            disabled={loading}
            style={{
              background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              opacity: loading ? 0.6 : 1
            }}
          >
            <UserPlus size={16} />
            Add Member
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div style={{ display: 'flex', gap: '4rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Search size={16} style={{ 
              position: 'absolute', 
              left: '0.75rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#9ca3af' 
            }} />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <Filter size={16} style={{ 
              position: 'absolute', 
              left: '0.75rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#9ca3af',
              zIndex: 1
            }} />
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              style={{
                padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: 'white',
                minWidth: '180px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>
                {selectedRoles.length === 0 
                  ? 'All Roles' 
                  : selectedRoles.length === 1 
                    ? selectedRoles[0]
                    : `${selectedRoles.length} roles selected`
                }
              </span>
              <span style={{ transform: showRoleDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                â–¼
              </span>
            </button>
            
            {showRoleDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 20,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                marginTop: '0.25rem'
              }}>
                {/* Clear All Option */}
                <div
                  onClick={() => setSelectedRoles([])}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    fontWeight: '500',
                    color: '#ef4444'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  Clear All Filters
                </div>
                
                {uniqueRoles.map(role => (
                  <div
                    key={role}
                    onClick={() => {
                      if (selectedRoles.includes(role)) {
                        setSelectedRoles(selectedRoles.filter(r => r !== role));
                      } else {
                        setSelectedRoles([...selectedRoles, role]);
                      }
                    }}
                    style={{
                      padding: '0.75rem',
                      cursor: 'pointer',
                      borderBottom: uniqueRoles.indexOf(role) === uniqueRoles.length - 1 ? 'none' : '1px solid #f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #d1d5db',
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selectedRoles.includes(role) ? '#2563eb' : 'white',
                      borderColor: selectedRoles.includes(role) ? '#2563eb' : '#d1d5db'
                    }}>
                      {selectedRoles.includes(role) && (
                        <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>âœ“</span>
                      )}
                    </div>
                    {role}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Members Grid */}
      {filteredMembers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          color: '#6b7280'
        }}>
          <Users size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            {searchTerm || filterRole !== 'all' ? 'No members found' : 'No team members yet'}
          </h4>
          <p style={{ fontSize: '0.875rem', margin: 0 }}>
            {searchTerm || filterRole !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Add team members to get started'
            }
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {filteredMembers.map(member => {
            const actualContribution = member.contribution ?? 0;
            const actualTasksCompleted = member.tasksCompleted ?? 0;
            const actualSkills = Array.isArray(member.skills) ? member.skills : [];
            
            console.log(`ðŸ” Rendering member ${member.name}:`, {
              contribution: actualContribution,
              tasksCompleted: actualTasksCompleted,
              skills: actualSkills
            });
            
            return (
              <div key={member.id || member.name} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                
                {/* Member Actions Dropdown */}
                <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                      style={{
                        padding: '0.25rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        color: '#6b7280'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      onClick={(e) => {
                        e.preventDefault();
                        const dropdown = e.target.closest('div').querySelector('.dropdown-menu');
                        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    <div
                      className="dropdown-menu"
                      style={{
                        display: 'none',
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        zIndex: 10,
                        minWidth: '120px'
                      }}
                    >
                      <button
                        onClick={() => handleEditMember(member)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: 'none',
                          background: 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: 'none',
                          background: 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {/* Member Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {member.avatar || member.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h4 style={{ 
                        fontSize: '1rem', 
                        fontWeight: '600', 
                        color: '#111827', 
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {member.name}
                        {currentUser && member.email === currentUser.email && (
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#2563eb',
                            fontWeight: '500',
                            marginLeft: '0.5rem'
                          }}>
                            (You)
                          </span>
                        )}
                      </h4>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(member.status || 'active'),
                        flexShrink: 0
                      }} />
                    </div>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.125rem 0.5rem',
                      backgroundColor: getRoleColor(member.role) + '20',
                      color: getRoleColor(member.role),
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      borderRadius: '9999px',
                      marginBottom: '0.25rem'
                    }}>
                      {member.role}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Mail size={12} style={{ color: '#9ca3af' }} />
                      <p style={{ 
                        fontSize: '0.75rem', 
                        color: '#6b7280', 
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {member.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Member Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Contribution</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                      {actualContribution}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: actualContribution >= 90 ? '#10b981' : actualContribution >= 70 ? '#3b82f6' : actualContribution >= 40 ? '#f59e0b' : actualContribution > 0 ? '#f97316' : '#ef4444',
                        width: `${Math.max(actualContribution, 2)}%`, 
                        borderRadius: '9999px',
                        transition: 'width 0.8s ease-in-out'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Tasks Completed</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                      {actualTasksCompleted}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={12} style={{ color: '#9ca3af' }} />
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Joined</span>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                      {new Date(member.joinedDate || '2024-07-20').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                      <Award size={12} style={{ color: '#9ca3af' }} />
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Skills</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {actualSkills.length > 0 ? (
                        <>
                          {actualSkills.slice(0, 3).map(skill => (
                            <span key={skill} style={{
                              padding: '0.125rem 0.5rem',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              borderRadius: '9999px',
                              border: '1px solid #dbeafe'
                            }}>
                              {skill}
                            </span>
                          ))}
                          {actualSkills.length > 3 && (
                            <span style={{
                              padding: '0.125rem 0.5rem',
                              backgroundColor: '#f3f4f6',
                              color: '#6b7280',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              borderRadius: '9999px'
                            }}>
                              +{actualSkills.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          backgroundColor: '#f9fafb',
                          color: '#9ca3af',
                          fontSize: '0.75rem',
                          fontStyle: 'italic',
                          borderRadius: '9999px',
                          border: '1px solid #e5e7eb'
                        }}>
                          No skills listed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <TeamMemberModal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          setEditingMember(null);
        }}
        onSubmit={handleSubmitMember}
        member={null}
        allUsers={allUsers}
        currentTeamMembers={teamMembers}
        loading={loading}
        title="Add Team Member"
      />

      <TeamMemberModal
        isOpen={showEditMemberModal}
        onClose={() => {
          setShowEditMemberModal(false);
          setEditingMember(null);
        }}
        onSubmit={handleSubmitMember}
        member={editingMember}
        allUsers={allUsers}
        currentTeamMembers={teamMembers}
        loading={loading}
        title="Edit Team Member"
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingMember(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={deletingMember?.name}
        itemType="team member"
        message={`Are you sure you want to remove ${deletingMember?.name} from the team? This action cannot be undone.`}
      />
    </div>
  );
};

export default ProjectTeamSection;