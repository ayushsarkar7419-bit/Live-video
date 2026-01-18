import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useAnimationFrame, AnimatePresence, MotionValue } from 'framer-motion';
import { CountryFlag, PhysicsState } from '../types';
import { GlowingRing } from './GlowingRing';

// --- CONFIGURATION ---
const BOUNDARY_RADIUS = 160; // Logical radius for collision (match SVG ~48% of 320-420px)
const INITIAL_RADIUS = 95;   // Initial formation radius
const FLAG_RADIUS = 12;      // Approximation of flag size for collision
const BASE_SPEED = 2.0;      // REDUCED SPEED: Slower, floatier movement
const ROTATION_SPEED = 0.8;  // Degrees per frame for the outer ring
const FORMATION_SPIN_SPEED = 0.005; // Radians per frame for initial formation spin

// Gap Configuration
const GAP_TOLERANCE = 4; // Slightly tighter tolerance for a smaller feel

const countriesList = [
  { code: 'us', name: 'USA' }, { code: 'gb', name: 'UK' }, { code: 'jp', name: 'Japan' },
  { code: 'de', name: 'Germany' }, { code: 'fr', name: 'France' }, { code: 'ca', name: 'Canada' },
  { code: 'au', name: 'Australia' }, { code: 'it', name: 'Italy' }, { code: 'es', name: 'Spain' },
  { code: 'nl', name: 'Netherlands' }, { code: 'se', name: 'Sweden' }, { code: 'ch', name: 'Switzerland' },
  { code: 'kr', name: 'South Korea' }, { code: 'sg', name: 'Singapore' }, { code: 'br', name: 'Brazil' },
  { code: 'in', name: 'India' }, { code: 'cn', name: 'China' }, { code: 'ru', name: 'Russia' },
  { code: 'mx', name: 'Mexico' }, { code: 'za', name: 'South Africa' }, { code: 'tr', name: 'Turkey' },
  { code: 'id', name: 'Indonesia' }, { code: 'sa', name: 'Saudi Arabia' }, { code: 'ar', name: 'Argentina' },
  { code: 'pl', name: 'Poland' }, { code: 'be', name: 'Belgium' }, { code: 'no', name: 'Norway' },
  { code: 'dk', name: 'Denmark' }, { code: 'fi', name: 'Finland' }, { code: 'nz', name: 'New Zealand' },
  { code: 'pt', name: 'Portugal' }, { code: 'gr', name: 'Greece' }, { code: 'ie', name: 'Ireland' },
  { code: 'at', name: 'Austria' }, { code: 'cz', name: 'Czechia' }, { code: 'hu', name: 'Hungary' },
  { code: 'ro', name: 'Romania' }, { code: 'ua', name: 'Ukraine' }, { code: 'cl', name: 'Chile' },
  { code: 'co', name: 'Colombia' }, { code: 'pe', name: 'Peru' }, { code: 've', name: 'Venezuela' },
  { code: 'eg', name: 'Egypt' }, { code: 'ng', name: 'Nigeria' }, { code: 'ke', name: 'Kenya' },
  { code: 'th', name: 'Thailand' }, { code: 'vn', name: 'Vietnam' }, { code: 'my', name: 'Malaysia' },
  { code: 'ph', name: 'Philippines' }, { code: 'pk', name: 'Pakistan' }
];

// Helper to normalize angle to 0-360
const normalizeAngle = (angle: number) => {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
};

interface PhysicsFlagProps {
  flag: CountryFlag;
  x: MotionValue<number>;
  y: MotionValue<number>;
  angle: MotionValue<number>;
  scale: MotionValue<number>;
  opacity: MotionValue<number>;
}

interface LeaderboardEntry {
  code: string;
  name: string;
  wins: number;
}

// Component to render a single flag based on MotionValues
const PhysicsFlag: React.FC<PhysicsFlagProps> = ({ 
  flag, 
  x, 
  y, 
  angle,
  scale,
  opacity
}) => {
  return (
    <motion.div
      className="absolute rounded-sm overflow-hidden shadow-lg border border-white/20 bg-slate-800"
      style={{
        width: 28,
        height: 20,
        x,
        y,
        marginLeft: -14, // Center the flag on its coordinates
        marginTop: -10,  // Center the flag on its coordinates
        rotate: angle,
        scale,
        opacity,
        zIndex: flag.status === 'winner' ? 100 : 10
      }}
    >
      <img
        src={`https://flagcdn.com/w80/${flag.code}.png`}
        alt={flag.name}
        className="w-full h-full object-cover"
      />
      {/* Gloss overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/30 to-transparent pointer-events-none" />
      
      {/* Subtle Cyan tint when exiting to simulate energy charge */}
      {flag.status === 'exiting' && (
        <div className="absolute inset-0 bg-cyan-400/20 mix-blend-overlay" />
      )}
    </motion.div>
  );
};

