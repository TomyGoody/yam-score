"use client";

import { useEffect, useState } from "react";
import { supabase, ensureUserProfile } from "../lib/supabase";
import { useRouter } from "next/navigation";
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
  type ProfileTab = "dashboard" | "history" | "achievements";
  const [scoreChart, setScoreChart] = useState<ChartPoint[]>([]);
  const [selectedMode, setSelectedMode] = useState<GameMode>("6cols");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
const [customStartDate, setCustomStartDate] = useState("");
const [customEndDate, setCustomEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>("dashboard");
  const [playerCountChart, setPlayerCountChart] = useState<PlayerCountChartItem[]>([]);
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
});


            setHistory(items);
            setScoreChart(
  [...filteredItems]
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
    )
    .slice(-10)
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
          }
          
          setLoading(false);
        }
        
        loadProfile();
      }, [router, selectedMode, dateFilter, customStartDate, customEndDate]);
      
      if (loading) {
        return (
          <main className="min-h-screen bg-black p-6 text-white">
          Chargement...
          </main>
        );
      }
      
      if (!profile) return null;
      
      return (
        <main className="min-h-screen bg-black px-4 py-8 text-white">
        <div className="mx-auto max-w-6xl">
        <button
        onClick={() => router.push("/")}
        className="mb-6 rounded-xl border border-slate-700 px-4 py-2 font-bold text-slate-300 hover:bg-slate-900"
        >
        ← Retour
        </button>
        
        <section className="rounded-3xl border border-[#9B6A28]/70 bg-black p-6 shadow-2xl">
        <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          <img
          src={profile.avatar_url}
          alt=""
          className="h-20 w-20 rounded-full border border-white/20"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#C44934] text-3xl">
          👤
          </div>
        )}
        
        <div>
        <h1 className="text-3xl font-black">
        {profile.display_name || "Utilisateur"}
        </h1>
        
        <p className="mt-1 text-sm font-bold text-slate-400">
        @{profile.username || "pseudo"}
        </p>
        </div>
        </div>
        
        <div className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-slate-800 bg-black p-2">
        {[
          { id: "dashboard", label: "Dashboard" },
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
          <StatCard icon="👑" label="Meilleur score" value={String(stats.bestScore)} />
          <StatCard icon="⭐" label="Score moyen" value={String(stats.averageScore)} />
          <StatCard icon="🥈" label="Rang moyen" value={String(stats.averageRank)} />
          <StatCard icon="🎲" label="Yams réalisés" value={String(stats.totalYams)} />
          <StatCard icon="🎯" label="Yams / partie" value={String(stats.averageYams)} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
  <div className="rounded-2xl border border-slate-800 bg-black p-5">
          <h2 className="text-xl font-black">
          Évolution du score (10 dernières parties)
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
          </section>
          </div>
          </main>
        );
      }
      
      
      function StatCard({
        icon,
        label,
        value,
      }: {
        icon: string;
        label: string;
        value: string;
      }) {
        return (
          <div className="rounded-2xl bg-[#F4E9DC] p-4 text-center text-black">
          <div className="text-2xl">{icon}</div>
          
          <div className="mt-1 text-3xl font-black text-[#C44934]">{value}</div>
          
          <div className="mt-1 text-xs font-black uppercase text-black/60">
          {label}
          </div>
          </div>
        );
      }