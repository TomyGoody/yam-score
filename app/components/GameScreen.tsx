"use client";

import Image from "next/image";

export default function GameScreen({
  fitToScreen,
  setFitToScreen,
  toggleFullscreen,
  quitGame,
  useSideLeaderboard,
  viewportRef,
  sheetRef,
  fitOffsetX,
  fitScale,
  players,
  PlayerSheetComponent,
  playerSheetProps,
  LeaderboardComponent,

fitOffsetY,

  devFillRandomGame,
  leaderboardProps,

}: any) {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
        <Image
          src="/favicon.png"
          alt=""
          width={1000}
          height={1000}
          className="select-none rotate-[-12deg]"
        />
      </div>

      <div className="flex h-12 items-center justify-between  border-slate-800 bg-black px-3">
        <div className="text-xs font-black uppercase text-white">
          {fitToScreen ? "Affichage adapté" : "Affichage normal"}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFitToScreen((current: boolean) => !current)}
            className="rounded-lg bg-[#241A13] px-4 py-2 text-sm font-black hover:bg-[#322217]"
          >
            {fitToScreen ? "Taille normale" : "Adapter à l'écran"}
          </button>

          <button
            onClick={toggleFullscreen}
            className="rounded-lg bg-[#241A13] px-4 py-2 text-sm font-black hover:bg-[#322217]"
          >
            Plein écran
          </button>
{process.env.NODE_ENV === "development" && devFillRandomGame && (
  <button
    onClick={devFillRandomGame}
    className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-black text-white hover:bg-purple-600"
  >
    🧪 Remplir
  </button>
)}
          <button
            onClick={quitGame}
            className="rounded-lg bg-[#C44934] px-4 py-2 text-sm font-black hover:bg-[#D75A43]"
          >
            Quitter
          </button>
        </div>
      </div>

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
          {...playerSheetProps}
        />
      ))}
    </div>

    <LeaderboardComponent
      layout={useSideLeaderboard ? "side" : "bottom"}
      {...leaderboardProps}
    />
  </div>
</div>
    </section>
  );
}