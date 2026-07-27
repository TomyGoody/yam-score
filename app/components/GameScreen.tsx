"use client";

import Image from "next/image";
import {
  getTournamentTheme,
  
} from "../lib/tournamentThemes";
import type {
  CompetitionHeaderData,
} from "../lib/competitionTypes";
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
  console.log({
  competitionHeader,
  tournamentTheme,
});

  return (
    <section
  className="relative flex h-full min-h-0 flex-col overflow-hidden"
  style={{
    backgroundColor:
      tournamentTheme?.pageBackgroundColor ?? "#000000",
  }}
>
  {tournamentTheme?.backgroundImage && (
  <>
    <div
      className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('${tournamentTheme.backgroundImage}')`,
      }}
    />

    <div className="pointer-events-none absolute inset-0 bg-black/45" />

    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.52) 55%, rgba(0,0,0,0.80) 100%)",
      }}
    />

    {tournamentTheme.backgroundGlow && (
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: tournamentTheme.backgroundGlow,
        }}
      />
    )}
  </>
)}
     {!tournamentTheme?.backgroundImage && (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
    <Image
      src="/favicon.png"
      alt=""
      width={1000}
      height={1000}
      className="select-none rotate-[-12deg]"
    />
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
  fitToScreen && "py-5",
  useSideLeaderboard ? "items-start" : "flex-col",
]
  .filter(Boolean)
  .join(" ")}
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
    "relative z-20 shrink-0 border-b px-5 py-3 text-white shadow-xl",
    competition.competitionType === "world_cup"
  ? "border-[#D69E1F]/70"
  : tournamentTheme.border
  ].join(" ")}
  style={{
  background: tournamentTheme.headerGradient,
}}
>
  <div className="mx-auto flex w-full max-w-[1900px] items-center justify-between gap-6">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center">
  <Image
    src={tournamentTheme.headerLogo}
    alt={tournamentTheme.name}
    width={56}
    height={56}
    className="max-h-14 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.18)]"
    priority
  />
</div>

      <div className="min-w-0">
       <p
  className={[
    "truncate font-black uppercase",
    competition.competitionType === "world_cup"
      ? "text-xl tracking-[0.08em] text-[#DDB35A]"
      : "text-xs tracking-[0.18em] text-white/70",
  ].join(" ")}
>
  {competition.tournamentName}
</p>

        <p
  className={[
    "truncate font-black",
    competition.competitionType === "world_cup"
      ? "mt-0.5 text-lg text-white"
      : "text-base",
  ].join(" ")}
>
  {competition.roundLabel ??
    `Finale · Set ${competition.roundNumber}`}
</p>
      </div>
    </div>

    <div className="hidden items-center gap-3 md:flex">
  <span className="max-w-[180px] truncate text-xl font-black tracking-wide">
  {player1?.name ?? "Joueur 1"}
</span>

  {competition.competitionType === "world_cup" ? (
    <div className="rounded-xl border border-[#D4A74A] bg-[#D4A74A]/10 px-5 py-2 text-base font-black tracking-[0.18em] text-[#FFF2BF] shadow-[0_0_20px_rgba(244,197,66,0.22)]">
  VS
</div>
  ) : (
    <div className="rounded-lg border border-white/20 bg-black/20 px-3 py-1 text-base font-black">
      {competition.player1SetsWon}–{competition.player2SetsWon}
    </div>
  )}

  <span className="max-w-[180px] truncate text-xl font-black tracking-wide">
  {player2?.name ?? "Joueur 2"}
</span>
</div>

    <div className="flex items-center gap-3">
  <button
    type="button"
    onClick={() =>
      setFitToScreen((current: boolean) => !current)
    }
    className={[
      "rounded-xl px-4 py-2.5 text-xs font-black transition",
      competition.competitionType === "world_cup"
        ? "border border-[#315F2D] bg-[#07130D]/90 text-white hover:border-[#D4A74A]/60 hover:bg-[#0B1E14]"
        : "bg-black/20 hover:bg-black/35",
    ].join(" ")}
  >
    {fitToScreen ? "Taille normale" : "Adapter"}
  </button>

  <button
    type="button"
    onClick={toggleFullscreen}
    className={[
      "rounded-xl px-4 py-2.5 text-xs font-black transition",
      competition.competitionType === "world_cup"
        ? "border border-[#315F2D] bg-[#07130D]/90 text-white hover:border-[#D4A74A]/60 hover:bg-[#0B1E14]"
        : "bg-black/20 hover:bg-black/35",
    ].join(" ")}
  >
    Plein écran
  </button>

  {process.env.NODE_ENV === "development" &&
    devFillRandomGame && (
      <button
        type="button"
        onClick={devFillRandomGame}
        className={[
          "rounded-xl px-4 py-2.5 text-xs font-black transition",
          competition.competitionType === "world_cup"
            ? "border border-[#D4A74A]/70 bg-[#D4A74A]/10 text-[#FFF2BF] hover:bg-[#D4A74A]/20"
            : "bg-purple-700 text-white hover:bg-purple-600",
        ].join(" ")}
      >
        🧪
      </button>
    )}

  {onUndoLastMove && (
    <button
      type="button"
      onClick={onUndoLastMove}
      className={[
        "rounded-xl px-4 py-2.5 text-xs font-black transition",
        competition.competitionType === "world_cup"
          ? "border border-[#D4A74A]/70 bg-[#D4A74A]/10 text-[#FFF2BF] hover:bg-[#D4A74A]/20"
          : "border border-amber-300/40 bg-amber-500/90 text-black hover:bg-amber-400",
      ].join(" ")}
    >
      ↶ Annuler
    </button>
  )}

  {onOpenPlayerAccess && (
    <button
      type="button"
      onClick={onOpenPlayerAccess}
      className={[
        "rounded-xl px-4 py-2.5 text-xs font-black transition",
        competition.competitionType === "world_cup"
          ? "border border-[#315F2D] bg-[#07130D]/90 text-white hover:border-[#D4A74A]/60 hover:bg-[#0B1E14]"
          : "border border-white/20 bg-black/20 hover:bg-black/35",
      ].join(" ")}
    >
      Accès joueurs
    </button>
  )}

  {onBack && (
    <button
      type="button"
      onClick={onBack}
      className={[
        "rounded-xl px-4 py-2.5 text-xs font-black transition",
        competition.competitionType === "world_cup"
          ? "border border-[#315F2D] bg-[#07130D]/90 text-white hover:border-[#D4A74A]/60 hover:bg-[#0B1E14]"
          : "border border-white/20 bg-black/20 hover:bg-black/35",
      ].join(" ")}
    >
      {competition.competitionType === "world_cup"
        ? "Voir le tableau"
        : "Voir la finale"}
    </button>
  )}

  <button
    type="button"
    onClick={quitGame}
    className={[
      "rounded-xl px-4 py-2.5 text-xs font-black text-white transition",
      competition.competitionType === "world_cup"
        ? "border border-red-400/40 bg-[#C93838] shadow-[0_0_16px_rgba(201,56,56,0.15)] hover:bg-[#DB4747]"
        : "bg-[#C44934] hover:bg-[#D75A43]",
    ].join(" ")}
  >
    {quitLabel ?? "Quitter"}
  </button>
</div>
  </div>
</div>
);
}