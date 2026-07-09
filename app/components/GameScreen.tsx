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
  devFillRandomGame,
  leaderboardProps,

}: any) {
  return (
    <section className="relative flex h-full flex-col overflow-y-auto overflow-x-hidden">
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
    "relative z-10 flex flex-1 p-3",
    fitToScreen ? "overflow-hidden" : "overflow-auto",
  ].join(" ")}
>
  <div
    ref={sheetRef}
    style={{
      transform: `translateX(${fitOffsetX}px) scale(${fitScale})`,
      transformOrigin: "top left",
    }}
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