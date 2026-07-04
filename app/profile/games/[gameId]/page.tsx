"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { columns, rows, YamRow } from "../../../lib/yamRules";
import LoadingScreen from "@/app/components/LoadingScreen";
import GameScreen from "../../../components/GameScreen";
import Leaderboard from "../../../components/Leaderboard";
import PlayerSheet from "../../../components/PlayerSheet";
import { useRef } from "react";
type ScoreValue = number | "X" | null;

type HistoryPlayer = {
  id: string;
  player_key: string;
  display_name: string;
  final_score: number | null;
  player_order: number;
  profile_id: string | null;
};

type HistoryGame = {
  id: string;
  mode: "6cols" | "3cols";
  player_count: number;
  created_at: string;
  finished_at: string | null;
};

type Scores = Record<string, Record<string, Record<YamRow, ScoreValue>>>;

export default function GameHistoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;
const viewportRef = useRef<HTMLDivElement | null>(null);
const sheetRef = useRef<HTMLDivElement | null>(null);
  const [game, setGame] = useState<HistoryGame | null>(null);
  const [players, setPlayers] = useState<HistoryPlayer[]>([]);
  const [scores, setScores] = useState<Scores>({});
  const [loading, setLoading] = useState(true);

  const activeColumns =
    game?.mode === "3cols" ? [columns[0], columns[2], columns[4]] : columns;

  useEffect(() => {
    async function loadGame() {
      const { data: gameData, error: gameError } = await supabase
        .from("local_games")
        .select("id, mode, player_count, created_at, finished_at")
        .eq("id", gameId)
        .single();

      if (gameError || !gameData) {
        console.error("Erreur chargement partie", gameError);
        router.push("/profile");
        return;
      }

      setGame(gameData as HistoryGame);

      const { data: playersData, error: playersError } = await supabase
        .from("local_game_players")
        .select("id, player_key, display_name, final_score, player_order, profile_id")
        .eq("game_id", gameId)
        .order("player_order", { ascending: true });

      if (playersError) {
        console.error("Erreur chargement joueurs", playersError);
        router.push("/profile");
        return;
      }

      setPlayers((playersData ?? []) as HistoryPlayer[]);

      const { data: scoresData, error: scoresError } = await supabase
        .from("local_game_scores")
        .select("player_key, column_id, row_id, value")
        .eq("game_id", gameId);

      if (scoresError) {
        console.error("Erreur chargement scores", scoresError);
        router.push("/profile");
        return;
      }

      const nextScores: Scores = {};

      for (const score of scoresData ?? []) {
        const playerKey = score.player_key;
        const columnId = score.column_id;
        const rowId = score.row_id as YamRow;

        if (!nextScores[playerKey]) nextScores[playerKey] = {};
        if (!nextScores[playerKey][columnId]) {
          nextScores[playerKey][columnId] = {} as Record<YamRow, ScoreValue>;
        }

        nextScores[playerKey][columnId][rowId] =
          score.value === "X" ? "X" : Number(score.value);
      }

      setScores(nextScores);
      setLoading(false);
    }

    loadGame();
  }, [gameId, router]);
function noop() {}

const readOnlyPlayerSheetProps = {
  getScore,
  getTopTotal,
  getBonus,
  getBottomTotal,
  getGrandTotal,
  getPlayerTotal,
  isCellPlayable: () => false,
  onSelectCell: noop,
  startEditingPlayer: noop,
  editingPlayerId: null,
  editingName: "",
  setEditingName: noop,
  savePlayerName: noop,
  setEditingPlayerId: noop,
  activeColumns,
  currentPlayerId: null,
  gameFinished: true,
  lastScoreAnimation: null,
};
  function getScore(playerKey: string, columnId: string, rowId: YamRow) {
    return scores[playerKey]?.[columnId]?.[rowId] ?? null;
  }

  function scoreToNumber(value: ScoreValue) {
    return typeof value === "number" ? value : 0;
  }

  function getTopTotal(playerKey: string, columnId: string) {
    return rows
      .slice(0, 6)
      .reduce(
        (total, row) => total + scoreToNumber(getScore(playerKey, columnId, row.id)),
        0
      );
  }

  function getBonus(playerKey: string, columnId: string) {
    return getTopTotal(playerKey, columnId) >= 60 ? 30 : 0;
  }

  function getBottomTotal(playerKey: string, columnId: string) {
    return rows
      .slice(6)
      .reduce(
        (total, row) => total + scoreToNumber(getScore(playerKey, columnId, row.id)),
        0
      );
  }

  function getGrandTotal(playerKey: string, columnId: string) {
    return (
      getTopTotal(playerKey, columnId) +
      getBonus(playerKey, columnId) +
      getBottomTotal(playerKey, columnId)
    );
  }

  function getPlayerTotal(playerKey: string) {
    return activeColumns.reduce(
      (total, column) => total + getGrandTotal(playerKey, column.id),
      0
    );
  }

  if (loading || !game) {
    return <LoadingScreen />;
  }
