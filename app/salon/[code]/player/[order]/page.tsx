"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { columns, rows, getPossibleValues } from "../../../../lib/yamRules";

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
  { id: string; name: string; player_order: number }[]
>([]);

const [finalScores, setFinalScores] = useState<
  { player_id: string; value: string }[]
>([]);
async function loadFinalResults(currentGameId: string) {
  const { data: playersData } = await supabase
    .from("yam_players")
    .select("id, name, player_order")
    .eq("game_id", currentGameId);

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

  if (message) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="rounded-3xl border border-cyan-500 bg-black p-6 text-center font-black text-cyan-300">
          {message}
        </div>
      </main>
    );
  }
if (gameStatus === "waiting") {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-cyan-500 bg-black p-8 text-center shadow-2xl shadow-cyan-500/20">
        <div className="text-sm font-black uppercase text-cyan-300">
          Salon {code} · Joueur {order}
        </div>

        <h1 className="mt-3 text-3xl font-black">
          En attente du lancement
        </h1>

        <p className="mt-3 text-sm font-bold text-slate-400">
          L’administrateur du salon doit démarrer la partie.
        </p>
      </div>
    </main>
  );
}
const finalRanking = finalPlayers
  .map((player) => {
    const total = finalScores
      .filter((score) => score.player_id === player.id)
      .reduce((sum, score) => {
        if (score.value === "X") return sum;
        const value = Number(score.value);
        return Number.isNaN(value) ? sum : sum + value;
      }, 0);

    return {
      ...player,
      total,
    };
  })
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
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-yellow-500 bg-black p-8 text-center shadow-2xl shadow-yellow-500/20">
        <div className="text-5xl">🏆</div>

        <div className="mt-4 text-sm font-black uppercase text-yellow-300">
          Salon {code} · Joueur {order}
        </div>

        <h1 className="mt-3 text-3xl font-black">
          Partie terminée
        </h1>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="text-sm font-black uppercase text-slate-500">
            Ta position
          </div>

          <div className="mt-2 text-5xl font-black text-yellow-300">
            #{myRank ?? "-"}
          </div>

          <div className="mt-2 text-xl font-black">
            {myFinalResult?.total ?? 0} points
          </div>
        </div>

        <p className="mt-5 text-sm font-bold text-slate-400">
          Vainqueur :{" "}
          <span className="text-yellow-300">
            {winner?.name ?? "-"}
          </span>
        </p>
		<button
  onClick={() => window.location.href = "/"}
  className="mt-6 w-full rounded-xl bg-yellow-500 px-4 py-3 font-black text-black hover:bg-yellow-400"
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
    text: "text-cyan-300",
    border: "border-cyan-500",
    bg: "bg-cyan-500/10",
    button: "border-cyan-500 bg-cyan-500/10 text-cyan-300",
	valueButton: "bg-cyan-600",
	hoverBorder: "hover:border-cyan-500",
  },
  {
    text: "text-emerald-300",
    border: "border-emerald-500",
    bg: "bg-emerald-500/10",
    button: "border-emerald-500 bg-emerald-500/10 text-emerald-300",
	valueButton: "bg-emerald-600",
	hoverBorder: "hover:border-emerald-500",
  },
  {
    text: "text-amber-300",
    border: "border-amber-500",
    bg: "bg-amber-500/10",
    button: "border-amber-500 bg-amber-500/10 text-amber-300",
	valueButton: "bg-amber-600",
	hoverBorder: "hover:border-amber-500",
  },
  {
    text: "text-fuchsia-300",
    border: "border-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    button: "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300",
	valueButton: "bg-fuchsia-600",
	hoverBorder: "hover:border-fuchsia-500",
  },
  {
    text: "text-orange-300",
    border: "border-orange-500",
    bg: "bg-orange-500/10",
    button: "border-orange-500 bg-orange-500/10 text-orange-300",
	valueButton: "bg-orange-600",
	hoverBorder: "hover:border-orange-500",
  },
  {
    text: "text-violet-300",
    border: "border-violet-500",
    bg: "bg-violet-500/10",
    button: "border-violet-500 bg-violet-500/10 text-violet-300",
	valueButton: "bg-violet-600",
	hoverBorder: "hover:border-violet-500",
  },
];

const playerColor = playerColors[(selectedOrder - 1) % playerColors.length];
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
  "flex h-14 w-full items-center justify-center rounded-xl border font-black transition",
  !isPlayable
    ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600"
    : selectedRowId === row.id
    ? playerColor.button
    : `border-slate-700 bg-slate-950 text-white ${playerColor.hoverBorder}`,
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
                "rounded-xl p-3 font-black text-white",
                value === "X"
  ? "bg-rose-700"
  : playerColor.valueButton,
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
        <div className={`rounded-3xl border ${playerColor.border} bg-black p-6 text-center shadow-2xl`}>
          <div className={`text-sm font-black uppercase ${playerColor.text}`}>
            Salon {code} · Joueur {selectedOrder}
          </div>

          <h1 className="mt-2 text-4xl font-black">{playerName}</h1>
<div className="mt-3 grid grid-cols-2 gap-3">
  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
    <div className="text-xs font-black uppercase text-slate-500">
      Score
    </div>
    <div className={`mt-1 text-2xl font-black ${playerColor.text}`}>
      {playerTotal}
    </div>
  </div>

  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
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
  "rounded-2xl border p-3 text-center font-black transition min-h-[56px]",
  !isMyTurn
    ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600"
    : isSelected
    ? playerColor.button
    : `border-slate-700 bg-slate-950 text-white ${playerColor.hoverBorder}`,
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