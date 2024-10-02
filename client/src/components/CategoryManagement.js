import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();

  console.log("CategoryManagement rendered, user:", user); // Debug log

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`{process.env.REACT_APP_API_URL}/categories`);
      setCategories(response.data);
    } catch (error) {
      setError('Failed to fetch categories');
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`{process.env.REACT_APP_API_URL}/categories`, { name: newCategory });
      setNewCategory('');
      fetchCategories();
    } catch (error) {
      setError('Failed to create category');
      console.error('Error creating category:', error);
    }
  };

  if (!user || !user.isAdmin) {
    console.log("User is not admin, redirecting..."); // Debug log
    return <p>You don't have permission to access this page.</p>;
  }

  return (
    <div>
      <h2>Manage Categories</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name"
          required
        />
        <button type="submit">Add Category</button>
      </form>
      <ul>
        {categories.map(category => (
          <li key={category.id}>{category.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default CategoryManagement;