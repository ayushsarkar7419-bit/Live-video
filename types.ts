export type FlagStatus = 'active' | 'exiting' | 'eliminated' | 'winner';

export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // visual rotation of the flag itself
  vAngle: number; // rotational velocity
}

export interface CountryFlag {
  code: string;
  name: string;
  status: FlagStatus;
  physics: PhysicsState;
}