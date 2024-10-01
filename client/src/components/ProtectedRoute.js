import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  console.log("ProtectedRoute rendered, user:", user, "adminOnly:", adminOnly); // Debug log

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log("User not authenticated, redirecting to login"); // Debug log
    return <Navigate to="/admin-login" replace />;
  }

  if (adminOnly && !user.isAdmin) {
    console.log("Admin access required, user is not admin, redirecting to home"); // Debug log
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;