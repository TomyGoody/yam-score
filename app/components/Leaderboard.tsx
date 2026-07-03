"use client";

type Player = {
  id: string;
  name: string;
  playerOrder?: number;
  player_order?: number;
};



export default function Leaderboard({
  players,
  layout,
  currentPlayerId,
  gameFinished,
  onUndoLastMove,
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
  onUndoLastMove?: () => void;
}) {
  if (players.length === 0) return null;

  return (
    <aside
  className={[
    "rounded-xl border border-[#8B5A2B] bg-black/70 p-3 shadow-xl",
    layout === "side" ? "w-64 shrink-0" : "w-full shrink-0",
  ].join(" ")}
>
      <h3 className="mb-3 text-lg font-black uppercase tracking-wide text-[#F7EFE6]">
  {gameFinished ? "🏆 Partie terminée" : "Classement"}
</h3>
{onUndoLastMove && !gameFinished && (
  <button
    onClick={onUndoLastMove}
    className="mb-3 w-full rounded-lg bg-[#C44934] px-3 py-2 text-xs text-white font-black text-black hover:bg-[#C44934]-700"
  >
    Annuler le dernier coup
  </button>
)}
      <div
  className={[
    "gap-2",
    layout === "side"
      ? "grid"
      : "flex flex-wrap justify-center",
  ].join(" ")}
>
        {players.map((player, index) => {
 

  return (
    <div
  key={player.id}
  className={[
    "shrink-0 rounded-xl border border-[#B87942] bg-black/50 p-4 font-black",
    layout === "side" ? "w-full" : "min-w-56",
  ].join(" ")}
>
  <div className="flex items-start justify-between">
    <span className="text-xl font-black text-[#B84332]">
      #{player.rank}
    </span>

    {player.gap > 0 && (
      <span className="rounded-md bg-[#C44934] px-2 py-1 text-sm text-white">
        -{player.gap}
      </span>
    )}
  </div>

  <div className="mt-2 text-4xl font-black text-[#F7EFE6]">
    {player.total}
  </div>

  <div className="mt-2 text-xl font-black text-[#F7EFE6]">
    {player.name}
  </div>

  {!gameFinished && player.id === currentPlayerId && (
    <div className="mt-2 text-xs font-black text-[#B84332]">
      ▶ Ton tour
    </div>
  )}

  <div className="mt-3 text-sm font-bold text-[#F7EFE6]">
    {player.remainingMoves} coup{player.remainingMoves > 1 ? "s" : ""} restant
    {player.remainingMoves > 1 ? "s" : ""}
  </div>

  <div className="mt-3 flex gap-4 text-xs font-black text-[#F7EFE6]">
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