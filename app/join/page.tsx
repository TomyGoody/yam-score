"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { columns, rows, YamRow, getPossibleValues } from "../lib/yamRules";

const JOIN_STORAGE_KEY = "yam-score-join-session";
export default function JoinPage() {
	const router = useRouter();
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [playerCount, setPlayerCount] = useState(0);
  const [playerId, setPlayerId] = useState<string | null>(null);
const [takenOrders, setTakenOrders] = useState<number[]>([]);
const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
const [gameStatus, setGameStatus] = useState<"waiting" | "playing">("waiting");
const [gameMode, setGameMode] = useState<"6cols" | "3cols">("6cols");

  async function findSalon() {
    setMessage("");

    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setMessage("Entre un code salon.");
      return;
    }

    const { data, error } = await supabase
      .from("yam_games")
      .select("id, code, player_count, status, mode")
      .eq("code", cleanCode)
      .single();

    if (error || !data) {
      setMessage("Salon introuvable.");
      return;
    }

    setGameId(data.id);
	setGameStatus(data.status);
	setPlayerCount(data.player_count);
	setGameMode(data.mode);

const { data: playersData } = await supabase
  .from("yam_players")
  .select("player_order")
  .eq("game_id", data.id);

setTakenOrders(
  playersData?.map((player) => player.player_order) ?? []
);
    setMessage("");
  }

