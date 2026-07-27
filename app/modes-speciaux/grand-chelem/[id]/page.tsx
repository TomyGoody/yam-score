"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuthButton from "../../../components/AuthButton";
import { supabase } from "../../../lib/supabase";
import {
  getTournamentTheme,
  TournamentTheme,
} from "@/app/lib/tournamentThemes";
import LoadingScreen from "@/app/components/LoadingScreen";
type CompetitionStatus = "in_progress" | "finished" | "abandoned";


type CurrentSetTarget =
| {
  playMode: "local";
  gameId: string;
}
| {
  playMode: "salon";
  gameId: string;
  salonCode: string;
};
type Competition = {
  id: string;
  competition_type: "grand_slam_final";
  theme: TournamentTheme;
  status: CompetitionStatus;
  column_mode: 3 | 6;
  wins_required: number;
  created_by: string;
  winner_player_id: string | null;
  current_round_number: number | null;
  current_play_mode: "local" | "salon" | null;
  started_at: string;
  finished_at: string | null;
  abandoned_at: string | null;
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_order: number;
  player_key: string;
  player_name: string;
  profile_id: string | null;
  avatar_url: string | null;
  sets_won: number;
};
type CompetitionSet = {
  roundNumber: number;
  playMode: "local" | "salon";
  status: "waiting" | "playing" | "finished";
  gameId: string;
  salonCode: string | null;
  historyGameId: string | null;
  player1Score: number | null;
  player2Score: number | null;
  
};




