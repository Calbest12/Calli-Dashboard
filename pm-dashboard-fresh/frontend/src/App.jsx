import React, { useState } from 'react';
import PMDashboard from './components/PMDashboard';
import Chatbot from './components/Chatbot';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  const updateUserContext = (user) => {
    setCurrentUser(user);
  };

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