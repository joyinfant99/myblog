import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import BlogList from './components/BlogList';
import BlogPost from './components/BlogPost';
import CreatePost from './components/CreatePost';
import SearchResults from './components/SearchResults';
import Login from './components/Login';
import CategoryManagement from './components/CategoryManagement';
import ProtectedRoute from './components/ProtectedRoute';
import About from './components/About';
import ConnectWithMe from './components/ConnectWithMe';
import './App.css';

function AppContent() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    category: '',
    sortOrder: 'desc',
    searchQuery: ''
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

  const resetFilters = () => {
    setFilters({
      category: '',
      sortOrder: 'desc',
      searchQuery: ''
    });
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
  };
  
  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : ''}`}>
      <header className="header">
        <Navigation resetFilters={resetFilters} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      </header>
      <div className="content-wrapper">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<BlogList filters={filters} setFilters={setFilters} />} />
            <Route path="/post/:id" element={<BlogPost />} />
            <Route path="/create" element={
              <ProtectedRoute>
                <CreatePost />
              </ProtectedRoute>
            } />
            <Route path="/categories" element={
              <ProtectedRoute adminOnly={true}>
                <CategoryManagement />
              </ProtectedRoute>
            } />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/admin-login" element={
              user ? <Navigate to="/" replace /> : <Login />
            } />
            <Route path="/about" element={<About />} />
            <Route path="/connect" element={<ConnectWithMe />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <footer className="footer" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '10px 20px',
        textAlign: 'center'
      }}>
        <p>© 2024 Joy Infant. All rights reserved. 🌟</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;