async function joinSalon() {
  if (!gameId) return;

  if (!selectedOrder) {
    setMessage("Choisis ta place.");
    return;
  }

  if (takenOrders.includes(selectedOrder)) {
    setMessage("Cette place est déjà prise.");
    return;
  }

  const name = playerName.trim();

  if (!name) {
    setMessage("Entre ton nom.");
    return;
  }

  const { data, error } = await supabase
  .from("yam_players")
  .insert({
    game_id: gameId,
    name,
    player_order: selectedOrder,
  })
  .select("id")
  .single();

  if (error) {
    if (error.message.includes("yam_players_unique_slot")) {
      setMessage("Cette place vient d'être prise. Choisis-en une autre.");
    } else {
      setMessage(error.message);
    }
    return;
  }

  setPlayerId(data.id);
setMessage("Tu as rejoint le salon !");

localStorage.setItem(
  JOIN_STORAGE_KEY,
  JSON.stringify({
    code: code.trim().toUpperCase(),
    gameId,
    playerId: data.id,
    playerName: name,
    selectedOrder,
    gameMode,
  })
);

router.push(`/salon/${code.trim().toUpperCase()}/player/${selectedOrder}`);
}
useEffect(() => {
  const saved = localStorage.getItem(JOIN_STORAGE_KEY);
  if (!saved) return;

  const session = JSON.parse(saved);

  setGameId(session.gameId);
  setPlayerId(session.playerId);
  setPlayerName(session.playerName);
  setSelectedOrder(session.selectedOrder);
  setGameMode(session.gameMode);
  setGameStatus(session.gameStatus ?? "waiting");
}, []);
useEffect(() => {
  if (!gameId) return;

  const channel = supabase
    .channel(`yam_game_${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "yam_games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        const status = payload.new.status;

        if (status === "playing") {
  setGameStatus("playing");

  const saved = localStorage.getItem(JOIN_STORAGE_KEY);
  if (saved) {
    const session = JSON.parse(saved);
    localStorage.setItem(
      JOIN_STORAGE_KEY,
      JSON.stringify({
        ...session,
        gameStatus: "playing",
      })
    );
  }
}
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [gameId]);
if (gameStatus === "playing" && gameId && playerId) {
  return (
    <>
      <button
        onClick={() => {
          localStorage.removeItem(JOIN_STORAGE_KEY);
          window.location.reload();
        }}
        className="fixed left-4 top-4 z-50 rounded-xl bg-slate-800 px-4 py-2 font-black text-white"
      >
        Quitter
      </button>

      <PlayerMobileSheet
        playerName={playerName}
        selectedOrder={selectedOrder}
        gameMode={gameMode}
        gameId={gameId}
        playerId={playerId}
      />
    </>
  );
}

  return (
  
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-cyan-500 bg-black p-8 text-center shadow-2xl shadow-cyan-500/20">
	  {gameId && (
    <button
      onClick={() => {
        localStorage.removeItem(JOIN_STORAGE_KEY);

        setGameId(null);
        setPlayerId(null);
        setPlayerName("");
        setSelectedOrder(null);
        setTakenOrders([]);
        setGameStatus("waiting");
        setMessage("");
        setCode("");
      }}
      className="mb-4 w-full rounded-xl bg-slate-800 px-4 py-3 font-black text-white hover:bg-slate-700"
    >
      ← Quitter le salon
    </button>
  )}
        <h1 className="text-4xl font-black">Rejoindre un salon</h1>

        {!gameId ? (
          <>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="Code salon"
              className="mt-8 w-full rounded-xl border border-slate-700 bg-black p-4 text-center text-3xl font-black uppercase tracking-widest text-cyan-300"
            />

            <button
              onClick={findSalon}
              className="mt-4 w-full rounded-xl bg-cyan-600 px-4 py-4 text-lg font-black hover:bg-cyan-500"
            >
              Rejoindre
            </button>
          </>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-cyan-500 bg-cyan-500/10 p-4 text-cyan-300 font-black">
              Salon trouvé : {code}
            </div>
<div className="mt-6">
  <div className="mb-3 text-sm font-black uppercase text-slate-400">
    Choisis ta place
  </div>

  <div className="grid grid-cols-3 gap-2">
    {Array.from({ length: playerCount }, (_, index) => {
      const order = index + 1;
      const isTaken = takenOrders.includes(order);
      const isSelected = selectedOrder === order;

      return (
	  
        <button
          key={order}
          type="button"
          disabled={isTaken}
          onClick={() => setSelectedOrder(order)}
          className={[
            "rounded-xl border px-3 py-3 font-black transition",
            isTaken
              ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600"
              : isSelected
              ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
              : "border-slate-700 bg-black text-white hover:border-slate-500",
          ].join(" ")}
        >
          Joueur {order}
        </button>
      );
    })}
  </div>
</div>
            <input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="Ton nom"
              className="mt-6 w-full rounded-xl border border-slate-700 bg-black p-4 text-center text-xl font-black"
            />

            <button
              onClick={joinSalon}
              className="mt-4 w-full rounded-xl bg-cyan-600 px-4 py-4 text-lg font-black hover:bg-cyan-500"
            >
              Entrer dans le salon
            </button>
          </>
        )}

        {message && (
          <div className="mt-4 text-sm font-bold text-amber-300">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
function PlayerMobileSheet({
  playerName,
  selectedOrder,
   gameMode,
   gameId,
playerId,
}: {
  playerName: string;
  selectedOrder: number | null;
  gameMode: "6cols" | "3cols";
  gameId: string | null;
playerId: string | null;
}) {
	const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
const [selectedRowId, setSelectedRowId] = useState<YamRow | null>(null);
	const possibleValues = selectedRowId
  ? getPossibleValues(selectedRowId)
  : [];
	const activeColumns =
  gameMode === "6cols"
    ? columns
    : [columns[0], columns[2], columns[4]];
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
  }
}

	
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-cyan-500 bg-black p-6 text-center shadow-2xl shadow-cyan-500/20">
          <div className="text-sm font-black uppercase text-cyan-300">
            Joueur {selectedOrder}
          </div>

          <h1 className="mt-2 text-4xl font-black">
            {playerName}
          </h1>

          <p className="mt-3 text-sm font-bold text-slate-400">
            Ta feuille de score apparaîtra ici.
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
        onClick={() => setSelectedColumnId(column.id)}
        className={[
          "rounded-xl border p-4 text-left font-black transition",
          isSelected
            ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
            : "border-slate-700 bg-slate-950 text-white hover:border-slate-500",
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

    <div className="grid gap-2">
      {rows.map((row) => (
  <div key={row.id}>
    <button
      type="button"
      onClick={() => setSelectedRowId(row.id)}
      className={[
        "w-full rounded-xl border p-4 text-left font-black transition",
        selectedRowId === row.id
          ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
          : "border-slate-700 bg-slate-950 text-white hover:border-cyan-500",
      ].join(" ")}
    >
      {row.label}
    </button>

    {selectedRowId === row.id && (
      <div className="mt-2 mb-3 grid grid-cols-3 gap-2">
        {getPossibleValues(row.id).map((value) => (
  <button
    key={String(value)}
    type="button"
    onClick={() =>
      saveMobileScore(
        selectedColumnId!,
        row.id,
        value
      )
    }
    className={[
      "rounded-xl p-3 font-black text-white",
      value === "X"
        ? "bg-rose-700"
        : "bg-cyan-600",
    ].join(" ")}
  >
    {value}
  </button>
))}
      </div>
    )}
  </div>
))}
    </div>
  </div>
)}

      </div>
    </main>
  );
}