// src/components/BlogList.js
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Introduction from './Introduction';

const BlogList = ({ filters, setFilters }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPosts = useCallback(() => {
    setLoading(true);
    const url = new URL('http://localhost:5000/posts');
    url.searchParams.append('page', currentPage);
    url.searchParams.append('limit', 6);
    if (filters.category) url.searchParams.append('category', filters.category);
    url.searchParams.append('sortOrder', filters.sortOrder);
    if (filters.searchQuery) url.searchParams.append('search', filters.searchQuery);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        return response.json();
      })
      .then(data => {
        setPosts(data.posts);
        setTotalPages(data.totalPages);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentPage, filters]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetch('http://localhost:5000/categories')
      .then(response => response.json())
      .then(data => {
        setCategories(data);
      })
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleCategoryChange = (e) => {
    setFilters(prev => ({ ...prev, category: e.target.value }));
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setFilters(prev => ({ ...prev, sortOrder: e.target.value }));
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, searchQuery: searchTerm }));
    setCurrentPage(1);
  };

  const truncateHTML = (html, maxLength) => {
    const strippedString = html.replace(/(<([^>]+)>)/gi, "");
    if (strippedString.length <= maxLength) return html;
    const truncated = strippedString.substr(0, maxLength);
    return truncated.substr(0, truncated.lastIndexOf(" ")) + "...";
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!posts || posts.length === 0) return <div className="no-posts">No posts found.</div>;

  return (
    <div className="blog-list-container">
      <Introduction />
      <div className="blog-list">
        <h1>Blog Posts</h1>
        
        <div className="blog-controls">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search posts..."
              className="search-input"
            />
            <button type="submit" className="search-button">Search</button>
          </form>

          <div className="filters">
            <select 
              value={filters.category} 
              onChange={handleCategoryChange}
              className="category-select"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <select 
              value={filters.sortOrder} 
              onChange={handleSortChange}
              className="sort-select"
            >
              <option value="desc">Latest</option>
              <option value="asc">Oldest</option>
            </select>
          </div>
        </div>

        <div className="blog-posts">
          {posts.map(post => (
            <div key={post.id} className="blog-item">
              <div className="blog-item-header">
                <h2>
                  <Link to={`/post/${post.id}`}>{post.title}</Link>
                </h2>
                <Link 
                  to="/"
                  onClick={(e) => {
                    e.preventDefault();
                    setFilters(prev => ({ ...prev, category: post.Category ? post.Category.name : '' }));
                    setCurrentPage(1);
                  }}
                  className="category-pill"
                  style={{
                    backgroundColor: post.Category ? post.Category.backgroundColor : '#e0e0e0',
                    color: post.Category ? post.Category.fontColor : '#000000',
                    padding: '5px 10px',
                    borderRadius: '15px',
                    display: 'inline-block',
                    fontSize: '0.8em',
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    textDecoration: 'none'
                  }}
                >
                  {post.Category ? post.Category.name : 'Uncategorized'}
                </Link>
              </div>
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(truncateHTML(post.content, 150)) 
                }}
              />
              <Link to={`/post/${post.id}`} className="read-more">Read more</Link>
            </div>
          ))}
        </div>

        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => handlePageChange(i + 1)}
              className={currentPage === i + 1 ? 'active' : ''}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogList;