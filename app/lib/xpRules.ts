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

export const BADGE_XP = [
  10,
  50,
  150,
  350,
  700,
  1200,
  1800,
  2500,
];
export const DEFAULT_MILESTONES = [1, 10, 50, 100, 500, 1000, 5000, 10000];
export const WIN_STREAK_MILESTONES = [1, 2, 3, 4, 5, 6,7,8];
export const PERFORMANCE_3COLS_MILESTONES = [700,750,775 ,800, 825, 850,875, 900];
export const UNIQUE_ACHIEVEMENT_MILESTONE = [1];
export const GRAND_SLAM_WIN_MILESTONES = [1, 3, 5, 10, 25, 50, 100, 250];
export const WORLD_CUP_MILESTONES = [1, 3, 5, 10, 25, 50, 100, 250];
export const PERFORMANCE_6COLS_MILESTONES = [1400, 1500, 1550, 1600, 1650, 1700, 1750, 1800];
export const EXPLOIT_3COLS_MILESTONES = [1000];
export const EXPLOIT_WIN_STREAK = [10];
export const EXPLOIT_6COLS_MILESTONES = [2000];

export const GRAND_PRIX_MILESTONES = [
  1, 3, 5, 10, 25, 50, 100, 250,
];

export const GRAND_PRIX_TITLE_MILESTONES = [
  1, 2, 3, 5, 10, 25, 50, 100,
];
export const PERFORMANCE_BADGE_XP = [
  10,
  25,
  50,
  75,
  100,
  150,
  250,
  500,
];
type AchievementDefinition = {
  id: string;
  label: string;
  metric: string;
  milestones: readonly number[];
  xpRewards?: readonly number[];
};
export const achievementDefinitions: readonly AchievementDefinition[] = [
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
  id: "three_of_a_kind_total",
  label: "Brelans réalisés",
  metric: "three_of_a_kind_total",
  milestones: DEFAULT_MILESTONES,
},
{
  id: "full_house_total",
  label: "Fulls réalisés",
  metric: "full_house_total",
  milestones: DEFAULT_MILESTONES,
},
{
  id: "four_of_a_kind_total",
  label: "Carrés réalisés",
  metric: "four_of_a_kind_total",
  milestones: DEFAULT_MILESTONES,
},
{
  id: "straight_total",
  label: "Suites réalisées",
  metric: "straight_total",
  milestones: DEFAULT_MILESTONES,
},
{
  id: "bonus_total",
  label: "Bonus obtenus",
  metric: "bonus_total",
  milestones: DEFAULT_MILESTONES,
},
  {
    id: "yams_total",
    label: "Yams réalisés",
    metric: "yams_total",
    milestones: [1, 10, 50, 100, 250, 500, 1000, 5000],
  },
  {
  id: "performance_3",
  label: "Performance · 3 colonnes",
  metric: "best_score_3",
  milestones: PERFORMANCE_3COLS_MILESTONES,
  xpRewards: PERFORMANCE_BADGE_XP,
},
{
  id: "performance_6",
  label: "Performance · 6 colonnes",
  metric: "best_score_6",
  milestones: PERFORMANCE_6COLS_MILESTONES,
  xpRewards: PERFORMANCE_BADGE_XP,
},
  {
  id: "club_1000_3",
  label: "Le Club des 1000",
  metric: "best_score_3",
  milestones: EXPLOIT_3COLS_MILESTONES,
  xpRewards: [1000],
},
{
  id: "club_2000_6",
  label: "Le Club des 2000",
  metric: "best_score_6",
  milestones: EXPLOIT_6COLS_MILESTONES,
  xpRewards: [2000],
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
{
  id: "grand_slam_finals_won",
  label: "Finales de Grand Chelem remportées",
  metric: "grand_slam_finals_won",
  milestones: GRAND_SLAM_WIN_MILESTONES,
},
{
  id: "australian_open_wins",
  label: "Open d’Australie remportés",
  metric: "australian_open_wins",
  milestones: GRAND_SLAM_WIN_MILESTONES,
},
{
  id: "roland_garros_wins",
  label: "Roland-Garros remportés",
  metric: "roland_garros_wins",
  milestones: GRAND_SLAM_WIN_MILESTONES,
},
{
  id: "wimbledon_wins",
  label: "Wimbledon remportés",
  metric: "wimbledon_wins",
  milestones: GRAND_SLAM_WIN_MILESTONES,
},
{
  id: "us_open_wins",
  label: "US Open remportés",
  metric: "us_open_wins",
  milestones: GRAND_SLAM_WIN_MILESTONES,
},
{
  id: "career_grand_slam",
  label: "Grand Chelem en carrière",
  metric: "career_grand_slam",
  milestones: [1],
},
{
  id: "world_cup_finals_reached",
  label: "Finales de Coupe du Monde atteintes",
  metric: "world_cup_finals_reached",
  milestones: WORLD_CUP_MILESTONES,
},
{
  id: "world_cup_wins",
  label: "Coupes du Monde remportées",
  metric: "world_cup_wins",
  milestones: WORLD_CUP_MILESTONES,
},
{
  id: "grand_prix_played",
  label: "Grands Prix disputés",
  metric: "grand_prix_played",
  milestones: GRAND_PRIX_MILESTONES,
},
{
  id: "grand_prix_wins",
  label: "Grands Prix remportés",
  metric: "grand_prix_wins",
  milestones: GRAND_PRIX_MILESTONES,
},
{
  id: "grand_prix_podiums",
  label: "Podiums en Grand Prix",
  metric: "grand_prix_podiums",
  milestones: GRAND_PRIX_MILESTONES,
},
{
  id: "grand_prix_seasons_completed",
  label: "Saisons Grand Prix terminées",
  metric: "grand_prix_seasons_completed",
  milestones: GRAND_PRIX_MILESTONES,
},
{
  id: "grand_prix_titles",
  label: "Titres de champion Grand Prix",
  metric: "grand_prix_titles",
  milestones: GRAND_PRIX_MILESTONES,
},
] ;

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