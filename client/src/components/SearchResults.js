import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';

function SearchResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    const searchPosts = async () => {
      const query = new URLSearchParams(location.search).get('query');
      console.log('Searching for:', query);
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`{process.env.REACT_APP_API_URL}/posts/search?query=${encodeURIComponent(query)}`);
        console.log('Search response:', response.data);
        setResults(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error searching posts:', error);
        setError(`Failed to search posts: ${error.message}`);
        setLoading(false);
      }
    };

    searchPosts();
  }, [location.search]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h1>Search Results</h1>
      {results.length === 0 ? (
        <p>No posts found matching your search.</p>
      ) : (
        results.map(post => (
          <div key={post.id} className="post-preview">
            <h2>
              <Link to={`/post/${post.id}`}>{post.title}</Link>
            </h2>
            <p>{post.content.substring(0, 100)}...</p>
          </div>
        ))
      )}
    </div>
  );
}

export default SearchResults;