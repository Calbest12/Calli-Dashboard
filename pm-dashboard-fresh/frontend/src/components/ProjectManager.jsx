// frontend/src/components/ProjectManager.jsx
import React, { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import ProjectDetails from './ProjectDetails';
import ProjectFormModal from './ProjectFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import ProjectCard from './ProjectCard';
import apiService from '../services/apiService';

const ProjectManager = ({ currentUser, onProjectSelect, onProjectsChange }) => {
  
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

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 ProjectManager: Loading projects...');
      const response = await apiService.getAllProjects();
      
      if (response && response.success && response.data) {
        console.log('✅ ProjectManager: Loaded', response.data.length, 'projects');
        setProjects(response.data);
        
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

  useEffect(() => {
    loadProjects();
  }, []);

  const handleAddProject = () => {
    console.log('🔧 Add Project button clicked');
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleEditProject = (project) => {
    console.log('🔧 Edit project:', project.name);
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleDeleteProject = (project) => {
    console.log('🗑️ Delete project triggered:', project.name);
    setDeletingProject(project);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      console.log('🗑️ Confirming deletion of project:', deletingProject.name);
      
      const response = await apiService.deleteProject(deletingProject.id);
      
      if (response && response.success) {
        console.log('✅ Project deleted successfully');
        const updatedProjects = projects.filter(p => p.id !== deletingProject.id);
        setProjects(updatedProjects);
        
        if (onProjectsChange) {
          onProjectsChange(updatedProjects);
        }
        
      } else {
        console.error('❌ Delete failed:', response);
        setError(response?.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      setError(`Failed to delete project: ${error.message}`);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingProject(null);
    }
  };

  const handleViewProject = (project) => {
    console.log('👁️ View project:', project.name);
    setSelectedProject(project);
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  };

  const showProjectDetails = selectedProject !== null;

  const handleSubmitProject = async (projectData) => {
    try {
      console.log('💾 Submitting project:', projectData.name);
      
      let response;
      if (editingProject) {
        console.log('🔄 Updating existing project');
        response = await apiService.updateProject(editingProject.id, projectData);
      } else {
        console.log('🆕 Creating new project');
        response = await apiService.createProject(projectData);
      }

      if (response && response.success) {
        console.log('✅ Project saved successfully');
        await loadProjects();
        setShowProjectForm(false);
        setEditingProject(null);
        setError(null);
      } else {
        console.error('❌ Project save failed:', response);
        throw new Error(response?.error || 'Failed to save project');
      }

    } catch (error) {
      console.error('❌ Project submission error:', error);
      throw error;
    }
  };

  const handleUpdateProject = async (updatedProject) => {
    try {
      console.log('🔄 Syncing project update to backend:', updatedProject.name);
      const response = await apiService.updateProject(updatedProject.id, updatedProject);
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to update project');
      }
      
      const backendProject = response.data || response.project || updatedProject;
      console.log('✅ Backend sync successful:', backendProject);
      
      const updatedProjects = projects.map(p => p.id === backendProject.id ? backendProject : p);
      setProjects(updatedProjects);
      
      if (onProjectsChange) {
        onProjectsChange(updatedProjects);
      }

      if (selectedProject && selectedProject.id === backendProject.id) {
        setSelectedProject(backendProject);
      }
      
    } catch (error) {
      console.error('❌ Failed to sync project update to backend:', error);
      
      const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
      setProjects(updatedProjects);
      
      if (onProjectsChange) {
        onProjectsChange(updatedProjects);
      }
      
      if (selectedProject && selectedProject.id === updatedProject.id) {
        setSelectedProject(updatedProject);
      }
      
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
      {/* Conditionally show either ProjectDetails or Project Management */}
      {showProjectDetails ? (
        <ProjectDetails
          project={selectedProject}
          onBack={() => {
            setSelectedProject(null);
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
        /* Main Project Management View - Clean Simple Grid */
        <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Simple Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
                  Project Management
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

            {/* Simple Project Grid */}
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

      {/* Modals */}
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