import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Sun, Moon } from 'lucide-react';

function Navigation({ resetFilters, isDarkMode, toggleDarkMode }) {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    resetFilters();
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleSwitchStyle = {
    position: 'relative',
    display: 'inline-block',
    width: '40px',
    height: '24px',
    marginLeft: '10px',
  };

  const toggleInputStyle = {
    opacity: 0,
    width: 0,
    height: 0,
  };

  const toggleSliderStyle = {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDarkMode ? '#2196F3' : '#ccc',
    transition: '0.4s',
    borderRadius: '24px',
  };

  const toggleSliderBeforeStyle = {
    position: 'absolute',
    content: '""',
    height: '18px',
    width: '18px',
    left: isDarkMode ? '3px' : '19px',
    bottom: '3px',
    backgroundColor: 'white',
    transition: '0.4s',
    borderRadius: '50%',
  };

  const NavLinks = () => (
    <>
      <li><a href="/" onClick={handleHomeClick}>Home</a></li>
      <li><Link to="/about" onClick={toggleMenu}>About</Link></li>
      <li><Link to="/connect" onClick={toggleMenu}>Connect with Me</Link></li>
      {user && (
        <>
          <li><Link to="/create" onClick={toggleMenu}>Create Post</Link></li>
          {user.isAdmin && (
            <li><Link to="/categories" onClick={toggleMenu}>Manage Categories</Link></li>
          )}
          <li><button onClick={handleLogout}>Logout</button></li>
        </>
      )}
      <li style={{ display: 'flex', alignItems: 'center' }}>
        {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
        <label style={toggleSwitchStyle}>
          <input 
            type="checkbox" 
            checked={isDarkMode} 
            onChange={toggleDarkMode} 
            style={toggleInputStyle}
          />
          <span style={toggleSliderStyle}>
            <span style={toggleSliderBeforeStyle}></span>
          </span>
        </label>
      </li>
    </>
  );

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="name-card">
          <div className="name-card-image-container">
            <img 
              src="https://i.ibb.co/MM2FrPL/Joy.png" 
              alt="Joy Infant" 
              className="name-card-image"
            />
          </div>
          <h1 className="name-card-name">Joy Infant</h1>
        </div>
        <button className="burger-menu" onClick={toggleMenu}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <ul className="navbar-links">
          <NavLinks />
        </ul>
      </div>
      <div className={`side-menu ${isMenuOpen ? 'active' : ''}`}>
        <button className="close-menu" onClick={toggleMenu}>
          <X size={24} />
        </button>
        <ul className="side-menu-links">
          <NavLinks />
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;