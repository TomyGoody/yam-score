"use client";

import Image from "next/image";
import {
  getTournamentTheme,
  TournamentTheme,
} from "../lib/tournamentThemes";
type CompetitionHeaderData = {
  competitionId: string;
  roundNumber: number;
  theme: TournamentTheme;
  tournamentName: string;
  player1SetsWon: number;
  player2SetsWon: number;
};

export default function GameScreen({
  fitToScreen,
  setFitToScreen,
  toggleFullscreen,
  quitGame,
    quitLabel,
  useSideLeaderboard,
  viewportRef,
  sheetRef,
  fitOffsetX,
  fitOffsetY,
  fitScale,
  onUndoLastMove,
  players,
  PlayerSheetComponent,
  playerSheetProps,
  onOpenPlayerAccess,
  LeaderboardComponent,
  leaderboardProps,
  devFillRandomGame,
  competitionHeader,
  onBackToCompetition,
}: {
  fitToScreen: boolean;
  setFitToScreen: (value: boolean | ((current: boolean) => boolean)) => void;
  toggleFullscreen: () => void;
  quitGame: () => void;
  useSideLeaderboard: boolean;
  quitLabel?: string;
  onOpenPlayerAccess?: () => void;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  sheetRef: React.RefObject<HTMLDivElement | null>;
  fitOffsetX: number;
  onUndoLastMove?: () => void;
  fitOffsetY: number;
  fitScale: number;
  players: any[];
  PlayerSheetComponent: React.ComponentType<any>;
  playerSheetProps: Record<string, any>;
  LeaderboardComponent: React.ComponentType<any>;
  leaderboardProps: Record<string, any>;
  devFillRandomGame?: () => void;
  
  competitionHeader?: CompetitionHeaderData | null;
  onBackToCompetition?: () => void;
}) {
  const tournamentTheme = competitionHeader
  ? getTournamentTheme(competitionHeader.theme)
  : null;
  return (
    <section
  className={[
    "relative flex h-full min-h-0 flex-col overflow-hidden",
    tournamentTheme?.pageBackground ?? "bg-black",
  ].join(" ")}
>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
        <Image
          src="/favicon.png"
          alt=""
          width={1000}
          height={1000}
          className="select-none rotate-[-12deg]"
        />
      </div>
      {tournamentTheme && (
  <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.08]">
    <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white" />

    <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white" />

    <div className="absolute left-1/2 top-1/2 h-[58%] w-[72%] -translate-x-1/2 -translate-y-1/2 border border-white" />

    <div className="absolute left-1/2 top-1/2 h-[58%] w-px -translate-x-1/2 -translate-y-1/2 bg-white" />

    <div className="absolute left-1/2 top-1/2 h-[58%] w-[28%] -translate-x-1/2 -translate-y-1/2 border-x border-white" />
  </div>
)}

      {competitionHeader ? (
  <CompetitionGameHeader
    competition={competitionHeader}
    players={players}
    onBack={onBackToCompetition}
    fitToScreen={fitToScreen}
    setFitToScreen={setFitToScreen}
    toggleFullscreen={toggleFullscreen}
    onUndoLastMove={onUndoLastMove}
    onOpenPlayerAccess={onOpenPlayerAccess}
    quitGame={quitGame}
    quitLabel={quitLabel}
    devFillRandomGame={devFillRandomGame}
  />
) : (
  <div className="relative z-20 flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-black px-3">
    <div className="text-xs font-black uppercase text-white">
      {fitToScreen ? "Affichage adapté" : "Affichage normal"}
    </div>

    <div className="flex gap-2">
      <button
        type="button"
        onClick={() =>
          setFitToScreen((current: boolean) => !current)
        }
        className="rounded-lg bg-[#241A13] px-4 py-2 text-sm font-black hover:bg-[#322217]"
      >
        {fitToScreen ? "Taille normale" : "Adapter à l'écran"}
      </button>

      <button
        type="button"
        onClick={toggleFullscreen}
        className="rounded-lg bg-[#241A13] px-4 py-2 text-sm font-black hover:bg-[#322217]"
      >
        Plein écran
      </button>

      {process.env.NODE_ENV === "development" &&
        devFillRandomGame && (
          <button
            type="button"
            onClick={devFillRandomGame}
            className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-black text-white hover:bg-purple-600"
          >
            🧪 Remplir
          </button>
        )}
{onUndoLastMove && (
  <button
    type="button"
    onClick={onUndoLastMove}
    className="rounded-lg border border-amber-500/40 bg-amber-600 px-3 py-2 text-sm font-black text-white transition hover:bg-amber-500"
  >
    ↶ Annuler
  </button>
)}
      <button
        type="button"
        onClick={quitGame}
        className="rounded-lg bg-[#C44934] px-4 py-2 text-sm font-black hover:bg-[#D75A43]"
      >
        {quitLabel ?? "Quitter"}
      </button>
    </div>
  </div>
)}

      {/* Zone utilisée pour le calcul Adapter à l’écran */}
      <div
        ref={viewportRef}
        className={[
          "relative z-10 min-h-0 flex-1",
          fitToScreen ? "overflow-hidden" : "overflow-auto p-3",
        ].join(" ")}
      >
        <div
          ref={sheetRef}
          style={
            fitToScreen
              ? {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: `translate(${fitOffsetX}px, ${fitOffsetY}px) scale(${fitScale})`,
                  transformOrigin: "top left",
                }
              : {
                  position: "relative",
                  transform: "none",
                  transformOrigin: "top left",
                }
          }
          className={[
            "flex w-max gap-3",
            useSideLeaderboard ? "items-start" : "flex-col",
          ].join(" ")}
        >
          <div className="flex w-max items-start gap-3">
            {players.map((player: any) => (
              <PlayerSheetComponent
  key={player.id}
  player={player}
  tournamentTheme={tournamentTheme}
  {...playerSheetProps}
/>
            ))}
          </div>

          <LeaderboardComponent
  layout={useSideLeaderboard ? "side" : "bottom"}
  tournamentTheme={tournamentTheme}
  {...leaderboardProps}
/>
        </div>
      </div>
    </section>
  );
}

