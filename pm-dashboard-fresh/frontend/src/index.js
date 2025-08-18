import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';  // ← Should import App, not ProjectManager

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />  {/* ← Should render App, not ProjectManager */}
  </React.StrictMode>
);