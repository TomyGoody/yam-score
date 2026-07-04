"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { columns, rows, YamRow, getPossibleValues } from "../lib/yamRules";
import { useSearchParams } from "next/navigation";
const JOIN_STORAGE_KEY = "yam-score-join-session";

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinPageContent />
    </Suspense>
  );
}
function JoinPageContent() {
	const searchParams = useSearchParams();
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
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
const [currentUsername, setCurrentUsername] = useState<string | null>(null);
const [associateProfile, setAssociateProfile] = useState(true);
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
  profile_id: associateProfile ? currentUserId : null,
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
  async function loadCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUserId(user?.id ?? null);

    if (!user) {
      setCurrentUsername(null);
      setAssociateProfile(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    setCurrentUsername(profile?.username ?? null);

setPlayerName((current) =>
  current.trim() === "" && profile?.username
    ? profile.username
    : current
);

setAssociateProfile(true);
  }

  loadCurrentUser();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    loadCurrentUser();
  });

  return () => subscription.unsubscribe();
}, []);
useEffect(() => {
  const codeFromUrl = searchParams.get("code");

  if (!codeFromUrl) return;

  const cleanCode = codeFromUrl.trim().toUpperCase();

  setCode(cleanCode);

  async function autoFindSalon() {
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

    setTakenOrders(playersData?.map((player) => player.player_order) ?? []);
    setMessage("");
  }

  autoFindSalon();
}, [searchParams]);
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
        className="fixed left-4 top-4 z-50 rounded-xl bg-slate-900 px-4 py-2 font-black text-white hover:bg-slate-800"
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
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
  <img
    src="/favicon.png"
    alt=""
    className="w-[900px] rotate-[-12deg] select-none"
  />
</div>
      <div className="relative w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-8 text-center shadow-2xl">
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
      className="mb-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-black text-white hover:bg-slate-800"
    >
      ← Quitter le salon
    </button>
  )}
        <div className="text-5xl">🎲</div>

<div className="mt-3 text-sm font-black uppercase text-[#C44934]">
  Salon multijoueur
</div>

<h1 className="mt-1 text-4xl font-black text-white">
  Rejoindre une partie
</h1>

<p className="mt-2 text-sm font-bold text-slate-400">
  Entre le code affiché sur l'écran principal.
</p>

        {!gameId ? (
          <>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="Code salon"
              className="mt-8 w-full rounded-2xl border border-[#9B6A28]/50 bg-[#F4E9DC] p-5 text-center text-2xl font-black uppercase tracking-[0.35em] text-black outline-none focus:border-[#C44934]"
            />

            <button
              onClick={findSalon}
              className="mt-4 w-full rounded-xl bg-[#C44934] px-4 py-4 text-lg font-black text-white transition hover:bg-[#D75A43]"
            >
              Rejoindre
            </button>
          </>
        ) : (
          <>
            <div className="mt-6 rounded-2xl bg-[#F4E9DC] p-5 text-black">
  <div className="text-sm font-black uppercase text-[#C44934]">
    Salon trouvé
  </div>

  <div className="mt-2 text-3xl font-black tracking-[0.25em]">
    {code}
  </div>
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
  "rounded-xl px-3 py-3 font-black transition",
  isTaken
    ? "cursor-not-allowed bg-black/20 text-black/30"
    : isSelected
    ? "bg-[#C44934] text-white"
    : "bg-slate-900 text-white hover:bg-slate-800",
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
              className="mt-6 w-full rounded-2xl border border-[#9B6A28]/50 bg-[#F4E9DC] p-4 text-center text-xl font-black text-black outline-none focus:border-[#C44934]"
            />
{currentUserId && currentUsername && (
  <button
    type="button"
    onClick={() => setAssociateProfile((current) => !current)}
    className={[
      "mt-3 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-black transition",
      associateProfile
        ? "bg-[#C44934] text-white"
        : "bg-slate-900 text-white hover:bg-slate-800",
    ].join(" ")}
  >
    <span>
      {associateProfile
        ? `✅ Partie associée à @${currentUsername}`
        : `Associer cette partie à @${currentUsername}`}
    </span>
  </button>
)}
            <button
              onClick={joinSalon}
              className="mt-4 w-full rounded-xl bg-[#C44934] px-4 py-4 text-lg font-black text-white hover:bg-[#D75A43]"
            >
              Entrer dans le salon
            </button>
          </>
        )}

        {message && (
          <div className="mt-4 rounded-xl border border-[#C44934]/50 bg-[#C44934]/10 px-4 py-3 text-sm font-black text-[#D75A43]">
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
        <div className="rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center shadow-2xl">
          <div className="text-sm font-black uppercase text-[#C44934]">
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
  "rounded-xl p-4 text-left font-black transition",
  isSelected
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

    <div className="grid gap-2">
      {rows.map((row) => (
  <div key={row.id}>
    <button
      type="button"
      onClick={() => setSelectedRowId(row.id)}
      className={[
  "w-full rounded-xl p-4 text-left font-black transition",
  selectedRowId === row.id
    ? "bg-[#C44934] text-white"
    : "bg-slate-900 text-white hover:bg-slate-800",
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
))}
    </div>
  </div>
)}

      </div>
    </main>
  );
}