import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './CreatePost.css';

function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryBackgroundColor, setEditCategoryBackgroundColor] = useState('');
  const [editCategoryFontColor, setEditCategoryFontColor] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:5000/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to fetch categories. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('http://localhost:5000/posts', { 
        title, 
        content, 
        CategoryId: categoryId || null,
        authorEmail: user.email 
      });
      navigate('/');
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post. Please try again.');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const response = await axios.post('http://localhost:5000/categories', { 
        name: newCategory,
        backgroundColor: '#e0e0e0', // default background color
        fontColor: '#000000' // default font color
      });
      setCategories([...categories, response.data]);
      setNewCategory('');
    } catch (error) {
      console.error('Error creating category:', error);
      setError('Failed to create category. Please try again.');
    }
  };

  const handleEditCategory = (category) => {
    setEditCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryBackgroundColor(category.backgroundColor);
    setEditCategoryFontColor(category.fontColor);
  };

  const handleUpdateCategory = async () => {
    if (!editCategoryName.trim()) return;
    try {
      const response = await axios.put(`http://localhost:5000/categories/${editCategoryId}`, {
        name: editCategoryName,
        backgroundColor: editCategoryBackgroundColor,
        fontColor: editCategoryFontColor
      });
      setCategories(categories.map(cat => cat.id === editCategoryId ? response.data : cat));
      setEditCategoryId(null);
      setEditCategoryName('');
      setEditCategoryBackgroundColor('');
      setEditCategoryFontColor('');
    } catch (error) {
      console.error('Error updating category:', error);
      setError('Failed to update category. Please try again.');
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/categories/${id}`);
      setCategories(categories.filter(cat => cat.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category. Please try again.');
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean'],
      ['emoji']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'blockquote', 'code-block',
    'script',
    'indent',
    'direction',
    'color', 'background',
    'link', 'image',
    'emoji'
  ];

  if (!user) {
    return <p>Please log in to create a post.</p>;
  }

  return (
    <div className="create-post">
      <h2 className="create-post-title">Create New Post</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit} className="create-post-form">
        <div className="form-group">
          <label htmlFor="title">Title:</label>
          <input 
            id="title"
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
            className="title-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">Content:</label>
          <ReactQuill 
            id="content"
            theme="snow"
            value={content}
            onChange={setContent}
            modules={modules}
            formats={formats}
            className="content-editor"
          />
        </div>
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <select 
            id="category"
            value={categoryId} 
            onChange={(e) => setCategoryId(e.target.value)}
            className="category-select"
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="submit-button">Create Post</button>
      </form>

      <div className="category-management">
        <h3 className="category-management-title">Manage Categories</h3>
        <div className="new-category">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name"
            className="new-category-input"
          />
          <button onClick={handleCreateCategory} className="add-category-button">Add Category</button>
        </div>
        <ul className="category-list">
          {categories.map(category => (
            <li key={category.id} className="category-item">
              {editCategoryId === category.id ? (
                <div className="edit-category">
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="edit-category-input"
                  />
                  <input
                    type="color"
                    value={editCategoryBackgroundColor}
                    onChange={(e) => setEditCategoryBackgroundColor(e.target.value)}
                    title="Background Color"
                    className="color-picker"
                  />
                  <input
                    type="color"
                    value={editCategoryFontColor}
                    onChange={(e) => setEditCategoryFontColor(e.target.value)}
                    title="Font Color"
                    className="color-picker"
                  />
                  <button onClick={handleUpdateCategory} className="save-button">Save</button>
                  <button onClick={() => setEditCategoryId(null)} className="cancel-button">Cancel</button>
                </div>
              ) : (
                <div className="category-display">
                  <span 
                    className="category-pill"
                    style={{
                      backgroundColor: category.backgroundColor,
                      color: category.fontColor,
                    }}
                  >
                    {category.name}
                  </span>
                  <div className="category-actions">
                    <button onClick={() => handleEditCategory(category)} className="edit-button">Edit</button>
                    <button onClick={() => handleDeleteCategory(category.id)} className="delete-button">Delete</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default CreatePost;