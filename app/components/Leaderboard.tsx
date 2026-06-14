"use client";

type Player = {
  id: string;
  name: string;
  playerOrder?: number;
  player_order?: number;
};

const PLAYER_COLORS = [
  { text: "text-cyan-300", border: "border-cyan-500", bg: "bg-cyan-500/10" },
  { text: "text-emerald-300", border: "border-emerald-500", bg: "bg-emerald-500/10" },
  { text: "text-amber-300", border: "border-amber-500", bg: "bg-amber-500/10" },
  { text: "text-fuchsia-300", border: "border-fuchsia-500", bg: "bg-fuchsia-500/10" },
  { text: "text-orange-300", border: "border-orange-500", bg: "bg-orange-500/10" },
  { text: "text-violet-300", border: "border-violet-500", bg: "bg-violet-500/10" },
];

export default function Leaderboard({
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
function getPlayerColor(player: Player, index: number) {
  const order = player.playerOrder ?? player.player_order;

  const colorIndex =
    typeof order === "number" ? order - 1 : index;

  return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
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
        {players.map((player, index) => {
  const color = getPlayerColor(player, index);

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