"use client";

import { useState } from "react";
import Image from "next/image";
import type { TournamentThemeConfig } from "../lib/tournamentThemes";
type VictoryPlayer = {
  id: string;
  name: string;
  total: number;
  rank: number;
  player_order?: number;
  playerOrder?: number;
  basketTeam?: "A" | "B" | null;
};

type XpResult = {
  xpGain: number;
  oldLevel: number;
  newLevel: number;

  baseXp: number;
 
  badgeXp: number;

  badges: {
    label: string;
    milestone: number;
    xp: number;
  }[];
};

export default function VictoryModal({
  players,
  xpResults,
  onBackHome,
  tournamentTheme,
  onViewGrid,
  competitionType,
  competitionFinished,
  isFinalizing,
  basketQuarterScores,
  basketPoints,
}: {
  players: VictoryPlayer[];
  xpResults: Record<string, XpResult>;
  onBackHome: () => void;
  onViewGrid?: () => void;
  tournamentTheme?: TournamentThemeConfig | null;
  competitionType?:
  | "grand_slam_final"
  | "world_cup"
  | "grand_prix"
  | "basket"
  | null;
  competitionFinished?: boolean;
  isFinalizing?: boolean;
  basketQuarterScores?: {
  1: { teamA: number; teamB: number };
  2: { teamA: number; teamB: number };
  3: { teamA: number; teamB: number };
  4: { teamA: number; teamB: number };
} | null;

basketPoints?: {
  teamA: number;
  teamB: number;
} | null;
}) {
  const [selectedXpPlayerId, setSelectedXpPlayerId] = useState<string | null>(null);
const isGrandSlam =
  competitionType === "grand_slam_final";

const isWorldCup =
  competitionType === "world_cup";
const isGrandPrix =
  competitionType === "grand_prix";
  const isBasket =
  competitionType === "basket";
const isWorldCupChampion =
  isWorldCup && competitionFinished;

const winner = players[0] ?? null;
const basketTeamAPlayers = players.filter(
  (player) => player.basketTeam === "A"
);

const basketTeamBPlayers = players.filter(
  (player) => player.basketTeam === "B"
);

const basketTeamAScore = basketTeamAPlayers.reduce(
  (total, player) => total + player.total,
  0
);

const basketTeamBScore = basketTeamBPlayers.reduce(
  (total, player) => total + player.total,
  0
);

const basketWinner =
  basketTeamAScore > basketTeamBScore
    ? "A"
    : basketTeamBScore > basketTeamAScore
      ? "B"
      : null;
      const basketTeamAFinalPoints =
  (basketPoints?.teamA ?? 0) +
  (basketWinner === "A" ? 4 : 0);

const basketTeamBFinalPoints =
  (basketPoints?.teamB ?? 0) +
  (basketWinner === "B" ? 4 : 0);
const GRAND_PRIX_POINTS = [25, 18, 15, 12, 10, 8];

function getGrandPrixPoints(rank: number) {
  return GRAND_PRIX_POINTS[rank - 1] ?? 0;
}
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 px-4 py-4">
  <div className="flex min-h-full items-start justify-center">
  <div
    className={[
      "relative my-auto w-full max-w-lg overflow-hidden rounded-3xl border-2 p-6 text-white shadow-2xl",
      tournamentTheme
        ? tournamentTheme.border
        : "border-[#9B6A28] bg-black",
    ].join(" ")}
    style={
  tournamentTheme
    ? {
        background: tournamentTheme.headerGradient,
      }
    : undefined
}
  >
 {tournamentTheme && !isWorldCup && (
  <div className="pointer-events-none absolute inset-0 opacity-15">
    <div className="absolute left-1/2 top-0 h-full w-px bg-white" />
    <div className="absolute left-0 top-1/2 h-px w-full bg-white" />
    <div className="absolute left-1/2 top-1/2 h-48 w-72 -translate-x-1/2 -translate-y-1/2 border border-white" />
  </div>
)}

<div className="relative z-10">
 {tournamentTheme ? (
  <div className="flex justify-center">
    {tournamentTheme.flagImage ? (
      <Image
        src={tournamentTheme.flagImage}
        alt={`Drapeau — ${tournamentTheme.name}`}
        width={96}
        height={64}
        className="h-16 w-auto rounded-md object-contain shadow-xl"
        priority
      />
    ) : tournamentTheme.headerLogo ? (
      <Image
        src={tournamentTheme.headerLogo}
        alt={tournamentTheme.name}
        width={96}
        height={96}
        className="h-24 w-auto object-contain drop-shadow-xl"
        priority
      />
    ) : (
      <div className="text-6xl">
        {tournamentTheme.icon}
      </div>
    )}
  </div>
) : (
  <div className="text-6xl">🏆</div>
)}

<p
  className={[
    "mt-3 text-sm font-black uppercase tracking-[0.3em]",
    tournamentTheme
      ? tournamentTheme.accentText
      : isWorldCup
        ? "text-emerald-300"
        : "text-[#C44934]",
  ].join(" ")}
>
  {isWorldCupChampion
  ? "Coupe du Monde remportée"
  : isWorldCup
    ? "Match remporté"
    : isGrandSlam
      ? "Set remporté"
      : isGrandPrix
        ? "Grand Prix terminé"
        : isBasket
          ? "Match terminé"
          : "Partie terminée"}
</p>

<h2 className="mt-2 text-3xl font-black">
  {isWorldCupChampion
  ? winner?.name
  : isWorldCup
    ? winner?.name
    : isGrandSlam
      ? winner?.name
      : isGrandPrix
        ? winner?.name
        : isBasket
  ? basketWinner
    ? `Équipe ${basketWinner} remporte le match`
    : "Match nul"
          : "Classement final"}
</h2>
{isGrandPrix && tournamentTheme && (
  <p className="mt-2 text-white/70">
    Remporte le {tournamentTheme.name}
  </p>
)}
{isWorldCupChampion && (
  <p className="mt-2 text-white/70">
    Champion du monde YamScore
  </p>
)}

{isWorldCup && !isWorldCupChampion && (
  <p className="mt-2 text-white/70">
    Se qualifie pour le tour suivant
  </p>
)}

{isGrandSlam && tournamentTheme && (
  <p className="mt-2 text-white/70">
    Remporte le set de {tournamentTheme.name}
  </p>
)}

        {isBasket ? (
  <div className="mt-6 grid gap-4 sm:grid-cols-2">
    <div
      className={[
        "rounded-2xl border-2 p-5 text-center",
        basketWinner === "A"
          ? "border-amber-300 bg-amber-300/15"
          : "border-white/20 bg-black/25",
      ].join(" ")}
    >
      <div className="text-sm font-black uppercase tracking-[0.25em] opacity-70">
        Équipe A
      </div>

      <div className="mt-2 text-5xl font-black">
        {basketTeamAScore}
      </div>

      <div className="mt-2 h-5 text-sm font-black text-amber-300">
  {basketWinner === "A" ? "🏆 Vainqueur" : ""}
</div>

<div className="mt-4 space-y-1 text-sm">
        {basketTeamAPlayers.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between gap-3"
          >
            <span className="truncate font-black">
              {player.name}
            </span>

            <span className="font-black opacity-70">
              {player.total}
            </span>
          </div>
        ))}
      </div>
    </div>

    <div
      className={[
        "rounded-2xl border-2 p-5 text-center",
        basketWinner === "B"
          ? "border-amber-300 bg-amber-300/15"
          : "border-white/20 bg-black/25",
      ].join(" ")}
    >
      <div className="text-sm font-black uppercase tracking-[0.25em] opacity-70">
        Équipe B
      </div>

      <div className="mt-2 text-5xl font-black">
        {basketTeamBScore}
      </div>

      <div className="mt-2 h-5 text-sm font-black text-amber-300">
  {basketWinner === "B" ? "🏆 Vainqueur" : ""}
</div>

<div className="mt-4 space-y-1 text-sm">
        {basketTeamBPlayers.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between gap-3"
          >
            <span className="truncate font-black">
              {player.name}
            </span>

            <span className="font-black opacity-70">
              {player.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
) : (
  <div className="mt-6 grid gap-3">
    {players.map((player) => {
            const xp = xpResults[player.id];
            const grandPrixPoints = isGrandPrix
  ? getGrandPrixPoints(player.rank)
  : null;
            const playerOrder = player.player_order ?? player.playerOrder;
const useDarkXpText =
  player.rank === 1 && !!tournamentTheme;
            return (
              <div
                key={player.id}
                className={[
  "rounded-2xl border px-5 py-4 font-black",
  tournamentTheme
    ? player.rank === 1
      ? `${tournamentTheme.border} ${tournamentTheme.scoreBackground} ${tournamentTheme.scoreText}`
      : `${tournamentTheme.border} bg-black/25 text-white`
    : player.rank === 1
      ? "border-[#C44934] bg-[#C44934] text-white"
      : "border-[#D7C4B3] bg-[#F4E9DC] text-black",
].join(" ")}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-left">
                    <div className="text-lg">
                      {player.rank === 1
                        ? "🥇"
                        : player.rank === 2
                        ? "🥈"
                        : player.rank === 3
                        ? "🥉"
                        : `#${player.rank}`}{" "}
                      {player.name}
                    </div>

                    {playerOrder && (
                      <div className="mt-1 text-xs opacity-70">
                        Joueur {playerOrder}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
  <div className="text-2xl">
    {player.total}
  </div>

  {grandPrixPoints !== null && (
    <div className="mt-1 text-sm font-black opacity-70">
      +{grandPrixPoints} pts championnat
    </div>
  )}
 
</div>
                </div>

                {isFinalizing ? (
  <div
    className={[
      "mt-3 flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-black",
      useDarkXpText
  ? "bg-black/10 text-[#241812]"
  : "bg-white/10 text-white"
    ].join(" ")}
  >
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    Calcul de la progression…
  </div>
) : xp ? (
  <div className="mt-3">
    <button
      type="button"
      onClick={() =>
        setSelectedXpPlayerId(
          selectedXpPlayerId === player.id ? null : player.id
        )
      }
      className={[
        "flex w-full items-center justify-between rounded-xl p-3 text-left text-sm font-black transition",
        useDarkXpText
  ? "bg-black/10 text-[#241812] hover:bg-black/15"
  : "bg-white/10 text-white hover:bg-white/15"
      ].join(" ")}
    >
      <span>
        ⭐ Niveau {xp.newLevel}

        {xp.newLevel > xp.oldLevel && (
          <span
            className={[
              "ml-2 rounded-full px-2 py-0.5",
              useDarkXpText
  ? "bg-emerald-600/15 text-emerald-800"
  : "bg-emerald-400/20 text-emerald-300",
            ].join(" ")}
          >
            +{xp.newLevel - xp.oldLevel}
          </span>
        )}
      </span>

      <span>
        +{xp.xpGain} XP{" "}
        {selectedXpPlayerId === player.id ? "▲" : "▼"}
      </span>
    </button>

    {selectedXpPlayerId === player.id && (
      <div
        className={[
          "mt-2 rounded-xl p-3 text-left text-xs font-black",
          useDarkXpText
  ? "bg-black/10 text-[#241812]"
  : "bg-white/10 text-white"
        ].join(" ")}
      >
        <div className="flex justify-between">
          <span>Progression</span>
          <span>+{xp.baseXp} XP</span>
        </div>

        <div className="mt-2 flex justify-between">
          <span>Succès</span>
          <span>+{xp.badgeXp} XP</span>
        </div>

        {xp.badges.length > 0 && (
          <div className="mt-3 space-y-1">
            {xp.badges.map((badge) => (
              <div
                key={`${badge.label}-${badge.milestone}`}
                className="opacity-80"
              >
                🏅 {badge.label} · {badge.milestone} (+{badge.xp} XP)
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
) : null}
              </div>
            );
              })}
  </div>
)}
{isBasket && basketQuarterScores && basketPoints && (
  <div className="mt-5 rounded-2xl border border-white/15 bg-black/25 p-4">
    <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-white/70">
      Détail du match
    </div>

    <div className="grid grid-cols-4 gap-2">
      {([1, 2, 3, 4] as const).map((quarter) => {
        const score = basketQuarterScores[quarter];

        const winner =
          score.teamA > score.teamB
            ? "A"
            : score.teamB > score.teamA
              ? "B"
              : null;

        return (
          <div
            key={quarter}
            className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-1 py-2 text-center"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-white/50">
              Q{quarter}
            </div>

           <div className="mt-1 flex min-w-0 items-center justify-center gap-1 whitespace-nowrap text-[13px] font-black tracking-tight">
  <span
    className={
      winner === "A"
        ? "text-amber-300"
        : ""
    }
  >
    {score.teamA}
  </span>

  <span className="text-white/40">
    -
  </span>

  <span
    className={
      winner === "B"
        ? "text-amber-300"
        : ""
    }
  >
    {score.teamB}
  </span>
</div>

            <div className="mt-1 text-[9px] font-black text-white/40">
              {winner
                ? `Équipe ${winner}`
                : "Égalité"}
            </div>
          </div>
        );
      })}
    </div>

    <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-xs font-black uppercase tracking-wider text-white/50">
        Points Basket
      </div>

      <div className="text-xl font-black">
        <span className="text-orange-300">
          {basketTeamAFinalPoints}
        </span>

        <span className="mx-3 text-white/40">
          -
        </span>

        <span className="text-blue-300">
          {basketTeamBFinalPoints}
        </span>
      </div>
    </div>
  </div>
)}
 {isBasket && (
  <div className="mt-5">
    <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-white/70">
      Progression des joueurs
    </div>

    <div className="grid gap-2">
      {players.map((player) => {
        const xp = xpResults[player.id];

        if (!xp) {
          return null;
        }

        return (
          <div
            key={player.id}
            className="rounded-xl border border-white/15 bg-black/25 p-3"
          >
            <button
              type="button"
              onClick={() =>
                setSelectedXpPlayerId(
                  selectedXpPlayerId === player.id
                    ? null
                    : player.id
                )
              }
              className="flex w-full items-center justify-between gap-4 text-left font-black"
            >
              <div>
                <div className="text-sm">
                  {player.name}
                </div>

                <div className="mt-0.5 text-xs opacity-60">
                  Équipe {player.basketTeam}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm">
                  ⭐ Niveau {xp.newLevel}
                </div>

                <div className="mt-0.5 text-xs text-amber-300">
                  +{xp.xpGain} XP{" "}
                  {selectedXpPlayerId === player.id
                    ? "▲"
                    : "▼"}
                </div>
              </div>
            </button>

            {selectedXpPlayerId === player.id && (
              <div className="mt-3 border-t border-white/10 pt-3 text-xs font-black">
                <div className="flex justify-between">
                  <span>Progression</span>
                  <span>+{xp.baseXp} XP</span>
                </div>

                <div className="mt-2 flex justify-between">
                  <span>Succès</span>
                  <span>+{xp.badgeXp} XP</span>
                </div>

                {xp.badges.length > 0 && (
                  <div className="mt-3 space-y-1 text-white/70">
                    {xp.badges.map((badge) => (
                      <div
                        key={`${badge.label}-${badge.milestone}`}
                      >
                        🏅 {badge.label} · {badge.milestone}
                        {" "}
                        (+{badge.xp} XP)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
  {onViewGrid && (
    <button
  type="button"
  onClick={onViewGrid}
  disabled={isFinalizing}
  className="rounded-xl bg-[#F4E9DC] px-4 py-3 font-black text-[#241812] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
>
  {isFinalizing ? "Sauvegarde en cours…" : "Voir la grille"}
</button>
  )}

  <button
    type="button"
    onClick={onBackHome}
    disabled={isFinalizing}
    className={[
  "rounded-xl px-4 py-3 font-black transition disabled:cursor-not-allowed disabled:opacity-40",
  tournamentTheme
    ? `${tournamentTheme.border} border bg-black/25 text-white hover:bg-black/40`
    : "bg-[#241A13] text-white hover:bg-[#322217]",
].join(" ")}
  >
    {isFinalizing
  ? "Finalisation en cours…"
  : isWorldCupChampion
    ? "Voir le champion"
    : isWorldCup
      ? "Retour à la Coupe du Monde"
      : isGrandSlam
        ? "Retour à la finale"
        : isGrandPrix
  ? "Retour à la saison"
  : isBasket
    ? "Retour à la compétition"
    : "Retour accueil"}
  </button>
</div>
</div>
        </div>
      </div>
    </div>
  );
}