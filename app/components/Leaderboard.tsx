"use client";
import type { TournamentThemeConfig } from "../lib/tournamentThemes";
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
  tournamentTheme,
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
  tournamentTheme?: TournamentThemeConfig | null;
}) {
  if (players.length === 0) return null;

  return (
    <aside
  className={[
    "rounded-xl border p-3 shadow-xl",
    layout === "side" ? "w-64 shrink-0" : "w-full shrink-0",
    tournamentTheme
      ? `${tournamentTheme.border} bg-black/35 backdrop-blur-sm`
      : "border-[#8B5A2B] bg-black/70",
  ].join(" ")}
>
      <h3
  className={[
    "mb-3 text-lg font-black uppercase tracking-wide",
    tournamentTheme
      ? tournamentTheme.accentText
      : "text-[#F7EFE6]",
  ].join(" ")}
>
  {gameFinished ? "🏆 Partie terminée" : "Classement"}
</h3>
{onUndoLastMove && !gameFinished && (
  <button
    onClick={onUndoLastMove}
    className="mb-3 w-full rounded-lg bg-[#C44934] px-3 py-2 text-xs font-black text-white hover:bg-[#D75A43]"
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
        {players.map((player) => {
 const playerTextClass = tournamentTheme
  ? "text-[#241812]"
  : "text-[#F7EFE6]";

  return (
    <div
  key={player.id}
  className={[
  "shrink-0 rounded-xl border p-4 font-black",
  layout === "side" ? "w-full" : "min-w-56",
  tournamentTheme
    ? `${tournamentTheme.border} bg-[#F4E9DC] text-[#241812]`
    : "border-[#B87942] bg-black/50 text-white",
].join(" ")}
>
  <div className="flex items-start justify-between">
    <span
  className={[
    "text-xl font-black",
    tournamentTheme
      ? tournamentTheme.accentDarkText
      : "text-[#B84332]",
  ].join(" ")}
>
      #{player.rank}
    </span>

    {player.gap > 0 && (
      <span className="rounded-md bg-[#C44934] px-2 py-1 text-sm text-white">
        -{player.gap}
      </span>
    )}
  </div>

  <div
  className={[
    "mt-2 text-4xl font-black",
    playerTextClass,
  ].join(" ")}
>
  {player.total}
</div>

 <div
  className={[
    "mt-2 text-xl font-black",
    playerTextClass,
  ].join(" ")}
>
  {player.name}
</div>

  {!gameFinished && player.id === currentPlayerId && (
  <div
    className={[
      "mt-2 text-xs font-black",
      tournamentTheme
        ? tournamentTheme.accentDarkText
        : "text-[#B84332]",
    ].join(" ")}
  >
    ▶ Ton tour
  </div>
)}

  <div
  className={[
    "mt-3 text-sm font-bold",
    playerTextClass,
  ].join(" ")}
>
  {player.remainingMoves} coup
  {player.remainingMoves > 1 ? "s" : ""} restant
  {player.remainingMoves > 1 ? "s" : ""}
</div>

<div
  className={[
    "mt-3 flex gap-4 text-xs font-black",
    playerTextClass,
  ].join(" ")}
>
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