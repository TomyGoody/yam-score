"use client";

import { useEffect, useState } from "react";
import { supabase, ensureUserProfile } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import LoadingScreen from "@/app/components/LoadingScreen";

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
  gamesPlayed: number;
  wins: number;
  losses: number;
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
  type GameMode = "6cols" | "3cols";
  type ProfileTab =
  | "dashboard"
  | "rivalries"
  | "history"
  | "achievements";
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
const [crop, setCrop] = useState({ x: 0, y: 0 });
const [zoom, setZoom] = useState(1);
const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [rivalries, setRivalries] = useState<RivalryOpponent[]>([]);
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null);
  const [scoreChart, setScoreChart] = useState<ChartPoint[]>([]);
  const [selectedMode, setSelectedMode] = useState<GameMode>("6cols");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>("dashboard");
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
  
  useEffect(() => {
    async function loadProfile() {
      const ensuredProfile = await ensureUserProfile();
      
      if (!ensuredProfile) {
        router.push("/");
        return;
      }
      
      const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", ensuredProfile.id)
      .single();
      
      if (profileError) {
        console.error("Erreur chargement profil", profileError);
        router.push("/");
        return;
      }
      
      setProfile(profileData);
      
      
      
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
          
          const filteredWins = filteredItems.filter((game) => game.rank === 1).length;
          
          const filteredAverageRank =
          filteredItems.length > 0
          ? Math.round(
            (filteredItems.reduce((total, game) => total + game.rank, 0) /
            filteredItems.length) *
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
            filteredItems.length > 0
            ? Math.round((filteredWins / filteredItems.length) * 100)
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
                  
                  current.averageScore += myRow.final_score ?? 0;
                  current.opponentAverageScore += opponent.final_score ?? 0;
                  const myScore = myRow.final_score ?? 0;

if (myScore > current.bestScore) {
  current.bestScore = myScore;
  current.bestScoreGameId = opponent.game_id;
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
      history: sortedHistory.slice(-100),
      averageScore: Math.round(rival.averageScore / rival.gamesPlayed),
      opponentAverageScore: Math.round(
        rival.opponentAverageScore / rival.gamesPlayed
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
    .update({ avatar_url: avatar })
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
    .update({ avatar_url: publicUrl })
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
    .update({ avatar_url: publicUrl })
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
      return (
        <main className="min-h-screen bg-black px-4 py-8 text-white">
        <div className="mx-auto max-w-6xl">
        <button
        onClick={() => router.push("/")}
        className="mb-6 rounded-xl bg-[#241A13] px-4 py-2 font-black text-white hover:bg-[#322217]"
        >
        ← Retour
        </button>
        
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
          onClick={() => setActiveTab(tab.id as ProfileTab)}
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
          <StatCard icon="🏆" label="Victoires" value={String(stats.wins)} />
          <StatCard icon="📈" label="% victoires" value={`${stats.winRate}%`} />
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
          <StatCard icon="🥈" label="Rang moyen" value={String(stats.averageRank)} />
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
            formatter={(value) => [`${value} partie(s)`, "Scores"]}
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
                
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#F4E9DC] p-5 text-black">
                <div className="text-xs font-black uppercase text-black/50">
                Ton score moyen
                </div>
                <div className="mt-2 text-3xl font-black text-[#C44934]">
                {rival.averageScore}
                </div>
                </div>
                
                <div className="rounded-2xl bg-[#F4E9DC] p-5 text-black">
                <div className="text-xs font-black uppercase text-black/50">
                Score moyen rival
                </div>
                <div className="mt-2 text-3xl font-black text-[#9B6A28]">
                {rival.opponentAverageScore}
                </div>
                
                </div>
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
  icon={rival.currentStreak?.type === "win" ? "🔥" : "❄️"}
  label="Série actuelle"
  value={
    rival.currentStreak
      ? `${rival.currentStreak.count}${rival.currentStreak.type === "win" ? "V" : "D"}`
      : "-"
  }
/>
                {rival.lastGame && (
                  <button
                  onClick={() =>
                    router.push(`/profile/games/${rival.lastGame!.gameId}`)
                  }
                  className="group relative sm:col-span-2 rounded-2xl bg-[#F4E9DC] p-5 text-left text-black transition hover:-translate-y-1 hover:shadow-lg cursor-pointer"
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
                </div>
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
          )}
          {activeTab === "history" && (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-black p-5">
            <h2 className="text-xl font-black">Historique</h2>
            
            {history.length === 0 ? (
              <p className="mt-3 text-sm font-bold text-slate-500">
              Aucune partie enregistrée pour le moment.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
              {history.map((game) => (
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
              )}
              </div>
            )}
            {activeTab === "achievements" && (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-black p-5">
              <h2 className="text-xl font-black">Succès</h2>
              <p className="mt-3 text-sm font-bold text-slate-500">
              Les succès seront globaux et compteront les parties 3 colonnes + 6 colonnes.
              </p>
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