export type PowerUpType =
  | 'spreadShot'
  | 'rapidFire'
  | 'shield'
  | 'piercingShot'
  | 'homingMissile'
  | 'timeSlow';

export interface PowerUpDef {
  readonly displayName: string; // shown in PickupFeedback and shop
  readonly duration: number;    // seconds
  readonly color: number;       // emissive hex color for token mesh
}

export const POWER_UP_DEFS: Record<PowerUpType, PowerUpDef> = {
  spreadShot: { displayName: 'SPREAD SHOT', duration: 10, color: 0x0088ff },
  rapidFire:  { displayName: 'RAPID FIRE',  duration: 10, color: 0xff8800 },
  shield:     { displayName: 'SHIELD',      duration: 15, color: 0x00ff88 },
  piercingShot: { displayName: 'PIERCING SHOT', duration: 12, color: 0x44f5ff },
  homingMissile: { displayName: 'HOMING MISSILE', duration: 10, color: 0xff6677 },
  timeSlow: { displayName: 'TIME SLOW', duration: 8, color: 0x88ddff },
};

export const POWER_UP_TYPES: readonly PowerUpType[] = [
  'spreadShot',
  'rapidFire',
  'shield',
  'piercingShot',
  'homingMissile',
  'timeSlow',
];
