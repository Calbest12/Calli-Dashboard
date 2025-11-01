import { useState, useEffect } from 'react';

const useProjectPermissions = (project, currentUser) => {
  const [permissions, setPermissions] = useState({
    canView: false,
    canEdit: false,
    canComment: false,
    canManageTeam: false,
    canDelete: false,
    userLevel: 'none'
  });

  useEffect(() => {
    if (!project || !currentUser) {
      setPermissions({
        canView: false,
        canEdit: false,
        canComment: false,
        canManageTeam: false,
        canDelete: false,
        userLevel: 'none'
      });
      return;
    }

    const isCreator = project.created_by === currentUser.id;
    const isTeamMember = project.teamMembers?.some(member => member.id === currentUser.id);
    const isExecutive = currentUser.role === 'Executive Leader';

    let newPermissions = {
      canView: true, // Everyone can view
      canEdit: isCreator || isTeamMember,        // Team Members + Project Managers
      canComment: isCreator || isTeamMember || isExecutive,
      canManageTeam: isCreator,                  // Only Project Managers
      canDelete: isCreator,                      // Only Project Managers
      userLevel: isCreator ? 'manager' : 
                 isTeamMember ? 'member' : 
                 isExecutive ? 'executive' : 'viewer'
    };

    setPermissions(newPermissions);
    
    console.log('🔐 Permissions calculated:', {
      projectId: project.id,
      userId: currentUser.id,
      isCreator,
      isTeamMember,
      isExecutive,
      permissions: newPermissions
    });

  }, [project, currentUser]);

  return permissions;
};

export default useProjectPermissions;