function countFigure(playerKey: string, rowId: YamRow) {
  return activeColumns.reduce((total, column) => {
    const value = getScore(playerKey, column.id, rowId);
    return value !== null && value !== "X" ? total + 1 : total;
  }, 0);
}
  return (
  <main className="min-h-screen overflow-y-auto bg-black text-white">
    <div className="flex h-12 items-center justify-between border-b border-slate-800 bg-black px-3">
      <button
        onClick={() => router.push("/profile")}
        className="rounded-xl bg-[#241A13] px-4 py-2 text-sm font-black text-white transition hover:bg-[#322217]"
      >
        ← Retour au profil
      </button>

      <div className="text-xs font-black uppercase text-slate-400">
        {new Date(game.created_at).toLocaleDateString("fr-FR")} •{" "}
        {game.mode === "6cols" ? "6 colonnes" : "3 colonnes"}
      </div>
    </div>

    <GameScreen
      fitToScreen={false}
      setFitToScreen={() => {}}
      toggleFullscreen={() => {}}
      quitGame={() => router.push("/profile")}
      useSideLeaderboard={players.length <= 3}
      viewportRef={viewportRef}
      sheetRef={sheetRef}
      fitOffsetX={0}
      fitScale={1}
      players={players.map((player) => ({
        id: player.player_key,
        name: player.display_name,
        playerOrder: player.player_order,
        linkedUserId: player.profile_id,
      }))}
      PlayerSheetComponent={PlayerSheet}
      playerSheetProps={readOnlyPlayerSheetProps}
      LeaderboardComponent={Leaderboard}
      leaderboardProps={{
        players: players
          .map((player) => ({
            id: player.player_key,
            name: player.display_name,
            playerOrder: player.player_order,
            linkedUserId: player.profile_id,
            total: player.final_score ?? getPlayerTotal(player.player_key),
            rank: 0,
            gap: 0,
            remainingMoves: 0,
            straights: countFigure(player.player_key, "straight"),
            fourOfAKinds: countFigure(player.player_key, "fourOfAKind"),
            yams: countFigure(player.player_key, "yam"),
          }))
          .sort((a, b) => b.total - a.total)
          .map((player, index, array) => ({
            ...player,
            rank: index + 1,
            gap: array[0].total - player.total,
          })),
        currentPlayerId: null,
        gameFinished: true,
      }}
      playerColors={[
  {
    text: "text-[#C44934]",
    border: "border-[#9B6A28]/70",
    bg: "bg-[#F4E9DC]",
  },
]}
    />
  </main>
);
}

function ReadOnlyPlayerCard({
  player,
  activeColumns,
  getScore,
  getTopTotal,
  getBonus,
  getBottomTotal,
  getGrandTotal,
  getPlayerTotal,
}: {
  player: HistoryPlayer;
  activeColumns: typeof columns;
  getScore: (playerKey: string, columnId: string, rowId: YamRow) => ScoreValue;
  getTopTotal: (playerKey: string, columnId: string) => number;
  getBonus: (playerKey: string, columnId: string) => number;
  getBottomTotal: (playerKey: string, columnId: string) => number;
  getGrandTotal: (playerKey: string, columnId: string) => number;
  getPlayerTotal: (playerKey: string) => number;
}) {
  return (
    <div className="min-w-[360px] rounded-3xl border border-slate-800 bg-black p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">{player.display_name}</h2>
          <p className="text-sm font-bold text-slate-500">
            Joueur {player.player_order}
          </p>
        </div>

        <div className="text-right">
          <div className="text-3xl font-black text-[#C44934]">
            {player.final_score ?? getPlayerTotal(player.player_key)}
          </div>
          <div className="text-xs font-bold text-slate-500">points</div>
        </div>
      </div>

      <div
        className="grid overflow-hidden rounded-2xl border border-slate-800 text-sm"
        style={{
          gridTemplateColumns: `130px repeat(${activeColumns.length}, 64px)`,
        }}
      >
        <div className="border-b border-r border-slate-800 bg-slate-950 p-2 font-black text-slate-400">
          Case
        </div>

        {activeColumns.map((column) => (
          <div
            key={column.id}
            className="border-b border-r border-slate-800 bg-slate-950 p-2 text-center text-xs font-black text-slate-400 last:border-r-0"
          >
            {column.label}
          </div>
        ))}

        {rows.map((row) => (
          <>
            <div
              key={`${row.id}-label`}
              className="border-b border-r border-slate-800 p-2 font-bold text-slate-300"
            >
              {row.label}
            </div>

            {activeColumns.map((column) => {
              const value = getScore(player.player_key, column.id, row.id);

              return (
                <div
                  key={`${row.id}-${column.id}`}
                  className="border-b border-r border-slate-800 p-2 text-center font-black text-white last:border-r-0"
                >
                  {value ?? ""}
                </div>
              );
            })}
          </>
        ))}

        <TotalRow
          label="Total 1"
          activeColumns={activeColumns}
          getValue={(columnId) => getTopTotal(player.player_key, columnId)}
        />

        <TotalRow
          label="Bonus"
          activeColumns={activeColumns}
          getValue={(columnId) => getBonus(player.player_key, columnId)}
        />

        <TotalRow
          label="Total 2"
          activeColumns={activeColumns}
          getValue={(columnId) => getBottomTotal(player.player_key, columnId)}
        />

        <TotalRow
          label="Total"
          activeColumns={activeColumns}
          getValue={(columnId) => getGrandTotal(player.player_key, columnId)}
        />
      </div>
    </div>
  );
}

function TotalRow({
  label,
  activeColumns,
  getValue,
}: {
  label: string;
  activeColumns: typeof columns;
  getValue: (columnId: string) => number;
}) {
  return (
    <>
      <div className="border-b border-r border-slate-800 bg-slate-950 p-2 font-black text-[#C44934]">
        {label}
      </div>

      {activeColumns.map((column) => (
        <div
          key={`${label}-${column.id}`}
          className="border-b border-r border-slate-800 bg-slate-950 p-2 text-center font-black text-[#C44934] last:border-r-0"
        >
          {getValue(column.id)}
        </div>
      ))}
    </>
  );
}