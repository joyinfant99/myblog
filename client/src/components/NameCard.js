// src/components/NameCard.js
import React from 'react';

function NameCard() {
  return (
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
  );
}

export default NameCard;