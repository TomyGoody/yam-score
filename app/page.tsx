"use client";

import { useEffect, useRef, useState } from "react";
import { columns, rows, YamRow } from "./lib/yamRules";
import { Pencil } from "lucide-react";
import Image from "next/image";
type ScoreValue = number | "X" | null;

type Player = {
  id: string;
  name: string;
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
  const [playerCount, setPlayerCount] = useState(2);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
const [editingName, setEditingName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
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
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    setHasSavedGame(true);
  }
}, []);
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

  function quitGame() {
  setShowQuitModal(true);
}
function confirmQuitGame() {
  localStorage.removeItem(STORAGE_KEY);

  setPlayers([]);
  setScores({});
  setSelectedCell(null);
  setScoreInput("");
  setFitToScreen(false);
  setFitScale(1);
  setShowQuitModal(false);
  setHasSavedGame(false);
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
  startGame={startGame}
  hasSavedGame={hasSavedGame}
resumeGame={resumeGame}
/>
      ) : (
        <section className="relative flex h-full flex-col overflow-hidden">
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
  <Image
    src="/favicon.png"
    alt=""
    width={1000}
    height={1000}
    className="select-none rotate-[-12deg]"
  />
</div>
          <GameToolbar
            fitToScreen={fitToScreen}
            setFitToScreen={setFitToScreen}
            toggleFullscreen={toggleFullscreen}
            quitGame={quitGame}
          />

          <div
  className={[
    "relative z-10 flex flex-1 gap-3 p-3",
    useSideLeaderboard ? "flex-row" : "flex-col",
  ].join(" ")}
>
  <div
    ref={viewportRef}
    className={[
      "flex-1",
      fitToScreen
        ? "overflow-hidden"
        : "overflow-x-auto overflow-y-hidden",
    ].join(" ")}
  >
    <div
  ref={sheetRef}
  style={{
    transform: `translateX(${fitOffsetX}px) scale(${fitScale})`,
    transformOrigin: "top left",
  }}
  className="flex w-max items-start gap-3"
>
                {players.map((player) => (
                  <PlayerSheet
  key={player.id}
  player={player}
  getScore={getScore}
  getTopTotal={getTopTotal}
  getBonus={getBonus}
  getBottomTotal={getBottomTotal}
  getGrandTotal={getGrandTotal}
  getPlayerTotal={getPlayerTotal}
  isCellPlayable={isCellPlayable}
  onSelectCell={handleSelectCell}
  startEditingPlayer={startEditingPlayer}
  editingPlayerId={editingPlayerId}
editingName={editingName}
setEditingName={setEditingName}
savePlayerName={savePlayerName}
setEditingPlayerId={setEditingPlayerId}
activeColumns={activeColumns}
currentPlayerId={currentPlayerId}
gameFinished={gameFinished}
lastScoreAnimation={lastScoreAnimation}
/>
                ))}
              </div>
            </div>

            <Leaderboard
  players={getLeaderboard()}
  layout={useSideLeaderboard ? "side" : "bottom"}
  currentPlayerId={currentPlayerId}
  gameFinished={gameFinished}
/>
          </div>
        </section>
      )}

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
          Les scores actuels seront effacés.
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
}: {
  playerCount: number;
  setPlayerCount: (count: number) => void;
  gameMode: "6cols" | "3cols";
setGameMode: (mode: "6cols" | "3cols") => void;
  startGame: () => void;
  hasSavedGame: boolean;
resumeGame: () => void;
}) {
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
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-black p-8 shadow-2xl">
	  
        <div className="mb-8 text-center">
		
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
<p className="mt-2 text-sm text-slate-400">
  {playerCount} joueur{playerCount > 1 ? "s" : ""} sélectionné
</p>
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
{hasSavedGame && (
  <button
    onClick={resumeGame}
    className="
mt-4
w-full
rounded-xl
bg-cyan-600
px-4
py-4
text-lg
font-black
hover:bg-cyan-500
"
  >
    Reprendre la partie
  </button>
)}
        <button
          onClick={startGame}
          className="
mt-3
w-full
rounded-xl
bg-cyan-600
px-4
py-4
text-lg
font-black
hover:bg-cyan-500
transition-colors
"
        >
          🎲 Commencer la partie
        </button>
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

function Leaderboard({
  players,
  layout,
  currentPlayerId,
  gameFinished,
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
  layout: "side" | "bottom";
  currentPlayerId: string | null;
  gameFinished: boolean;
}) {
  if (players.length === 0) return null;
function getPlayerColor(playerId: string) {
  const index =
    Number(playerId.replace("player-", "")) - 1;

  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
  return (
    <aside
      className={[
        "rounded-xl border border-slate-800 bg-black p-3",
        layout === "side"
  ? "w-56 shrink-0"
  : "w-full shrink-0",
      ].join(" ")}
    >
      <h3 className="mb-3 text-sm font-black uppercase text-white">
  {gameFinished ? "🏆 Partie terminée" : "Classement"}
</h3>

      <div
  className={[
    "gap-2",
    layout === "side"
      ? "grid"
      : "flex flex-wrap justify-center",
  ].join(" ")}
>
        {players.map((player) => {
  const color = getPlayerColor(player.id);

  return (
    <div
      key={player.id}
      className={[
  `shrink-0 rounded-xl border-2 ${color.border} ${color.bg} p-3 font-black`,
        layout === "side" ? "w-full" : "min-w-56",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className={`text-lg ${color.text}`}>
          #{player.rank}
        </span>

        {player.gap > 0 && (
          <span className="rounded bg-rose-700 px-2 py-1 text-sm text-white">
            -{player.gap}
          </span>
        )}
      </div>
<div className={`mt-1 text-4xl font-black ${color.text}`}>
        {player.total}
      </div>
      <div className="mt-2 text-xl text-white">
        {player.name}
      </div>
	  {!gameFinished && player.id === currentPlayerId && (
  <div className="mt-1 text-xs font-black text-emerald-400">
    ▶ Ton tour
  </div>
)}
<div className="mt-2 text-sm text-slate-300">
  {player.remainingMoves} coup{player.remainingMoves > 1 ? "s" : ""} restant
  {player.remainingMoves > 1 ? "s" : ""}
</div>

<div className="mt-2 flex gap-2 text-xs font-black">
  <span>Quinte {player.straights}</span>
  <span>Carré {player.fourOfAKinds}</span>
  <span>Yam {player.yams}</span>
</div>
      
    </div>
  );
})}
      </div>
    </aside>
  );
}

function PlayerSheet({
  player,
  getScore,
  getTopTotal,
  getBonus,
  getBottomTotal,
  getGrandTotal,
  startEditingPlayer,
  getPlayerTotal,
  isCellPlayable,
  onSelectCell,
  editingPlayerId,
editingName,
setEditingName,
savePlayerName,
setEditingPlayerId,
activeColumns,
currentPlayerId,
gameFinished,
lastScoreAnimation,
}: {
  player: Player;
  getScore: (playerId: string, columnId: string, rowId: YamRow) => ScoreValue;
  getTopTotal: (playerId: string, columnId: string) => number;
  getBonus: (playerId: string, columnId: string) => number;
  getBottomTotal: (playerId: string, columnId: string) => number;
  getGrandTotal: (playerId: string, columnId: string) => number;
  getPlayerTotal: (playerId: string) => number;
  currentPlayerId: string | null;
gameFinished: boolean;
  isCellPlayable: (playerId: string, columnId: string, rowId: YamRow) => boolean;
  onSelectCell: (cell: SelectedCell) => void;
  startEditingPlayer: (
  playerId: string,
  currentName: string
) => void;
editingPlayerId: string | null;
editingName: string;
setEditingName: (value: string) => void;
savePlayerName: (playerId: string) => void;
setEditingPlayerId: (value: string | null) => void;
activeColumns: typeof columns;
lastScoreAnimation: {
  playerId: string;
  columnId: string;
  rowId: string;
  value: number | "X";
} | null;
}) {
  const bottomRows = rows.slice(6);
const playerIndex =
  Number(player.id.replace("player-", "")) - 1;

const color =
  PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
  const isCurrentPlayer =
  player.id === currentPlayerId;
  return (
    <div
  className={`shrink-0 rounded-xl border-2 ${color.border} bg-black p-4`}
>
     <div className="relative mb-1 text-center">
  <div className="flex items-center justify-center gap-2">
    {editingPlayerId === player.id ? (
      <input
        autoFocus
        value={editingName}
        onChange={(e) => setEditingName(e.target.value)}
        onBlur={() => savePlayerName(player.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            savePlayerName(player.id);
          }

          if (e.key === "Escape") {
            setEditingPlayerId(null);
          }
        }}
        className="
          w-40
          rounded-md
          border
          border-slate-700
          bg-slate-900
          px-2
          py-1
          text-center
          font-black
          text-white
        "
      />
    ) : (
      <>
        <h2 className="text-xl font-black text-white">
          {player.name}
        </h2>

        <button
          onClick={() =>
            startEditingPlayer(player.id, player.name)
          }
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Renommer"
        >
          <Pencil size={14} />
        </button>
      </>
    )}
  </div>

  <div className={`text-3xl font-black ${color.text}`}>
    {getPlayerTotal(player.id)}
  </div>
  {lastScoreAnimation?.playerId === player.id && (
  <div className={`pointer-events-none absolute left-1/2 top-12 -translate-x-1/2 text-lg font-black animate-score-pop ${color.text}`}>
    {lastScoreAnimation.value === "X"
  ? "✕"
  : `+${lastScoreAnimation.value}`}
  </div>
)}
  <div className="h-5 mt-1">
  {isCurrentPlayer && !gameFinished && (
    <div
      className={`text-xs font-black uppercase tracking-wider animate-pulse ${color.text}`}
    >
      ▶ Ton tour
    </div>
  )}
</div>
</div>

      <table className="border-collapse text-center text-sm">
        <thead>
          <tr>
            <th className="w-16"></th>
            {activeColumns.map((column, columnIndex) => (
              <th
                key={column.id}
                className="h-6 w-10 text-xl font-black text-slate-100"
              >
                {column.type === "down" && "↓"}
                {column.type === "free" && "L"}
                {column.type === "up" && "↑"}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.slice(0, 6).map((row, rowIndex) => (
            <tr key={row.id}>
              <RowLabel label={row.label} />

              {activeColumns.map((column, columnIndex) => (
                <ScoreCell
                  key={`${column.id}-${row.id}`}
                  playerId={player.id}
                  columnId={column.id}
                  rowId={row.id}
                  rowIndex={rowIndex}
				  lastScoreAnimation={lastScoreAnimation}
                  section="top"
                  value={getScore(player.id, column.id, row.id)}
                  playable={isCellPlayable(player.id, column.id, row.id)}
                  onSelectCell={onSelectCell}
				  blockStart={
  columnIndex > 0 &&
  activeColumns[columnIndex - 1].type !== column.type
}
                />
              ))}
            </tr>
          ))}

          <TotalRow
            label="Total"
            cells={activeColumns.map((column, columnIndex) => getTopTotal(player.id, column.id))}
            labelClassName="bg-slate-700 text-white"
			activeColumns={activeColumns}
            cellClassName="bg-slate-200 text-rose-700"
          />

          <TotalRow
            label="Bonus"
            cells={activeColumns.map((column, columnIndex) => getBonus(player.id, column.id))}
            labelClassName="bg-cyan-700 text-white"
			activeColumns={activeColumns}
            cellClassName="bg-cyan-100 text-slate-950"
          />

          <TotalRow
            label="Total"
            cells={activeColumns.map(
              (column) =>
                getTopTotal(player.id, column.id) +
                getBonus(player.id, column.id)
            )}
            labelClassName="bg-slate-700 text-white"
            cellClassName="bg-slate-200 text-rose-700"
			activeColumns={activeColumns}
          />

          <tr>
            <td colSpan={activeColumns.length + 1} className="h-3 bg-black"></td>
          </tr>

          {bottomRows.map((row, rowIndex) => (
            <FragmentRow
              key={row.id}
              row={row}
              rowIndex={rowIndex}
              player={player}
              getScore={getScore}
              isCellPlayable={isCellPlayable}
              onSelectCell={onSelectCell}
			  activeColumns={activeColumns}
			  lastScoreAnimation={lastScoreAnimation}
            />
          ))}

          <TotalRow
            label="Total"
            cells={activeColumns.map((column, columnIndex) => getBottomTotal(player.id, column.id))}
            labelClassName="bg-slate-700 text-white"
            cellClassName="bg-slate-200 text-rose-700"
			activeColumns={activeColumns}
          />

          <TotalRow
            label="Final"
            cells={activeColumns.map((column, columnIndex) => getGrandTotal(player.id, column.id))}
            labelClassName="bg-indigo-700 text-white"
            cellClassName="bg-indigo-100 text-slate-950"
			activeColumns={activeColumns}
          />
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({
  row,
  rowIndex,
  player,
  getScore,
  isCellPlayable,
  onSelectCell,
  activeColumns,
  lastScoreAnimation,
}: {
  row: { id: YamRow; label: string };
  rowIndex: number;
  player: Player;
  getScore: (
    playerId: string,
    columnId: string,
    rowId: YamRow
  ) => ScoreValue;
  isCellPlayable: (
    playerId: string,
    columnId: string,
    rowId: YamRow
  ) => boolean;
  lastScoreAnimation: {
  playerId: string;
  columnId: string;
  rowId: string;
  value: number | "X";
} | null;
  onSelectCell: (cell: SelectedCell) => void;
  activeColumns: typeof columns;
}) {
  return (
    <>
      {row.id === "threeOfAKind" && (
        <tr>
         <td colSpan={activeColumns.length + 1} className="h-2 bg-slate-950"></td>
        </tr>
      )}

      <tr>
        <RowLabel label={row.label} />

        {activeColumns.map((column, columnIndex) => (
          <ScoreCell
            key={`${column.id}-${row.id}`}
            playerId={player.id}
            columnId={column.id}
            rowId={row.id}
            rowIndex={rowIndex}
            section="bottom"
			lastScoreAnimation={lastScoreAnimation}
            value={getScore(player.id, column.id, row.id)}
            playable={isCellPlayable(player.id, column.id, row.id)}
            onSelectCell={onSelectCell}
			blockStart={
  columnIndex > 0 &&
  activeColumns[columnIndex - 1].type !== column.type
}
          />
        ))}
      </tr>
    </>
  );
}

function RowLabel({ label }: { label: string }) {
  return (
    <th className="h-6 w-14 border border-slate-900 bg-slate-900 text-center text-xs font-black text-slate-100">
      {label}
    </th>
  );
}

function ScoreCell({
  playerId,
  columnId,
  rowId,
  rowIndex,
  section,
  value,
  playable,
  onSelectCell,
  blockStart,
  lastScoreAnimation,
}: {
  playerId: string;
  columnId: string;
  rowId: YamRow;
  rowIndex: number;
  section: "top" | "bottom";
  value: ScoreValue;
  playable: boolean;
  onSelectCell: (cell: SelectedCell) => void;
  blockStart: boolean;
  lastScoreAnimation: {
    playerId: string;
    columnId: string;
    rowId: string;
    value: number | "X";
  } | null;
}) {
  const colorClass =
    section === "top" ? getTopColor(rowIndex) : getBottomColor(rowIndex);
const isLastPlayed =
  lastScoreAnimation?.playerId === playerId &&
  lastScoreAnimation?.columnId === columnId &&
  lastScoreAnimation?.rowId === rowId;
  return (
    <td
      onClick={() => {
        if (!playable) return;
        onSelectCell({ playerId, columnId, rowId });
      }}
      className={[
        "h-6 w-10 border border-slate-950 text-sm font-black transition-all duration-200",
		blockStart ? "border-l-4 border-l-black" : "",
		isLastPlayed
  ? "relative z-10 scale-110 ring-4 ring-yellow-300 shadow-lg shadow-yellow-300/60"
  : "",
        colorClass,
        playable
          ? "cursor-pointer text-slate-950 hover:brightness-110"
          : "cursor-not-allowed text-slate-950",
      ].join(" ")}
    >
      {value === "X" ? <span className="text-rose-700">✕</span> : value ?? ""}
    </td>
  );
}

function TotalRow({
  label,
  cells,
  activeColumns,
  labelClassName,
  cellClassName,
}: {
  label: string;
  cells: number[];
  activeColumns: typeof columns;
  labelClassName: string;
  cellClassName: string;
}) {
  return (
    <tr>
      <th
        className={[
  "h-6 w-14 border border-slate-950 text-center text-xs font-black",
  labelClassName,
].join(" ")}
      >
        {label}
      </th>

      {cells.map((value, index) => {
  const blockStart =
    index > 0 &&
    activeColumns[index - 1].type !== activeColumns[index].type;

  return (
    <td
      key={index}
      className={[
        "h-6 w-10 border border-slate-950 text-sm font-black",
        blockStart ? "border-l-4 border-l-black" : "",
        cellClassName,
      ].join(" ")}
    >
      {value}
    </td>
  );
})}
    </tr>
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
          {players.map((player) => (
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
function getTopColor(index: number) {
  return [
    "bg-stone-50",
    "bg-stone-100",
    "bg-amber-100",
    "bg-amber-200",
    "bg-orange-200",
    "bg-orange-300",
  ][index];
}

function getBottomColor(index: number) {
  return [
    "bg-sky-100",
    "bg-cyan-100",
    "bg-teal-100",
    "bg-emerald-200",
    "bg-emerald-300",
    "bg-lime-300",
    "bg-green-500",
  ][index];
}