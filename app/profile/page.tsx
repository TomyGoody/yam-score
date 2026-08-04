"use client";

import { useEffect, useState } from "react";
import { supabase, ensureUserProfile } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import { syncProfileAchievements } from "../lib/syncProfileAchievements";
import LoadingScreen from "@/app/components/LoadingScreen";
import { syncMissingGameXp } from "../lib/syncMissingGameXp";
import { rebuildAllProfiles } from "../lib/rebuildAllProfiles";
import {
  WIN_STREAK_MILESTONES,
  DEFAULT_MILESTONES,
  EXPLOIT_3COLS_MILESTONES,
  EXPLOIT_6COLS_MILESTONES,
  PERFORMANCE_3COLS_MILESTONES,
  PERFORMANCE_6COLS_MILESTONES,
  EXPLOIT_WIN_STREAK,
  GRAND_SLAM_WIN_MILESTONES,
  WORLD_CUP_MILESTONES,
  GRAND_PRIX_MILESTONES,
  GRAND_PRIX_TITLE_MILESTONES,
} from "../lib/xpRules";
import {
  LEVEL_XP,
  getLevelFromTotalXp,
  getXpIntoCurrentLevel,
  getXpNeededForCurrentLevel,
} from "../lib/levelRules";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
const DEFAULT_AVATARS = [
  "/avatars/dice-red.png",
  "/avatars/dice-black.png",
  "/avatars/dice-gold.png",
  "/avatars/dice-green.png",
  "/avatars/dice-blue.png",
  "/avatars/dice-purple.png",
  "/avatars/crown.png",
  "/avatars/trophy.png",
  "/avatars/diamond.png",
  "/avatars/fire.png",
  "/avatars/lightning.png",
  "/avatars/star.png",
  
];
type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_customized: boolean;
};
type ChartPoint = {
  label: string;
  date: string;
  score: number;
};
type RivalryPlayerRow = {
  game_id: string;
  profile_id: string | null;
  display_name: string | null;
  final_score: number | null;
  final_rank: number | null;
  profiles:
  | {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }
  | {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }[]
  | null;
};
type RivalryOpponent = {
  profileId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  opponentBestScore: number;
  gamesPlayed: number;
  wins: number;
  opponentBestScoreGameId: string | null;
  losses: number;
  totalScore: number;
opponentTotalScore: number;
pointGap: number;
averagePointGap: number;
  averageScore: number;
  opponentAverageScore: number;
  bestScore: number;
  bestScoreGameId: string | null;
  currentStreak: {
    type: "win" | "loss";
    count: number;
  } | null;
  lastGame: {
    gameId: string;
    date: string;
    myScore: number;
    opponentScore: number;
    didWin: boolean;
  } | null;
  history: {
    gameId: string;
    date: string;
    myScore: number;
    opponentScore: number;
  }[];
};
type DateFilter = "7d" | "30d" | "year" | "all" | "custom";
type ProfileStats = {
  gamesPlayed: number;
  wins: number;
  winRate: number;
  bestScore: number;
  averageScore: number;
  averageRank: number;
  totalYams: number;
  averageYams: number;
  bestScoreGameId: string | null;
};
type PlayerCountChartItem = {
  players: string;
  games: number;
};
type WinRateByPlayerCountItem = {
  players: string;
  winRate: number;
};
type ScoreDistributionItem = {
  range: string;
  games: number;
};
type GameHistoryItem = {
  gameId: string;
  createdAt: string;
  mode: string;
  playerCount: number;
  score: number;
  rank: number;
  yamsCount: number;
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [achievementStats, setAchievementStats] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [isRebuildingAllProfiles, setIsRebuildingAllProfiles] =
  useState(false);

const [rebuildAllResult, setRebuildAllResult] = useState<{
  success: number;
  failed: number;
  totalXpAwarded: number;
} | null>(null);
  type GameMode = "6cols" | "3cols";
  type ProfileTab =
  | "dashboard"
  | "rivalries"
  | "history"
  | "achievements";
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [rivalries, setRivalries] = useState<RivalryOpponent[]>([]);
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null);
  const [scoreChart, setScoreChart] = useState<ChartPoint[]>([]);
  const [showRanksModal, setShowRanksModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>("6cols");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
 const [activeTab, setActiveTab] =
  useState<ProfileTab>("dashboard");
  const [playerCountChart, setPlayerCountChart] = useState<PlayerCountChartItem[]>([]);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [scoreDistribution, setScoreDistribution] = useState<
  ScoreDistributionItem[]
  >([]);
  const [winRateByPlayerCount, setWinRateByPlayerCount] = useState<
  WinRateByPlayerCountItem[]
  >([]);
  const [stats, setStats] = useState<ProfileStats>({
    gamesPlayed: 0,
    wins: 0,
    winRate: 0,
    bestScore: 0,
    averageScore: 0,
    averageRank: 0,
    totalYams: 0,
    averageYams: 0,
    bestScoreGameId: null,
  });
  
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
const HISTORY_PER_PAGE = 10;
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");

  if (
    tab === "dashboard" ||
    tab === "rivalries" ||
    tab === "history" ||
    tab === "achievements"
  ) {
    setActiveTab(tab);
  }
}, []);
  useEffect(() => {
    async function loadProfile() {
      const ensuredProfile = await ensureUserProfile();
      
      if (!ensuredProfile) {
        router.push("/");
        return;
      }
      const { data: adminRow, error: adminError } = await supabase
  .from("admin_users")
  .select("user_id")
  .eq("user_id", ensuredProfile.id)
  .maybeSingle();

if (adminError) {
  console.error("Erreur vérification admin", adminError);
  setIsAdmin(false);
} else {
  setIsAdmin(Boolean(adminRow));
}
      const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, avatar_customized")
      .eq("id", ensuredProfile.id)
      .single();
      // Rebuild désactivé au chargement du profil.
// À garder uniquement pour une action manuelle "Réparer mes stats".
// await rebuildProfileStats(ensuredProfile.id);

const xpSyncResult = await syncMissingGameXp(ensuredProfile.id);
      console.log("Résultat sync XP rétroactive", xpSyncResult);

const syncResult = await syncProfileAchievements(ensuredProfile.id);

console.log("Résultat sync succès", syncResult);
      

if (xpSyncResult.xp > 0) {
  console.log("XP rétroactive synchronisée", xpSyncResult);
}
      if (syncResult.xpAwarded > 0) {
        console.log("Succès synchronisés", syncResult);
      }
      if (profileError) {
        console.error("Erreur chargement profil", profileError);
        router.push("/");
        return;
      }
      
      setProfile(profileData);
      if (!profileData.avatar_customized) {
        setAvatarModalOpen(true);
      }
      const { data: profileStatsData, error: profileStatsError } = await supabase
      .from("profile_stats")
      .select("*")
      .eq("profile_id", ensuredProfile.id)
      .maybeSingle();
      
      if (profileStatsError) {
        console.error("Erreur chargement profile_stats", {
          message: profileStatsError.message,
          details: profileStatsError.details,
          hint: profileStatsError.hint,
          code: profileStatsError.code,
        });
      }
      
      setAchievementStats(profileStatsData);
      await supabase.rpc("ensure_profile_progress", {
        p_profile_id: ensuredProfile.id,
      });
      const { data: progressData, error: progressError } = await supabase
      .from("profile_progress")
      .select("*")
      .eq("profile_id", ensuredProfile.id)
      .maybeSingle();
      
      if (progressError) {
        console.error("Erreur chargement profile_progress", {
          message: progressError.message,
          details: progressError.details,
          hint: progressError.hint,
          code: progressError.code,
        });
      }
      
      setProgress(progressData);
      const { data: historyRows, error: historyError } = await supabase
      .from("local_game_players")
      .select(`
  game_id,
  profile_id,
  display_name,
  final_score,
  final_rank,
  yams_count,
  local_games!inner(
    created_at,
    mode,
    player_count,
    status
  )
`)
        .eq("profile_id", ensuredProfile.id)
        .eq("local_games.status", "finished")
        .eq("local_games.mode", selectedMode)
        .not("final_score", "is", null)
        .order("created_at", {
          referencedTable: "local_games",
          ascending: false,
        });
        
        if (historyError) {
          console.error("Erreur chargement historique", historyError);
        } else {
          const items: GameHistoryItem[] = [];
          
          for (const row of historyRows ?? []) {
            
            
            
            
            const game = Array.isArray(row.local_games)
            ? row.local_games[0]
            : row.local_games;
            
            items.push({
              gameId: row.game_id,
              createdAt: game.created_at,
              mode: game.mode,
              playerCount: game.player_count,
              score: row.final_score ?? 0,
              rank: row.final_rank ?? 0,
              yamsCount: row.yams_count ?? 0,
            });
            
          }
          const filteredItems = items.filter((game) => {
            const gameDate = new Date(game.createdAt);
            const now = new Date();
            
            if (dateFilter === "all") return true;
            
            if (dateFilter === "7d") {
              const limit = new Date();
              limit.setDate(now.getDate() - 7);
              return gameDate >= limit;
            }
            
            if (dateFilter === "30d") {
              const limit = new Date();
              limit.setDate(now.getDate() - 30);
              return gameDate >= limit;
            }
            
            if (dateFilter === "year") {
              return gameDate.getFullYear() === now.getFullYear();
            }
            
            if (dateFilter === "custom") {
              if (!customStartDate || !customEndDate) return true;
              
              const start = new Date(customStartDate);
              const end = new Date(customEndDate);
              end.setHours(23, 59, 59, 999);
              
              return gameDate >= start && gameDate <= end;
            }
            
            return true;
          });
          const filteredScores = filteredItems.map((game) => game.score);
          
          const filteredBestScore =
          filteredScores.length > 0 ? Math.max(...filteredScores) : 0;
          
          const filteredAverageScore =
          filteredScores.length > 0
          ? Math.round(
            filteredScores.reduce((total, score) => total + score, 0) /
            filteredScores.length
          )
          : 0;
          const competitiveItems = filteredItems.filter(
  (game) => game.playerCount >= 2 && game.rank > 0
);
          console.log(
  "Répartition des rangs",
  competitiveItems.reduce((acc, game) => {
    acc[game.rank] = (acc[game.rank] ?? 0) + 1;
    return acc;
  }, {} as Record<number, number>)
);
          const filteredWins = competitiveItems.filter((game) => game.rank === 1).length;

const filteredAverageRank =
  competitiveItems.length > 0
    ? Math.round(
        (competitiveItems.reduce((total, game) => total + game.rank, 0) /
          competitiveItems.length) *
          10
      ) / 10
    : 0;
          const filteredTotalYams = filteredItems.reduce(
            (total, game) => total + game.yamsCount,
            0
          );
          
          const filteredAverageYams =
          filteredItems.length > 0
          ? Math.round((filteredTotalYams / filteredItems.length) * 10) / 10
          : 0;
          const bestScoreGame =
          filteredItems.length > 0
          ? [...filteredItems].sort((a, b) => b.score - a.score)[0]
          : null;
          setStats({
            gamesPlayed: filteredItems.length,
            wins: filteredWins,
            winRate:
  competitiveItems.length > 0
    ? Math.round((filteredWins / competitiveItems.length) * 100)
    : 0,
            bestScore: filteredBestScore,
            averageScore: filteredAverageScore,
            averageRank: filteredAverageRank,
            totalYams: filteredTotalYams,
            averageYams: filteredAverageYams,
            bestScoreGameId: bestScoreGame?.gameId ?? null,
          });
          
          
          setHistory(items);
          setScoreChart(
            [...filteredItems]
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()
            )
            .slice(-100)
            .map((game, index) => ({
              label: `P${index + 1}`,
              date: new Date(game.createdAt).toLocaleDateString("fr-FR"),
              score: game.score,
            }))
          );
          const playerCounts = [1, 2, 3, 4, 5, 6].map((count) => ({
            players: `${count}J`,
            games: filteredItems.filter((game) => game.playerCount === count).length,
          }));
          
          setPlayerCountChart(playerCounts);
          const winRates = [2, 3, 4, 5, 6].map((count) => {
            const gamesForCount = filteredItems.filter((game) => game.playerCount === count);
            const winsForCount = gamesForCount.filter((game) => game.rank === 1).length;
            
            return {
              players: `${count}J`,
              winRate:
              gamesForCount.length > 0
              ? Math.round((winsForCount / gamesForCount.length) * 100)
              : 0,
            };
          });
          
          setWinRateByPlayerCount(winRates);
          const scoreRanges =
          selectedMode === "3cols"
          ? [
            { min: 0, max: 399, label: "0-399" },
            { min: 400, max: 599, label: "400-599" },
            { min: 600, max: 799, label: "600-799" },
            { min: 800, max: 999, label: "800-999" },
            { min: 1000, max: Infinity, label: "1000+" },
          ]
          : [
            { min: 0, max: 999, label: "0-999" },
            { min: 1000, max: 1299, label: "1000-1299" },
            { min: 1300, max: 1599, label: "1300-1599" },
            { min: 1600, max: 1899, label: "1600-1899" },
            { min: 1900, max: Infinity, label: "1900+" },
          ];
          
          setScoreDistribution(
            scoreRanges.map((range) => ({
              range: range.label,
              games: filteredItems.filter(
                (game) =>
                  game.score >= range.min &&
                game.score <= range.max
              ).length,
            }))
          );
          const twoPlayerGameIds = filteredItems
          .filter((game) => game.playerCount === 2)
          .map((game) => game.gameId);
          
          if (twoPlayerGameIds.length === 0) {
            setRivalries([]);
            setSelectedRivalId(null);
          } else {
            const { data: rivalryRows, error: rivalryError } = await supabase
            .from("local_game_players")
            .select(`
  game_id,
  profile_id,
  display_name,
  final_score,
  final_rank,
  profiles!local_game_players_profile_id_fkey(
    username,
    display_name,
    avatar_url
  )
`)
              .in("game_id", twoPlayerGameIds)
              .not("profile_id", "is", null);
              
              
              if (rivalryError) {
                console.error("Erreur chargement rivalités", rivalryError);
                setRivalries([]);
              } else {
                const rows = (rivalryRows ?? []) as RivalryPlayerRow[];
                
                const myRows = rows.filter((row) => row.profile_id === ensuredProfile.id);
                const opponentRows = rows.filter((row) => row.profile_id !== ensuredProfile.id);
                
                const rivalMap = new Map<string, RivalryOpponent>();
                
                for (const opponent of opponentRows) {
                  const opponentProfile = Array.isArray(opponent.profiles)
                  ? opponent.profiles[0]
                  : opponent.profiles;
                  if (!opponent.profile_id) continue;
                  
                  const myRow = myRows.find((row) => row.game_id === opponent.game_id);
                  if (!myRow) continue;
                  
                  const current =
                  rivalMap.get(opponent.profile_id) ??
                  {
                    profileId: opponent.profile_id,
                    displayName:
                    opponentProfile?.display_name ||
                    opponent.display_name ||
                    "Joueur",
                    lastGame: null,
                    bestScore: 0,
                    totalScore: 0,
opponentTotalScore: 0,
pointGap: 0,
averagePointGap: 0,
opponentBestScore: 0,
opponentBestScoreGameId: null,
                    bestScoreGameId: null,
                    currentStreak: null,
                    history: [],
                    username: opponentProfile?.username ?? null,
                    avatarUrl: opponentProfile?.avatar_url ?? null,
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    averageScore: 0,
                    opponentAverageScore: 0,
                  };
                  
                  current.gamesPlayed += 1;
                  
                  if ((myRow.final_rank ?? 0) < (opponent.final_rank ?? 999)) {
                    current.wins += 1;
                  } else {
                    current.losses += 1;
                  }
                  
                  const myScore = myRow.final_score ?? 0;
const opponentScore = opponent.final_score ?? 0;

current.totalScore += myScore;
current.opponentTotalScore += opponentScore;
current.pointGap += myScore - opponentScore;

current.averageScore += myScore;
current.opponentAverageScore += opponentScore;
                  
                  if (myScore > current.bestScore) {
                    current.bestScore = myScore;
                    current.bestScoreGameId = opponent.game_id;
                  }
                  if (opponentScore > current.opponentBestScore) {
  current.opponentBestScore = opponentScore;
  current.opponentBestScoreGameId = opponent.game_id;
}
                  const relatedGame = filteredItems.find(
                    (game) => game.gameId === opponent.game_id
                  );
                  
                  if (relatedGame) {
                    const didWin =
                    (myRow.final_rank ?? 0) < (opponent.final_rank ?? 999);
                    
                    if (
                      !current.lastGame ||
                      new Date(relatedGame.createdAt).getTime() >
                      new Date(current.lastGame.date).getTime()
                    ) {
                      current.lastGame = {
                        gameId: relatedGame.gameId,
                        date: relatedGame.createdAt,
                        myScore: myRow.final_score ?? 0,
                        opponentScore: opponent.final_score ?? 0,
                        didWin,
                      };
                    }
                    current.history.push({
                      gameId: opponent.game_id,
                      date: relatedGame.createdAt,
                      myScore: myRow.final_score ?? 0,
                      opponentScore: opponent.final_score ?? 0,
                    });
                  }
                  rivalMap.set(opponent.profile_id, current);
                }
                
                const rivalList = Array.from(rivalMap.values())
                .map((rival) => {
                  const sortedHistory = rival.history.sort(
                    (a, b) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                  
                  const reversedHistory = [...sortedHistory].reverse();
                  
                  let streakType: "win" | "loss" | null = null;
                  let streakCount = 0;
                  
                  for (const duel of reversedHistory) {
                    const didWin = duel.myScore > duel.opponentScore;
                    const type = didWin ? "win" : "loss";
                    
                    if (!streakType) {
                      streakType = type;
                      streakCount = 1;
                    } else if (streakType === type) {
                      streakCount += 1;
                    } else {
                      break;
                    }
                  }
                  
                  return {
  ...rival,

  totalScore: rival.totalScore,
  opponentTotalScore: rival.opponentTotalScore,
  pointGap: rival.pointGap,

  history: sortedHistory.slice(-100),

  averageScore: Math.round(rival.averageScore / rival.gamesPlayed),

  opponentAverageScore: Math.round(
    rival.opponentAverageScore / rival.gamesPlayed
  ),

  averagePointGap: Math.round(
    rival.pointGap / rival.gamesPlayed
  ),

  currentStreak: streakType
    ? {
        type: streakType,
        count: streakCount,
      }
    : null,
};
                })
                .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
                
                setRivalries(rivalList);
                setSelectedRivalId((current) => {
                  const next = current ?? rivalList[0]?.profileId ?? null;
                  return current === next ? current : next;
                });
              }
            }
          }
          
          setLoading(false);
        }
        
        loadProfile();
      }, [selectedMode, dateFilter, customStartDate, customEndDate]);
      
      if (loading) {
        return <LoadingScreen />;
      }
      
      if (!profile) return null;
      const handleSelectDefaultAvatar = async (avatar: string) => {
        if (!profile) return;
        if (profile.avatar_url?.includes("/storage/v1/object/public/avatars/")) {
          const oldFileName = `${profile.id}.webp`;
          
          await supabase.storage
          .from("avatars")
          .remove([oldFileName]);
        }
        const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatar,
          avatar_customized: true, })
          .eq("id", profile.id);
          
          if (error) {
            console.error("Erreur changement avatar", error);
            return;
          }
          
          setProfile({
            ...profile,
            avatar_url: avatar,
          });
          
          setAvatarModalOpen(false);
        };
        const createCroppedAvatarBlob = async (
          imageSrc: string,
          cropPixels: any
        ): Promise<Blob> => {
          const image = new Image();
          image.src = imageSrc;
          
          await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
          });
          
          const canvas = document.createElement("canvas");
          const size = 512;
          
          canvas.width = size;
          canvas.height = size;
          
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            throw new Error("Canvas non disponible");
          }
          
          ctx.drawImage(
            image,
            cropPixels.x,
            cropPixels.y,
            cropPixels.width,
            cropPixels.height,
            0,
            0,
            size,
            size
          );
          
          return new Promise((resolve, reject) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Impossible de créer l'image"));
                  return;
                }
                
                resolve(blob);
              },
              "image/webp",
              0.9
            );
          });
        };
        
        const handleCropAvatar = async () => {
          if (!imageToCrop || !croppedAreaPixels || !profile) return;
          setAvatarUploading(true);
          const avatarBlob = await createCroppedAvatarBlob(
            imageToCrop,
            croppedAreaPixels
          );
          
          const filePath = `${profile.id}.webp`;
          
          const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarBlob, {
            upsert: true,
            contentType: "image/webp",
          });
          
          if (uploadError) {
            console.error("Erreur upload avatar", uploadError);
            return;
          }
          
          const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
          
          const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
          
          const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl,
            avatar_customized: true,
          })
          .eq("id", profile.id);
          
          if (updateError) {
            console.error("Erreur mise à jour avatar", updateError);
            return;
          }
          
          setProfile({
            ...profile,
            avatar_url: publicUrl,
          });
          
          setImageToCrop(null);
          setAvatarModalOpen(false);
          setZoom(1);
          setAvatarUploading(false);
        };
        const handleAvatarUpload = async (
          event: React.ChangeEvent<HTMLInputElement>
        ) => {
          const file = event.target.files?.[0];
          
          if (!file || !profile) return;
          
          const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
          
          if (!allowedTypes.includes(file.type)) {
            alert("Format non accepté. Utilise une image PNG, JPG ou WEBP.");
            return;
          }
          
          const imageUrl = URL.createObjectURL(file);
          setImageToCrop(imageUrl);
          
          const extension = file.name.split(".").pop() || "png";
          const filePath = `${profile.id}`;
          
          const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          });
          
          if (uploadError) {
            console.error("Erreur upload avatar", uploadError);
            return;
          }
          
          const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
          
          const publicUrl = data.publicUrl;
          
          const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl,
            avatar_customized: true,
          })
          .eq("id", profile.id);
          
          if (updateError) {
            console.error("Erreur mise à jour avatar", updateError);
            return;
          }
          
          setProfile({
            ...profile,
            avatar_url: publicUrl,
          });
          
          setAvatarModalOpen(false);
        };
        function countUnlockedMilestones(value: number, milestones: number[]) {
          return milestones.filter((milestone) => value >= milestone).length;
        }
        const totalXp = progress?.total_xp ?? 0;
        
        const currentLevel = getLevelFromTotalXp(totalXp);

