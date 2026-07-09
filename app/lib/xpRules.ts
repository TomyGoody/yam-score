export const RANK_XP: Record<number, number[]> = {
  2: [20, 0],
  3: [30, 10, 0],
  4: [40, 20, 10, 0],
  5: [50, 30, 20, 10, 0],
  6: [60, 40, 30, 20, 10, 0],
};

export const FIGURE_XP = {
  threeOfAKind: 3,
  fullHouse: 5,
  fourOfAKind: 8,
  straight: 10,
  yam: 25,
  bonus: 5,
};

export const BADGE_XP = [100, 250, 500, 1000, 2000, 3500, 5000, 10000];
export const DEFAULT_MILESTONES = [1, 10, 50, 100, 500, 1000, 5000, 10000];
export const WIN_STREAK_MILESTONES = [1, 2, 3, 4, 5, 6,7,8];
export const PERFORMANCE_3COLS_MILESTONES = [700,750,775 ,800, 825, 850,875, 900];

export const PERFORMANCE_6COLS_MILESTONES = [1400, 1500, 1550, 1600, 1650, 1700, 1750, 1800];
export const EXPLOIT_3COLS_MILESTONES = [1000];
export const EXPLOIT_WIN_STREAK = [10];
export const EXPLOIT_6COLS_MILESTONES = [2000];
export const achievementDefinitions = [
  {
    id: "games_played_3",
    label: "Parties jouées · 3 colonnes",
    metric: "games_played_3",
    milestones: DEFAULT_MILESTONES,
  },
  {
    id: "games_played_6",
    label: "Parties jouées · 6 colonnes",
    metric: "games_played_6",
    milestones: DEFAULT_MILESTONES,
  },
  {
    id: "wins_3",
    label: "Victoires · 3 colonnes",
    metric: "wins_3",
    milestones: DEFAULT_MILESTONES,
  },
  {
    id: "wins_6",
    label: "Victoires · 6 colonnes",
    metric: "wins_6",
    milestones: DEFAULT_MILESTONES,
  },
  {
    id: "yams_total",
    label: "Yams réalisés",
    metric: "yams_total",
    milestones: [1, 10, 50, 100, 250, 500, 1000, 5000],
  },
  {
  id: "club_1000_3",
  label: "Le Club des 1000",
  metric: "best_score_3",
  milestones: EXPLOIT_3COLS_MILESTONES,
},
{
  id: "club_2000_6",
  label: "Le Club des 2000",
  metric: "best_score_6",
  milestones: EXPLOIT_6COLS_MILESTONES,
},
{
  id: "win_streak",
  label: "Série de victoires",
  metric: "best_win_streak",
  milestones: WIN_STREAK_MILESTONES,
},
{
  id: "exploit_win_streak",
  label: "inarrêtable",
  metric: "best_win_streak",
  milestones: EXPLOIT_WIN_STREAK,
},
] as const;

export function getUnlockedMilestoneIndexes(value: number, milestones: readonly number[]) {
  return milestones
    .map((milestone, index) => (value >= milestone ? index : null))
    .filter((index): index is number => index !== null);
}

export function getModeXpMultiplier(mode: "3cols" | "6cols") {
  return mode === "3cols" ? 0.5 : 1;
}

export function getParticipationXp(mode: "3cols" | "6cols") {
  return Math.round(10 * getModeXpMultiplier(mode));
}

export function getRankXp(
  rank: number,
  playerCount: number,
  mode: "3cols" | "6cols"
) {
  const baseXp = RANK_XP[playerCount]?.[rank - 1] ?? 0;

  return Math.round(baseXp * getModeXpMultiplier(mode));
}