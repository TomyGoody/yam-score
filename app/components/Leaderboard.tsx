"use client";
import type { TournamentThemeConfig } from "../lib/tournamentThemes";
type Player = {
  id: string;
  name: string;
  playerOrder?: number;
  player_order?: number;
  basketTeam?: "A" | "B" | null;
};



export default function Leaderboard({
  players,
  layout,
  currentPlayerId,
  gameFinished,
  onUndoLastMove,
  tournamentTheme,
  historyMode = false,
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
      championshipPoints: number | null;
provisionalGrandPrixPoints: number;

    }
  >;
  historyMode?: boolean;
  layout: "side" | "bottom";
  currentPlayerId: string | null;
  gameFinished: boolean;
  onUndoLastMove?: () => void;
  tournamentTheme?: TournamentThemeConfig | null;
}) {
  if (players.length === 0) return null;
const leaderboardTheme =
  tournamentTheme?.leaderboard ?? null;

const hasCustomLeaderboardTheme =
  Boolean(leaderboardTheme);
  return (
    <aside
  className={[
    "rounded-xl border p-3 shadow-xl",
    layout === "side" ? "w-64 shrink-0" : "w-full shrink-0",
    !hasCustomLeaderboardTheme
      ? tournamentTheme
        ? `${tournamentTheme.border} bg-black/35 backdrop-blur-sm`
        : "border-[#8B5A2B] bg-black/70"
      : "",
  ].join(" ")}
  style={
    leaderboardTheme
      ? {
          borderColor: leaderboardTheme.border,
          background: leaderboardTheme.background,
        }
      : undefined
  }
>
      <h3
  className={[
    "mb-3 text-lg font-black uppercase tracking-wide",
    !leaderboardTheme
      ? tournamentTheme
        ? tournamentTheme.accentText
        : "text-[#F7EFE6]"
      : "",
  ].join(" ")}
  style={{
    color: leaderboardTheme?.titleText,
  }}
>
  {gameFinished ? "🏆 Partie terminée" : "Classement"}
</h3>
{onUndoLastMove && !gameFinished && (
  <button
    onClick={onUndoLastMove}
    className={[
      "mb-3 w-full rounded-lg px-3 py-2 text-xs font-black text-white transition",
      tournamentTheme
        ? `${tournamentTheme.buttonBackground} ${tournamentTheme.buttonHover}`
        : "bg-[#C44934] hover:bg-[#D75A43]",
    ].join(" ")}
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
 const playerTextClass =
  leaderboardTheme
    ? "text-white"
    : tournamentTheme
      ? "text-[#241812]"
      : "text-[#F7EFE6]";
const basketTeamColor =
  player.basketTeam === "A"
    ? "#F47B20"
    : player.basketTeam === "B"
      ? "#3B82F6"
      : null;

const isBasketTheme =
  tournamentTheme?.id === "basket";
  return (
    <div
  key={player.id}
  className={[
    "shrink-0 rounded-xl border p-3 font-black",
    layout === "side" ? "w-full" : "w-48",
    !leaderboardTheme
      ? tournamentTheme
        ? `${tournamentTheme.border} bg-[#F4E9DC] text-[#241812]`
        : "border-[#B87942] bg-black/50 text-white"
      : "text-white",
  ].join(" ")}
  style={
  leaderboardTheme
    ? {
        borderColor:
          isBasketTheme && basketTeamColor
            ? basketTeamColor
            : leaderboardTheme.cardBorder,

        background: leaderboardTheme.cardBackground,
      }
    : undefined
}
>
  <div className="flex items-start justify-between gap-3">
  <span
    className={[
      "text-xl font-black",
      !leaderboardTheme
        ? tournamentTheme
          ? tournamentTheme.accentDarkText
          : "text-[#B84332]"
        : "",
    ].join(" ")}
    style={{
      color: leaderboardTheme?.rankText,
    }}
  >
    #{player.rank}
  </span>

  <div className="leading-tight text-right">
    {!historyMode &&
  player.championshipPoints != null && (
      <>
        <div
          className={[
            "text-[10px] font-black uppercase tracking-widest",
            !leaderboardTheme
              ? tournamentTheme
                ? tournamentTheme.accentDarkText
                : "text-[#C44934]"
              : "",
          ].join(" ")}
          style={{
            color: leaderboardTheme?.rankText,
          }}
        >
          Championnat
        </div>

        <div
          className={[
            "text-lg font-black",
            playerTextClass,
          ].join(" ")}
        >
          {player.championshipPoints} pts
        </div>

        <div
          className={[
            "text-[10px] font-black opacity-60",
            playerTextClass,
          ].join(" ")}
        >
          +{player.provisionalGrandPrixPoints} provisoires
        </div>
      </>
    )}

    
  </div>
</div>

<div className="mt-1 flex items-center gap-2">
  <div
    className={[
      "text-3xl font-black",
      playerTextClass,
    ].join(" ")}
  >
    {player.total}
  </div>

  {player.gap > 0 && (
    <span className="rounded-md bg-[#C44934] px-2 py-0.5 text-[10px] text-white">
      -{player.gap}
    </span>
  )}
</div>

<div
  className={[
    "mt-0.5 flex items-center gap-2 text-base font-black",
    playerTextClass,
  ].join(" ")}
>
  {isBasketTheme && basketTeamColor && (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{
        backgroundColor: basketTeamColor,
        boxShadow: `0 0 5px ${basketTeamColor}80`,
      }}
      title={`Équipe ${player.basketTeam}`}
    />
  )}

  <span>{player.name}</span>
</div>

{!gameFinished && player.id === currentPlayerId && (
  <div
    className={[
      "mt-1 text-[10px] font-black",
      leaderboardTheme
        ? ""
        : tournamentTheme
          ? tournamentTheme.accentDarkText
          : "text-[#B84332]",
    ].join(" ")}
    style={{
      color:
        tournamentTheme?.sheet?.activeText ??
        undefined,
    }}
  >
    ▶ Ton tour
  </div>
)}

<div
  className={[
    "mt-2 text-[10px] font-bold",
    playerTextClass,
  ].join(" ")}
>
  {player.remainingMoves} coup
  {player.remainingMoves > 1 ? "s" : ""} restant
  {player.remainingMoves > 1 ? "s" : ""}
</div>

<div
  className={[
    "mt-1 flex gap-3 text-[10px] font-black",
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