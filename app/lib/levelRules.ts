export const LEVEL_XP = [
  0,
  100,
  220,
  370,
  550,
  770,
  1030,
  1340,
  1700,
  2120,
  2600,
  3150,
  3770,
  4470,
  5250,
  6120,
  7080,
  8140,
  9300,
  10570,
  11950,
  13450,
  15080,
  16850,
  18770,
  20850,
  23100,
  25530,
  28150,
  30970,
  34000,
  37250,
  40730,
  44450,
  48420,
  52650,
  57150,
  61930,
  67000,
  72370,
  78050,
  84050,
  90380,
  97050,
  104080,
  111480,
  119260,
  127430,
  136000,
  144980,
  154380,
];
export function getLevelFromTotalXp(totalXp: number) {
  let level = 1;

  while (
    level < LEVEL_XP.length &&
    totalXp >= LEVEL_XP[level]
  ) {
    level++;
  }

  return level;
}

export function getXpIntoCurrentLevel(totalXp: number) {
  const level = getLevelFromTotalXp(totalXp);

  return totalXp - LEVEL_XP[level - 1];
}

export function getXpNeededForCurrentLevel(level: number) {
  return LEVEL_XP[level] - LEVEL_XP[level - 1];
}