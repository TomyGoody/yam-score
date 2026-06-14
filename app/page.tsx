"use client";

import { useEffect, useRef, useState } from "react";
import { columns, rows, YamRow } from "./lib/yamRules";
import Image from "next/image";
import { supabase } from "./lib/supabase";
type ScoreValue = number | "X" | null;
import { useRouter } from "next/navigation";
import GameScreen from "./components/GameScreen";
import Leaderboard from "./components/Leaderboard";
import PlayerSheet from "./components/PlayerSheet";

type Player = {
  id: string;
  name: string;
  playerOrder?: number;
};

type Scores = Record<string, Record<string, Record<YamRow, ScoreValue>>>;

type SelectedCell = {
  playerId: string;
  columnId: string;
  rowId: YamRow;
};
const STORAGE_KEY = "yam-score-save";
const PLAYER_COLORS = [
  {
    text: "text-cyan-300",
    border: "border-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    text: "text-emerald-300",
    border: "border-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    text: "text-amber-300",
    border: "border-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    text: "text-fuchsia-300",
    border: "border-fuchsia-500",
    bg: "bg-fuchsia-500/10",
  },
  {
    text: "text-orange-300",
    border: "border-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    text: "text-violet-300",
    border: "border-violet-500",
    bg: "bg-violet-500/10",
  },
];
export default function Home() {
	const router = useRouter();
  const [playerCount, setPlayerCount] = useState(2);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
const [editingName, setEditingName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [showNewGameWarning, setShowNewGameWarning] = useState(false);
  
  const [savedGameInfo, setSavedGameInfo] = useState<{
  playerCount: number;
  mode: string;
  remainingTurns: number;
} | null>(null);
const [partyMode, setPartyMode] = useState<"local" | "salon">("local");
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [gameMode, setGameMode] = useState<"6cols" | "3cols">("6cols");
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [scores, setScores] = useState<Scores>({});
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [lastScoreAnimation, setLastScoreAnimation] = useState<{
  playerId: string;
  columnId: string;
  rowId: string;
  value: number | "X";
} | null>(null);
const [salonCode, setSalonCode] = useState<string | null>(null);
const [isCreatingSalon, setIsCreatingSalon] = useState(false);
const [salonGameId, setSalonGameId] = useState<string | null>(null);
const [salonPlayers, setSalonPlayers] = useState<
  { id: string; name: string; player_order: number }[]
>([]);
  const [scoreInput, setScoreInput] = useState("");
  const [pendingCell, setPendingCell] = useState<SelectedCell | null>(null);
  const [fitToScreen, setFitToScreen] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const [fitOffsetX, setFitOffsetX] = useState(0);
const [hasSavedGame, setHasSavedGame] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const scoreOptions = selectedCell ? getScoreOptions(selectedCell.rowId) : [];
  const useSideLeaderboard = players.length <= 3;
  const activeColumns =
  gameMode === "6cols"
    ? columns
    : [columns[0], columns[2], columns[4]];
useEffect(() => {
  updateSavedGameInfo();
}, []);

function updateSavedGameInfo() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    setHasSavedGame(false);
    setSavedGameInfo(null);
    return;
  }

  const data = JSON.parse(saved);
  const savedPlayerCount = data.players?.length ?? 0;
  const columnCount = data.gameMode === "6cols" ? 6 : 3;
  const totalCells = savedPlayerCount * columnCount * 13;

  const filledCells = Object.values(data.scores ?? {})
    .flatMap((player: any) => Object.values(player))
    .flatMap((column: any) => Object.values(column))
    .filter((value) => value !== null).length;

  const remainingTurns = Math.ceil(
    (totalCells - filledCells) / savedPlayerCount
  );

  setHasSavedGame(true);
  setSavedGameInfo({
    playerCount: savedPlayerCount,
    mode: data.gameMode === "6cols" ? "6 colonnes" : "3 colonnes",
    remainingTurns,
  });
}
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
}, [fitToScreen, players.length, gameMode]);
  useEffect(() => {
  if (players.length === 0) return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      players,
      scores,
      gameMode,
    })
  );
}, [players, scores, gameMode]);
function handleSelectCell(cell: SelectedCell) {
  const currentValue = getScore(cell.playerId, cell.columnId, cell.rowId);

  if (
    currentValue === null &&
    cell.playerId !== currentPlayerId &&
    !gameFinished
  ) {
    setPendingCell(cell);
    return;
  }

  setSelectedCell(cell);
}
function generateSalonCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function createSalon() {
  setIsCreatingSalon(true);

  const code = generateSalonCode();

  const { data, error } = await supabase
  .from("yam_games")
  .insert({
    code,
    mode: gameMode,
    player_count: playerCount,
    status: "waiting",
	current_player_order: 1,
  })
  .select("id")
  .single();

  if (error) {
  console.error("SUPABASE ERROR", {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });

  alert(error.message);

  setIsCreatingSalon(false);
  return;
}

setIsCreatingSalon(false);
router.push(`/salon/${code}`);
}
async function loadSalonPlayers() {
  if (!salonGameId) return;

  const { data, error } = await supabase
    .from("yam_players")
    .select("id, name, player_order")
    .eq("game_id", salonGameId)
    .order("player_order", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  setSalonPlayers(data ?? []);
}
async function startSalonGame() {
  if (!salonGameId) return;

  const { data: playersData, error: playersError } = await supabase
    .from("yam_players")
    .select("id, name, player_order")
    .eq("game_id", salonGameId)
    .order("player_order", { ascending: true });

  if (playersError) {
    console.error("Erreur récupération joueurs", playersError);
    return;
  }

  const salonPlayersAsLocalPlayers = (playersData ?? []).map((player) => ({
  id: player.id,
  name: player.name,
  playerOrder: player.player_order,
}));

  setPlayers(salonPlayersAsLocalPlayers);
  setScores({});
  setSalonCode(null);
  setFitToScreen(false);
  setFitScale(1);

  const { error } = await supabase
    .from("yam_games")
    .update({
      status: "playing",
    })
    .eq("id", salonGameId);

  if (error) {
    console.error("Erreur démarrage salon", error);
  }
}
useEffect(() => {
  if (!salonGameId) return;

  loadSalonPlayers();

  const channel = supabase
    .channel(`yam_players_${salonGameId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "yam_players",
        filter: `game_id=eq.${salonGameId}`,
      },
      () => {
        loadSalonPlayers();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [salonGameId]);
useEffect(() => {
  if (!salonGameId) return;

  const channel = supabase
    .channel(`yam_scores_${salonGameId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "yam_scores",
        filter: `game_id=eq.${salonGameId}`,
      },
      (payload) => {
        const newScore = payload.new as {
          player_id: string;
          column_id: string;
          row_id: YamRow;
          value: string;
        };

        setScores((current) => ({
          ...current,
          [newScore.player_id]: {
            ...current[newScore.player_id],
            [newScore.column_id]: {
              ...current[newScore.player_id]?.[newScore.column_id],
              [newScore.row_id]:
                newScore.value === "X" ? "X" : Number(newScore.value),
            },
          },
        }));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [salonGameId]);
function newGameFromVictory() {
  localStorage.removeItem(STORAGE_KEY);

  setPlayers([]);
  setScores({});
  setSelectedCell(null);
  setScoreInput("");
  setShowVictoryModal(false);
  setHasSavedGame(false);
}
function startEditingPlayer(playerId: string, currentName: string) {
  setEditingPlayerId(playerId);
  setEditingName(currentName);
}
function resumeGame() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) return;

  const data = JSON.parse(saved);

  setPlayers(data.players ?? []);
  setScores(data.scores ?? {});
  setGameMode(data.gameMode ?? "6cols");
  setHasSavedGame(false);
}
function startFreshGame() {
  localStorage.removeItem(STORAGE_KEY);

  setPlayers([]);
  setScores({});
  setHasSavedGame(false);
}
function savePlayerName(playerId: string) {
  if (!editingName.trim()) return;

  setPlayers((current) =>
    current.map((player) =>
      player.id === playerId
        ? { ...player, name: editingName.trim() }
        : player
    )
  );

  setEditingPlayerId(null);
}
function getRemainingMoves(playerId: string) {
  return activeColumns.reduce((total, column) => {
    const remainingInColumn = rows.filter(
      (row) => getScore(playerId, column.id, row.id) === null
    ).length;

    return total + remainingInColumn;
  }, 0);
}

function countFigure(playerId: string, rowId: YamRow) {
  return activeColumns.reduce((total, column) => {
    const value = getScore(playerId, column.id, rowId);

    return value !== null && value !== "X" ? total + 1 : total;
  }, 0);
}
  function startGame() {
  const newPlayers = Array.from({ length: playerCount }, (_, index) => ({
    id: `player-${index + 1}`,
    name: `Joueur ${index + 1}`,
  }));

  setPlayers(newPlayers);
  setScores({});
  setHasSavedGame(false);
  setFitToScreen(false);
  setFitScale(1);
}
function handleStartGame() {
  if (partyMode === "salon") {
    createSalon();
    return;
  }

  if (hasSavedGame) {
    setShowNewGameWarning(true);
    return;
  }

  startGame();
}

  function quitGame() {
  setShowQuitModal(true);
}
function confirmQuitGame() {
  setPlayers([]);
  setSelectedCell(null);
  setScoreInput("");
  setFitToScreen(false);
  setFitScale(1);
  setShowQuitModal(false);
  setHasSavedGame(true);
  setTimeout(updateSavedGameInfo, 0);
}
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  function getScoreOptions(rowId: YamRow) {
    if (rowId === "plus" || rowId === "minus") {
      return Array.from({ length: 26 }, (_, index) => index + 5);
    }

    const optionsByRow: Partial<Record<YamRow, number[]>> = {
      aces: [1, 2, 3, 4, 5],
      twos: [2, 4, 6, 8, 10],
      threes: [3, 6, 9, 12, 15],
      fours: [4, 8, 12, 16, 20],
      fives: [5, 10, 15, 20, 25],
      sixes: [6, 12, 18, 24, 30],
      threeOfAKind: [20],
      fullHouse: [30],
      straight: [50],
      fourOfAKind: [40],
      yam: [60],
    };

    return optionsByRow[rowId] ?? [];
  }

  function isValidScoreForRow(rowId: YamRow, value: number) {
    return getScoreOptions(rowId).includes(value);
  }

  function saveScore(value: number | "X") {
    if (!selectedCell) return;

    const { playerId, columnId, rowId } = selectedCell;
    let finalValue: number | "X" = value;

    if (typeof value === "number" && (rowId === "plus" || rowId === "minus")) {
      const oppositeRowId = rowId === "plus" ? "minus" : "plus";
      const oppositeValue = getScore(playerId, columnId, oppositeRowId);

      if (typeof oppositeValue === "number") {
        if (rowId === "plus" && value <= oppositeValue) {
          finalValue = -50;
        }

        if (rowId === "minus" && value >= oppositeValue) {
          finalValue = -50;
        }
      }
    }

    setScores((current) => ({
      ...current,
      [playerId]: {
        ...current[playerId],
        [columnId]: {
          ...current[playerId]?.[columnId],
          [rowId]: finalValue,
        },
      },
    }));
setLastScoreAnimation({
  playerId,
  columnId,
  rowId,
  value,
});

setTimeout(() => {
  setLastScoreAnimation(null);
}, 800);
    closeModal();
  }

  function clearScore() {
    if (!selectedCell) return;

    const { playerId, columnId, rowId } = selectedCell;

    setScores((current) => ({
      ...current,
      [playerId]: {
        ...current[playerId],
        [columnId]: {
          ...current[playerId]?.[columnId],
          [rowId]: null,
        },
      },
    }));

    closeModal();
  }

  function closeModal() {
    setSelectedCell(null);
    setScoreInput("");
  }

  function getScore(playerId: string, columnId: string, rowId: YamRow) {
    return scores[playerId]?.[columnId]?.[rowId] ?? null;
  }

  function scoreToNumber(value: ScoreValue) {
    return typeof value === "number" ? value : 0;
  }

  function isCellFilled(playerId: string, columnId: string, rowId: YamRow) {
    return getScore(playerId, columnId, rowId) !== null;
  }

  function isCellPlayable(playerId: string, columnId: string, rowId: YamRow) {
    const column = activeColumns.find((item) => item.id === columnId);
    if (!column) return false;

    if (isCellFilled(playerId, columnId, rowId)) return true;

    const rowIndex = rows.findIndex((row) => row.id === rowId);
    if (rowIndex === -1) return false;

    if (column.type === "free") return true;

    if (column.type === "down") {
      return rows
        .slice(0, rowIndex)
        .every((row) => isCellFilled(playerId, column.id, row.id));
    }

    if (column.type === "up") {
      return rows
        .slice(rowIndex + 1)
        .every((row) => isCellFilled(playerId, column.id, row.id));
    }

    return false;
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
function getTotalPlayedMoves() {
  return players.reduce((total, player) => {
    return (
      total +
      activeColumns.reduce((playerTotal, column) => {
        return (
          playerTotal +
          rows.filter(
            (row) =>
              getScore(player.id, column.id, row.id) !== null
          ).length
        );
      }, 0)
    );
  }, 0);
}

function getCurrentPlayerId() {
  if (players.length === 0) return null;

  return players[
    getTotalPlayedMoves() % players.length
  ]?.id;
}
function isGameFinished() {
  return players.length > 0 && players.every((player) => getRemainingMoves(player.id) === 0);
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
const currentPlayerId = getCurrentPlayerId();
const gameFinished = isGameFinished();
useEffect(() => {
  if (gameFinished) {
    setShowVictoryModal(true);
  }
}, [gameFinished]);
  return (
    <main className="h-screen overflow-hidden bg-black text-white">
	
      {players.length === 0 ? (
        <StartScreen
  playerCount={playerCount}
  setPlayerCount={setPlayerCount}
  gameMode={gameMode}
  setGameMode={setGameMode}
  startGame={handleStartGame}
  hasSavedGame={hasSavedGame}
resumeGame={resumeGame}
partyMode={partyMode}
setPartyMode={setPartyMode}
/>
      ) : (
        <GameScreen
  fitToScreen={fitToScreen}
  setFitToScreen={setFitToScreen}
  toggleFullscreen={toggleFullscreen}
  quitGame={quitGame}
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
    startEditingPlayer,
    editingPlayerId,
    editingName,
    setEditingName,
    savePlayerName,
    setEditingPlayerId,
    activeColumns,
    currentPlayerId,
    gameFinished,
    lastScoreAnimation,
  }}
  LeaderboardComponent={Leaderboard}
  leaderboardProps={{
    players: getLeaderboard(),
    currentPlayerId,
    gameFinished,
  }}
  playerColors={PLAYER_COLORS}
/>      )}

      {selectedCell && (
        <ScoreModal
          scoreInput={scoreInput}
          setScoreInput={setScoreInput}
          scoreOptions={scoreOptions}
          selectedCell={selectedCell}
          saveScore={saveScore}
          clearScore={clearScore}
          closeModal={closeModal}
          isValidScoreForRow={isValidScoreForRow}
        />
      )}
	  {showVictoryModal && gameFinished && (
  <VictoryModal
    players={getLeaderboard()}
    onClose={() => setShowVictoryModal(false)}
    onNewGame={newGameFromVictory}
  />
)}
{showQuitModal && (
  <QuitModal
    onCancel={() => setShowQuitModal(false)}
    onConfirm={confirmQuitGame}
  />
)}
{pendingCell && (
  <WrongPlayerModal
    onCancel={() => setPendingCell(null)}
    onConfirm={() => {
      setSelectedCell(pendingCell);
      setPendingCell(null);
    }}
  />
)}
{showNewGameWarning && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
    <div className="w-full max-w-md rounded-3xl border border-amber-500 bg-black p-6 text-center shadow-2xl shadow-amber-500/20">
      <div className="text-4xl">⚠️</div>

      <h2 className="mt-3 text-2xl font-black text-white">
        Partie sauvegardée détectée
      </h2>

      <div className="mt-3 space-y-2 text-sm font-bold text-slate-400">
  <div>
    👥 {savedGameInfo?.playerCount} joueur{savedGameInfo?.playerCount! > 1 ? "s" : ""}
  </div>

  <div>
    🎲 {savedGameInfo?.mode}
  </div>

  <div>
    ⏳ {savedGameInfo?.remainingTurns} tour{savedGameInfo?.remainingTurns! > 1 ? "s" : ""} restant{savedGameInfo?.remainingTurns! > 1 ? "s" : ""}
  </div>

  <div className="pt-2 text-amber-300">
    Commencer une nouvelle partie écrasera cette sauvegarde.
  </div>
</div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowNewGameWarning(false)}
          className="rounded-xl bg-slate-800 px-4 py-3 font-black hover:bg-slate-700"
        >
          Annuler
        </button>

        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            setHasSavedGame(false);
            setShowNewGameWarning(false);
            startGame();
			setSavedGameInfo(null);
          }}
          className="rounded-xl bg-amber-500 px-4 py-3 font-black text-black hover:bg-amber-400"
        >
          Nouvelle partie
        </button>
		
      </div>
    </div>
  </div>
)}
    </main>
  );
}
function WrongPlayerModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md rounded-3xl border border-amber-500 bg-black p-6 text-center shadow-2xl shadow-amber-500/20">
        <div className="text-4xl">⚠️</div>

        <h2 className="mt-3 text-2xl font-black text-white">
          Ce n'est pas à ce joueur de jouer
        </h2>

        <p className="mt-3 text-sm font-bold text-slate-400">
          Tu veux quand même remplir cette case ?
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl bg-slate-800 px-4 py-3 font-black hover:bg-slate-700"
          >
            Annuler
          </button>

          <button
            onClick={onConfirm}
            className="rounded-xl bg-amber-500 px-4 py-3 font-black text-black hover:bg-amber-400"
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}
function QuitModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md rounded-3xl border border-rose-700 bg-black p-6 text-center shadow-2xl shadow-rose-900/30">
        <div className="text-4xl">⚠️</div>

        <h2 className="mt-3 text-2xl font-black text-white">
          Quitter la partie ?
        </h2>

        <p className="mt-3 text-sm font-bold text-slate-400">
          La partie sera sauvegardée et tu reviendras au menu principal.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl bg-slate-800 px-4 py-3 font-black hover:bg-slate-700"
          >
            Continuer
          </button>

          <button
            onClick={onConfirm}
            className="rounded-xl bg-rose-700 px-4 py-3 font-black text-white hover:bg-rose-600"
          >
            Quitter
          </button>
        </div>
      </div>
    </div>
  );
}
function StartScreen({
  playerCount,
  setPlayerCount,
  gameMode,
  setGameMode,
  startGame,
  hasSavedGame,
  resumeGame,
  partyMode,
setPartyMode,
}: {
  playerCount: number;
  setPlayerCount: (count: number) => void;
  gameMode: "6cols" | "3cols";
setGameMode: (mode: "6cols" | "3cols") => void;
  startGame: () => void;
  hasSavedGame: boolean;
resumeGame: () => void;
partyMode: "local" | "salon";
setPartyMode: (mode: "local" | "salon") => void;
}) {
	const router = useRouter();
  return (
    <section className="relative flex h-full items-center justify-center px-4 overflow-hidden">
	<div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
  <Image
    src="/favicon.png"
    alt=""
    width={1000}
    height={1000}
    className="select-none rotate-[-12deg]"
  />
</div>
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-black p-4 shadow-2xl">
	  
        <div className="mb-3 text-center">
		
          <h1 className="text-6xl font-black tracking-tight">
  Yam Score
</h1>
<div className="mt-2 text-cyan-400 font-black">
  🎲 Feuille de score numérique
</div>
          <p className="mt-3 text-slate-400">
            Une feuille de score simple pour vos parties de Yam.
          </p>
        </div>
		<label className="block text-sm font-bold text-slate-300">
  Mode de partie
</label>

<div className="mt-2 grid grid-cols-2 gap-2">
  <button
    type="button"
    onClick={() => setPartyMode("local")}
    className={[
      "rounded-xl border px-4 py-3 text-left font-black transition",
      partyMode === "local"
        ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
        : "border-slate-700 bg-black text-white hover:border-slate-500",
    ].join(" ")}
  >
    <div>Local</div>
    <div className="mt-1 text-xs font-bold text-slate-400">
      Une personne note tout
    </div>
  </button>

  <button
    type="button"
    onClick={() => setPartyMode("salon")}
    className={[
      "rounded-xl border px-4 py-3 text-left font-black transition",
      partyMode === "salon"
        ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
        : "border-slate-700 bg-black text-white hover:border-slate-500",
    ].join(" ")}
  >
    <div>Salon</div>
    <div className="mt-1 text-xs font-bold text-slate-400">
      Chacun note sur son téléphone
    </div>
  </button>
</div>

<div className="my-5 h-px bg-slate-800" />
<div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <label className="block text-sm font-bold text-slate-300">
          Nombre de joueurs
        </label>

        <div className="mt-2 grid grid-cols-3 gap-2">
  {[1, 2, 3, 4, 5, 6].map((count) => (
    <button
      key={count}
      type="button"
      onClick={() => setPlayerCount(count)}
      className={[
        "rounded-xl border px-4 py-3 font-black transition",
        playerCount === count
          ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
          : "border-slate-700 bg-black text-white hover:border-slate-500",
      ].join(" ")}
    >
      {count}
    </button>
  ))}
  
</div>

<div className="mt-6">
  <label className="mb-3 block text-lg font-bold">
    Mode de jeu
  </label>
</div>
  <div className="space-y-3">
    <button
      onClick={() => setGameMode("6cols")}
      className={`w-full rounded-lg border p-3 text-left ${
        gameMode === "6cols"
          ? "border-cyan-500 bg-cyan-500/10"
          : "border-slate-700"
      }`}
    >
      <div className="font-bold">
        6 Colonnes
      </div>

      <div className="text-sm text-slate-400">
        Descente ×2 • Libre ×2 • Montée ×2
      </div>
    </button>

    <button
      onClick={() => setGameMode("3cols")}
      className={`w-full rounded-lg border p-3 text-left ${
        gameMode === "3cols"
          ? "border-cyan-500 bg-cyan-500/10"
          : "border-slate-700"
      }`}
    >
      <div className="font-bold">
        3 Colonnes
      </div>

      <div className="text-sm text-slate-400">
        Descente • Libre • Montée
      </div>
    </button>
  </div>
</div>
<div className="mt-4 grid gap-3">
  {hasSavedGame && partyMode === "local" && (
  <button
    onClick={resumeGame}
    className="w-full rounded-xl bg-cyan-600 px-4 py-4 text-lg font-black hover:bg-cyan-500"
  >
    Reprendre la partie locale
  </button>
)}

  <div>
    <button
      onClick={startGame}
      className="w-full rounded-xl bg-cyan-600 px-4 py-4 text-lg font-black hover:bg-cyan-500 transition-colors"
    >
      Nouvelle Partie
    </button>

    
  </div>
  {partyMode === "salon" && (
  <p className="mt-3 text-center text-xs font-bold text-slate-500">
    Les parties salon sont sauvegardées en ligne. Pour reprendre une partie,
    il suffit de rouvrir le lien du salon.
  </p>
)}
</div>
      </div>
    </section>
  );
}

