"use client";

import Image from "next/image";
import {
  getTournamentTheme,
} from "../lib/tournamentThemes";

import {
  getGrandPrixCircuitTheme,
} from "../lib/grandPrixThemes";
import type {
  CompetitionHeaderData,
} from "../lib/competitionTypes";
export default function GameScreen({
  fitToScreen,
  setFitToScreen,
  highContrast,
  setHighContrast,
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
  highContrast: boolean;
setHighContrast: (
  value: boolean | ((current: boolean) => boolean)
) => void;
  competitionHeader?: CompetitionHeaderData | null;
  onBackToCompetition?: () => void;
}) {
  const tournamentTheme = competitionHeader
  ? competitionHeader.competitionType === "grand_prix"
    ? getGrandPrixCircuitTheme(competitionHeader.circuitId)
    : getTournamentTheme(competitionHeader.theme)
  : null;
  

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

    <div
      className={[
        "pointer-events-none absolute inset-0",
        competitionHeader?.competitionType === "grand_prix"
          ? "bg-black/20"
          : competitionHeader?.competitionType === "basket"
            ? "bg-black/20"
            : "bg-black/20",
      ].join(" ")}
    />

    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          competitionHeader?.competitionType === "basket"
            ? "linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.38) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.52) 55%, rgba(0,0,0,0.80) 100%)",
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
    highContrast={highContrast}
setHighContrast={setHighContrast}
  />
) : (
  <div className="relative z-20 flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-black px-3">
    <div className="flex shrink-0 items-center gap-3">
  <div className="text-xs font-black uppercase text-white">
    {fitToScreen ? "Affichage adapté" : "Affichage normal"}
  </div>

  <button
  type="button"
  onClick={() => setHighContrast((current) => !current)}
  className="shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-black transition"
  style={{
    backgroundColor: highContrast ? "#D7B53F" : "#241A13",
    borderColor: highContrast ? "#F0D468" : "rgba(255,255,255,0.15)",
    color: highContrast ? "#111111" : "#FFFFFF",
  }}
  aria-pressed={highContrast}
  title="Activer ou désactiver le contraste renforcé"
>
  Contraste {highContrast ? "✓" : ""}
</button>
</div>

<div className="flex min-w-0 items-center gap-2 overflow-x-auto">
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
  grandPrixCircuitId={
    competitionHeader?.competitionType === "grand_prix"
      ? competitionHeader.circuitId
      : null
  }
  {...playerSheetProps}
  highContrast={highContrast}
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
   highContrast,
  setHighContrast,
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
highContrast: boolean;
setHighContrast: (
  value: boolean | ((current: boolean) => boolean)
) => void;
}) {
  const player1 = players[0];
  const player2 = players[1];

  const tournamentTheme =
  competition.competitionType === "grand_prix"
    ? getGrandPrixCircuitTheme(competition.circuitId)
    : getTournamentTheme(competition.theme);


  return (
  <div
  className={[
  "relative z-20 shrink-0 border-b px-5 py-3 text-white shadow-xl",
  competition.competitionType === "world_cup"
    ? "border-[#D69E1F]/70"
    : tournamentTheme?.border ?? "border-white/15",
].join(" ")}
style={{
  background:
    tournamentTheme?.headerGradient ?? "#111111",
}}
>
  <div className="mx-auto flex w-full max-w-[1900px] items-center justify-between gap-6">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center">
  {tournamentTheme ? (
  tournamentTheme.flagImage ? (
    <Image
      src={tournamentTheme.flagImage}
      alt=""
      width={56}
      height={38}
      className="max-h-10 w-auto rounded-sm object-cover shadow-lg"
      priority
    />
  ) : tournamentTheme.headerLogo ? (
    <Image
      src={tournamentTheme.headerLogo}
      alt={tournamentTheme.name}
      width={56}
      height={56}
      className="max-h-14 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.18)]"
      priority
    />
  ) : (
    <div className="text-4xl">
      {tournamentTheme.icon}
    </div>
  )
) : null}
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
  {tournamentTheme?.name ?? competition.tournamentName}
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
  {competition.competitionType === "grand_prix" ? (
    <div className="rounded-lg border border-white/20 bg-black/20 px-5 py-2 text-base font-black">
      🏎️ {players.length} pilotes
    </div>
  ) : competition.competitionType === "basket" ? (
  <div className="flex items-center gap-4">
    <div className="flex items-center gap-2">
      <span
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: "#F47B20" }}
      />

      <span
        className="text-xl font-black tracking-wide"
        style={{ color: "#FF9A4A" }}
      >
        Équipe A
      </span>
    </div>

    <div
      className="flex min-w-[110px] flex-col items-center rounded-xl border px-4 py-1.5"
      style={{
        borderColor: "rgba(232,117,36,0.45)",
        backgroundColor: "rgba(0,0,0,0.28)",
      }}
    >
      <div className="text-xl font-black text-white">
        {competition.teamAPoints}
        <span className="mx-2 text-white/40">-</span>
        {competition.teamBPoints}
      </div>

      {competition.currentQuarter && (
  <>
    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
      Q{competition.currentQuarter}
    </div>

    <div className="mt-1 flex items-center gap-2">
  <span
    className="text-base font-black"
    style={{ color: "#FF9A4A" }}
  >
    {competition.currentQuarterTeamAScore}
  </span>

  <span className="text-xs font-black text-white/35">
    -
  </span>

  <span
    className="text-base font-black"
    style={{ color: "#60A5FA" }}
  >
    {competition.currentQuarterTeamBScore}
  </span>
</div>
  </>
)}
    </div>

    <div className="flex items-center gap-2">
      <span
        className="text-xl font-black tracking-wide"
        style={{ color: "#60A5FA" }}
      >
        Équipe B
      </span>

      <span
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: "#3B82F6" }}
      />
    </div>
  </div>
) : (
    <>
      <span className="max-w-[180px] truncate text-xl font-black tracking-wide">
        {player1?.name ?? "Joueur 1"}
      </span>

      {competition.competitionType === "grand_slam_final" ? (
        <div className="rounded-lg border border-white/20 bg-black/20 px-3 py-1 text-base font-black">
          {competition.player1SetsWon}–{competition.player2SetsWon}
        </div>
      ) : (
        <div className="rounded-xl border border-[#D4A74A] bg-[#D4A74A]/10 px-5 py-2 text-base font-black tracking-[0.18em] text-[#FFF2BF] shadow-[0_0_20px_rgba(244,197,66,0.22)]">
          VS
        </div>
      )}

      <span className="max-w-[180px] truncate text-xl font-black tracking-wide">
        {player2?.name ?? "Joueur 2"}
      </span>
    </>
  )}
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
  onClick={() => setHighContrast((current) => !current)}
  className={[
    "rounded-xl px-4 py-2.5 text-xs font-black transition",
    competition.competitionType === "world_cup"
      ? highContrast
        ? "border border-[#D4A74A] bg-[#D4A74A] text-[#07130D] shadow-[0_0_16px_rgba(212,167,74,0.25)]"
        : "border border-[#315F2D] bg-[#07130D]/90 text-white hover:border-[#D4A74A]/60 hover:bg-[#0B1E14]"
      : highContrast
        ? "border border-white/40 bg-white/90 text-black hover:bg-white"
        : "bg-black/20 hover:bg-black/35",
  ].join(" ")}
>
  {highContrast ? "Contraste ✓" : "Contraste"}
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
  : competition.competitionType === "grand_prix"
    ? "Voir la saison"
    : competition.competitionType === "basket"
      ? "Voir la compétition"
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