const currentLevelStartXp = LEVEL_XP[currentLevel - 1];
const nextLevelXp = LEVEL_XP[currentLevel];

const xpIntoLevel = totalXp - currentLevelStartXp;
const xpNeededForLevel = nextLevelXp - currentLevelStartXp;

const levelProgress =
  xpNeededForLevel > 0
    ? Math.min(100, Math.round((xpIntoLevel / xpNeededForLevel) * 100))
    : 0;
        const achievementItems = [
          {
            value: achievementStats?.games_played_3 ?? 0,
            milestones: [1, 10, 50, 100, 500, 1000, 5000, 10000],
          },
          {
            value: achievementStats?.games_played_6 ?? 0,
            milestones: [1, 10, 50, 100, 500, 1000, 5000, 10000],
          },
          {
            value: achievementStats?.wins_3 ?? 0,
            milestones: [1, 10, 50, 100, 500, 1000, 5000, 10000],
          },
          {
            value: achievementStats?.wins_6 ?? 0,
            milestones: [1, 10, 50, 100, 500, 1000, 5000, 10000],
          },
          {
            value: achievementStats?.yams_total ?? 0,
            milestones: [1, 10, 50, 100, 250, 500, 1000, 5000],
          },
          {
  value: achievementStats?.best_score_3 ?? 0,
  milestones: PERFORMANCE_3COLS_MILESTONES,
},
{
  value: achievementStats?.best_score_6 ?? 0,
  milestones: PERFORMANCE_6COLS_MILESTONES,
},
{
  value: achievementStats?.best_win_streak ?? 0,
  milestones: WIN_STREAK_MILESTONES,
},
{
  value: achievementStats?.grand_slam_finals_won ?? 0,
  milestones: GRAND_SLAM_WIN_MILESTONES,
},
{
  value: achievementStats?.australian_open_wins ?? 0,
  milestones: GRAND_SLAM_WIN_MILESTONES,
},
{
  value: achievementStats?.roland_garros_wins ?? 0,
  milestones: GRAND_SLAM_WIN_MILESTONES,
},
{
  value: achievementStats?.wimbledon_wins ?? 0,
  milestones: GRAND_SLAM_WIN_MILESTONES,
},
{
  value: achievementStats?.us_open_wins ?? 0,
  milestones: GRAND_SLAM_WIN_MILESTONES,
},
{
  value:
    achievementStats?.world_cup_finals_reached ?? 0,
  milestones: WORLD_CUP_MILESTONES,
},
{
  value:
    achievementStats?.world_cup_wins ?? 0,
  milestones: WORLD_CUP_MILESTONES,
},
        ];
        
        const unlockedAchievements = achievementItems.reduce(
          (total, item) => total + countUnlockedMilestones(item.value, item.milestones),
          0
        );
        
        const totalAchievements = achievementItems.reduce(
          (total, item) => total + item.milestones.length,
          0
        );
        
        const achievementCompletion =
        totalAchievements > 0
        ? Math.round((unlockedAchievements / totalAchievements) * 100)
        : 0;
        const sortedHistory = [...history].sort(
  (a, b) =>
    new Date(b.createdAt).getTime() -
    new Date(a.createdAt).getTime()
);

