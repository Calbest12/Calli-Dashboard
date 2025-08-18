import React, { useState } from 'react';
import PMDashboard from './components/PMDashboard';
import Chatbot from './components/Chatbot';

function App() {
  // State to track current user and active project for chatbot context
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  // Function to update user context (called from PMDashboard)
  const updateUserContext = (user) => {
    setCurrentUser(user);
  };

  // Function to update project context (called when user views a project)
  const updateProjectContext = (project) => {
    setCurrentProject(project);
  };

  return (
    <>
      <PMDashboard 
        onUserChange={updateUserContext}
        onProjectChange={updateProjectContext}
      />
      <Chatbot 
        currentUser={currentUser}
        currentProject={currentProject}
      />
    </>
  );
}

export default App;