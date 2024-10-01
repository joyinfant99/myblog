import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

function UserProfile() {
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserPosts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/user/posts', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setUserPosts(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user posts:', error);
        setError('Failed to fetch user posts. Please try again.');
        setLoading(false);
      }
    };

    if (user) {
      fetchUserPosts();
    }
  }, [user]);

  if (!user) {
    return <p>Please log in to view your profile.</p>;
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Your Profile</h2>
      <h3>Your Posts:</h3>
      {userPosts.length === 0 ? (
        <p>You haven't created any posts yet.</p>
      ) : (
        <ul>
          {userPosts.map(post => (
            <li key={post.id}>
              <Link to={`/post/${post.id}`}>{post.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UserProfile;