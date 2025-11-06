// frontend/src/components/ProjectManager.jsx
import React, { useState, useEffect } from 'react';
import { Plus, FileText, Loader, AlertCircle } from 'lucide-react';
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
        console.warn('⚠️ ProjectManager: API response not successful:', response);
        setError(response?.error || 'Failed to load projects');
        setProjects([]);
      }
    } catch (error) {
      console.error('❌ ProjectManager: Error loading projects:', error);
      setError(error.message || 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleAddProject = () => {
    console.log('➕ Add project button clicked');
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleEditProject = (project) => {
    console.log('🔧 Edit project:', project.name);
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleDeleteProject = (project) => {
    console.log('🗑️ Delete project:', project.name);
    setDeletingProject(project);
    setShowDeleteConfirm(true);
  };

  const handleViewProject = (project) => {
    console.log('👁️ View project:', project.name);
    setSelectedProject(project);
    if (onProjectSelect) onProjectSelect(project);
  };

  const handleSubmitProject = async (projectData) => {
    try {
      console.log('💾 Submitting project:', projectData);
      
      let response;
      if (editingProject) {
        response = await apiService.updateProject(editingProject.id, projectData);
      } else {
        response = await apiService.createProject(projectData);
      }
      
      if (response.success) {
        console.log('✅ Project saved successfully');
        setShowProjectForm(false);
        setEditingProject(null);
        await loadProjects();
      } else {
        console.error('❌ Failed to save project:', response.error);
        throw new Error(response.error || 'Failed to save project');
      }
    } catch (error) {
      console.error('❌ Error in handleSubmitProject:', error);
      throw error;
    }
  };

  const handleConfirmDelete = async () => {
    try {
      if (!deletingProject) return;
      
      console.log('🗑️ Confirming delete for:', deletingProject.name);
      const response = await apiService.deleteProject(deletingProject.id);
      
      if (response.success) {
        console.log('✅ Project deleted successfully');
        setShowDeleteConfirm(false);
        setDeletingProject(null);
        await loadProjects();
      } else {
        console.error('❌ Failed to delete project:', response.error);
        throw new Error(response.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('❌ Error in handleConfirmDelete:', error);
      alert('Failed to delete project: ' + error.message);
    }
  };

  const handleUpdateProject = async (updatedProject) => {
    console.log('📝 Updating project from details view:', updatedProject);
    await loadProjects();
    setSelectedProject(updatedProject);
  };

  // If loading show loading state
  if (loading) {
    return (
      <div style={{ 
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '1rem'
      }}>
        <Loader size={32} style={{ 
          animation: 'spin 1s linear infinite',
          color: '#3b82f6'
        }} />
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>Loading projects...</p>
      </div>
    );
  }

  // If error show error state
  if (error) {
    return (
      <div style={{ 
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '1rem'
      }}>
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          maxWidth: '400px'
        }}>
          <AlertCircle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>
            {error}
          </span>
        </div>
        <button
          onClick={loadProjects}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Project Details View */}
      {selectedProject ? (
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
        /* Main Project Management View */
        <div style={{ padding: '2rem' }}>
          {/* Header Section */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <div>
              <h1 style={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                color: '#111827', 
                marginBottom: '0.5rem',
                margin: 0
              }}>
                Project Management
              </h1>
              <p style={{ 
                color: '#6b7280', 
                fontSize: '1rem', 
                margin: '0.5rem 0 0 0'
              }}>
                Manage all your projects in one place
              </p>
            </div>

            <button
              onClick={handleAddProject}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.25)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#2563eb';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#3b82f6';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.25)';
              }}
            >
              <Plus size={20} />
              Add New Project
            </button>
          </div>

          {/* Projects Grid */}
          <div>
            {projects.length === 0 ? (
              /* Empty State */
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                border: '2px dashed #d1d5db',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <FileText 
                  size={48} 
                  style={{ 
                    color: '#d1d5db', 
                    margin: '0 auto 1.5rem',
                    display: 'block'
                  }} 
                />
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  color: '#111827', 
                  marginBottom: '0.5rem',
                  margin: '0 0 0.5rem 0'
                }}>
                  No projects yet
                </h3>
                <p style={{ 
                  color: '#6b7280', 
                  marginBottom: '1.5rem',
                  margin: '0 0 1.5rem 0',
                  fontSize: '1rem'
                }}>
                  Get started by creating your first project
                </p>
                <button
                  onClick={handleAddProject}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#3b82f6';
                  }}
                >
                  <Plus size={16} />
                  Create Your First Project
                </button>
              </div>
            ) : (
              /* Projects Grid */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
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