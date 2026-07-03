"use client";

import { useEffect, useState } from "react";
import { supabase, ensureUserProfile } from "../lib/supabase";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};
type ChartPoint = {
  label: string;
  score: number;
};
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

type GameHistoryItem = {
  gameId: string;
  createdAt: string;
  mode: string;
  playerCount: number;
  score: number;
  rank: number;
};

export default function ProfilePage() {
  const router = useRouter();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  type GameMode = "6cols" | "3cols";
  type ProfileTab = "dashboard" | "history" | "achievements";
  const [scoreChart, setScoreChart] = useState<ChartPoint[]>([]);
  const [selectedMode, setSelectedMode] = useState<GameMode>("6cols");
  const [activeTab, setActiveTab] = useState<ProfileTab>("dashboard");
  
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
      
      const { data: playedPlayers, error: statsError } = await supabase
      .from("local_game_players")
      .select(`
  final_score,
  final_rank,
  game_id,
  yams_count,
  local_games!inner(status,mode)
`)
      .eq("profile_id", ensuredProfile.id)
      .eq("local_games.status", "finished")
      .eq("local_games.mode", selectedMode)
      .not("final_score", "is", null);
      
      if (statsError) {
        console.error("Erreur chargement stats", statsError);
      } else {
        const scores = playedPlayers?.map((row) => row.final_score ?? 0) ?? [];
        
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
        
        const averageScore =
        scores.length > 0
        ? Math.round(
          scores.reduce((total, score) => total + score, 0) /
          scores.length
        )
        : 0;
        const totalYams =
  playedPlayers?.reduce(
    (total, row) => total + (row.yams_count ?? 0),
    0
  ) ?? 0;

const averageYams =
  scores.length > 0 ? Math.round((totalYams / scores.length) * 10) / 10 : 0;
        
        
        
        const wins =
  playedPlayers?.filter((row) => row.final_rank === 1).length ?? 0;

const averageRank =
  scores.length > 0
    ? Math.round(
        ((playedPlayers?.reduce(
          (total, row) => total + (row.final_rank ?? 0),
          0
        ) ?? 0) /
          scores.length) *
          10
      ) / 10
    : 0;
        setStats({
          gamesPlayed: scores.length,
          wins,
          winRate: scores.length > 0 ? Math.round((wins / scores.length) * 100) : 0,
          bestScore,
          averageScore,
          averageRank,
          totalYams,
          averageYams,
        });
      }
      
      const { data: historyRows, error: historyError } = await supabase
      .from("local_game_players")
      .select(`
  game_id,
  final_score,
  final_rank,
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
          });
        }
        
        setHistory(items);
        setScoreChart(
  [...items]
    .reverse()
    .map((game, index) => ({
      label: `Partie ${index + 1}`,
      score: game.score,
    }))
);
      }
      
      setLoading(false);
    }
    
    loadProfile();
  }, [router, selectedMode]);
  
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
    <div className="mx-auto max-w-3xl">
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
      <div className="mt-6 rounded-2xl border border-slate-800 bg-black p-5">
  <h2 className="text-xl font-black">Évolution du score</h2>

  {scoreChart.length === 0 ? (
    <p className="mt-3 text-sm font-bold text-slate-500">
      Aucune donnée pour ce mode.
    </p>
  ) : (
    <div className="mt-5 space-y-3">
      {scoreChart.map((point) => (
        <div key={point.label}>
          <div className="mb-1 flex justify-between text-xs font-black text-slate-400">
            <span>{point.label}</span>
            <span>{point.score}</span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-[#C44934]"
              style={{
                width: `${
                  stats.bestScore > 0
                    ? Math.min(100, (point.score / stats.bestScore) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )}
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