function CompetitionGameHeader({
  competition,
  players,
  onBack,
  fitToScreen,
  setFitToScreen,
  toggleFullscreen,
  quitGame,
  quitLabel,
  devFillRandomGame,
  onUndoLastMove,
  onOpenPlayerAccess,
}: {
  competition: CompetitionHeaderData;
  players: any[];
  onBack?: () => void;
  fitToScreen: boolean;
setFitToScreen: (value: boolean | ((current: boolean) => boolean)) => void;
toggleFullscreen: () => void;
quitGame: () => void;
onUndoLastMove?: () => void;
quitLabel?: string;
devFillRandomGame?: () => void;
onOpenPlayerAccess?: () => void;
}) {
  const player1 = players[0];
  const player2 = players[1];

  const tournamentTheme = getTournamentTheme(competition.theme);

  return (
  <div
  className={[
    "relative z-20 shrink-0 border-b px-3 py-2 text-white",
    tournamentTheme.panelBackground,
    tournamentTheme.border,
  ].join(" ")}
>
  <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/20 text-sm font-black">
        {tournamentTheme.icon}
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-black uppercase tracking-widest text-white/70">
          {competition.tournamentName}
        </p>

        <p className="truncate text-base font-black">
          Finale · Set {competition.roundNumber}
        </p>
      </div>
    </div>

    <div className="hidden items-center gap-3 md:flex">
      <span className="max-w-[140px] truncate text-sm font-black">
        {player1?.name ?? "Joueur 1"}
      </span>

      <div className="rounded-lg border border-white/20 bg-black/20 px-3 py-1 text-base font-black">
        {competition.player1SetsWon}–
        {competition.player2SetsWon}
      </div>

      <span className="max-w-[140px] truncate text-sm font-black">
        {player2?.name ?? "Joueur 2"}
      </span>
    </div>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() =>
          setFitToScreen((current: boolean) => !current)
        }
        className="rounded-lg bg-black/20 px-3 py-2 text-xs font-black transition hover:bg-black/35"
      >
        {fitToScreen ? "Taille normale" : "Adapter"}
      </button>

      <button
        type="button"
        onClick={toggleFullscreen}
        className="rounded-lg bg-black/20 px-3 py-2 text-xs font-black transition hover:bg-black/35"
      >
        Plein écran
      </button>

      {process.env.NODE_ENV === "development" &&
        devFillRandomGame && (
          <button
            type="button"
            onClick={devFillRandomGame}
            className="rounded-lg bg-purple-700 px-3 py-2 text-xs font-black text-white hover:bg-purple-600"
          >
            🧪
          </button>
        )}
{onUndoLastMove && (
  <button
    type="button"
    onClick={onUndoLastMove}
    className="rounded-lg border border-amber-300/40 bg-amber-500/90 px-3 py-2 text-xs font-black text-black transition hover:bg-amber-400"
  >
    ↶ Annuler
  </button>
)}
{onOpenPlayerAccess && (
  <button
    type="button"
    onClick={onOpenPlayerAccess}
    className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-xs font-black transition hover:bg-black/35"
  >
    Accès joueurs
  </button>
)}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-xs font-black transition hover:bg-black/35"
        >
          Voir la finale
        </button>
      )}

      <button
        type="button"
        onClick={quitGame}
        className="rounded-lg bg-[#C44934] px-3 py-2 text-xs font-black transition hover:bg-[#D75A43]"
      >
        {quitLabel ?? "Quitter"}
      </button>
    </div>
  </div>
</div>
);
}