import React from 'react';
import { Background } from './components/Background';
import { FlagScatter } from './components/FlagScatter';

const App: React.FC = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center font-sans antialiased selection:bg-cyan-500/30">
      <Background />
      
      {/* Main Visual Container */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {/* FlagScatter now contains the Ring and the Logic */}
        <FlagScatter />
      </div>

      {/* Optional: Subtle Ambient Light Source at bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none z-0" />
    </div>
  );
};

export default App;