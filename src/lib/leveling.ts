/**
 * Exponential leveling curve.
 * Level 1→2 = 100 XP, each subsequent level requires 1.5× more.
 * xpForLevel(n) = total XP needed to REACH level n.
 */

const BASE_XP = 100;
const SCALE = 1.5;

/** XP required to go from level (n-1) to level n */
export function xpForLevelUp(level: number): number {
  if (level <= 1) return 0;
  return Math.round(BASE_XP * Math.pow(SCALE, level - 2));
}

/** Total cumulative XP needed to reach a given level */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += xpForLevelUp(i);
  }
  return total;
}

/** Calculate level from total XP */
export function calcLevel(totalXp: number): number {
  let level = 1;
  let cumulative = 0;
  while (true) {
    const needed = xpForLevelUp(level + 1);
    if (cumulative + needed > totalXp) break;
    cumulative += needed;
    level++;
  }
  return level;
}

/** Progress within current level: { current, required, percent } */
export function levelProgress(totalXp: number) {
  const level = calcLevel(totalXp);
  const xpAtCurrentLevel = totalXpForLevel(level);
  const xpInLevel = totalXp - xpAtCurrentLevel;
  const xpNeeded = xpForLevelUp(level + 1);
  return {
    level,
    current: xpInLevel,
    required: xpNeeded,
    percent: Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)),
  };
}

/** Level titles for flair */
export function levelTitle(level: number): string {
  if (level >= 50) return 'Legendary';
  if (level >= 40) return 'Grandmaster';
  if (level >= 30) return 'Master';
  if (level >= 25) return 'Expert';
  if (level >= 20) return 'Veteran';
  if (level >= 15) return 'Specialist';
  if (level >= 10) return 'Adept';
  if (level >= 7) return 'Skilled';
  if (level >= 5) return 'Apprentice';
  if (level >= 3) return 'Initiate';
  return 'Novice';
}