export default function GrandSlamCompetitionPage() {
  const params = useParams();
  const router = useRouter();
  
  const competitionId = String(params.id);
  const [currentSetTarget, setCurrentSetTarget] =
  useState<CurrentSetTarget | null>(null);
  const [showTournamentVictory, setShowTournamentVictory] =
  useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] =
  useState(false);
  const [selectedStartingPlayerId, setSelectedStartingPlayerId] =
  useState<string | null>(null);
  const [isAbandoning, setIsAbandoning] =
  useState(false);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [players, setPlayers] = useState<CompetitionPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [competitionSets, setCompetitionSets] =
  useState<CompetitionSet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showModeChoice, setShowModeChoice] = useState(false);
  const [isStartingSet, setIsStartingSet] = useState(false);
  
  useEffect(() => {
    async function loadCompetition() {
      setLoading(true);
      setErrorMessage(null);
      setCurrentSetTarget(null);
      const { data: competitionData, error: competitionError } =
      await supabase
      .from("competitions")
      .select(
        `
            id,
            competition_type,
            theme,
            status,
            column_mode,
            wins_required,
            created_by,
            winner_player_id,
            current_round_number,
            current_play_mode,
            started_at,
            finished_at,
            abandoned_at
          `
      )
      .eq("id", competitionId)
      .single();
      
      if (competitionError || !competitionData) {
        console.error("Erreur chargement compétition", {
          message: competitionError?.message,
          details: competitionError?.details,
          hint: competitionError?.hint,
          code: competitionError?.code,
          competitionId,
        });
        setErrorMessage("Compétition introuvable ou inaccessible.");
        setLoading(false);
        return;
      }
      
      const { data: playersData, error: playersError } = await supabase
      .from("competition_players")
      .select(
        `
          id,
          competition_id,
          player_order,
          player_key,
          player_name,
          profile_id,
          avatar_url,
          sets_won
        `
      )
      .eq("competition_id", competitionId)
      .order("player_order", { ascending: true });
      
      if (playersError) {
        console.error("Erreur chargement joueurs", playersError);
        setErrorMessage("Impossible de charger les joueurs.");
        setLoading(false);
        return;
      }
      const { data: localGames, error: localGamesError } =
      await supabase
      .from("local_games")
      .select(
        `
  id,
  status,
  source,
  competition_round_number
  `
      )
      .eq("competition_id", competitionId)
      .order("competition_round_number", { ascending: true });
      
      if (localGamesError) {
        console.error("Erreur chargement sets locaux", {
          message: localGamesError.message,
          details: localGamesError.details,
          hint: localGamesError.hint,
          code: localGamesError.code,
        });
      }
      
      const localGameIds = (localGames ?? []).map((game) => game.id);
      
      let localPlayers:
  | {
      game_id: string;
      player_order: number;
      final_score: number | null;
      competition_player_id: string | null;
    }[]
  = [];
      
      if (localGameIds.length > 0) {
        const { data, error } = await supabase
        .from("local_game_players")
        .select(
  "game_id, player_order, final_score, competition_player_id"
)
        .in("game_id", localGameIds)
        .order("player_order", { ascending: true });
        
        if (error) {
          console.error("Erreur chargement scores locaux", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
        } else {
          localPlayers = data ?? [];
        }
      }
      
      const { data: salonGames, error: salonGamesError } =
      await supabase
      .from("yam_games")
      .select(
        `
      id,
      code,
      status,
      competition_round_number
      `
      )
      .eq("competition_id", competitionId)
      .order("competition_round_number", { ascending: true });
      
      if (salonGamesError) {
        console.error("Erreur chargement sets Salon", {
          message: salonGamesError.message,
          details: salonGamesError.details,
          hint: salonGamesError.hint,
          code: salonGamesError.code,
        });
      }
      
      const salonGameIds = (salonGames ?? []).map((game) => game.id);
      
      let salonPlayers:
  | {
      game_id: string;
      player_order: number;
      final_score: number | null;
      competition_player_id: string | null;
    }[]
  = [];
      
      if (salonGameIds.length > 0) {
        const { data, error } = await supabase
        .from("yam_players")
        .select(
  "game_id, player_order, final_score, competition_player_id"
)
        .in("game_id", salonGameIds)
        .order("player_order", { ascending: true });
        
        if (error) {
          console.error("Erreur chargement scores Salon", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
        } else {
          salonPlayers = data ?? [];
        }
      }
      const salonHistoryGames = (localGames ?? []).filter(
        (game) => game.source === "salon"
      );
      const fixedPlayer1 = (playersData ?? []).find(
  (player) => player.player_order === 1
);

const fixedPlayer2 = (playersData ?? []).find(
  (player) => player.player_order === 2
);

const player1Id = fixedPlayer1?.id ?? null;
const player2Id = fixedPlayer2?.id ?? null;
      const loadedLocalSets: CompetitionSet[] = (localGames ?? [])
      .filter((game) => game.source !== "salon")
      .map((game) => {
        const gamePlayers = localPlayers.filter(
          (player) => player.game_id === game.id
        );
        
        const player1 = gamePlayers.find(
  (player) => player.competition_player_id === player1Id
);

const player2 = gamePlayers.find(
  (player) => player.competition_player_id === player2Id
);
        
        return {
          roundNumber: game.competition_round_number,
          playMode: "local",
          status: game.status,
          gameId: game.id,
          salonCode: null,
          historyGameId: game.id,
          player1Score: player1?.final_score ?? null,
          player2Score: player2?.final_score ?? null,
        };
      }
    );
    
    const loadedSalonSets: CompetitionSet[] = (salonGames ?? []).map(
      (game) => {
        const gamePlayers = salonPlayers.filter(
          (player) => player.game_id === game.id
        );
        
        const player1 = gamePlayers.find(
  (player) => player.competition_player_id === player1Id
);

const player2 = gamePlayers.find(
  (player) => player.competition_player_id === player2Id
);
        const historyGame = salonHistoryGames.find(
          (history) =>
            history.competition_round_number ===
          game.competition_round_number
        );
        return {
          roundNumber: game.competition_round_number,
          playMode: "salon",
          status: game.status,
          gameId: game.id,
          salonCode: game.code,
          historyGameId: historyGame?.id ?? null,
          player1Score: player1?.final_score ?? null,
          player2Score: player2?.final_score ?? null,
        };
      }
    );
    
    setCompetitionSets(
      [...loadedLocalSets, ...loadedSalonSets].sort(
        (a, b) => a.roundNumber - b.roundNumber
      )
    );
    setCompetition(competitionData as Competition);
    setPlayers((playersData ?? []) as CompetitionPlayer[]);
    if (
      competitionData.current_round_number &&
      competitionData.current_play_mode === "local"
    ) {
      const { data: localGame, error: localGameError } =
      await supabase
      .from("local_games")
      .select("id")
      .eq("competition_id", competitionId)
      .eq(
        "competition_round_number",
        competitionData.current_round_number
      )
      .in("status", ["playing"])
      .maybeSingle();
      
      if (localGameError) {
        console.error("Erreur recherche du set local", {
          message: localGameError.message,
          details: localGameError.details,
          hint: localGameError.hint,
          code: localGameError.code,
        });
      }
      
      if (localGame) {
        setCurrentSetTarget({
          playMode: "local",
          gameId: localGame.id,
        });
      }
    }
    
    if (
      competitionData.current_round_number &&
      competitionData.current_play_mode === "salon"
    ) {
      const { data: salonGame, error: salonGameError } =
      await supabase
      .from("yam_games")
      .select("id, code")
      .eq("competition_id", competitionId)
      .eq(
        "competition_round_number",
        competitionData.current_round_number
      )
      .in("status", ["waiting", "playing"])
      .maybeSingle();
      
      if (salonGameError) {
        console.error("Erreur recherche du set Salon", {
          message: salonGameError.message,
          details: salonGameError.details,
          hint: salonGameError.hint,
          code: salonGameError.code,
        });
      }
      
      if (salonGame) {
        setCurrentSetTarget({
          playMode: "salon",
          gameId: salonGame.id,
          salonCode: salonGame.code,
        });
      }
    }
    setLoading(false);
  }
  
  void loadCompetition();
}, [competitionId]);
useEffect(() => {
  if (typeof window === "undefined") return;
  
  const searchParams = new URLSearchParams(window.location.search);
  const shouldShowVictory =
  searchParams.get("tournamentVictory") === "1";
  
  if (shouldShowVictory) {
    setShowTournamentVictory(true);
    
    // Nettoie l’URL pour éviter que la modale revienne au rechargement.
    window.history.replaceState(
      {},
      "",
      `/modes-speciaux/grand-chelem/${competitionId}`
    );
  }
}, [competitionId]);
const tournament = competition
? getTournamentTheme(competition.theme)
: null;

const player1 = players.find((player) => player.player_order === 1) ?? null;
const player2 = players.find((player) => player.player_order === 2) ?? null;

const currentRoundNumber = useMemo(() => {
  if (!competition) return 1;
  
  if (competition.current_round_number) {
    return competition.current_round_number;
  }
  
  const completedSets =
  (player1?.sets_won ?? 0) + (player2?.sets_won ?? 0);
  
  return completedSets + 1;
}, [competition, player1?.sets_won, player2?.sets_won]);

const savedFirstSetMode = useMemo(() => {
  if (typeof window === "undefined") return null;
  
  return sessionStorage.getItem(
    `grand-slam-first-set-mode-${competitionId}`
  ) as "local" | "salon" | null;
}, [competitionId]);

function openStartSetChoice() {
  if (!competition || competition.status !== "in_progress") return;

  setSelectedStartingPlayerId(null);
  setShowModeChoice(true);
}

async function startSet(
  mode: "local" | "salon",
  startingCompetitionPlayerId: string
) {
  if (!competition) return;
  
  setIsStartingSet(true);
  setErrorMessage(null);
  
  const { data, error } = await supabase.rpc(
  "start_competition_set",
  {
    p_competition_id: competition.id,
    p_play_mode: mode,
    p_starting_competition_player_id: startingCompetitionPlayerId,
  }
);
  
  if (error || !data) {
    console.error("Erreur lancement du set", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });
    
    setErrorMessage(
      error?.message ?? "Impossible de lancer le set."
    );
    
    setIsStartingSet(false);
    return;
  }
  
  const result = data as {
    play_mode: "local" | "salon";
    round_number: number;
    game_id: string;
    salon_code: string | null;
  };
  
  sessionStorage.removeItem(
    `grand-slam-first-set-mode-${competition.id}`
  );
  setSelectedStartingPlayerId(null);
setShowModeChoice(false);
  if (result.play_mode === "salon" && result.salon_code) {
    router.push(`/salon/${result.salon_code}/access`);
    return;
  }
  
  sessionStorage.setItem(
    "yam-competition-local-set",
    JSON.stringify({
      competitionId: competition.id,
      gameId: result.game_id,
      roundNumber: result.round_number,
    })
  );
  
  router.push(
    `/?competitionId=${competition.id}&gameId=${result.game_id}`
  );
}
async function abandonCompetition() {
  if (!competition) return;
  
  setIsAbandoning(true);
  setErrorMessage(null);
  
  const { error } = await supabase.rpc(
    "abandon_competition",
    {
      p_competition_id: competition.id,
    }
  );
  
  if (error) {
    console.error("Erreur abandon compétition", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    
    setErrorMessage(
      "Impossible d’abandonner définitivement la finale."
    );
    
    setIsAbandoning(false);
    return;
  }
  
  setCompetition((current) =>
    current
  ? {
    ...current,
    status: "abandoned",
    abandoned_at: new Date().toISOString(),
    current_round_number: null,
    current_play_mode: null,
  }
  : current
);

setCurrentSetTarget(null);
setShowAbandonConfirm(false);
setIsAbandoning(false);
}
function resumeCurrentSet() {
  if (!competition || !currentSetTarget) return;
  
  if (currentSetTarget.playMode === "salon") {
    router.push(`/salon/${currentSetTarget.salonCode}/access`);
    return;
  }
  
  router.push(
    `/?competitionId=${competition.id}&gameId=${currentSetTarget.gameId}`
  );
}
if (loading) {
  return <LoadingScreen />;
}

if (errorMessage || !competition || !tournament || !player1 || !player2) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 text-white">
    <div className="w-full max-w-md rounded-3xl border border-red-500/50 bg-[#111111] p-6 text-center">
    <p className="text-xl font-black text-red-400">
    Impossible d’ouvrir la finale
    </p>
    
    <p className="mt-3 font-bold text-slate-400">
    {errorMessage ?? "Données incomplètes."}
    </p>
    
    <button
    type="button"
    onClick={() => router.push("/modes-speciaux")}
    className="mt-6 rounded-xl bg-[#C44934] px-5 py-3 font-black text-white"
    >
    Retour aux modes spéciaux
    </button>
    </div>
    </main>
  );
}

