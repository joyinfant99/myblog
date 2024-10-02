import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Adjust the path as needed

const EditPost = () => {
  const [post, setPost] = useState({ title: '', content: '', CategoryId: '' });
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();
  const { getIdToken } = useAuth();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`{process.env.REACT_APP_API_URL}/posts/${id}`);
        if (!response.ok) throw new Error('Failed to fetch post');
        const data = await response.json();
        setPost(data);
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Failed to load post. Please try again.');
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await fetch(`{process.env.REACT_APP_API_URL}/categories`);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      console.log('Updating post with data:', post); // Log the data being sent
      const response = await fetch(`{process.env.REACT_APP_API_URL}/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(post)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update post');
      }
      const updatedPost = await response.json();
      console.log('Post updated successfully:', updatedPost);
      navigate(`/post/${id}`);
    } catch (error) {
      console.error('Error updating post:', error);
      setError(`Failed to update post: ${error.message}`);
    }
  };

  const handleChange = (e) => {
    setPost({ ...post, [e.target.name]: e.target.value });
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="title"
        value={post.title}
        onChange={handleChange}
        required
      />
      <textarea
        name="content"
        value={post.content}
        onChange={handleChange}
        required
      />
      <select
        name="CategoryId"
        value={post.CategoryId}
        onChange={handleChange}
        required
      >
        <option value="">Select a category</option>
        {categories.map(category => (
          <option key={category.id} value={category.id}>{category.name}</option>
        ))}
      </select>
      <button type="submit">Update Post</button>
    </form>
  );
};

export default EditPost;