const totalHistoryPages = Math.ceil(sortedHistory.length / HISTORY_PER_PAGE);

const paginatedHistory = sortedHistory.slice(
  (historyPage - 1) * HISTORY_PER_PAGE,
  historyPage * HISTORY_PER_PAGE
);
async function handleRebuildAllProfiles() {
  if (isRebuildingAllProfiles) return;

  const confirmed = window.confirm(
    "Recalculer les statistiques de tous les profils ?"
  );

  if (!confirmed) return;

  setIsRebuildingAllProfiles(true);
  setRebuildAllResult(null);

  try {
    const result = await rebuildAllProfiles();

    setRebuildAllResult(result);

    if (profile?.id) {
  const [
    { data: refreshedStats, error: statsError },
    { data: refreshedProgress, error: progressError },
  ] = await Promise.all([
    supabase
      .from("profile_stats")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle(),

    supabase
      .from("profile_progress")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle(),
  ]);

  if (statsError) {
    console.error(
      "Erreur rechargement des statistiques après rebuild",
      statsError
    );
  } else {
    setAchievementStats(refreshedStats);
  }

  if (progressError) {
    console.error(
      "Erreur rechargement de l’XP après rebuild",
      progressError
    );
  } else {
    setProgress(refreshedProgress);
  }
}
  } catch (error) {
    console.error("Erreur rebuild global", error);

    setRebuildAllResult({
      success: 0,
      failed: 1,
      totalXpAwarded: 0,
    });
  } finally {
    setIsRebuildingAllProfiles(false);
  }
}
        return (
          <main className="min-h-screen bg-black px-4 py-8 text-white">
          <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap gap-3">
  <button
    onClick={() => router.push("/")}
    className="rounded-xl bg-[#241A13] px-4 py-2 font-black text-white hover:bg-[#322217]"
  >
    Retour
  </button>

  {isAdmin && (
  <button
    type="button"
    onClick={() => void handleRebuildAllProfiles()}
    disabled={isRebuildingAllProfiles}
    className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2 font-black text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {isRebuildingAllProfiles
      ? "Rebuild en cours…"
      : "Rebuild global des stats"}
  </button>
)}
</div>

{isAdmin && rebuildAllResult && (
  <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold">
    {rebuildAllResult.success} profil
    {rebuildAllResult.success > 1 ? "s" : ""} recalculé
    {rebuildAllResult.success > 1 ? "s" : ""} ·{" "}
    {rebuildAllResult.failed} échec
    {rebuildAllResult.failed > 1 ? "s" : ""} ·{" "}
    {rebuildAllResult.totalXpAwarded} XP attribuée
  </div>
)}
          <section className="rounded-3xl border border-[#9B6A28]/70 bg-black p-6 shadow-2xl">
          <div className="flex items-center gap-4">
          <button
          onClick={() => setAvatarModalOpen(true)}
          className="group relative"
          >
          
          {profile.avatar_url ? (
            <img
            src={profile.avatar_url}
            alt=""
            className="h-20 w-20 rounded-full border border-white/20 object-cover transition group-hover:brightness-75"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#C44934] text-3xl transition group-hover:brightness-75">
            👤
            </div>
          )}
          
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover:bg-black/40">
          <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 scale-75 text-white opacity-0 transition group-hover:scale-100 group-hover:opacity-100"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          >
          <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.232 5.232 18.768 8.768M16.5 3.964a2.5 2.5 0 1 1 3.536 3.536L7 20.5 3 21l.5-4L16.5 3.964Z"
          />
          </svg>
          </div>
          </button>
          
          <div>
          <h1 className="text-3xl font-black">
          {profile.display_name || "Utilisateur"}
          </h1>
          
          <p className="mt-1 text-sm font-bold text-slate-400">
          @{profile.username || "pseudo"}
          </p>
          </div>
          </div>
          
          <div className="mt-8 grid grid-cols-4 gap-3 rounded-2xl border border-slate-800 bg-black p-2">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "rivalries", label: "Rivalités" },
            { id: "history", label: "Historique" },
            { id: "achievements", label: "Succès" },
          ].map((tab) => (
            <button
            key={tab.id}
            onClick={() => {
  const nextTab = tab.id as ProfileTab;

  setActiveTab(nextTab);

  router.replace(`/profile?tab=${nextTab}`, {
    scroll: false,
  });
}}
            className={[
              "rounded-xl px-4 py-3 font-black transition",
              activeTab === tab.id
              ? "bg-[#C44934] text-white"
              : "text-slate-400 hover:bg-slate-900",
            ].join(" ")}
            >
            {tab.label}
            </button>
          ))}
          </div>
          {activeTab !== "achievements" && (
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-black p-2">
            <button
            onClick={() => setSelectedMode("6cols")}
            className={[
              "rounded-xl px-4 py-3 font-black transition",
              selectedMode === "6cols"
              ? "bg-[#9B6A28] text-white"
              : "text-slate-400 hover:bg-slate-900",
            ].join(" ")}
            >
            6 colonnes
            </button>
            
            <button
            onClick={() => setSelectedMode("3cols")}
            className={[
              "rounded-xl px-4 py-3 font-black transition",
              selectedMode === "3cols"
              ? "bg-[#9B6A28] text-white"
              : "text-slate-400 hover:bg-slate-900",
            ].join(" ")}
            >
            3 colonnes
            </button>
            </div>
          )}
          {activeTab === "dashboard" && (
            <>
            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-black p-2 lg:grid-cols-5">
            {[
              { id: "all", label: "Tout" },
              { id: "7d", label: "7 jours" },
              { id: "30d", label: "30 jours" },
              { id: "year", label: "Cette année" },
              
              { id: "custom", label: "Personnalisé" },
            ].map((filter) => (
              <button
              key={filter.id}
              onClick={() => {
                const nextFilter = filter.id as DateFilter;
                setDateFilter(nextFilter);
                
                if (nextFilter === "custom") {
                  const today = new Date();
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(today.getDate() - 30);
                  
                  setCustomStartDate(thirtyDaysAgo.toISOString().slice(0, 10));
                  setCustomEndDate(today.toISOString().slice(0, 10));
                }
              }}
              
              className={[
                "rounded-xl px-3 py-2 text-sm font-black transition",
                dateFilter === filter.id
                ? "bg-[#9B6A28] text-white"
                : "text-slate-400 hover:bg-slate-900",
              ].join(" ")}
              >
              {filter.label}
              </button>
            ))}
            </div>
            {dateFilter === "custom" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
              type="date"
              value={customStartDate}
              onChange={(event) => setCustomStartDate(event.target.value)}
              onClick={(event) => event.currentTarget.showPicker?.()}
              className="mt-1 w-full cursor-pointer rounded-xl border border-slate-800 bg-black px-4 py-3 font-bold text-white"
              />
              
              <input
              type="date"
              value={customEndDate}
              onChange={(event) => setCustomEndDate(event.target.value)}
              onClick={(event) => event.currentTarget.showPicker?.()}
              className="mt-1 w-full cursor-pointer rounded-xl border border-slate-800 bg-black px-4 py-3 font-bold text-white"
              />
              </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon="🎮" label="Parties jouées" value={String(stats.gamesPlayed)} />
            <StatCard icon="🏆" label="Victoires 2J+" value={String(stats.wins)} />
            <StatCard icon="📈" label="% victoires 2J+" value={`${stats.winRate}%`} />
            <StatCard
            icon="👑"
            label="Meilleur score"
            value={String(stats.bestScore)}
            onClick={
              stats.bestScoreGameId
              ? () => router.push(`/profile/games/${stats.bestScoreGameId}`)
              : undefined
            }
            />
            <StatCard icon="⭐" label="Score moyen" value={String(stats.averageScore)} />
            <StatCard icon="🥈" label="Rang moyen 2J+" value={String(stats.averageRank)} />
            <StatCard icon="🎲" label="Yams réalisés" value={String(stats.totalYams)} />
            <StatCard icon="🎯" label="Yams / partie" value={String(stats.averageYams)} />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-black p-5">
            <h2 className="text-xl font-black">
            Évolution du score (100 dernières parties)
            </h2>
            
            {scoreChart.length === 0 ? (
              <p className="mt-3 text-sm font-bold text-slate-500">
              Aucune donnée pour ce mode.
              </p>
            ) : (
              <div className="mt-5 h-72" >
              <ResponsiveContainer width="100%" height="100%">
              <LineChart
              data={scoreChart}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              
              >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
              cursor={{ stroke: "#9B6A28", strokeDasharray: "3 3" }}
              formatter={(value) => [`${value} points`, "Score"]}
              labelFormatter={(label) => {
                const point = scoreChart.find((item) => item.label === label);
                return point ? `Partie du ${point.date}` : String(label);
              }}
              contentStyle={{
                backgroundColor: "#F4E9DC",
                border: "1px solid #9B6A28",
                borderRadius: "12px",
                color: "#000",
                fontWeight: 900,
              }}
              labelStyle={{
                color: "#C44934",
                fontWeight: 900,
              }}
              
              />
              <Line
              type="monotone"
              dataKey="score"
              stroke="#C44934"
              strokeWidth={4}
              dot={{ r: 5, fill: "#C44934", stroke: "#F4E9DC", strokeWidth: 2 }}
              activeDot={{ r: 7 }}
              />
              </LineChart>
              </ResponsiveContainer>
              </div>
            )}
            
            </div>
            <div className="rounded-2xl border border-slate-800 bg-black p-5">
            <h2 className="text-xl font-black">
            Répartition des parties par nombre de joueurs
            </h2>
            
            {playerCountChart.every((item) => item.games === 0) ? (
              <p className="mt-3 text-sm font-bold text-slate-500">
              Aucune donnée pour ce mode.
              </p>
            ) : (
              <div className="mt-5 h-80">
              <ResponsiveContainer width="100%" height="100%">
              <PieChart>
              <Pie
              data={playerCountChart.filter((item) => item.games > 0)}
              dataKey="games"
              nameKey="players"
              cx="50%"
              cy="50%"
              
              innerRadius={65}
              outerRadius={105}
              stroke="none"
              paddingAngle={3}
              cornerRadius={6}
              label={false}
              >
              {playerCountChart
                .filter((item) => item.games > 0)
                .map((entry, index) => (
                  <Cell
                  key={`cell-${entry.players}`}
                  fill={
                    [
                      "#C44934",
                      "#9B6A28",
                      "#F4E9DC",
                      "#D75A43",
                      "#6B3F22",
                      "#FFF8EF",
                    ][index % 6]
                  }
                  />
                ))}
                </Pie>
                <text
                x="45.8%"
                y="46%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#FFFFFF"
                fontSize={34}
                fontWeight={900}
                >
                {stats.gamesPlayed}
                </text>
                
                <text
                x="45.8%"
                y="57%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#94A3B8"
                fontSize={14}
                fontWeight={800}
                >
                parties
                </text>
                
                <Tooltip
                cursor={false}
                formatter={(value, name) => {
                  const games = Number(value ?? 0);
                  const total = playerCountChart.reduce(
                    (sum, item) => sum + item.games,
                    0
                  );
                  const percent = total > 0 ? Math.round((games / total) * 100) : 0;
                  
                  return [`${games} partie(s) (${percent} %)`, name];
                }}
                contentStyle={{
                  backgroundColor: "#F4E9DC",
                  border: "1px solid #9B6A28",
                  borderRadius: "12px",
                  color: "#000",
                  fontWeight: 900,
                }}
                labelStyle={{
                  color: "#C44934",
                  fontWeight: 900,
                }}
                itemStyle={{
  color: "#C44934",
  fontWeight: 900,
}}
                />
                
                <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                iconType="circle"
                />
                </PieChart>
                </ResponsiveContainer>
                </div>
              )}
              </div>
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-black p-5">
              <h2 className="text-xl font-black">
              Taux de victoire selon le nombre de joueurs
              </h2>
              
              <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={winRateByPlayerCount}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="players" stroke="#94a3b8" />
              <YAxis
              stroke="#94a3b8"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
              cursor={false}
              formatter={(value) => [`${value}%`, "Victoires"]}
              contentStyle={{
                backgroundColor: "#F4E9DC",
                border: "1px solid #9B6A28",
                borderRadius: "12px",
                color: "#000",
                fontWeight: 900,
              }}
              labelStyle={{
                color: "#C44934",
                fontWeight: 900,
              }}
              />
              <Bar dataKey="winRate" fill="#C44934" radius={[8, 8, 0, 0]} />
              </BarChart>
              </ResponsiveContainer>
              </div>
              </div>
              
              <div className="rounded-2xl border border-slate-800 bg-black p-5">
              <h2 className="text-xl font-black">Distribution des scores</h2>
              
              <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="range" stroke="#94a3b8" />
              <YAxis allowDecimals={false} stroke="#94a3b8" />
              <Tooltip
              cursor={false}
              formatter={(value) => [`${value} partie(s)`]}
              contentStyle={{
                backgroundColor: "#F4E9DC",
                border: "1px solid #9B6A28",
                borderRadius: "12px",
                color: "#000",
                fontWeight: 900,
              }}
              labelStyle={{
                color: "#C44934",
                fontWeight: 900,
              }}
              />
              <Bar dataKey="games" fill="#9B6A28" radius={[8, 8, 0, 0]} />
              </BarChart>
              </ResponsiveContainer>
              </div>
              </div>
              </div>
              </>
              
              
            )}
            {activeTab === "rivalries" && (
              <>
              <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-black p-2 lg:grid-cols-5">
              {[
                { id: "all", label: "Tout" },
                { id: "7d", label: "7 jours" },
                { id: "30d", label: "30 jours" },
                { id: "year", label: "Cette année" },
                { id: "custom", label: "Personnalisé" },
              ].map((filter) => (
                <button
                key={filter.id}
                onClick={() => {
                  const nextFilter = filter.id as DateFilter;
                  setDateFilter(nextFilter);
                  
                  if (nextFilter === "custom") {
                    const today = new Date();
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(today.getDate() - 30);
                    
                    setCustomStartDate(thirtyDaysAgo.toISOString().slice(0, 10));
                    setCustomEndDate(today.toISOString().slice(0, 10));
                  }
                }}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-black transition",
                  dateFilter === filter.id
                  ? "bg-[#9B6A28] text-white"
                  : "text-slate-400 hover:bg-slate-900",
                ].join(" ")}
                >
                {filter.label}
                </button>
              ))}
              </div>
              
              {dateFilter === "custom" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                onClick={(event) => event.currentTarget.showPicker?.()}
                className="mt-1 w-full cursor-pointer rounded-xl border border-slate-800 bg-black px-4 py-3 font-bold text-white"
                />
                
                <input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                onClick={(event) => event.currentTarget.showPicker?.()}
                className="mt-1 w-full cursor-pointer rounded-xl border border-slate-800 bg-black px-4 py-3 font-bold text-white"
                />
                </div>
              )}
              
              <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="rounded-2xl border border-slate-800 bg-black p-5">
              <h2 className="text-xl font-black">Rivalités</h2>
              
              {rivalries.length === 0 ? (
                <p className="mt-3 text-sm font-bold text-slate-500">
                Aucune rivalité 1v1 contre un joueur connecté pour le moment.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                {rivalries.map((rival) => (
                  <button
                  key={rival.profileId}
                  onClick={() => setSelectedRivalId(rival.profileId)}
                  className={[
                    "w-full rounded-2xl p-4 text-left font-black transition",
                    selectedRivalId === rival.profileId
                    ? "bg-[#C44934] text-white"
                    : "bg-[#F4E9DC] text-black hover:bg-[#FFF8EF]",
                  ].join(" ")}
                  >
                  <div className="flex items-center gap-3">
                  {rival.avatarUrl ? (
                    <img
                    src={rival.avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-full border border-black/10"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C44934] text-white">
                    👤
                    </div>
                  )}
                  
                  <div>
                  <div>{rival.displayName}</div>
                  {rival.username && (
                    <div className="text-xs opacity-70">@{rival.username}</div>
                  )}
                  </div>
                  </div>
                  <div className="mt-1 text-xs opacity-70">
                  {rival.gamesPlayed} partie{rival.gamesPlayed > 1 ? "s" : ""}
                  </div>
                  </button>
                ))}
                </div>
              )}
              </div>
              
              <div className="rounded-2xl border border-slate-800 bg-black p-5">
              {(() => {
                const rival = rivalries.find(
                  (item) => item.profileId === selectedRivalId
                );
                
                if (!rival) {
                  return (
                    <p className="text-sm font-bold text-slate-500">
                    Sélectionnez un rival pour voir le détail.
                    </p>
                  );
                }
                
                return (
                  <>
                  <h2 className="text-2xl font-black">{rival.displayName}</h2>
                  
                  <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <StatCard
                  icon="🤝"
                  label="Duels"
                  value={String(rival.gamesPlayed)}
                  />
                  <StatCard
                  icon="🏆"
                  label="Victoires"
                  value={String(rival.wins)}
                  />
                  <StatCard
                  icon="💀"
                  label="Défaites"
                  value={String(rival.losses)}
                  />
                  <StatCard
                  icon="📈"
                  label="% victoires"
                  value={`${Math.round(
                    (rival.wins / rival.gamesPlayed) * 100
                  )}%`}
                  />
                  
                  </div>
                  
                 <div className="mt-6 rounded-2xl bg-[#F4E9DC] p-5 text-black">
  <h3 className="text-sm font-black uppercase text-black/50">
    Comparatif des scores
  </h3>

  <div className="mt-4 overflow-hidden rounded-xl border border-black/10">
    <div className="grid grid-cols-4 bg-black/10 px-4 py-3 text-xs font-black uppercase text-black/50">
      <div></div>
      <div className="text-right">Toi</div>
      <div className="text-right">Rival</div>
      <div className="text-right">Écart</div>
    </div>

    <div className="grid grid-cols-4 px-4 py-4 font-black">
      <div>Score cumulé</div>
      <div className="text-right text-[#C44934]">{rival.totalScore}</div>
      <div className="text-right text-[#9B6A28]">{rival.opponentTotalScore}</div>
      <div className="text-right text-[#C44934]">
        {rival.pointGap > 0 ? "+" : ""}
        {rival.pointGap}
      </div>
    </div>

    <div className="grid grid-cols-4 border-t border-black/10 px-4 py-4 font-black">
      <div>Score moyen</div>
      <div className="text-right text-[#C44934]">{rival.averageScore}</div>
      <div className="text-right text-[#9B6A28]">{rival.opponentAverageScore}</div>
      <div className="text-right text-[#C44934]">
        {rival.averagePointGap > 0 ? "+" : ""}
        {rival.averagePointGap}
      </div>
    </div>
  </div>
</div>

<div className="mt-6 grid gap-4 sm:grid-cols-3">
  <StatCard
    icon="👑"
    label="Meilleur score"
    value={String(rival.bestScore)}
    onClick={
      rival.bestScoreGameId
        ? () => router.push(`/profile/games/${rival.bestScoreGameId}`)
        : undefined
    }
  />

  <StatCard
  icon="🛡️"
  label="Meilleur score rival"
  value={String(rival.opponentBestScore)}
  onClick={
    rival.opponentBestScoreGameId
      ? () => router.push(`/profile/games/${rival.opponentBestScoreGameId}`)
      : undefined
  }
/>

  <StatCard
    icon={rival.currentStreak?.type === "win" ? "🔥" : "❄️"}
    label="Série actuelle"
    value={
      rival.currentStreak
        ? `${rival.currentStreak.count}${rival.currentStreak.type === "win" ? "V" : "D"}`
        : "-"
    }
  />
</div>

{rival.lastGame && (
   <button
                    onClick={() =>
                      router.push(`/profile/games/${rival.lastGame!.gameId}`)
                    }
                    className="group relative mt-6 w-full rounded-2xl bg-[#F4E9DC] p-5 text-left text-black transition hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                    >
                    <div className="text-xs font-black uppercase text-black/50">
                    Dernière confrontation
                    </div>
                    
                    <div className="mt-2 text-sm font-black text-[#9B6A28]">
                    {new Date(rival.lastGame.date).toLocaleDateString("fr-FR")}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between gap-4">
                    <div>
                    <div className="text-xs font-black uppercase text-black/50">
                    Toi
                    </div>
                    <div className="text-3xl font-black text-[#C44934]">
                    {rival.lastGame.myScore}
                    </div>
                    </div>
                    
                    <div className="text-center">
                    <div
                    className={[
                      "rounded-full px-4 py-2 text-sm font-black",
                      rival.lastGame.didWin
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700",
                    ].join(" ")}
                    >
                    {rival.lastGame.didWin ? "Victoire" : "Défaite"}
                    </div>
                    
                    <div className="mt-2 text-xs font-black text-black/40">
                    {rival.lastGame.myScore - rival.lastGame.opponentScore > 0 ? "+" : ""}
                    {rival.lastGame.myScore - rival.lastGame.opponentScore} pts
                    </div>
                    </div>
                    
                    <div className="text-right">
                    <div className="text-xs font-black uppercase text-black/50">
                    Rival
                    </div>
                    <div className="text-3xl font-black text-[#9B6A28]">
                    {rival.lastGame.opponentScore}
                    </div>
                    </div>
                    </div>
                    <div className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#C44934]/10 text-[#C44934] transition group-hover:scale-110 group-hover:bg-[#C44934]/20">
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    >
                    <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 17 17 7M9 7h8v8"
                    />
                    </svg>
                    </div>
                    
                    </button>

)}
                  {rival.history.length > 0 && (
                    <div className="mt-6 rounded-2xl border border-slate-800 bg-black p-5">
                    <h2 className="text-xl font-black">
                    Évolution des duels
                    </h2>
                    
                    <div className="mt-5 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                    data={rival.history.map((duel, index) => ({
                      label: `D${index + 1}`,
                      date: new Date(duel.date).toLocaleDateString("fr-FR"),
                      myScore: duel.myScore,
                      opponentScore: duel.opponentScore,
                    }))}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    
                    <Tooltip
                    cursor={{ stroke: "#9B6A28", strokeDasharray: "3 3" }}
                    formatter={(value, name) => [
                      `${value} points`,
                      name === "myScore" ? "Toi" : rival.displayName,
                    ]}
                    labelFormatter={(label) => {
                      const point = rival.history.find(
                        (_, index) => `D${index + 1}` === label
                      );
                      
                      return point
                      ? `Duel du ${new Date(point.date).toLocaleDateString("fr-FR")}`
                      : String(label);
                    }}
                    contentStyle={{
                      backgroundColor: "#F4E9DC",
                      border: "1px solid #9B6A28",
                      borderRadius: "12px",
                      color: "#000",
                      fontWeight: 900,
                    }}
                    labelStyle={{
                      color: "#C44934",
                      fontWeight: 900,
                    }}
                    />
                    
                    <Line
                    type="monotone"
                    dataKey="myScore"
                    stroke="#C44934"
                    strokeWidth={4}
                    dot={{ r: 5, fill: "#C44934", stroke: "#F4E9DC", strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                    />
                    
                    <Line
                    type="monotone"
                    dataKey="opponentScore"
                    stroke="#9B6A28"
                    strokeWidth={4}
                    dot={{ r: 5, fill: "#9B6A28", stroke: "#F4E9DC", strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                    />
                    </LineChart>
                    </ResponsiveContainer>
                    </div>
                    </div>
                  )}
                  </>
                );
              })()}
              </div>
              </div>
              </>
            )}
            {activeTab === "history" && (
  <div className="mt-6 rounded-2xl border border-slate-800 bg-black p-5">
    <h2 className="text-xl font-black">Historique</h2>

    {history.length === 0 ? (
      <p className="mt-3 text-sm font-bold text-slate-500">
        Aucune partie enregistrée pour le moment.
      </p>
    ) : (
      <>
        <div className="mt-4 space-y-3">
          {paginatedHistory.map((game) => (
            <button
              key={game.gameId}
              onClick={() => router.push(`/profile/games/${game.gameId}`)}
              className="w-full rounded-2xl bg-[#F4E9DC] p-4 text-left text-black transition hover:bg-[#FFF8EF]"
            >
                  <div className="flex items-center justify-between gap-4">
                  <div>
                  <div className="font-black text-[#C44934]">
                  {new Date(game.createdAt).toLocaleDateString(
                    "fr-FR"
                  )}
                  </div>
                  
                  <div className="mt-1 text-sm font-bold text-slate-400">
                  {game.mode === "6cols"
                    ? "6 colonnes"
                    : "3 colonnes"}{" "}
                    • {game.playerCount} joueur
                    {game.playerCount > 1 ? "s" : ""}
                    </div>
                    </div>
                    
                    <div className="text-right">
                    <div className="text-2xl font-black text-[#C44934]">
                    {game.score}
                    </div>
                    
                    <div className="text-xs font-black text-black/50">
                    #{game.rank}
                    </div>
                    </div>
                    </div>
                    </button>
                  ))}
                  </div>
                  {totalHistoryPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
              disabled={historyPage === 1}
              className="rounded-lg bg-[#241A13] px-4 py-2 font-black text-white disabled:opacity-40"
            >
              Précédent
            </button>

            <span className="font-black text-slate-400">
              Page {historyPage} / {totalHistoryPages}
            </span>

            <button
              onClick={() =>
                setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))
              }
              disabled={historyPage === totalHistoryPages}
              className="rounded-lg bg-[#241A13] px-4 py-2 font-black text-white disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        )}
      </>
    )}
  </div>
)}
              
              {activeTab === "achievements" && (
                <div className="mt-6 rounded-2xl border border-slate-800 bg-black p-5">
                <div className="flex items-center gap-2">
  <h2 className="text-2xl font-black">Succès</h2>

  <button
    type="button"
    onClick={() => setShowRanksModal(true)}
    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-[#111111] text-sm font-black text-slate-300 transition hover:border-[#9B6A28] hover:text-white"
    title="Comprendre les rangs"
  >
    ?
  </button>
</div>
                <div className="mt-5 rounded-2xl bg-[#F4E9DC] p-5 text-black">
                <div className="flex items-center justify-between gap-4">
                <div>
                <div className="text-sm font-black uppercase text-black/50">
                Niveau YamScore
                </div>
                
                <div className="mt-1 text-4xl font-black text-[#C44934]">
                ⭐ Niveau {currentLevel}
                </div>
                </div>
                
                <div className="text-right">
                <div className="text-4xl font-black text-[#9B6A28]">
                {progress?.total_xp ?? 0} XP
                </div>
                
                <div className="text-xs font-black uppercase text-black/50">
                progression
                </div>
                </div>
                </div>
                
                <div className="mt-4 h-4 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-[#C44934]" style={{ width: `${levelProgress}%` }} />
                </div>
                
                <div className="mt-2 text-sm font-black text-black/50">
                {xpIntoLevel} / {xpNeededForLevel} XP vers le niveau {currentLevel + 1}
                </div>
                </div>
                <AchievementSection title="🎮 Parties">
                <AchievementCard
                icon="🎮"
                title="Parties jouées · 3 colonnes"
                value={achievementStats?.games_played_3 ?? 0}
                milestones={DEFAULT_MILESTONES}
                />
                
                <AchievementCard
                icon="🎮"
                title="Parties jouées · 6 colonnes"
                value={achievementStats?.games_played_6 ?? 0}
                milestones={DEFAULT_MILESTONES}
                />
                
                <AchievementCard
                icon="🏆"
                title="Victoires · 3 colonnes"
                value={achievementStats?.wins_3 ?? 0}
                milestones={DEFAULT_MILESTONES}
                />
                
                <AchievementCard
                icon="🏆"
                title="Victoires · 6 colonnes"
                value={achievementStats?.wins_6 ?? 0}
                milestones={DEFAULT_MILESTONES}
                />
                <AchievementCard
  icon="🔥"
  title="Série de victoires"
  value={achievementStats?.best_win_streak ?? 0}
  milestones={WIN_STREAK_MILESTONES}
/>
                
                </AchievementSection>
                
                <AchievementSection title="🎲 Figures">
                <AchievementCard
                icon="🎯"
                title="Brelans réalisés"
                value={achievementStats?.three_of_a_kind_total ?? 0}
                milestones={DEFAULT_MILESTONES}
                />
                
                <AchievementCard
                icon="🏠"
                title="Fulls réalisés"
                value={achievementStats?.full_house_total ?? 0}
                milestones={DEFAULT_MILESTONES}
                />
                
                <AchievementCard
                icon="⬛"
                title="Carrés réalisés"
                value={achievementStats?.four_of_a_kind_total ?? 0}
                milestones={DEFAULT_MILESTONES}
                />
                
                <AchievementCard
                icon="➡️"
                title="Suites réalisées"
                value={achievementStats?.straight_total ?? 0}
                milestones={DEFAULT_MILESTONES}
                />
                
                <AchievementCard
                icon="🎲"
                title="Yams réalisés"
                value={achievementStats?.yams_total ?? 0}
                milestones={[1, 10, 50, 100, 250, 500, 1000, 5000]}
                />
                
                <AchievementCard
                icon="⭐"
                title="Bonus obtenus"
                value={achievementStats?.bonus_total ?? 0}
                milestones={DEFAULT_MILESTONES}
                />
                </AchievementSection>
                
                <AchievementSection title="⭐ Performance">
                <AchievementCard
                icon="👑"
                title="Meilleur score · 3 colonnes"
                value={achievementStats?.best_score_3 ?? 0}
                milestones={PERFORMANCE_3COLS_MILESTONES}
                />
                
                <AchievementCard
                icon="👑"
                title="Meilleur score · 6 colonnes"
                value={achievementStats?.best_score_6 ?? 0}
                milestones={PERFORMANCE_6COLS_MILESTONES}
                />
                </AchievementSection>

                <AchievementSection title="🎾 Grand Chelem">
  <AchievementCard
    icon="🏆"
    title="Finales remportées"
    value={achievementStats?.grand_slam_finals_won ?? 0}
    milestones={GRAND_SLAM_WIN_MILESTONES}
  />

  <AchievementCard
    icon="🇦🇺"
    title="Open d’Australie remportés"
    value={achievementStats?.australian_open_wins ?? 0}
    milestones={GRAND_SLAM_WIN_MILESTONES}
  />

  <AchievementCard
    icon="🟠"
    title="Roland-Garros remportés"
    value={achievementStats?.roland_garros_wins ?? 0}
    milestones={GRAND_SLAM_WIN_MILESTONES}
  />

  <AchievementCard
    icon="🌿"
    title="Wimbledon remportés"
    value={achievementStats?.wimbledon_wins ?? 0}
    milestones={GRAND_SLAM_WIN_MILESTONES}
  />

  <AchievementCard
    icon="🇺🇸"
    title="US Open remportés"
    value={achievementStats?.us_open_wins ?? 0}
    milestones={GRAND_SLAM_WIN_MILESTONES}
  />
</AchievementSection>
<AchievementSection title="⚽ Coupe du Monde">
  <AchievementCard
    icon="🏟️"
    title="Finales atteintes"
    value={
      achievementStats?.world_cup_finals_reached ?? 0
    }
    milestones={WORLD_CUP_MILESTONES}
  />

  <AchievementCard
    icon="🏆"
    title="Coupes du Monde remportées"
    value={
      achievementStats?.world_cup_wins ?? 0
    }
    milestones={WORLD_CUP_MILESTONES}
  />
</AchievementSection>
<AchievementSection title="🏎️ Grand Prix">
  <AchievementCard
    icon="🏁"
    title="Grands Prix remportés"
    value={achievementStats?.grand_prix_wins ?? 0}
    milestones={GRAND_PRIX_MILESTONES}
  />

  <AchievementCard
    icon="🥇"
    title="Podiums"
    value={achievementStats?.grand_prix_podiums ?? 0}
    milestones={GRAND_PRIX_MILESTONES}
  />

  <AchievementCard
    icon="🏆"
    title="Championnats remportés"
    value={achievementStats?.grand_prix_titles ?? 0}
    milestones={GRAND_PRIX_TITLE_MILESTONES}
  />
</AchievementSection>
                <AchievementSection title="🏅 Exploits">
  <AchievementCard
  variant="exploit"
  icon="💎"
  title="Le Club des 1000"
  value={achievementStats?.best_score_3 ?? 0}
  milestones={EXPLOIT_3COLS_MILESTONES}
/>

<AchievementCard
  variant="exploit"
  icon="👑"
  title="Le Club des 2000"
  value={achievementStats?.best_score_6 ?? 0}
  milestones={EXPLOIT_6COLS_MILESTONES}
/>
<AchievementCard
  variant="exploit"
  icon="🔥"
  title="Inarrêtable"
  value={achievementStats?.best_win_streak ?? 0}
  milestones={EXPLOIT_WIN_STREAK}
/>
<AchievementCard
  variant="exploit"
  icon="🌍"
  title="Grand Chelem en carrière"
  value={achievementStats?.career_grand_slam ?? 0}
  milestones={[1]}
/>
</AchievementSection>
                </div>
                
              )}
              
              {imageToCrop && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
                <div className="w-full max-w-xl rounded-3xl border border-[#9B6A28]/70 bg-black p-6">
                <h2 className="text-2xl font-black text-white">
                Recadrer l'image
                </h2>
                
                <div className="relative mt-6 h-96 overflow-hidden rounded-2xl bg-[#111]">
                <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedPixels) =>
                  setCroppedAreaPixels(croppedPixels)
                }
                />
                </div>
                
                <div className="mt-6">
                <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
                />
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                <button
                onClick={() => {
                  setImageToCrop(null);
                  setZoom(1);
                }}
                className="rounded-xl bg-[#241A13] px-5 py-3 font-black text-white"
                >
                Annuler
                </button>
                
                <button
                onClick={handleCropAvatar}
                className="rounded-xl bg-[#C44934] px-5 py-3 font-black text-white"
                >
                Valider
                </button>
                </div>
                </div>
                </div>
              )}
              {avatarModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                <div className="w-full max-w-lg rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-white shadow-2xl">
                <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black">Changer mon avatar</h2>
                
                <button
                onClick={() => setAvatarModalOpen(false)}
                className="rounded-full bg-[#241A13] px-3 py-2 font-black hover:bg-[#322217]"
                >
                ✕
                </button>
                </div>
                
                <div className="mt-6 rounded-2xl border border-slate-800 p-4">
                <h3 className="font-black">🎲 Avatars YamScore</h3>
                
                <div className="mt-6 grid grid-cols-4 justify-items-center gap-5">
                {DEFAULT_AVATARS.map((avatar) => (
                  <button
                  key={avatar}
                  onClick={() => handleSelectDefaultAvatar(avatar)}
                  className={[
                    "group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border transition",
                    profile.avatar_url === avatar
                    ? "border-[#C44934]"
                    : "border-slate-800 hover:border-[#C44934]",
                  ].join(" ")}
                  >
                  <img
                  src={avatar}
                  alt=""
                  className="h-24 w-24 object-contain transition group-hover:scale-110"
                  />
                  
                  {profile.avatar_url === avatar && (
                    <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow-lg">
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    >
                    <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L9 11.586l6.293-6.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                    />
                    </svg>
                    </div>
                  )}
                  </button>
                ))}
                </div>
                </div>
                
                <div className="mt-4 rounded-2xl border border-slate-800 p-4">
                <h3 className="font-black">📁 Importer une image</h3>
                <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl bg-[#C44934] px-4 py-3 font-black text-white transition hover:bg-[#D75A43]">
                Choisir une image
                
                <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  handleAvatarUpload(event);
                  event.currentTarget.value = "";
                }}
                />
                </label>
                </div>
                </div>
                </div>
              )}
              </section>
              </div>
              {showRanksModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
    <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-white shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">
          Rangs des succès
        </h2>

        <button
          onClick={() => setShowRanksModal(false)}
          className="rounded-lg px-3 py-1 text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          ✕
        </button>
      </div>

      <p className="mt-3 text-sm text-slate-400">
        Chaque succès progresse en débloquant ses différents paliers.
      </p>

      <div className="mt-6 space-y-2">
        {[
          ["⚪", "Non classé", "Aucun palier débloqué"],
          ["🥉", "Bronze", "1 palier débloqué"],
          ["🥈", "Argent", "2 paliers débloqués"],
          ["🥇", "Or", "3 paliers débloqués"],
          ["💎", "Platine", "4 paliers débloqués"],
          ["👑", "Diamant", "5 paliers débloqués"],
          ["🌟", "Maître", "6 paliers débloqués"],
          ["🔥", "Légende", "7 paliers débloqués"],
          ["🌌", "Mythique", "Tous les paliers débloqués"],
        ].map(([emoji, rank, description]) => (
          <div
            key={rank}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#111111] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{emoji}</span>

              <span className="font-black">{rank}</span>
            </div>

            <span className="text-sm text-slate-400">
              {description}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
              </main>
            );
          }
          
          
          function StatCard({
            icon,
            label,
            value,
            onClick,
          }: {
            icon: string;
            label: string;
            value: string;
            onClick?: () => void;
          }) {
            const Wrapper = onClick ? "button" : "div";
            
            return (
              <Wrapper
              onClick={onClick}
              className={[
                "group relative rounded-2xl bg-[#F4E9DC] p-4 text-center text-black",
                onClick
                ? "cursor-pointer transition hover:-translate-y-1 hover:shadow-lg"
                : "",
              ].join(" ")}
              
              >
              <div className="text-2xl">{icon}</div>
              <div className="mt-1 text-3xl font-black text-[#C44934]">{value}</div>
              <div className="mt-1 text-xs font-black uppercase text-black/60">
              {label}
              </div>
              {onClick && (
                <div className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#C44934]/10 text-[#C44934] transition group-hover:scale-110 group-hover:bg-[#C44934]/20">
                <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                >
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 17 17 7M9 7h8v8"
                />
                </svg>
                </div>
              )}
              </Wrapper>
            );
          }
          function AchievementCard({
            icon,
            title,
            value,
            milestones,
          variant = "progress",
}: {
  icon: string;
  title: string;
  value: number;
  milestones: readonly number[];
  variant?: "progress" | "exploit";
}) {
  const isExploit = variant === "exploit";
const exploitUnlocked = value >= milestones[0];
const isLocked = isExploit && !exploitUnlocked;
if (isExploit) {
  return (
    <div className={[
  "relative rounded-2xl p-5 transition",
  isLocked
    ? "bg-[#F4E9DC] text-black opacity-50 grayscale"
    : "bg-[#F4E9DC] text-black",
].join(" ")}>
  {isLocked && (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="rounded-full bg-black/80 px-5 py-2 font-black text-white">
      🔒 Verrouillé
    </div>
  </div>
)}
      <div className="text-3xl">{icon}</div>

      <div className="mt-5 text-xl font-black">{title}</div>

      <div className="mt-4 text-4xl font-black text-[#C44934]">
        {value}
      </div>

      <div className="mt-4 text-sm font-black text-black/50">
  {exploitUnlocked
    ? "✅ Exploit débloqué"
    : `Objectif : ${milestones[0]}+`}
</div>
    </div>
  );
}
            const currentIndex = milestones.findLastIndex((milestone) => value >= milestone);
            const nextMilestone = milestones[currentIndex + 1] ?? null;
            const currentMilestone = currentIndex >= 0 ? milestones[currentIndex] : 0;
            
            const progressBase = currentMilestone;
            const progressTarget = nextMilestone ?? currentMilestone;
            const progress =
            progressTarget > progressBase
            ? Math.min(
              100,
              Math.round(
                ((value - progressBase) / (progressTarget - progressBase)) * 100
              )
            )
            : 100;
            
            const ranks = ["🥉 Bronze", "🥈 Argent", "🥇 Or", "💎 Platine", "👑 Diamant", "🌟 Maître", "🔥 Légende", "🌌 Mythique"];
            const currentRank = currentIndex >= 0 ? ranks[currentIndex] : "🔒 Non débloqué";
            const isUnlocked = currentIndex >= 0;
            return (
              <div
              className={[
                "relative overflow-hidden rounded-2xl bg-[#F4E9DC] p-5 text-black",
                !isUnlocked ? "opacity-60 grayscale" : "",
              ].join(" ")}
              >
              {!isUnlocked && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
                <div className="rounded-full bg-black/70 px-4 py-2 text-sm font-black text-white">
                🔒 Verrouillé
                </div>
                </div>
              )}
              
              <div className="flex items-center justify-between gap-3">
              <div className="text-3xl">{icon}</div>
              
              <div className="rounded-full bg-black/10 px-3 py-1 text-xs font-black">
              {isUnlocked ? currentRank : "???"}
              </div>
              </div>
              
              <h3 className="mt-4 text-lg font-black">{title}</h3>
              
              <div className="mt-3 text-3xl font-black text-[#C44934]">
              {isUnlocked ? value : 0}
              </div>
              
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/10">
              <div
              className="h-full rounded-full bg-[#C44934]"
              style={{ width: `${isUnlocked ? progress : 0}%` }}
              />
              </div>
              
              <div className="mt-2 text-sm font-black text-black/50">
              {isUnlocked
                ? nextMilestone
                ? `${value} / ${nextMilestone}`
                : "Objectif maximum atteint"
                : "Débloque le premier palier"}
                </div>
                </div>
              );
            }
            function AchievementSection({
              title,
              children,
            }: {
              title: string;
              children: React.ReactNode;
            }) {
              return (
                <div className="mt-6">
                <h3 className="text-lg font-black text-white">{title}</h3>
                
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {children}
                </div>
                </div>
              );
            }