function GameToolbar({
  fitToScreen,
  setFitToScreen,
  toggleFullscreen,
  quitGame,
}: {
  fitToScreen: boolean;
  setFitToScreen: (value: (current: boolean) => boolean) => void;
  toggleFullscreen: () => void;
  quitGame: () => void;
}) {
  return (
    <div className="flex h-12 items-center justify-between border-b border-slate-800 bg-black px-3">
      <div className="text-xs font-black uppercase text-white">
        {fitToScreen ? "Affichage adapté" : "Affichage normal"}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFitToScreen((current) => !current)}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-black hover:bg-slate-700"
        >
          {fitToScreen ? "Taille normale" : "Adapter à l'écran"}
        </button>

        <button
          onClick={toggleFullscreen}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-black hover:bg-slate-700"
        >
          Plein écran
        </button>

        <button
          onClick={quitGame}
          className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-black hover:bg-rose-600"
        >
          Quitter
        </button>
      </div>
    </div>
  );
}




function ScoreModal({
  scoreInput,
  setScoreInput,
  scoreOptions,
  selectedCell,
  saveScore,
  clearScore,
  closeModal,
  isValidScoreForRow,
}: {
  scoreInput: string;
  setScoreInput: (value: string) => void;
  scoreOptions: number[];
  selectedCell: SelectedCell;
  saveScore: (value: number | "X") => void;
  clearScore: () => void;
  closeModal: () => void;
  isValidScoreForRow: (rowId: YamRow, value: number) => boolean;
}) {
  const isPlusMinus =
    selectedCell.rowId === "plus" || selectedCell.rowId === "minus";
const [errorMessage, setErrorMessage] = useState("");
  const modalOptions: Array<number | "X"> = [...scoreOptions, "X"];
  const currentColumn = columns.find(
  (column) => column.id === selectedCell.columnId
);

const currentRow = rows.find(
  (row) => row.id === selectedCell.rowId
);

const columnLabel =
  currentColumn?.type === "down"
    ? "Descente"
    : currentColumn?.type === "free"
    ? "Libre"
    : "Montée";
function validateManualScore() {
  const value = Number(scoreInput);

  if (Number.isNaN(value)) return;

  if (!isValidScoreForRow(selectedCell.rowId, value)) {
    setErrorMessage("Score impossible pour cette case.");
    return;
  }

  saveScore(value);
}
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
      <div
        className={[
          "rounded-2xl border border-slate-700 bg-black p-6 shadow-2xl",
          isPlusMinus ? "w-[520px]" : "w-96",
        ].join(" ")}
      >
        <div className="mb-5 text-center">
  <div className="text-xs font-black uppercase tracking-wider text-slate-400">
    {columnLabel}
  </div>

  <h3 className="mt-1 text-2xl font-black text-white">
    {currentRow?.label}
  </h3>

  <div className="mt-1 text-sm font-bold text-slate-500">
    Entrer un score
  </div>
</div>

        {modalOptions.length > 0 && (
          <div
  className={[
    "mb-5 grid gap-3",
    isPlusMinus ? "grid-cols-5" : "grid-cols-3",
  ].join(" ")}
>
            {modalOptions.map((option) => (
              <button
                key={option}
                onClick={() =>
                  option === "X" ? saveScore("X") : saveScore(option)
                }
                className={[
                  "min-h-14 rounded-xl px-4 py-3 text-xl font-black transition-colors",
                  option === "X"
                    ? "bg-rose-700 text-white hover:bg-rose-600"
                    : "bg-slate-100 text-slate-950 hover:bg-cyan-100",
                ].join(" ")}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        <input
		onKeyDown={(event) => {
  if (event.key === "Enter") {
    validateManualScore();
  }
}}
          type="number"
          value={scoreInput}
          onChange={(event) => {
  setScoreInput(event.target.value);
  setErrorMessage("");
}}
          className="w-full rounded-xl border border-slate-700 bg-black p-3 text-center text-2xl"
          placeholder="Score manuel"
          autoFocus
        />
{errorMessage && (
  <div className="mt-3 rounded-xl border border-rose-700 bg-rose-700/10 px-3 py-2 text-center text-sm font-black text-rose-300">
    {errorMessage}
  </div>
)}
        <div className="mt-4 grid gap-2">
          <button
  onClick={validateManualScore}
  className="rounded-xl bg-indigo-600 py-3 font-bold hover:bg-indigo-500"
>
  ✓ Valider
</button>

          <button
            onClick={clearScore}
            className="rounded-xl bg-slate-700 py-3 font-bold hover:bg-slate-600"
          >
            🗑️ Effacer
          </button>

          <button
            onClick={closeModal}
            className="rounded-xl bg-slate-800 py-3 font-bold hover:bg-slate-700"
          >
            ✘ Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
function VictoryModal({
  players,
  onClose,
  onNewGame,
}: {
  players: Array<
    Player & {
      total: number;
      rank: number;
      gap: number;
      remainingMoves: number;
      straights: number;
      fourOfAKinds: number;
      yams: number;
    }
  >;
  onClose: () => void;
  onNewGame: () => void;
}) {
  const winner = players[0];
  const runnerUp = players[1];
const winningGap = runnerUp ? winner.total - runnerUp.total : 0;

  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-yellow-400 bg-black p-8 text-center shadow-2xl shadow-yellow-400/20">
        <div className="text-5xl">🏆</div>

        <h2 className="mt-3 text-3xl font-black uppercase text-yellow-300">
          Victoire
        </h2>

        

        <div className="mt-1 text-5xl font-black text-white">
          {winner.name}
        </div>

        <div className="mt-2 text-7xl font-black text-yellow-300">
          {winner.total}
        </div>

        <div className="mt-1 text-sm font-bold text-slate-400">
          points
        </div>

        <div className="mt-8 grid gap-2">
          {players.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-black"
            >
              <span>
                {player.rank === 1 && "🥇 "}
                {player.rank === 2 && "🥈 "}
                {player.rank === 3 && "🥉 "}
                #{player.rank} {player.name}
              </span>

              <span className="text-yellow-300">
                {player.total}
              </span>
            </div>
          ))}
        </div>
{runnerUp && (
  <div className="mt-3 text-lg font-black text-emerald-400">
    +{winningGap} points d'avance
  </div>
)}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-3 font-black hover:bg-slate-700"
          >
            Fermer
          </button>

          <button
            onClick={onNewGame}
            className="rounded-xl bg-yellow-500 px-4 py-3 font-black text-black hover:bg-yellow-400"
          >
            Nouvelle partie
          </button>
        </div>
      </div>
    </div>
  );
}
