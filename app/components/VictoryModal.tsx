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
}: {
  players: VictoryPlayer[];
  xpResults: Record<string, XpResult>;
  onBackHome: () => void;
  onViewGrid?: () => void;
  tournamentTheme?: TournamentThemeConfig | null;
  competitionType?:
  | "world_cup"
  | "grand_slam_final"
  | "grand_prix"
  | null;
  competitionFinished?: boolean;
  isFinalizing?: boolean;
}) {
  const [selectedXpPlayerId, setSelectedXpPlayerId] = useState<string | null>(null);
const isGrandSlam =
  competitionType === "grand_slam_final";

const isWorldCup =
  competitionType === "world_cup";
const isGrandPrix =
  competitionType === "grand_prix";
const isWorldCupChampion =
  isWorldCup && competitionFinished;

const winner = players[0] ?? null;
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

        <div className="mt-6 grid gap-3">
          {players.map((player) => {
            const xp = xpResults[player.id];
            const grandPrixPoints = isGrandPrix
  ? getGrandPrixPoints(player.rank)
  : null;
            const playerOrder = player.player_order ?? player.playerOrder;
const useDarkXpText =
  !tournamentTheme && player.rank !== 1;
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
          : "Retour accueil"}
  </button>
</div>
</div>
        </div>
      </div>
    </div>
  );
}