const isFinished = competition.status === "finished";
const isAbandoned = competition.status === "abandoned";
const competitionWinner =
players.find(
  (player) => player.id === competition.winner_player_id
) ?? null;

const competitionLoser =
players.find(
  (player) => player.id !== competition.winner_player_id
) ?? null;
return (
  <main
  className="relative min-h-dvh overflow-hidden px-4 py-8 text-white"
  style={{
    backgroundColor: tournament.pageBackgroundColor,
  }}
>
  <AuthButton />
  
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
  <Image
  src="/favicon.png"
  alt=""
  width={1000}
  height={1000}
  priority
  className="select-none rotate-[-12deg]"
  />
  </div>
  
  <div className="relative z-10 mx-auto w-full max-w-4xl">
  <button
  type="button"
  onClick={() => router.push("/modes-speciaux")}
  className={[
    "rounded-xl border px-4 py-2 font-black text-white transition",
    tournament.border,
    tournament.buttonBackground,
    tournament.buttonHover,
  ].join(" ")}
  >
  Modes spéciaux
  </button>
  
  <section
  className={[
    "relative mt-8 overflow-hidden rounded-3xl border-2",
    tournament.border,
  ].join(" ")}
  style={{
    backgroundColor: tournament.panelBackgroundColor,
  }}
>
  <div className="pointer-events-none absolute inset-0 opacity-15">
  <div className="absolute left-1/2 top-0 h-full w-px bg-white" />
  <div className="absolute left-0 top-1/2 h-px w-full bg-white" />
  <div className="absolute left-1/2 top-1/2 h-56 w-80 -translate-x-1/2 -translate-y-1/2 border border-white" />
  <div className="absolute left-1/2 top-1/2 h-56 w-px -translate-x-1/2 -translate-y-1/2 bg-white" />
  </div>
  
  <div className="relative z-10 px-5 py-8 sm:px-8 sm:py-10">
  <div className="text-center">
  <div className="flex justify-center">
  <Image
    src={tournament.headerLogo}
    alt={tournament.name}
    width={96}
    height={96}
    className="h-24 w-auto object-contain drop-shadow-xl"
    priority
  />
</div>
  
  <p className="mt-4 text-sm font-black uppercase tracking-[0.3em] text-white/70">
  Finale de Grand Chelem
  </p>
  
  <h1 className="mt-2 text-4xl font-black sm:text-6xl">
  {tournament.name}
  </h1>
  
  <p className="mt-3 font-bold text-white/70">
  {competition.column_mode} colonnes · Premier à{" "}
  {competition.wins_required} victoires
  </p>
  </div>
  
  <div className="mt-10 grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
  <CompetitionPlayerCard
  player={player1}
  winner={competition.winner_player_id === player1.id}
  tournament={tournament}
/>
  
  <div className="text-center">
  <div className="text-3xl font-black text-white/50">VS</div>
  
  <div className="mt-3 text-5xl font-black">
  {player1.sets_won}–{player2.sets_won}
  </div>
  </div>
  
  <CompetitionPlayerCard
  player={player2}
  winner={competition.winner_player_id === player2.id}
  tournament={tournament}
/>
  </div>
  
  <div className="mt-8 grid gap-4 md:grid-cols-2">
  <SetProgress
  name={player1.player_name}
  wins={player1.sets_won}
  winsRequired={competition.wins_required}
  tournament={tournament}
/>
  
  <SetProgress
  name={player2.player_name}
  wins={player2.sets_won}
  winsRequired={competition.wins_required}
  tournament={tournament}
/>
  </div>
  </div>
  </section>
  
  <section
  className={[
    "mt-6 rounded-3xl border p-6 text-center",
    tournament.border,
    "bg-black/35 backdrop-blur-sm",
  ].join(" ")}
  >
  {isFinished ? (
    <>
    <div className="text-6xl">🏆</div>
    
    <h2 className="mt-4 text-3xl font-black">
    {
      players.find(
        (player) => player.id === competition.winner_player_id
      )?.player_name
    }{" "}
    remporte {tournament.name}
    </h2>
    
    <p className="mt-3 font-bold text-slate-400">
    La finale est terminée et ne peut plus être reprise.
    </p>
    </>
  ) : isAbandoned ? (
    <>
    <div className="text-6xl">🚫</div>
    
    <h2 className="mt-4 text-3xl font-black">Finale abandonnée</h2>
    
    <p className="mt-3 font-bold text-slate-400">
    Cette compétition ne peut plus être reprise.
    </p>
    </>
  ) : competition.current_round_number &&
  competition.current_play_mode ? (
    <>
    <p className={[
      "text-sm font-black uppercase tracking-widest",
      tournament.accentText,
    ].join(" ")}>
    Set en cours
    </p>
    
    <h2 className="mt-3 text-3xl font-black">
    Set {competition.current_round_number}
    </h2>
    
    <p className="mt-2 font-bold text-slate-400">
    Mode{" "}
    {competition.current_play_mode === "local"
      ? "Local"
      : "Salon"}
      </p>
      
      <button
      type="button"
      disabled={!currentSetTarget}
      onClick={resumeCurrentSet}
      className={[
        "mt-6 w-full rounded-xl px-5 py-4 text-lg font-black transition",
        tournament.buttonBackground,
        tournament.buttonHover,
        tournament.buttonText,
        "disabled:cursor-not-allowed disabled:opacity-40",
      ].join(" ")}
      >
      {currentSetTarget
        ? `Reprendre le set ${competition.current_round_number}`
        : "Set en cours introuvable"}
        </button>
        </>
      ) : (
        <>
        <p className={[
          "text-sm font-black uppercase tracking-widest",
          tournament.accentText,
        ].join(" ")}>
        Prochain set
        </p>
        
        <h2 className="mt-3 text-3xl font-black">
        Set {currentRoundNumber}
        </h2>
        
        <p className="mt-2 font-bold text-slate-400">
        Choisis comment jouer cette nouvelle partie de Yam.
        </p>
        
        <button
        type="button"
        onClick={openStartSetChoice}
        className={[
          "mt-6 w-full rounded-xl px-5 py-4 text-lg font-black transition",
          tournament.buttonBackground,
          tournament.buttonHover,
          tournament.buttonText,
        ].join(" ")}
        >
        {currentRoundNumber === 1
          ? "Commencer le premier set"
          : `Jouer le set ${currentRoundNumber}`}
          </button>
          </>
        )}
        </section>
        {competitionSets.length > 0 && (
          <section
          className={[
            "mt-6 rounded-3xl border p-6",
            tournament.border,
            "bg-black/35 backdrop-blur-sm",
          ].join(" ")}
          >
          <div>
          <p
          className={[
            "text-sm font-black uppercase tracking-widest",
            tournament.accentText,
          ].join(" ")}
          >
          Historique
          </p>
          
          <h2 className="mt-2 text-2xl font-black">
          Sets joués
          </h2>
          </div>
          
          <div className="mt-5 space-y-4">
          {competitionSets.map((set) => (
            <CompetitionSetCard
            key={`${set.playMode}-${set.gameId}`}
            set={set}
            player1={player1}
            player2={player2}
            tournament={tournament}
            onOpen={() => {
              if (set.status !== "finished") {
                if (set.playMode === "salon" && set.salonCode) {
                  router.push(`/salon/${set.salonCode}/access`);
                  return;
                }
                
                router.push(
                  `/?competitionId=${competition.id}&gameId=${set.gameId}`
                );
                return;
              }
              
              if (set.historyGameId) {
                router.push(`/profile/games/${set.historyGameId}`);
              }
            }}
            />
          ))}
          </div>
          </section>
        )}
        {!isFinished && !isAbandoned && (
          <section className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/5 p-5">
          <h2 className="font-black text-red-300">Zone sensible</h2>
          
          <p className="mt-2 text-sm font-bold text-slate-500">
          La finale sera clôturée définitivement et ne pourra plus être reprise.
          </p>
          
          <button
          type="button"
          onClick={() => setShowAbandonConfirm(true)}
          className="mt-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 font-black text-red-300 transition hover:bg-red-500/20"
          >
          Abandonner définitivement
          </button>
          </section>
        )}
        </div>
        
        {showModeChoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
          <div
          className={[
            "w-full max-w-md rounded-3xl border p-6",
            tournament.border,
            "bg-black/40 backdrop-blur-sm",
          ].join(" ")}
          >
          <p className={[
            "text-sm font-black uppercase tracking-widest",
            tournament.accentText,
          ].join(" ")}>
          Set {currentRoundNumber}
          </p>
          
          <h2 className="mt-2 text-2xl font-black">
          Configuration
          </h2>
          <div className="mt-5">
  <p
    className={[
      "text-sm font-black uppercase tracking-widest",
      tournament.accentText,
    ].join(" ")}
  >
    Qui commence ce set ?
  </p>

  <div className="mt-3 grid grid-cols-2 gap-3">
    {[player1, player2].map((player) => {
      const selected = selectedStartingPlayerId === player.id;

      return (
        
        <button
          key={player.id}
          type="button"
          onClick={() => setSelectedStartingPlayerId(player.id)}
          className={[
            "rounded-2xl border p-4 text-left font-black transition",
            selected
              ? `${tournament.border} ${tournament.scoreBackground} ${tournament.scoreText}`
              : `${tournament.border} bg-black/25 text-white hover:bg-black/40`,
          ].join(" ")}
        >
          {player.player_name}
        </button>
      );
    })}
  </div>
</div>
<p
    className={[
      "text-sm mt-4 font-black uppercase tracking-widest",
      tournament.accentText,
    ].join(" ")}
  >
    Mode de jeu
  </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            
          <ModeButton
  title="Local"
  subtitle="Une personne note tout"
  disabled={isStartingSet || !selectedStartingPlayerId}
  tournament={tournament}
  onClick={() => {
    if (!selectedStartingPlayerId) return;

    void startSet("local", selectedStartingPlayerId);
  }}
/>
          
          <ModeButton
  title="Salon"
  subtitle="Chacun sur son téléphone"
  disabled={isStartingSet || !selectedStartingPlayerId}
  tournament={tournament}
  onClick={() => {
    if (!selectedStartingPlayerId) return;

    void startSet("salon", selectedStartingPlayerId);
  }}
/>
          </div>
          
          <button
          type="button"
          disabled={isStartingSet}
          onClick={() => setShowModeChoice(false)}
          className={[
  "mt-4 w-full rounded-xl border bg-black/30 px-4 py-3 font-black text-white transition disabled:opacity-50",
  tournament.border,
  "hover:bg-black/45",
].join(" ")}
          >
          Annuler
          </button>
          </div>
          </div>
        )}
        {showTournamentVictory &&
          isFinished &&
          competitionWinner &&
          competitionLoser && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 px-4">
           <div
  className={[
    "relative w-full max-w-lg overflow-hidden rounded-3xl border-2 text-white shadow-2xl",
    tournament.border,
  ].join(" ")}
  style={{
    backgroundColor: tournament.panelBackgroundColor,
  }}
>
            <div className="pointer-events-none absolute inset-0 opacity-15">
            <div className="absolute left-1/2 top-0 h-full w-px bg-white" />
            <div className="absolute left-0 top-1/2 h-px w-full bg-white" />
            <div className="absolute left-1/2 top-1/2 h-48 w-72 -translate-x-1/2 -translate-y-1/2 border border-white" />
            </div>
            
            <div className="relative z-10 p-7 text-center sm:p-9">
            <div className="text-7xl">🏆</div>
            
            <p className="mt-5 text-sm font-black uppercase tracking-[0.3em] text-white/70">
            Finale remportée
            </p>
            
            <h2 className="mt-2 text-4xl font-black">
            {tournament.name}
            </h2>
            
            <div
  className={[
    "mt-7 rounded-2xl border bg-black/30 p-5 backdrop-blur-sm",
    tournament.border,
  ].join(" ")}
>
            <PlayerAvatar player={competitionWinner} />
            
            <p className={[
  "mt-4 text-sm font-black uppercase tracking-widest",
  tournament.accentText,
].join(" ")}>
            Champion
            </p>
            
            <p className="mt-2 text-3xl font-black">
            {competitionWinner.player_name}
            </p>
            </div>
            
            <p className="mt-6 text-lg font-black">
            {competitionWinner.player_name}
            <span className="mx-3 text-2xl">
            {competitionWinner.sets_won}–
            {competitionLoser.sets_won}
            </span>
            {competitionLoser.player_name}
            </p>
            
            {competitionWinner.profile_id && (
              <div
  className={[
    "mt-6 rounded-2xl border bg-black/25 p-4 text-left",
    tournament.border,
  ].join(" ")}
>
              <p className="font-black">
              Récompenses enregistrées
              </p>
              
              <p className="mt-2 text-sm font-bold text-white/70">
              + 1 finale de Grand Chelem remportée
              </p>
              
              <p className="mt-1 text-sm font-bold text-white/70">
              + 1 victoire à {tournament.name}
              </p>
              </div>
            )}
            
            <button
            type="button"
            onClick={() => setShowTournamentVictory(false)}
            className="mt-7 w-full rounded-xl bg-[#F4E9DC] px-5 py-4 text-lg font-black text-black transition hover:bg-white"
            >
            Voir la finale
            </button>
            
            <button
            type="button"
            onClick={() => router.push("/modes-speciaux")}
            className={[
  "mt-3 w-full rounded-xl border px-5 py-3 font-black text-white transition",
  tournament.border,
  "bg-black/30 hover:bg-black/45",
].join(" ")}
            >
            Retour aux modes spéciaux
            </button>
            </div>
            </div>
            </div>
          )}
          {showAbandonConfirm && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 px-4">
            <div className="w-full max-w-md rounded-3xl border border-red-500/50 bg-[#111111] p-6 text-center">
            <div className="text-6xl">⚠️</div>
            
            <p className="mt-4 text-sm font-black uppercase tracking-widest text-red-400">
            Action définitive
            </p>
            
            <h2 className="mt-2 text-3xl font-black">
            Abandonner la finale ?
            </h2>
            
            <p className="mt-4 font-bold text-slate-400">
            Les scores déjà joués resteront visibles, mais aucun nouveau set ne
            pourra être lancé et le set en cours ne pourra plus être repris depuis
            cette compétition.
            </p>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
            <button
            type="button"
            disabled={isAbandoning}
            onClick={() => setShowAbandonConfirm(false)}
            className="rounded-xl bg-[#241A13] px-4 py-3 font-black text-white disabled:opacity-50"
            >
            Annuler
            </button>
            
            <button
            type="button"
            disabled={isAbandoning}
            onClick={() => void abandonCompetition()}
            className="rounded-xl bg-red-600 px-4 py-3 font-black text-white transition enabled:hover:bg-red-500 disabled:opacity-50"
            >
            {isAbandoning
              ? "Abandon..."
              : "Confirmer"}
              </button>
              </div>
              </div>
              </div>
            )}
            </main>
          );
        }
        
        function CompetitionPlayerCard({
  player,
  winner,
  tournament,
}: {
  player: CompetitionPlayer;
  winner: boolean;
  tournament: ReturnType<typeof getTournamentTheme>;
}) {
  return (
    <article
      className={[
        "rounded-2xl border bg-black/25 p-5 text-center backdrop-blur-sm",
        tournament.border,
      ].join(" ")}
    >
      <PlayerAvatar player={player} />

      <h2 className="mt-4 text-2xl font-black">
        {player.player_name}
      </h2>

      <p className="mt-1 text-xs font-black uppercase tracking-widest text-white/60">
        {player.profile_id ? "Profil associé" : "Invité"}
      </p>

      {winner && (
        <div
          className={[
            "mt-3 rounded-full bg-[#F4E9DC] px-3 py-1 text-sm font-black",
            tournament.accentDarkText,
          ].join(" ")}
        >
          🏆 Vainqueur
        </div>
      )}
    </article>
  );
}
        
        function PlayerAvatar({ player }: { player: CompetitionPlayer }) {
          if (player.avatar_url) {
            return (
              <img
              src={player.avatar_url}
              alt=""
              className="mx-auto h-20 w-20 rounded-full border-4 border-white/40 object-cover"
              />
            );
          }
          
          return (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/40 bg-black/40 text-3xl font-black">
            {player.player_name.charAt(0).toUpperCase()}
            </div>
          );
        }
        
        function SetProgress({
  name,
  wins,
  winsRequired,
  tournament,
}: {
  name: string;
  wins: number;
  winsRequired: number;
  tournament: ReturnType<typeof getTournamentTheme>;
}) {
  return (
    <div
      className={[
        "rounded-2xl border bg-black/25 p-4 backdrop-blur-sm",
        tournament.border,
      ].join(" ")}
    >
      <p className="truncate text-center font-black">{name}</p>

      <div className="mt-3 flex justify-center gap-3">
        {Array.from({ length: winsRequired }, (_, index) => {
          const won = index < wins;

          return (
            <div
              key={index}
              className={[
                "flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg transition",
                won
                  ? `${tournament.border} ${tournament.scoreBackground} ${tournament.scoreText}`
                  : "border-white/30 bg-white/10 text-white/30",
              ].join(" ")}
            >
              {won ? "🎾" : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
        function CompetitionSetCard({
          set,
          player1,
          player2,
          tournament,
          onOpen,
        }: {
          set: CompetitionSet;
          player1: CompetitionPlayer;
          player2: CompetitionPlayer;
          tournament: ReturnType<typeof getTournamentTheme>;
          onOpen: () => void;
        }) {
          const isFinished = set.status === "finished";
          
          const winnerOrder =
          isFinished &&
          set.player1Score !== null &&
          set.player2Score !== null
          ? set.player1Score >= set.player2Score
          ? 1
          : 2
          : null;
          
          return (
            <article
            className={[
              "rounded-2xl border p-5",
              tournament.border,
              "bg-black/35 backdrop-blur-sm",
            ].join(" ")}
            >
            <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
            <p
            className={[
              "text-xs font-black uppercase tracking-widest",
              tournament.accentText,
            ].join(" ")}
            >
            Set {set.roundNumber}
            </p>
            
            <p className="mt-1 text-sm font-bold text-slate-500">
            {set.playMode === "local" ? "Mode Local" : "Mode Salon"}
            </p>
            </div>
            
            <span
            className={[
              "rounded-full px-3 py-1 text-xs font-black uppercase",
              isFinished
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-300",
            ].join(" ")}
            >
            {isFinished ? "Terminé" : "En cours"}
            </span>
            </div>
            
            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
            <p
            className={[
              "truncate font-black",
              winnerOrder === 1 ? "text-emerald-300" : "text-white",
            ].join(" ")}
            >
            {player1.player_name}
            </p>
            
            <p className="mt-1 text-2xl font-black">
            {set.player1Score ?? "—"}
            </p>
            </div>
            
            <div className="text-sm font-black text-slate-600">
            VS
            </div>
            
            <div className="text-right">
            <p
            className={[
              "truncate font-black",
              winnerOrder === 2 ? "text-emerald-300" : "text-white",
            ].join(" ")}
            >
            {player2.player_name}
            </p>
            
            <p className="mt-1 text-2xl font-black">
            {set.player2Score ?? "—"}
            </p>
            </div>
            </div>
            
            <button
            type="button"
            onClick={onOpen}
            className={[
              "mt-5 w-full rounded-xl px-4 py-3 font-black transition",
              tournament.buttonBackground,
              tournament.buttonHover,
              tournament.buttonText,
            ].join(" ")}
            >
            {isFinished ? "Voir la feuille" : "Reprendre le set"}
            </button>
            </article>
          );
        }
        function ModeButton({
          title,
          subtitle,
          disabled,
          tournament,
          onClick,
        }: {
          title: string;
          subtitle: string;
          disabled: boolean;
          tournament: ReturnType<typeof getTournamentTheme>;
          onClick: () => void;
        }) {
          return (
            <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={[
              "rounded-2xl border bg-[#F4E9DC] p-4 text-left text-[#241812] transition",
              tournament.border,
              "enabled:hover:scale-[1.02] disabled:opacity-50",
            ].join(" ")}
            >
            <div
            className={[
              "text-lg font-black",
              tournament.accentDarkText,
            ].join(" ")}
            >
            {title}
            </div>
            
            <div className="mt-1 text-xs font-bold text-[#5B4636]">
            {subtitle}
            </div>
            </button>
          );
        }