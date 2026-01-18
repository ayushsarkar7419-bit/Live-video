import React from 'react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0">
      {/* Deep Navy/Black Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#020617] to-black" />
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
      
      {/* Subtle Blue Tint Overlay in Center */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_60%)]" />
      
      {/* Noise Texture (via CSS class in index.html, placed here for reference but rendered globally) */}
      <div className="bg-noise" />
    </div>
  );
};