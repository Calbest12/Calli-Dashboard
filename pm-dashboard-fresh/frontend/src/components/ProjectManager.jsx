import React, { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import ProjectDetails from './ProjectDetails';
import ProjectFormModal from './ProjectFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import ProjectCard from './ProjectCard';
import apiService from '../services/apiService';

const ProjectManager = ({ currentUser, onProjectSelect, onProjectsChange }) => { // ← Added onProjectsChange prop
  
  // DEBUG: Log the received user
  useEffect(() => {
    console.log('👤 ProjectManager received currentUser:', currentUser);
    console.log('👤 User ID type:', typeof currentUser?.id);
    console.log('👤 User name:', currentUser?.name);
  }, [currentUser]);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  // ENHANCED: Load projects with notification to parent
  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 ProjectManager: Loading projects...');
      const response = await apiService.getAllProjects();
      
      if (response && response.success && response.data) {
        console.log('✅ ProjectManager: Loaded', response.data.length, 'projects');
        setProjects(response.data);
        
        // NOTIFY PARENT COMPONENT ABOUT PROJECT CHANGES
        if (onProjectsChange) {
          console.log('📢 ProjectManager: Notifying parent about project changes');
          onProjectsChange(response.data);
        }
        
        setError(null);
      } else {
        console.warn('⚠️ ProjectManager: Unexpected response format:', response);
        setProjects([]);
        setError('Unexpected response format from server');
      }
      
    } catch (error) {
      console.error('❌ ProjectManager: API Error:', error);
      setProjects([]);
      setError(`Failed to load projects: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    console.log('🔄 ProjectManager: Initial load triggered');
    loadProjects();
  }, []);

  useEffect(() => {
    // Cleanup function to clear project context when component unmounts
    return () => {
      if (onProjectSelect) onProjectSelect(null);
    };
  }, [onProjectSelect]);

  // Show ProjectDetails if any project is selected
  const showProjectDetails = selectedProject;

  const handleAddProject = () => {
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleDeleteProject = (project) => {
    setDeletingProject(project);
    setShowDeleteConfirm(true);
  };

  const handleViewProject = (project) => {
    console.log('🔥 View Details clicked for:', project.name);
    setSelectedProject(project);
    // Notify parent component about project selection for chatbot context
    if (onProjectSelect) onProjectSelect(project);
  };

  const handleSubmitProject = async (projectData) => {
    console.log('💾 Submitting project:', projectData.name, 'isEditing:', !!editingProject);
    
    try {
      if (editingProject) {
        // Update existing project
        console.log('🔄 Updating project via API...');
        const response = await apiService.updateProject(editingProject.id, projectData);
        
        // Update local state
        const updatedProjects = projects.map(p => p.id === editingProject.id ? response.data : p);
        setProjects(updatedProjects);
        
        // NOTIFY PARENT ABOUT CHANGE
        if (onProjectsChange) {
          onProjectsChange(updatedProjects);
        }
        
        if (selectedProject && selectedProject.id === editingProject.id) {
          setSelectedProject(response.data);
        }
      } else {
        // Create new project
        console.log('🆕 Creating new project via API...');
        const response = await apiService.createProject(projectData);
        console.log('✅ Project created:', response);
        
        // Add to local state
        const updatedProjects = [...projects, response.data];
        setProjects(updatedProjects);
        
        // NOTIFY PARENT ABOUT CHANGE
        if (onProjectsChange) {
          onProjectsChange(updatedProjects);
        }
      }
      
      // Close modal and reset state
      setShowProjectForm(false);
      setEditingProject(null);
      
    } catch (error) {
      console.error('❌ Failed to save project:', error);
      alert(`Failed to save project: ${error.message}`);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      console.log('🗑️ Deleting project via API:', deletingProject.name);
      
      // Call the backend API to delete the project
      await apiService.deleteProject(deletingProject.id);
      console.log('✅ Project deleted from backend');
      
      // Update local state only after successful backend deletion
      const updatedProjects = projects.filter(p => p.id !== deletingProject.id);
      setProjects(updatedProjects);
      
      // NOTIFY PARENT ABOUT CHANGE
      if (onProjectsChange) {
        onProjectsChange(updatedProjects);
      }
      
      // Close the selected project if it was the one being deleted
      if (selectedProject && selectedProject.id === deletingProject.id) {
        setSelectedProject(null);
        if (onProjectSelect) onProjectSelect(null);
      }
      
      setShowDeleteConfirm(false);
      setDeletingProject(null);
      
    } catch (error) {
      console.error('❌ Failed to delete project:', error);
      alert(`Failed to delete project: ${error.message}`);
      // Don't close the modal on error so user can retry
    }
  };

  const handleUpdateProject = async (updatedProject) => {
    try {
      console.log('🔄 Syncing project update to backend:', updatedProject.name);
      
      // Call the backend API to update the project
      const response = await apiService.updateProject(updatedProject.id, updatedProject);
      console.log('✅ Project updated in backend');
      
      // Use the response from backend to ensure data consistency
      const backendProject = response.data;
      
      // Update in projects array
      const updatedProjects = projects.map(p => p.id === backendProject.id ? backendProject : p);
      setProjects(updatedProjects);
      
      // NOTIFY PARENT ABOUT CHANGE
      if (onProjectsChange) {
        onProjectsChange(updatedProjects);
      }
      
      // Update selected project if it's the same one
      if (selectedProject && selectedProject.id === backendProject.id) {
        setSelectedProject(backendProject);
      }
      
    } catch (error) {
      console.error('❌ Failed to sync project update to backend:', error);
      
      // Still update local state for better UX, but show a warning
      const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
      setProjects(updatedProjects);
      
      // NOTIFY PARENT EVEN IF SYNC FAILED
      if (onProjectsChange) {
        onProjectsChange(updatedProjects);
      }
      
      if (selectedProject && selectedProject.id === updatedProject.id) {
        setSelectedProject(updatedProject);
      }
      
      // Show user that sync failed
      console.warn('⚠️ Project updated locally but failed to sync with backend');
    }
  };

  console.log('🔧 Current state - showProjectForm:', showProjectForm, 'editingProject:', editingProject?.name);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading projects...</h2>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>Error: {error}</h2>
        <button 
          onClick={loadProjects}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div>
      {/* Conditionally show either ProjectDetails or Project Manager */}
      {showProjectDetails ? (
        <ProjectDetails
          project={selectedProject}
          onBack={() => {
            setSelectedProject(null);
            // Clear project context when going back
            if (onProjectSelect) onProjectSelect(null);
          }}
          onUpdateProject={handleUpdateProject}
          onEditProject={() => {
            console.log('🔧 Edit button clicked from ProjectDetails');
            setEditingProject(selectedProject);
            setShowProjectForm(true);
          }}
          currentUser={currentUser}
        />
      ) : (
        /* Main Project Manager View */
        <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
                  Project Manager
                </h1>
                <p style={{ color: '#6b7280', fontSize: '1.125rem', margin: 0 }}>
                  Manage all your projects in one place
                </p>
              </div>

              <button
                onClick={handleAddProject}
                style={{
                  background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={20} />
                Add New Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                border: '2px dashed #d1d5db',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <FileText size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                  No projects yet
                </h3>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                  Get started by creating your first project
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '1.5rem'
              }}>
                {projects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={handleEditProject}
                    onDelete={handleDeleteProject}
                    onView={handleViewProject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals - Always rendered at top level, regardless of view */}
      <ProjectFormModal
        isOpen={showProjectForm}
        onClose={() => {
          console.log('🔧 Closing project form modal');
          setShowProjectForm(false);
          setEditingProject(null);
        }}
        onSubmit={handleSubmitProject}
        project={editingProject}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingProject(null);
        }}
        onConfirm={handleConfirmDelete}
        projectName={deletingProject?.name}
      />
    </div>
  );
};

export default ProjectManager;