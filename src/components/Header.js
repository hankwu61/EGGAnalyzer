import React from 'react';

function Header() {
  return (
    <header style={{
      backgroundColor: '#007bff',
      color: 'white',
      padding: '20px 0',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div className="container">
        <h1>EEG Waveform Analyzer</h1>
        <p>Upload, visualize, and analyze EEG data</p>
      </div>
    </header>
  );
}

export default Header; 