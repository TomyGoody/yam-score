"use client";

import { useState } from "react";
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
}: {
  players: VictoryPlayer[];
  xpResults: Record<string, XpResult>;
  onBackHome: () => void;
  onViewGrid?: () => void;
  tournamentTheme?: TournamentThemeConfig | null;
}) {
  const [selectedXpPlayerId, setSelectedXpPlayerId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div
  className={[
    "relative w-full max-w-lg overflow-hidden rounded-3xl border-2 p-6 text-white shadow-2xl",
    tournamentTheme
      ? `${tournamentTheme.panelBackground} ${tournamentTheme.border}`
      : "border-[#9B6A28] bg-black",
  ].join(" ")}
>
 {tournamentTheme && (
  <div className="pointer-events-none absolute inset-0 opacity-15">
    <div className="absolute left-1/2 top-0 h-full w-px bg-white" />
    <div className="absolute left-0 top-1/2 h-px w-full bg-white" />
    <div className="absolute left-1/2 top-1/2 h-48 w-72 -translate-x-1/2 -translate-y-1/2 border border-white" />
  </div>
)}

<div className="relative z-10">
  <div className="text-6xl">
  {tournamentTheme ? tournamentTheme.icon : "🏆"}
</div>

<p
  className={[
    "mt-3 text-sm font-black uppercase tracking-[0.3em]",
    tournamentTheme
      ? tournamentTheme.accentText
      : "text-[#C44934]",
  ].join(" ")}
>
  {tournamentTheme ? "Set remporté" : "Partie terminée"}
</p>

<h2 className="mt-2 text-3xl font-black">
  {tournamentTheme ? players[0]?.name : "Classement final"}
</h2>

{tournamentTheme && (
  <p className="mt-2 text-white/70">
    Remporte le set de {tournamentTheme.name}
  </p>
)}

        <div className="mt-6 grid gap-3">
          {players.map((player) => {
            const xp = xpResults[player.id];
            const playerOrder = player.player_order ?? player.playerOrder;

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

                  <div className="text-2xl">{player.total}</div>
                </div>

                {xp && (
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
                        player.rank === 1
                          ? "bg-black/20 text-white hover:bg-black/30"
                          : "bg-black/10 text-black hover:bg-black/15",
                      ].join(" ")}
                    >
                      <span>
                        ⭐ Niveau {xp.newLevel}
                        {xp.newLevel > xp.oldLevel && (
                          <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
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
                          player.rank === 1
                            ? "bg-black/20 text-white"
                            : "bg-black/10 text-black",
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
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
  {onViewGrid && (
    <button
      type="button"
      onClick={onViewGrid}
      className="rounded-xl bg-[#F4E9DC] px-4 py-3 font-black text-[#241812] transition hover:bg-white"
    >
      Voir la grille
    </button>
  )}

  <button
    type="button"
    onClick={onBackHome}
    className={[
      "rounded-xl px-4 py-3 font-black transition",
      tournamentTheme
        ? `${tournamentTheme.border} border bg-black/25 text-white hover:bg-black/40`
        : "bg-[#241A13] text-white hover:bg-[#322217]",
    ].join(" ")}
  >
    {tournamentTheme ? "Retour à la finale" : "Retour accueil"}
  </button>
</div>
        </div>
      </div>
    </div>
  );
}