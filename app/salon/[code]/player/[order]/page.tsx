"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { columns, rows, getPossibleValues } from "../../../../lib/yamRules";
import LoadingScreen from "../../../../components/LoadingScreen";

type GameMode = "6cols" | "3cols";

export default function PlayerPage() {
  const params = useParams();
const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "finished">("waiting");
  const code = String(params.code).toUpperCase();
  const order = Number(params.order);
const [currentPlayerOrder, setCurrentPlayerOrder] = useState(1);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>("6cols");
  const [message, setMessage] = useState("Chargement...");
const [finalPlayers, setFinalPlayers] = useState<
  { id: string; name: string; player_order: number; final_score: number | null }[]
>([]);

const [finalScores, setFinalScores] = useState<
  { player_id: string; value: string }[]
>([]);
async function loadFinalResults(currentGameId: string) {
  const { data: playersData } = await supabase
    .from("yam_players")
    .select("*")
    .eq("game_id", currentGameId);
console.log("FINAL PLAYERS", playersData);
  const { data: scoresData } = await supabase
    .from("yam_scores")
    .select("player_id, value")
    .eq("game_id", currentGameId);

  setFinalPlayers(playersData ?? []);
  setFinalScores(scoresData ?? []);
}
  async function loadPlayerSession() {
    const { data: game, error: gameError } = await supabase
      .from("yam_games")
      .select("id, mode, current_player_order, status")
      .eq("code", code)
      .single();

    if (gameError || !game) {
      setMessage("Salon introuvable.");
      return;
    }

    setGameId(game.id);
    console.log("PLAYER GAME ID =", game.id);
    setGameMode(game.mode);
	setGameStatus(game.status);
	setCurrentPlayerOrder(game.current_player_order ?? 1);

    const { data: player, error: playerError } = await supabase
      .from("yam_players")
      .select("id, name")
      .eq("game_id", game.id)
      .eq("player_order", order)
      .single();

    if (playerError || !player) {
      setMessage("Joueur introuvable.");
      return;
    }

    setPlayerId(player.id);
    setPlayerName(player.name);
    setMessage("");
	if (game.status === "finished") {
  loadFinalResults(game.id);
}
  }

  useEffect(() => {
    loadPlayerSession();
  }, []);
  
useEffect(() => {
  if (!gameId) return;

  const channel = supabase
    .channel(`player_waiting_game_${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "yam_games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
  const nextStatus = payload.new.status ?? "waiting";

  setGameStatus(nextStatus);
  setCurrentPlayerOrder(payload.new.current_player_order ?? 1);

  if (nextStatus === "finished" && gameId) {
    loadFinalResults(gameId);
    
  }
}

    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [gameId]);
useEffect(() => {
  if (!gameId) return;
  if (gameStatus === "finished") return;

  const interval = window.setInterval(async () => {
    const { data, error } = await supabase
      .from("yam_games")
      .select("status, current_player_order")
      .eq("id", gameId)
      .single();

    if (error || !data) return;

    setGameStatus(data.status ?? "waiting");
    setCurrentPlayerOrder(data.current_player_order ?? 1);

    if (data.status === "finished") {
  loadFinalResults(gameId);
  
}
  }, 1000);

  return () => window.clearInterval(interval);
}, [gameId, gameStatus]);
  if (message === "Chargement...") {
  return <LoadingScreen />;
}

if (message) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center font-black text-[#C44934]">
        {message}
      </div>
    </main>
  );
}
if (gameStatus === "waiting") {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
        <img
          src="/favicon.png"
          alt=""
          className="w-[900px] rotate-[-12deg] select-none"
        />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-8 text-center shadow-2xl">
        <div className="text-5xl">🎲</div>

        <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
          Salon {code} · Joueur {order}
        </div>

        <h1 className="mt-1 text-3xl font-black text-white">
          En attente
        </h1>

        <p className="mt-3 text-sm font-bold text-slate-400">
          L’administrateur du salon doit démarrer la partie.
        </p>
      </div>
    </main>
  );
}
const finalRanking = finalPlayers
  .map((player) => ({
    ...player,
    total: Number(player.final_score ?? 0),
  }))
  .sort((a, b) => b.total - a.total);

const myFinalResult = finalRanking.find(
  (player) => player.player_order === order
);

const winner = finalRanking[0];
const myRank = myFinalResult
  ? finalRanking.findIndex((player) => player.id === myFinalResult.id) + 1
  : null;
if (gameStatus === "finished") {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
        <img
          src="/favicon.png"
          alt=""
          className="w-[900px] rotate-[-12deg] select-none"
        />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-8 text-center shadow-2xl">
        <div className="text-5xl">🏆</div>

        <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
          Salon {code} · Joueur {order}
        </div>

        <h1 className="mt-1 text-3xl font-black text-white">
          Partie terminée
        </h1>

        <div className="mt-6 rounded-2xl bg-[#F4E9DC] p-5 text-black">
          <div className="text-sm font-black uppercase text-[#C44934]">
            Ta position
          </div>

          <div className="mt-2 text-5xl font-black">
            #{myRank ?? "-"}
          </div>

          <div className="mt-2 text-xl font-black">
            {myFinalResult ? myFinalResult.total : 0} points
          </div>
        </div>

        <p className="mt-5 text-sm font-bold text-slate-400">
          Vainqueur :{" "}
          <span className="font-black text-[#F4E9DC]">
            {winner?.name ?? "-"}
          </span>
        </p>

        <button
          onClick={() => (window.location.href = "/")}
          className="mt-6 w-full rounded-xl bg-[#C44934] px-4 py-3 font-black text-white hover:bg-[#D75A43]"
        >
          Retour accueil
        </button>
      </div>
    </main>
  );
}

  return (
    <PlayerMobileSheet
      code={code}
      playerName={playerName}
      selectedOrder={order}
      gameMode={gameMode}
      gameId={gameId}
      playerId={playerId}
	  currentPlayerOrder={currentPlayerOrder}
setCurrentPlayerOrder={setCurrentPlayerOrder}
    />
  );
}

function PlayerMobileSheet({
  code,
  playerName,
  selectedOrder,
  gameMode,
  gameId,
  currentPlayerOrder,
setCurrentPlayerOrder,
  playerId,
}: {
  code: string;
  playerName: string;
  selectedOrder: number;
  gameMode: GameMode;
  gameId: string | null;
  playerId: string | null;
  currentPlayerOrder: number;
setCurrentPlayerOrder: (value: number) => void;
}) {
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
const [filledCells, setFilledCells] = useState<string[]>([]);
const [playerScores, setPlayerScores] = useState<
  { column_id: string; row_id: string; value: string }[]
>([]);
const playerColors = [
  {
    text: "text-[#C44934]",
    border: "border-[#9B6A28]/70",
    bg: "bg-[#F4E9DC]",
    button: "bg-[#C44934] text-white",
    valueButton: "bg-[#F4E9DC] text-black hover:bg-[#FFF8EF]",
    hoverBorder: "hover:bg-[#322217]",
  },
];

const playerColor = playerColors[0];
const isMyTurn = selectedOrder === currentPlayerOrder;
  const activeColumns =
    gameMode === "6cols"
      ? columns
      : [columns[0], columns[2], columns[4]];
	  const upperRows = rows.filter((row) =>
  ["1", "2", "3", "4", "5", "6", "-", "+"].includes(row.id)
);
useEffect(() => {
  if (!selectedColumnId) return;

  const firstPlayableRow = rows.find((row) =>
    isMobileCellPlayable(selectedColumnId, row.id)
  );

  if (!firstPlayableRow) return;

  const timer = setTimeout(() => {
    rowRefs.current[firstPlayableRow.id]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 150);

  return () => clearTimeout(timer);
}, [selectedColumnId, filledCells]);
const lowerRows = rows.filter(
  (row) => !["1", "2", "3", "4", "5", "6", "-", "+"].includes(row.id)
);
	  useEffect(() => {
  loadFilledCells();
}, [gameId, playerId]);
useEffect(() => {
  if (!gameId) return;

  const channel = supabase
    .channel(`player_game_${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "yam_games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
  setCurrentPlayerOrder(payload.new.current_player_order ?? 1);

  setSelectedColumnId(null);
  setSelectedRowId(null);

  loadFilledCells();
}
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [gameId]);
useEffect(() => {
  if (!gameId || !playerId) return;

  const channel = supabase
    .channel(`player_scores_${gameId}_${playerId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "yam_scores",
        filter: `game_id=eq.${gameId}`,
      },
      () => {
        loadFilledCells();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [gameId, playerId]);
async function loadFilledCells() {
  if (!gameId || !playerId) return;

  const { data, error } = await supabase
    .from("yam_scores")
    .select("column_id, row_id, value")
    .eq("game_id", gameId)
    .eq("player_id", playerId);
console.log("Polling", data);
  if (error) {
    console.error(error);
    return;
  }

  setFilledCells(
  (data ?? []).map((score) => `${score.column_id}:${score.row_id}`)
);

setPlayerScores(data ?? []);
}
function isMobileCellPlayable(columnId: string, rowId: string) {
  const column = activeColumns.find((item) => item.id === columnId);
  if (!column) return false;

  const cellKey = `${columnId}:${rowId}`;
  if (filledCells.includes(cellKey)) return false;

  const rowIndex = rows.findIndex((row) => row.id === rowId);
  if (rowIndex === -1) return false;

  if (column.type === "free") return true;

  if (column.type === "down") {
    return rows
      .slice(0, rowIndex)
      .every((row) => filledCells.includes(`${columnId}:${row.id}`));
  }

  if (column.type === "up") {
    return rows
      .slice(rowIndex + 1)
      .every((row) => filledCells.includes(`${columnId}:${row.id}`));
  }

  return false;
}
  async function saveMobileScore(
    columnId: string,
    rowId: string,
    value: number | "X"
  ) {
    if (!gameId || !playerId) return;

    const { error } = await supabase.from("yam_scores").upsert(
      {
        game_id: gameId,
        player_id: playerId,
        column_id: columnId,
        row_id: rowId,
        value: String(value),
      },
      {
        onConflict: "game_id,player_id,column_id,row_id",
      }
    );

    if (error) {
  console.error(error);
  alert(error.message);
  return;
}

const { data: game, error: gameError } = await supabase
  .from("yam_games")
  .select("player_count, current_player_order")
  .eq("id", gameId)
  .single();

if (gameError) {
  console.error(gameError);
  alert(gameError.message);
  return;
}

const nextPlayerOrder =
  game.current_player_order >= game.player_count
    ? 1
    : game.current_player_order + 1;

const { error: updateError } = await supabase
  .from("yam_games")
  .update({
    current_player_order: nextPlayerOrder,
  })
  .eq("id", gameId);

if (updateError) {
  console.error(updateError);
  alert(updateError.message);
  return;
}

setSelectedRowId(null);
setSelectedColumnId(null);
  }
  
function renderRowButton(row: (typeof rows)[number]) {
  if (!selectedColumnId) return null;

  const cellKey = `${selectedColumnId}:${row.id}`;
  const isFilled = filledCells.includes(cellKey);
  const isPlayable = isMobileCellPlayable(selectedColumnId, row.id);

  return (
    <div
  key={row.id}
  ref={(element) => {
    rowRefs.current[row.id] = element;
  }}
>
      <button
        type="button"
        onClick={() => {
  if (!isPlayable) return;

  setSelectedRowId(row.id);

  setTimeout(() => {
    rowRefs.current[row.id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 100);
}}
        className={[
  "flex h-14 w-full items-center justify-center rounded-xl font-black transition",
  !isPlayable
    ? "cursor-not-allowed bg-slate-950 text-slate-600"
    : selectedRowId === row.id
    ? "bg-[#C44934] text-white"
    : "bg-slate-900 text-white hover:bg-slate-800",
].join(" ")}
      >
        <span className="text-base">
          {isFilled ? "✓ " : ""}
          {row.label}
        </span>
      </button>

      {selectedRowId === row.id && isPlayable && (
        <div className="mb-3 mt-2 grid grid-cols-3 gap-2">
          {getPossibleValues(row.id).map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() =>
                saveMobileScore(selectedColumnId, row.id, value)
              }
              className={[
  "rounded-xl p-3 font-black transition",
  value === "X"
    ? "bg-[#C44934] text-white hover:bg-[#D75A43]"
    : "bg-[#F4E9DC] text-black hover:bg-[#FFF8EF]",
].join(" ")}
            >
              {value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
const playerTotal = playerScores.reduce((total, score) => {
  if (score.value === "X") return total;

  const value = Number(score.value);
  return Number.isNaN(value) ? total : total + value;
}, 0);

const totalCells = activeColumns.length * rows.length;
const remainingMoves = totalCells - filledCells.length;
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center shadow-2xl">
          <div className={`text-sm font-black uppercase ${playerColor.text}`}>
            Salon {code} · Joueur {selectedOrder}
          </div>

          <h1 className="mt-2 text-4xl font-black">{playerName}</h1>
<div className="mt-3 grid grid-cols-2 gap-3">
  <div className="rounded-xl bg-[#F4E9DC] p-3 text-black">
    <div className="text-xs font-black uppercase text-slate-500">
      Score
    </div>
    <div className={`mt-1 text-2xl font-black ${playerColor.text}`}>
      {playerTotal}
    </div>
  </div>

  <div className="rounded-xl bg-[#F4E9DC] p-3 text-black">
    <div className="text-xs font-black uppercase text-slate-500">
      Restants
    </div>
    <div className={`mt-1 text-2xl font-black ${playerColor.text}`}>
  {remainingMoves}
</div>
  </div>
</div>
          <p className="mt-3 text-sm font-bold text-slate-400">
  {isMyTurn
    ? "C'est à toi de jouer."
    : `En attente du joueur ${currentPlayerOrder}.`}
</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {activeColumns.map((column, index) => {
            const sameTypeBefore = activeColumns
              .slice(0, index)
              .filter((item) => item.type === column.type).length;

            const labelNumber = sameTypeBefore + 1;

            const label =
              column.type === "down"
                ? `↓ Descente ${gameMode === "6cols" ? labelNumber : ""}`
                : column.type === "free"
                ? `L Libre ${gameMode === "6cols" ? labelNumber : ""}`
                : `↑ Montée ${gameMode === "6cols" ? labelNumber : ""}`;

            const isSelected = selectedColumnId === column.id;

            return (
              <button
                key={column.id}
                type="button"
                onClick={() => {
  if (!isMyTurn) return;

  setSelectedColumnId(column.id);
  setSelectedRowId(null);
}}
                className={[
  "min-h-[56px] rounded-2xl p-3 text-center font-black transition",
  !isMyTurn
    ? "cursor-not-allowed bg-slate-950 text-slate-600"
    : isSelected
    ? "bg-[#C44934] text-white"
    : "bg-slate-900 text-white hover:bg-slate-800",
].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>

        {selectedColumnId && (
          <div className="mt-6">
            <div className="mb-3 text-sm font-black uppercase text-slate-400">
              Choisis une case
            </div>

            
			
              <div className="grid grid-cols-3 gap-3">
  {upperRows.map((row) => renderRowButton(row))}
</div>

<div className="mt-4 grid grid-cols-1 gap-3">
  {lowerRows.map((row) => renderRowButton(row))}
</div>
            
          </div>
        )}
      </div>
    </main>
  );
}