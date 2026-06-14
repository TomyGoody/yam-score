"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import GameScreen from "@/app/components/GameScreen";

import PlayerSheet from "@/app/components/PlayerSheet";
import Leaderboard from "@/app/components/Leaderboard";
import { columns, rows, YamRow } from "@/app/lib/yamRules";

type Player = {
  id: string;
  name: string;
  player_order: number;
};
type ScoreValue = number | "X" | null;

type Scores = Record<string, Record<string, Record<YamRow, ScoreValue>>>;

type SelectedCell = {
  playerId: string;
  columnId: string;
  rowId: YamRow;
};

const PLAYER_COLORS = [
  { text: "text-cyan-300", border: "border-cyan-500", bg: "bg-cyan-500/10" },
  { text: "text-emerald-300", border: "border-emerald-500", bg: "bg-emerald-500/10" },
  { text: "text-amber-300", border: "border-amber-500", bg: "bg-amber-500/10" },
  { text: "text-fuchsia-300", border: "border-fuchsia-500", bg: "bg-fuchsia-500/10" },
  { text: "text-orange-300", border: "border-orange-500", bg: "bg-orange-500/10" },
  { text: "text-violet-300", border: "border-violet-500", bg: "bg-violet-500/10" },
];

export default function SalonAdminPage() {
	const [scores, setScores] = useState<Scores>({});
const [gameMode, setGameMode] = useState<"6cols" | "3cols">("6cols");
const [showQuitModal, setShowQuitModal] = useState(false);
const [fitToScreen, setFitToScreen] = useState(false);
const [fitScale, setFitScale] = useState(1);
const [fitOffsetX, setFitOffsetX] = useState(0);
const [currentPlayerOrder, setCurrentPlayerOrder] = useState(1);
const viewportRef = useRef<HTMLDivElement | null>(null);
const [showFinalModal, setShowFinalModal] = useState(true);
const sheetRef = useRef<HTMLDivElement | null>(null);
  const params = useParams();
  const router = useRouter();

  const code = String(params.code).toUpperCase();

  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [status, setStatus] = useState<"waiting" | "playing" | "finished">("waiting");
  const [message, setMessage] = useState("");

  // 1. LOAD SALON
  async function loadSalon() {
    const { data, error } = await supabase
      .from("yam_games")
      .select("id, player_count, status, mode, current_player_order")
      .eq("code", code)
      .single();

    if (error || !data) {
      setMessage("Salon introuvable");
      return;
    }

    setGameId(data.id);
    setPlayerCount(data.player_count);
	setGameMode(data.mode);
	setStatus(data.status);
	setCurrentPlayerOrder(data.current_player_order ?? 1);
  }

  // 2. LOAD PLAYERS
  async function loadPlayers(id: string) {
    const { data } = await supabase
      .from("yam_players")
      .select("*")
      .eq("game_id", id)
      .order("player_order");

    setPlayers(
  (data ?? []).map((player) => ({
    id: player.id,
    name: player.name,
    playerOrder: player.player_order,
    player_order: player.player_order,
  }))
);
  }
async function loadScores(id: string) {
  const { data, error } = await supabase
    .from("yam_scores")
    .select("player_id, column_id, row_id, value")
    .eq("game_id", id);

  if (error) {
    console.error(error);
    return;
  }

  const nextScores: Scores = {};

  (data ?? []).forEach((score) => {
    const value =
      score.value === "X" ? "X" : Number(score.value);

    nextScores[score.player_id] = {
      ...nextScores[score.player_id],
      [score.column_id]: {
        ...nextScores[score.player_id]?.[score.column_id],
        [score.row_id as YamRow]: value,
      },
    };
  });

  setScores(nextScores);
}
  // 3. START GAME
  async function startGame() {
    if (!gameId) return;

    const { error } = await supabase
      .from("yam_games")
      .update({ status: "playing" })
      .eq("id", gameId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setStatus("playing");
  }

  // INIT
  useEffect(() => {
    loadSalon();
  }, []);

 useEffect(() => {
  if (!gameId) return;
  loadPlayers(gameId);
  loadScores(gameId);
}, [gameId]);
useEffect(() => {
  function updateLayout() {
    const viewport = viewportRef.current;
    const sheet = sheetRef.current;

    if (!viewport || !sheet) return;

    const contentWidth = sheet.scrollWidth;
    const contentHeight = sheet.scrollHeight;

    let nextScale = 1;

    if (fitToScreen) {
      const safePadding = 24;
      const scaleX = (viewport.clientWidth - safePadding) / contentWidth;
      const scaleY = (viewport.clientHeight - safePadding) / contentHeight;

      nextScale = Math.min(scaleX, scaleY);
    }

    const scaledWidth = contentWidth * nextScale;
    const nextOffsetX = Math.max(
      0,
      (viewport.clientWidth - scaledWidth) / 2
    );

    setFitScale(nextScale);
    setFitOffsetX(nextOffsetX);
  }

  const frame = requestAnimationFrame(updateLayout);
  window.addEventListener("resize", updateLayout);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", updateLayout);
  };
}, [fitToScreen, players.length, gameMode, scores]);
useEffect(() => {
  if (!gameId) return;

  const channel = supabase
    .channel(`salon_scores_${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "yam_scores",
        filter: `game_id=eq.${gameId}`,
      },
      () => {
        loadScores(gameId);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [gameId]);
useEffect(() => {
  if (!gameId) return;

  const channel = supabase
    .channel(`salon_players_${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "yam_players",
        filter: `game_id=eq.${gameId}`,
      },
      () => {
        loadPlayers(gameId);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [gameId]);
useEffect(() => {
  if (!gameId) return;

  const channel = supabase
    .channel(`salon_game_${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "yam_games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        setStatus(payload.new.status ?? "waiting");
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [gameId]);
const activeColumns =
  gameMode === "6cols"
    ? columns
    : [columns[0], columns[2], columns[4]];

const useSideLeaderboard = players.length <= 3;

function getScore(playerId: string, columnId: string, rowId: YamRow) {
  return scores[playerId]?.[columnId]?.[rowId] ?? null;
}

function scoreToNumber(value: ScoreValue) {
  return typeof value === "number" ? value : 0;
}

function getTopTotal(playerId: string, columnId: string) {
  return rows
    .slice(0, 6)
    .reduce(
      (total, row) =>
        total + scoreToNumber(getScore(playerId, columnId, row.id)),
      0
    );
}

function getBonus(playerId: string, columnId: string) {
  return getTopTotal(playerId, columnId) >= 60 ? 30 : 0;
}

function getBottomTotal(playerId: string, columnId: string) {
  return rows
    .slice(6)
    .reduce(
      (total, row) =>
        total + scoreToNumber(getScore(playerId, columnId, row.id)),
      0
    );
}

function getGrandTotal(playerId: string, columnId: string) {
  return (
    getTopTotal(playerId, columnId) +
    getBonus(playerId, columnId) +
    getBottomTotal(playerId, columnId)
  );
}

function getPlayerTotal(playerId: string) {
  return activeColumns.reduce(
    (total, column) => total + getGrandTotal(playerId, column.id),
    0
  );
}

function getRemainingMoves(playerId: string) {
  return activeColumns.reduce((total, column) => {
    return (
      total +
      rows.filter((row) => getScore(playerId, column.id, row.id) === null)
        .length
    );
  }, 0);
}

function countFigure(playerId: string, rowId: YamRow) {
  return activeColumns.reduce((total, column) => {
    const value = getScore(playerId, column.id, rowId);
    return value !== null && value !== "X" ? total + 1 : total;
  }, 0);
}

function getLeaderboard() {
  const totals = players.map((player) => ({
    ...player,
    total: getPlayerTotal(player.id),
  }));

  const sorted = [...totals].sort((a, b) => b.total - a.total);
  const leaderTotal = sorted[0]?.total ?? 0;

  return sorted.map((player, index) => ({
    ...player,
    rank: index + 1,
    gap: leaderTotal - player.total,
    remainingMoves: getRemainingMoves(player.id),
    straights: countFigure(player.id, "straight"),
    fourOfAKinds: countFigure(player.id, "fourOfAKind"),
    yams: countFigure(player.id, "yam"),
  }));
}

function isCellPlayable() {
  return false;
}

function handleSelectCell() {
  return;
}

function noop() {
  return;
}
function quitSalon() {
  setShowQuitModal(true);
}
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}
async function undoLastMove() {
  if (!gameId) return;

  const { data: lastScore, error: scoreError } = await supabase
    .from("yam_scores")
    .select("id, player_id")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (scoreError || !lastScore) {
  console.error("UNDO SCORE ERROR", scoreError);
  alert(scoreError?.message ?? "Aucun coup à annuler.");
  return;
}

  const player = players.find((item) => item.id === lastScore.player_id);

  if (!player) {
    setMessage("Joueur introuvable pour ce coup.");
    return;
  }

  const { error: deleteError } = await supabase
    .from("yam_scores")
    .delete()
    .eq("id", lastScore.id);

  if (deleteError) {
  console.error("DELETE ERROR", deleteError);
  alert(deleteError.message);
  return;
}

  const { error: updateError } = await supabase
    .from("yam_games")
    .update({
  current_player_order: player.player_order,
  updated_at: new Date().toISOString(),
})
    .eq("id", gameId);

  if (updateError) {
  console.error("UPDATE ERROR", updateError);
  alert(updateError.message);
  return;
}

  await loadScores(gameId);
  setCurrentPlayerOrder(player.player_order);
  setMessage("Dernier coup annulé.");
}
const gameFinished =
  players.length > 0 &&
  players.every((player) => getRemainingMoves(player.id) === 0);
  useEffect(() => {
  async function finishGame() {
    if (!gameId || status !== "playing" || !gameFinished) return;

    await supabase
      .from("yam_games")
      .update({ status: "finished" })
      .eq("id", gameId);

    setStatus("finished");
  }

  finishGame();
}, [gameId, status, gameFinished]);
if (status === "playing" || status === "finished") {
  return (
    <main className="h-screen overflow-hidden bg-black text-white">
	<div className="absolute right-3 top-14 z-40">
  <button
    onClick={undoLastMove}
    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-black text-black hover:bg-amber-500"
  >
    Annuler le dernier coup
  </button>
</div>
      <GameScreen
        fitToScreen={fitToScreen}
        setFitToScreen={setFitToScreen}
        toggleFullscreen={toggleFullscreen}
        quitGame={quitSalon}
        useSideLeaderboard={useSideLeaderboard}
        viewportRef={viewportRef}
        sheetRef={sheetRef}
        fitOffsetX={fitOffsetX}
        fitScale={fitScale}
        players={players}
        PlayerSheetComponent={PlayerSheet}
        playerSheetProps={{
          getScore,
          getTopTotal,
          getBonus,
          getBottomTotal,
          getGrandTotal,
          getPlayerTotal,
          isCellPlayable,
          onSelectCell: handleSelectCell,
          startEditingPlayer: noop,
          editingPlayerId: null,
          editingName: "",
          setEditingName: noop,
          savePlayerName: noop,
          setEditingPlayerId: noop,
          activeColumns,
          currentPlayerId:
  players.find((player) => player.player_order === currentPlayerOrder)?.id ??
  null,
          gameFinished,
          lastScoreAnimation: null,
        }}
        LeaderboardComponent={Leaderboard}
        leaderboardProps={{
          players: getLeaderboard(),
          
          gameFinished,
		  currentPlayerId:
  players.find((player) => player.player_order === currentPlayerOrder)?.id ??
  null,
        }}
        playerColors={PLAYER_COLORS}
      />
	  
     {showQuitModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
        <div className="w-full max-w-md rounded-3xl border border-rose-700 bg-black p-6 text-center shadow-2xl shadow-rose-900/30">
          <div className="text-4xl">⚠️</div>

          <h2 className="mt-3 text-2xl font-black text-white">
            Quitter le salon ?
          </h2>

          <p className="mt-3 text-sm font-bold text-slate-400">
            La partie restera accessible avec le même code salon.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowQuitModal(false)}
              className="rounded-xl bg-slate-800 px-4 py-3 font-black hover:bg-slate-700"
            >
              Annuler
            </button>

            <button
              onClick={() => router.push("/")}
              className="rounded-xl bg-rose-700 px-4 py-3 font-black text-white hover:bg-rose-600"
            >
              Quitter
            </button>
          </div>
        </div>
      </div>
    )}
	{status === "finished" && showFinalModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
    <div className="w-full max-w-xl rounded-3xl border border-yellow-500 bg-black p-8 text-center shadow-2xl shadow-yellow-500/20">
      <div className="text-6xl">🏆</div>

      <h2 className="mt-4 text-3xl font-black text-yellow-300">
        Partie terminée
      </h2>

      <p className="mt-2 text-sm font-bold text-slate-400">
        Classement final
      </p>

      <div className="mt-6 grid gap-3">
        {getLeaderboard().map((player) => (
          <div
            key={player.id}
            className={[
              "flex items-center justify-between rounded-2xl border bg-slate-950 px-5 py-4 font-black",
              player.rank === 1
                ? "border-yellow-500 text-yellow-300"
                : "border-slate-800 text-white",
            ].join(" ")}
          >
            <div className="text-left">
              <div className="text-lg">
                {player.rank === 1
                  ? "🥇"
                  : player.rank === 2
                  ? "🥈"
                  : player.rank === 3
                  ? "🥉"
                  : `#${player.rank}`}{" "}
                {player.name}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Joueur {player.player_order}
              </div>
            </div>

            <div className="text-2xl">
              {player.total}
            </div>
          </div>
        ))}
		<div className="mt-6 grid grid-cols-2 gap-3">
  <button
    onClick={() => router.push("/")}
    className="rounded-xl bg-slate-800 px-4 py-3 font-black hover:bg-slate-700"
  >
    Retour accueil
  </button>

  <button
  onClick={() => setShowFinalModal(false)}
  className="rounded-xl bg-yellow-500 px-4 py-3 font-black text-black hover:bg-yellow-400"
>
  Voir la grille
</button>
</div>
      </div>
    </div>
  </div>
  
)}
  </main>
);
}
  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-lg text-center">
        
        <h1 className="text-3xl font-black text-cyan-300">
          Salon {code}
        </h1>

        <p className="mt-2 text-slate-400">
          {players.length} / {playerCount} joueurs
        </p>

        {/* PLAYERS */}
        <div className="mt-6 space-y-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-cyan-500 bg-cyan-500/10 p-3 font-black"
            >
              #{p.player_order} {p.name}
            </div>
          ))}
        </div>

        {/* START */}
        <button
          onClick={startGame}
          disabled={players.length !== playerCount}
          className={[
            "mt-6 w-full rounded-xl p-4 font-black transition",
            players.length === playerCount
              ? "bg-cyan-600 hover:bg-cyan-500"
              : "bg-slate-800 text-slate-500 cursor-not-allowed",
          ].join(" ")}
        >
          Démarrer la partie
        </button>

        {message && (
          <p className="mt-4 text-amber-300 font-bold">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}