export const FlagScatter: React.FC = () => {
  const [flags, setFlags] = useState<CountryFlag[]>([]);
  const [winner, setWinner] = useState<CountryFlag | null>(null);
  const [visualPathLength, setVisualPathLength] = useState(0.85);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Motion Values for performant updates
  const ringRotation = useMotionValue(0);
  const ringOpacity = useMotionValue(1);
  
  // Store MotionValues
  const flagMotionValues = useRef<Map<string, { 
    x: MotionValue, 
    y: MotionValue, 
    angle: MotionValue,
    scale: MotionValue,
    opacity: MotionValue
  }>>(new Map());
  
  // Physics state ref
  const physicsRef = useRef<{
    flags: CountryFlag[];
    ringAngle: number;
    isRunning: boolean;
    phase: 'formation' | 'scatter';
    gapStart: number;
    gapEnd: number;
  }>({
    flags: [],
    ringAngle: 0,
    isRunning: true,
    phase: 'formation',
    gapStart: 306, // default
    gapEnd: 360  // default
  });

  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reusable Initialization Function
  const initializeGame = useCallback(() => {
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);

    // Reset UI State
    setWinner(null);
    ringOpacity.set(1);
    
    // Reset Physics Ref
    physicsRef.current.isRunning = true;
    physicsRef.current.phase = 'formation';
    physicsRef.current.ringAngle = 0;
    ringRotation.set(0);

    // 1. Fixed Gap Size (Consistent difficulty)
    // Setting to 45 degrees which is a balanced size.
    const gapDegrees = 45; 

    // Calculate path length for visual ring (1 - gap fraction)
    const pathLen = (360 - gapDegrees) / 360;
    setVisualPathLength(pathLen);

    physicsRef.current.gapStart = 360 - gapDegrees;
    physicsRef.current.gapEnd = 360;

    // 2. Shuffle flags for random winner
    const shuffledList = [...countriesList].sort(() => Math.random() - 0.5);

    // 3. Initialize flags
    const initialFlags: CountryFlag[] = shuffledList.map((c, i) => {
      const total = shuffledList.length;
      const theta = (i / total) * 2 * Math.PI; // Even distribution
      
      const x = INITIAL_RADIUS * Math.cos(theta);
      const y = INITIAL_RADIUS * Math.sin(theta);
      
      // Pre-calculate random velocity
      const velocityAngle = Math.random() * Math.PI * 2;
      
      return {
        ...c,
        status: 'active',
        physics: {
          x: x,
          y: y,
          vx: Math.cos(velocityAngle) * BASE_SPEED,
          vy: Math.sin(velocityAngle) * BASE_SPEED,
          angle: 0,
          vAngle: (Math.random() - 0.5) * 10 // INCREASED ROTATION for dynamic feel
        }
      };
    });

    // Create fresh MotionValues for the new flags
    flagMotionValues.current.clear();
    initialFlags.forEach(f => {
      flagMotionValues.current.set(f.code, {
        x: new MotionValue(f.physics.x),
        y: new MotionValue(f.physics.y),
        angle: new MotionValue(f.physics.angle),
        scale: new MotionValue(1),
        opacity: new MotionValue(1)
      });
    });

    setFlags(initialFlags);
    physicsRef.current.flags = initialFlags;

    // Start Scatter after delay
    startTimeoutRef.current = setTimeout(() => {
      physicsRef.current.phase = 'scatter';
    }, 2000); 

  }, [ringRotation, ringOpacity]);

  // Initial Start
  useEffect(() => {
    initializeGame();
    return () => {
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    }
  }, [initializeGame]);

  // Physics Loop
  useAnimationFrame((time, delta) => {
    if (!physicsRef.current.isRunning || physicsRef.current.flags.length === 0) return;

    // 1. Update Ring Rotation
    physicsRef.current.ringAngle = (physicsRef.current.ringAngle + ROTATION_SPEED) % 360;
    ringRotation.set(physicsRef.current.ringAngle);

    // 2. Update Flags based on Phase
    let activeCount = 0;
    let potentialWinner: CountryFlag | null = null;

    physicsRef.current.flags.forEach(flag => {
      if (flag.status === 'eliminated') return;
      if (flag.status === 'active') activeCount++;
      if (flag.status === 'active') potentialWinner = flag;

      const p = flag.physics;
      const mv = flagMotionValues.current.get(flag.code);

      if (physicsRef.current.phase === 'formation') {
        // FORMATION PHASE
        const cos = Math.cos(FORMATION_SPIN_SPEED);
        const sin = Math.sin(FORMATION_SPIN_SPEED);
        const nx = p.x * cos - p.y * sin;
        const ny = p.x * sin + p.y * cos;
        p.x = nx;
        p.y = ny;
        
        if (mv) {
          mv.x.set(p.x);
          mv.y.set(p.y);
          mv.angle.set(0); 
          mv.opacity.set(1);
          mv.scale.set(1);
        }
      } else {
        // SCATTER PHASE
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.vAngle;

        if (mv) {
          mv.x.set(p.x);
          mv.y.set(p.y);
          mv.angle.set(p.angle);
        }

        // Check Collision with Ring
        if (flag.status === 'active') {
          // --- BREATHING / MOTION EFFECT ---
          // Add a subtle sine wave scale pulse based on time and position to create "floating" feel
          if (mv) {
             const breathe = 1 + Math.sin((time / 600) + (p.x * 0.05)) * 0.1; 
             mv.scale.set(breathe);
          }

          const dist = Math.sqrt(p.x * p.x + p.y * p.y);
          
          if (dist + FLAG_RADIUS >= BOUNDARY_RADIUS) {
            let flagAngle = Math.atan2(p.y, p.x) * (180 / Math.PI);
            flagAngle = normalizeAngle(flagAngle);

            const gapS = physicsRef.current.gapStart;
            const gapE = physicsRef.current.gapEnd;
            const ringAng = physicsRef.current.ringAngle;

            const currentGapStart = normalizeAngle(gapS + ringAng - GAP_TOLERANCE);
            const currentGapEnd = normalizeAngle(gapE + ringAng + GAP_TOLERANCE);

            let isInsideGap = false;
            if (currentGapStart < currentGapEnd) {
               isInsideGap = flagAngle >= currentGapStart && flagAngle <= currentGapEnd;
            } else {
               isInsideGap = flagAngle >= currentGapStart || flagAngle <= currentGapEnd;
            }

            if (isInsideGap && activeCount > 1) {
              // Eliminate
              flag.status = 'exiting';
              p.vx *= 1.6; // Speed boost on exit
              p.vy *= 1.6;
              // Add energetic spin
              p.vAngle = (Math.random() > 0.5 ? 12 : -12) + (Math.random() * 8); 
            } else {
              // Bounce
              const nx = p.x / dist;
              const ny = p.y / dist;
              const dotProduct = p.vx * nx + p.vy * ny;
              p.vx = p.vx - 2 * dotProduct * nx;
              p.vy = p.vy - 2 * dotProduct * ny;
              const overlap = (dist + FLAG_RADIUS) - BOUNDARY_RADIUS;
              p.x -= nx * overlap;
              p.y -= ny * overlap;
              p.vx += (Math.random() - 0.5) * 0.5;
              p.vy += (Math.random() - 0.5) * 0.5;
            }
          }
        } else if (flag.status === 'exiting') {
          const dist = Math.sqrt(p.x * p.x + p.y * p.y);
          
          // Animate "fly off" effect via MotionValues
          if (mv) {
            const startFade = BOUNDARY_RADIUS;
            const endFade = BOUNDARY_RADIUS * 2.5;
            let progress = (dist - startFade) / (endFade - startFade);
            progress = Math.max(0, Math.min(1, progress));
            
            mv.opacity.set(1 - progress);
            mv.scale.set(1 - (progress * 0.3)); // Shrink slightly to 0.7
          }

          if (dist > BOUNDARY_RADIUS * 2.5) {
             flag.status = 'eliminated';
          }
        }
      }
    });

    // WINNER CHECK
    if (physicsRef.current.phase === 'scatter' && activeCount === 1 && potentialWinner && physicsRef.current.isRunning) {
      physicsRef.current.isRunning = false;
      setWinner(potentialWinner);
      
      const w = potentialWinner;
      
      // Update Leaderboard State
      setLeaderboard(prev => {
        const existing = prev.find(p => p.code === w.code);
        let newState;
        if (existing) {
          newState = prev.map(p => p.code === w.code ? { ...p, wins: p.wins + 1 } : p);
        } else {
          newState = [...prev, { code: w.code, name: w.name, wins: 1 }];
        }
        // Sort by wins (descending)
        return newState.sort((a, b) => b.wins - a.wins);
      });

      const finalFlags = physicsRef.current.flags.map(f => 
         f.code === w.code ? { ...f, status: 'winner' as const } : f
      );
      setFlags(finalFlags);
      ringOpacity.set(0);

      // Auto Restart Game
      setTimeout(() => {
        initializeGame();
      }, 5000);
    }
  });

  return (
    <>
      {/* LEADERBOARD UI */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-40">
        <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/20 rounded-lg p-4 min-w-[180px] shadow-[0_0_15px_rgba(8,145,178,0.2)]">
          <div className="flex items-center justify-between mb-3 border-b border-cyan-500/20 pb-2">
            <h3 className="text-cyan-400 text-[10px] tracking-[0.2em] font-bold uppercase">
              Top Wins
            </h3>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_5px_#22d3ee]" />
          </div>
          
          <div className="flex flex-col gap-2">
            {leaderboard.length === 0 ? (
              <div className="text-slate-500 text-[10px] font-mono uppercase text-center py-1">
                Awaiting Data...
              </div>
            ) : (
              leaderboard.slice(0, 5).map((entry, i) => (
                <div key={entry.code} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono w-3 ${i === 0 ? 'text-yellow-400' : 'text-slate-500'}`}>
                      {i + 1}
                    </span>
                    <img 
                      src={`https://flagcdn.com/w40/${entry.code}.png`}
                      alt={entry.name}
                      className="w-5 h-3.5 object-cover rounded-[2px] opacity-80 group-hover:opacity-100 transition-opacity border border-white/10"
                    />
                    <span className="text-slate-300 text-[11px] font-medium tracking-wide">
                      {entry.name}
                    </span>
                  </div>
                  <span className="text-cyan-400/80 text-[10px] font-mono font-bold">
                    {entry.wins}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="relative w-[320px] h-[320px] md:w-[420px] md:h-[420px] flex items-center justify-center">
        <GlowingRing 
          rotation={ringRotation} 
          opacity={ringOpacity} 
          pathLength={visualPathLength} 
        />
        
        <div className="absolute inset-0 overflow-visible pointer-events-none">
          <div className="absolute top-1/2 left-1/2 w-0 h-0">
             {flags.map((flag) => {
               if (flag.status === 'eliminated') return null;
               const mv = flagMotionValues.current.get(flag.code);
               if (!mv) return null;

               if (flag.status === 'winner') {
                 return <WinnerFlag key={flag.code} flag={flag} />;
               }

               return (
                 <PhysicsFlag 
                    key={flag.code} 
                    flag={flag} 
                    x={mv.x} 
                    y={mv.y} 
                    angle={mv.angle} 
                    scale={mv.scale}
                    opacity={mv.opacity}
                  />
               );
             })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {winner && (
          <motion.div 
            className="absolute top-1/2 left-0 right-0 flex flex-col items-center justify-center z-50 mt-32"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.5 }}
          >
             <div className="text-cyan-400 text-sm tracking-[0.5em] font-bold uppercase mb-2">Champion</div>
             <h1 className="text-white text-5xl font-black uppercase drop-shadow-[0_0_25px_rgba(34,211,238,0.6)]">
               {winner.name}
             </h1>
             <div className="mt-4 text-cyan-200/50 text-xs tracking-widest uppercase">Restarting in 5s...</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const WinnerFlag: React.FC<{ flag: CountryFlag }> = ({ flag }) => {
  return (
    <motion.div
      className="absolute flex items-center justify-center -ml-12 -mt-8"
      initial={{ scale: 1, x: flag.physics.x, y: flag.physics.y }}
      animate={{ scale: 3.5, x: 0, y: 0, rotate: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", duration: 1.5, bounce: 0.5 }}
      style={{ zIndex: 100 }}
    >
      <div className="relative w-24 h-16 rounded-md overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.5)] border-2 border-cyan-400 bg-slate-800">
        <img
          src={`https://flagcdn.com/w160/${flag.code}.png`}
          alt={flag.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
      
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white rounded-full"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [1, 0], 
            scale: [0, 1.5], 
            x: (Math.random() - 0.5) * 150, 
            y: (Math.random() - 0.5) * 150 
          }}
          transition={{ 
            duration: 1, 
            repeat: Infinity, 
            repeatDelay: Math.random() * 0.5,
            ease: "easeOut" 
          }}
        />
      ))}
    </motion.div>
  );
};