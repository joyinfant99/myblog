import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './BlogPost.css';

const BlogPost = () => {
  const [post, setPost] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedPost, setEditedPost] = useState({ title: '', content: '', CategoryId: '' });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const { user, getIdToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`http://localhost:5000/posts/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch post');
        }
        const data = await response.json();
        setPost(data);
        setEditedPost(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching post:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:5000/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setError('Failed to load categories. Please try again.');
      }
    };

    fetchPost();
    fetchCategories();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        const token = await getIdToken();
        const response = await fetch(`http://localhost:5000/posts/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to delete post');
        }
        navigate('/');
      } catch (error) {
        console.error('Error deleting post:', error);
        setError(error.message);
      }
    }
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const handleChange = (e) => {
    setEditedPost({ ...editedPost, [e.target.name]: e.target.value });
  };

  const handleContentChange = (content) => {
    setEditedPost({ ...editedPost, content });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      const response = await fetch(`http://localhost:5000/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedPost)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update post');
      }
      const updatedPost = await response.json();
      setPost(updatedPost);
      setEditMode(false);
    } catch (error) {
      console.error('Error updating post:', error);
      setError(`Failed to update post: ${error.message}`);
    }
  };

  const sanitizeContent = (content) => {
    return {
      __html: DOMPurify.sanitize(content, { ADD_ATTR: ['target'] })
    };
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
      ['clean']
    ],
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!post) return <div className="no-post">Post not found.</div>;

  return (
    <div className="blog-post">
      {editMode ? (
        <form onSubmit={handleSubmit} className="edit-form">
          <input
            type="text"
            name="title"
            value={editedPost.title}
            onChange={handleChange}
            required
            className="edit-title"
          />
          <ReactQuill
            theme="snow"
            value={editedPost.content}
            onChange={handleContentChange}
            modules={modules}
            className="edit-content"
          />
          <select
            name="CategoryId"
            value={editedPost.CategoryId}
            onChange={handleChange}
            required
            className="edit-category"
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <div className="edit-actions">
            <button type="submit" className="save-button">Save Changes</button>
            <button type="button" onClick={handleEditToggle} className="cancel-button">Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <div className="blog-post-header">
            <h1 className="blog-post-title">{post.title}</h1>
            {user && (
              <div className="post-actions">
                <button onClick={handleEditToggle} className="edit-button">Edit</button>
                <button onClick={handleDelete} className="delete-button">Delete</button>
              </div>
            )}
          </div>
          <div className="blog-post-meta">
            {post.Category && (
              <span 
                className="category-pill"
                style={{
                  backgroundColor: post.Category.backgroundColor || '#e0e0e0',
                  color: post.Category.fontColor || '#000000',
                }}
              >
                {post.Category.name}
              </span>
            )}
            <span className="blog-post-date">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div 
            className="blog-post-content"
            dangerouslySetInnerHTML={sanitizeContent(post.content)}
          />
          <p className="blog-post-author">Author: {post.authorEmail}</p>
          <Link to="/" className="back-link">Back to Blog List</Link>
        </>
      )}
    </div>
  );
};

export default BlogPost;