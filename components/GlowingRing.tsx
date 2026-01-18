import React from 'react';
import { motion, MotionValue } from 'framer-motion';

interface GlowingRingProps {
  rotation: MotionValue<number>;
  opacity?: MotionValue<number>;
  pathLength?: number; // Controls the size of the ring arc (1 = full circle, 0.85 = 15% gap)
}

export const GlowingRing: React.FC<GlowingRingProps> = ({ rotation, opacity, pathLength = 0.85 }) => {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
      style={{ opacity: opacity || 1 }}
    >
      <div className="relative w-[320px] h-[320px] md:w-[420px] md:h-[420px]">
        {/* Outer Glow Bloom */}
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-[50px]" />
        
        {/* Rotating Container controlled by physics loop */}
        <motion.div 
          className="w-full h-full"
          style={{ rotate: rotation }}
        >
          <svg 
            className="w-full h-full" 
            viewBox="0 0 100 100"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>

            {/* The Main Physics Ring 
                Path starts at 3 o'clock (0 degrees). 
                We want a gap. 
                pathLength determines the arc length.
                The gap is the remaining (1 - pathLength).
            */}
            <motion.circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="url(#ringGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: pathLength }}
              animate={{ pathLength: pathLength }}
              transition={{ duration: 0.5 }} 
              style={{
                filter: "drop-shadow(0 0 4px rgba(34,211,238,0.8))"
              }}
            />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
};