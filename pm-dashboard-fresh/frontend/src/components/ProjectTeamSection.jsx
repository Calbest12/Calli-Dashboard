// frontend/src/components/ProjectTeamSection.jsx
import React, { useState, useEffect } from 'react';
import { Users, Plus, Mail, UserX, Search, Filter } from 'lucide-react';
import TeamMemberModal from './TeamMemberModal';
import apiService from '../services/apiService';

const ProjectTeamSection = ({ project, onUpdateProject, canManageTeam, isReadOnly }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    if (project?.id) {
      loadTeamMembers();
      loadAllUsers();
    }
  }, [project?.id]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      console.log('📡 Loading team members for project:', project.id);
      
      const response = await apiService.getProjectTeam(project.id);
      
      if (response && response.success) {
        console.log('✅ Team members loaded:', response.team);
        setTeamMembers(response.team || []);
      } else {
        console.warn('⚠️ Team loading response:', response);
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('❌ Failed to load team members:', error);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      console.log('📡 Loading all available users...');
      const response = await apiService.getAllUsers();
      
      if (response && response.success) {
        console.log('✅ All users loaded:', response.users?.length || 0);
        setAllUsers(response.users || []);
      } else {
        console.warn('⚠️ Users loading response:', response);
        setAllUsers([]);
      }
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      setAllUsers([]);
    }
  };

  const handleAddMember = async (memberData) => {
    try {
      console.log('➕ Adding team member:', memberData);
      
      const response = await apiService.addProjectTeamMember(project.id, {
        user_id: memberData.id,
        name: memberData.name,
        email: memberData.email,
        role_in_project: memberData.role || 'Team Member',
        skills: memberData.skills || []
      });

      if (response && response.success) {
        console.log('✅ Team member added successfully');
        await loadTeamMembers();
        setShowAddMember(false);
      } else {
        throw new Error(response?.error || 'Failed to add team member');
      }
    } catch (error) {
      console.error('❌ Failed to add team member:', error);
      throw error;
    }
  };

  const handleEditMember = async (memberData) => {
    try {
      console.log('📝 Updating team member:', memberData);
      
      const response = await apiService.updateProjectTeamMember(project.id, memberData.id, {
        name: memberData.name,
        email: memberData.email,
        role_in_project: memberData.role || 'Team Member',
        skills: memberData.skills || []
      });

      if (response && response.success) {
        console.log('✅ Team member updated successfully');
        await loadTeamMembers();
        setEditingMember(null);
      } else {
        throw new Error(response?.error || 'Failed to update team member');
      }
    } catch (error) {
      console.error('❌ Failed to update team member:', error);
      throw error;
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      console.log('🗑️ Removing team member:', memberId);
      
      const response = await apiService.removeProjectTeamMember(project.id, memberId);
      
      if (response && response.success) {
        console.log('✅ Team member removed successfully');
        await loadTeamMembers();
      } else {
        throw new Error(response?.error || 'Failed to remove team member');
      }
    } catch (error) {
      console.error('❌ Failed to remove team member:', error);
      alert(`Failed to remove team member: ${error.message}`);
    }
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || 
                       member.role_in_project?.toLowerCase().includes(roleFilter.toLowerCase());
    
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = [...new Set(teamMembers.map(member => member.role_in_project).filter(Boolean))];

  if (loading) {
    return (
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        textAlign: 'center'
      }}>
        <p style={{ color: '#6b7280', margin: 0 }}>Loading team members...</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 1.5rem 0',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} style={{ color: '#374151' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Team Members ({teamMembers.length})
          </h3>
        </div>

        {canManageTeam && !isReadOnly && (
          <button
            onClick={() => setShowAddMember(true)}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s'
            }}
          >
            <Plus size={16} />
            Add Member
          </button>
        )}
      </div>

      {/* Search and Filter */}
      {teamMembers.length > 0 && (
        <div style={{
          padding: '0 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem'
        }}>
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }} />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Role Filter */}
          {uniqueRoles.length > 1 && (
            <div style={{ position: 'relative' }}>
              <Filter size={16} style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                zIndex: 1
              }} />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  paddingLeft: '2.5rem',
                  padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">All Roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Team Members List */}
      <div style={{ padding: '0 1.5rem 1.5rem' }}>
        {filteredMembers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 0',
            color: '#6b7280'
          }}>
            {teamMembers.length === 0 ? (
              <>
                <Users size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  No team members yet
                </p>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>
                  Add team members to start collaborating on this project
                </p>
              </>
            ) : (
              <>
                <Search size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  No members found
                </p>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>
                  Try adjusting your search or filter criteria
                </p>
              </>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {filteredMembers.map(member => (
              <TeamMemberCard
                key={member.id || member.email}
                member={member}
                onEdit={canManageTeam && !isReadOnly ? () => setEditingMember(member) : null}
                onRemove={canManageTeam && !isReadOnly ? () => handleRemoveMember(member.id) : null}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Member Modal */}
      <TeamMemberModal
        isOpen={showAddMember || !!editingMember}
        onClose={() => {
          setShowAddMember(false);
          setEditingMember(null);
        }}
        onSubmit={editingMember ? handleEditMember : handleAddMember}
        member={editingMember}
        allUsers={allUsers}
        currentTeamMembers={teamMembers}
      />
    </div>
  );
};

// Simplified TeamMemberCard component without contribution and task tracking
const TeamMemberCard = ({ member, onEdit, onRemove, isReadOnly }) => {
  const handleRemoveClick = () => {
    if (window.confirm(`Are you sure you want to remove ${member.name} from this project?`)) {
      onRemove();
    }
  };

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1rem',
      transition: 'all 0.2s'
    }}>
      {/* Member Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem'
      }}>
        {/* Avatar */}
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: '#3b82f6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '600',
          fontSize: '0.875rem'
        }}>
          {member.avatar || member.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
        </div>

        {/* Member Info */}
        <div style={{ flex: 1 }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 0.25rem 0'
          }}>
            {member.name}
          </h4>
          <p style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <Mail size={12} />
            {member.email}
          </p>
        </div>

        {/* Actions */}
        {!isReadOnly && (onEdit || onRemove) && (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {onEdit && (
              <button
                onClick={onEdit}
                style={{
                  padding: '0.375rem',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '0.75rem'
                }}
                title="Edit member"
              >
                Edit
              </button>
            )}
            {onRemove && (
              <button
                onClick={handleRemoveClick}
                style={{
                  padding: '0.375rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Remove member"
              >
                <UserX size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Role and Skills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {member.role_in_project && (
          <div>
            <span style={{
              fontSize: '0.75rem',
              color: '#374151',
              fontWeight: '500'
            }}>
              Role: 
            </span>
            <span style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginLeft: '0.25rem'
            }}>
              {member.role_in_project}
            </span>
          </div>
        )}

        {member.skills && member.skills.length > 0 && (
          <div>
            <div style={{
              fontSize: '0.75rem',
              color: '#374151',
              fontWeight: '500',
              marginBottom: '0.25rem'
            }}>
              Skills:
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.25rem'
            }}>
              {member.skills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  style={{
                    fontSize: '0.625rem',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    fontWeight: '500'
                  }}
                >
                  {skill}
                </span>
              ))}
              {member.skills.length > 3 && (
                <span style={{
                  fontSize: '0.625rem',
                  color: '#6b7280',
                  padding: '0.125rem 0.375rem'
                }}>
                  +{member.skills.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {member.joined_date && (
          <div>
            <span style={{
              fontSize: '0.75rem',
              color: '#374151',
              fontWeight: '500'
            }}>
              Joined: 
            </span>
            <span style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginLeft: '0.25rem'
            }}>
              {new Date(member.joined_date).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTeamSection;