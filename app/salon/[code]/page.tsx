"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import GameScreen from "@/app/components/GameScreen";
import QRCode from "react-qr-code";
import PlayerSheet from "@/app/components/PlayerSheet";
import Leaderboard from "@/app/components/Leaderboard";
import { columns, rows, YamRow, getPossibleValues } from "@/app/lib/yamRules";
import { getLevelFromTotalXp } from "@/app/lib/levelRules";
import VictoryModal from "@/app/components/VictoryModal";
import {
  achievementDefinitions,
  BADGE_XP,
  FIGURE_XP,
  getParticipationXp,
  getRankXp,
  getUnlockedMilestoneIndexes,
} from "@/app/lib/xpRules";

type Player = {
  id: string;
  name: string;
  player_order: number;
  profile_id: string | null;
};
type ScoreValue = number | "X" | null;

type Scores = Record<string, Record<string, Record<YamRow, ScoreValue>>>;

type SelectedCell = {
  playerId: string;
  columnId: string;
  rowId: YamRow;
};

const PLAYER_COLORS = [
  {
    text: "text-[#C44934]",
    border: "border-[#9B6A28]/70",
    bg: "bg-[#F4E9DC]",
  },
];

export default function SalonAdminPage() {
  const [scores, setScores] = useState<Scores>({});
  const [gameMode, setGameMode] = useState<"6cols" | "3cols">("6cols");
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const [fitOffsetX, setFitOffsetX] = useState(0);
  const [fitOffsetY, setFitOffsetY] = useState(0);
  const [currentPlayerOrder, setCurrentPlayerOrder] = useState(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [showFinalModal, setShowFinalModal] = useState(true);
  const [xpResultsByPlayer, setXpResultsByPlayer] = useState<
  Record<
    string,
    {
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
    }
  >
>({});
  const [salonSavedToProfile, setSalonSavedToProfile] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const params = useParams();
  const router = useRouter();
  const [selectedXpPlayerId, setSelectedXpPlayerId] = useState<string | null>(null);
  const code = String(params.code).toUpperCase();
  const joinUrl =
  typeof window !== "undefined"
  ? `${window.location.origin}/join?code=${code}`
  : `/join?code=${code}`;
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [status, setStatus] = useState<"waiting" | "playing" | "finished">("waiting");
  const [message, setMessage] = useState("");
  
  // 1. LOAD SALON
  async function loadSalon() {
    const { data, error } = await supabase
    .from("yam_games")
    .select("id, player_count, status, mode, current_player_order")
    .eq("code", code)
    .maybeSingle()
    if (error || !data) {
      setMessage("Salon introuvable");
      return;
    }
    
    setGameId(data.id);
    setPlayerCount(data.player_count);
    setGameMode(data.mode);
    setStatus(data.status);
    setCurrentPlayerOrder(data.current_player_order ?? 1);
  }
  
  // 2. LOAD PLAYERS
  async function loadPlayers(id: string) {
    const { data } = await supabase
    .from("yam_players")
    .select("*")
    .eq("game_id", id)
    .order("player_order");
    
    setPlayers(
      (data ?? []).map((player) => ({
        id: player.id,
        name: player.name,
        playerOrder: player.player_order,
        player_order: player.player_order,
        profile_id: player.profile_id ?? null,
      }))
    );
  }
  async function loadScores(id: string) {
    const { data, error } = await supabase
    .from("yam_scores")
    .select("player_id, column_id, row_id, value")
    .eq("game_id", id);
    
    if (error) {
      console.error(error);
      return;
    }
    
    const nextScores: Scores = {};
    
    (data ?? []).forEach((score) => {
      const value =
      score.value === "X" ? "X" : Number(score.value);
      
      nextScores[score.player_id] = {
        ...nextScores[score.player_id],
        [score.column_id]: {
          ...nextScores[score.player_id]?.[score.column_id],
          [score.row_id as YamRow]: value,
        },
      };
    });
    
    setScores(nextScores);
  }
  // 3. START GAME
  async function startGame() {
    if (!gameId) return;
    
    
    
    const { data, error } = await supabase
    .from("yam_games")
    .update({
      status: "playing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .select("id, status, updated_at")
    .single();
    
    
    
    if (error) {
      setMessage(error.message);
      return;
    }
    
    setStatus("playing");
  }
  useEffect(() => {
  async function loadCurrentUser() {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data.user?.id ?? null);
  }

  loadCurrentUser();
}, []);
  // INIT
  useEffect(() => {
    loadSalon();
  }, []);
  
  useEffect(() => {
    if (!gameId) return;
    loadPlayers(gameId);
    loadScores(gameId);
  }, [gameId]);
 useEffect(() => {
  function updateLayout() {
    const viewport = viewportRef.current;
    const sheet = sheetRef.current;

    if (!viewport || !sheet) return;

    if (!fitToScreen) {
      setFitScale(1);
      setFitOffsetX(0);
      setFitOffsetY(0);
      return;
    }

    const contentWidth = sheet.offsetWidth;
    const contentHeight = sheet.offsetHeight;

    const availableWidth = viewport.clientWidth;
    const availableHeight = viewport.clientHeight;

    if (
      contentWidth <= 0 ||
      contentHeight <= 0 ||
      availableWidth <= 0 ||
      availableHeight <= 0
    ) {
      return;
    }

    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;

    const nextScale = Math.min(scaleX, scaleY);

    const scaledWidth = contentWidth * nextScale;
    const scaledHeight = contentHeight * nextScale;

    const nextOffsetX = Math.max(
      0,
      (availableWidth - scaledWidth) / 2
    );

    const nextOffsetY = Math.max(
      0,
      (availableHeight - scaledHeight) / 2
    );

    setFitScale(nextScale);
    setFitOffsetX(nextOffsetX);
    setFitOffsetY(nextOffsetY);
  }

  const frame = requestAnimationFrame(updateLayout);

  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(updateLayout);
  });

  const viewport = viewportRef.current;
  const sheet = sheetRef.current;

  if (viewport) {
    resizeObserver.observe(viewport);
  }

  if (sheet) {
    resizeObserver.observe(sheet);
  }

  window.addEventListener("resize", updateLayout);
  document.addEventListener("fullscreenchange", updateLayout);

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    window.removeEventListener("resize", updateLayout);
    document.removeEventListener("fullscreenchange", updateLayout);
  };
}, [fitToScreen, players.length, gameMode]);
  useEffect(() => {
    if (!gameId) return;
    
    const channel = supabase
    .channel(`salon_scores_${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "yam_scores",
        filter: `game_id=eq.${gameId}`,
      },
      () => {
        loadScores(gameId);
      }
    )
    .subscribe((status) => {
      console.log("CHANNEL STATUS =", status);
    });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);
  useEffect(() => {
    if (!gameId) return;
    
    const channel = supabase
    .channel(`salon_players_${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "yam_players",
        filter: `game_id=eq.${gameId}`,
      },
      () => {
        loadPlayers(gameId);
      }
    )
    .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);
  useEffect(() => {
    if (!gameId) return;
    
    const channel = supabase
    .channel(`salon_game_${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "yam_games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        setStatus(payload.new.status ?? "waiting");
      }
    )
    .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);
  const activeColumns =
  gameMode === "6cols"
  ? columns
  : [columns[0], columns[2], columns[4]];
  
  const useSideLeaderboard = players.length <= 3;
  
  function getScore(playerId: string, columnId: string, rowId: YamRow) {
    return scores[playerId]?.[columnId]?.[rowId] ?? null;
  }
  
  function scoreToNumber(value: ScoreValue) {
    return typeof value === "number" ? value : 0;
  }
  
  function getTopTotal(playerId: string, columnId: string) {
    return rows
    .slice(0, 6)
    .reduce(
      (total, row) =>
        total + scoreToNumber(getScore(playerId, columnId, row.id)),
      0
    );
  }
  
  function getBonus(playerId: string, columnId: string) {
    return getTopTotal(playerId, columnId) >= 60 ? 35 : 0;
  }
  
  function getBottomTotal(playerId: string, columnId: string) {
    return rows
    .slice(6)
    .reduce(
      (total, row) =>
        total + scoreToNumber(getScore(playerId, columnId, row.id)),
      0
    );
  }
  
  function getGrandTotal(playerId: string, columnId: string) {
    return (
      getTopTotal(playerId, columnId) +
      getBonus(playerId, columnId) +
      getBottomTotal(playerId, columnId)
    );
  }
  
  function getPlayerTotal(playerId: string) {
    return activeColumns.reduce(
      (total, column) => total + getGrandTotal(playerId, column.id),
      0
    );
  }
  
  function getRemainingMoves(playerId: string) {
    return activeColumns.reduce((total, column) => {
      return (
        total +
        rows.filter((row) => getScore(playerId, column.id, row.id) === null)
        .length
      );
    }, 0);
  }
  
  function countFigure(playerId: string, rowId: YamRow) {
    return activeColumns.reduce((total, column) => {
      const value = getScore(playerId, column.id, rowId);
      return value !== null && value !== "X" ? total + 1 : total;
    }, 0);
  }
  
  function getLeaderboard() {
    const totals = players.map((player) => ({
      ...player,
      total: getPlayerTotal(player.id),
    }));
    
    const sorted = [...totals].sort((a, b) => b.total - a.total);
    const leaderTotal = sorted[0]?.total ?? 0;
    
    return sorted.map((player, index) => ({
      ...player,
      rank: index + 1,
      gap: leaderTotal - player.total,
      remainingMoves: getRemainingMoves(player.id),
      straights: countFigure(player.id, "straight"),
      fourOfAKinds: countFigure(player.id, "fourOfAKind"),
      yams: countFigure(player.id, "yam"),
    }));
  }
  
  function isCellPlayable() {
    return false;
  }
  
  function handleSelectCell() {
    return;
  }
  
  function noop() {
    return;
  }
  function quitSalon() {
    setShowQuitModal(true);
  }
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
  async function undoLastMove() {
    if (!gameId) return;
    
    const { data: lastScore, error: scoreError } = await supabase
    .from("yam_scores")
    .select("id, player_id")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
    
    if (scoreError || !lastScore) {
      console.error("UNDO SCORE ERROR", scoreError);
      alert(scoreError?.message ?? "Aucun coup à annuler.");
      return;
    }
    
    const player = players.find((item) => item.id === lastScore.player_id);
    
    if (!player) {
      setMessage("Joueur introuvable pour ce coup.");
      return;
    }
    
    const { error: deleteError } = await supabase
    .from("yam_scores")
    .delete()
    .eq("id", lastScore.id);
    
    if (deleteError) {
      console.error("DELETE ERROR", deleteError);
      alert(deleteError.message);
      return;
    }
    
    const { error: updateError } = await supabase
    .from("yam_games")
    .update({
      current_player_order: player.player_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId);
    
    if (updateError) {
      console.error("UPDATE ERROR", updateError);
      alert(updateError.message);
      return;
    }
    
    await loadScores(gameId);
    setCurrentPlayerOrder(player.player_order);
    setMessage("Dernier coup annulé.");
  }
  async function simulateSalonGame() {
  if (!gameId) return;

  const activeColumns =
    gameMode === "6cols"
      ? columns
      : [columns[0], columns[2], columns[4]];

  for (const row of rows) {
    for (const player of players.sort(
      (a, b) => a.player_order - b.player_order
    )) {
      for (const column of activeColumns) {
        const values = getPossibleValues(row.id);

        const value =
          Math.random() < 0.15
            ? "X"
            : values[Math.floor(Math.random() * values.length)];

        const { error } = await supabase
          .from("yam_scores")
          .upsert(
            {
              game_id: gameId,
              player_id: player.id,
              column_id: column.id,
              row_id: row.id,
              value: String(value),
            },
            {
              onConflict: "game_id,player_id,column_id,row_id",
            }
          );

        if (error) {
          console.error(error);
          return;
        }
      }
    }
  }

  await loadScores(gameId);
}
  async function saveSalonToProfiles() {
    if (!gameId) return;
    
    const linkedPlayers = players.filter((player) => player.profile_id);
    
    if (linkedPlayers.length === 0) return;
    
    if (!currentUserId) return;

const ownerId = currentUserId;
    
    const { data: localGame, error: gameError } = await supabase
    .from("local_games")
    .insert({
      mode: gameMode,
      player_count: playerCount,
      status: "finished",
      created_by: ownerId,
      linked_profile_id: ownerId,
      finished_at: new Date().toISOString(),
      source: "salon",
    })
    .select("id")
    .single();
    
    if (gameError || !localGame) {
      console.error("Erreur sauvegarde salon local_games", gameError);
      return;
    }
    
    const leaderboard = getLeaderboard();

const { error: finalScoresError } = await supabase.rpc(
  "set_salon_final_scores",
  {
    p_game_id: gameId,
    p_scores: leaderboard.map((player) => ({
      player_id: player.id,
      final_score: player.total,
    })),
  }
);

if (finalScoresError) {
  console.error("Erreur scores finaux salon", finalScoresError);
}
const { data: test } = await supabase
  .from("yam_players")
  .select("id, name, final_score")
  .eq("game_id", gameId);

console.log("FINAL SCORES SAVED", test);
await loadPlayers(gameId);
    const { error: playersError } = await supabase
    .from("local_game_players")
    .insert(
      leaderboard.map((player) => {
        const originalPlayer = players.find((item) => item.id === player.id);
        
        return {
  game_id: localGame.id,
  player_key: player.id,
  display_name: player.name,
  profile_id: originalPlayer?.profile_id ?? null,
  player_order: originalPlayer?.player_order ?? player.rank,
  final_score: player.total,
  final_rank: player.rank,
  yams_count: player.yams,
};
      })
    );
    
    if (playersError) {
      console.error("Erreur sauvegarde salon local_game_players", playersError);
      return;
    }
    
    const scoreRows = players.flatMap((player) =>
      activeColumns.flatMap((column) =>
        rows.flatMap((row) => {
      const value = getScore(player.id, column.id, row.id);
      
      if (value === null) return [];
      
      return [
        {
          game_id: localGame.id,
          player_key: player.id,
          column_id: column.id,
          row_id: row.id,
          value: String(value),
        },
      ];
    })
  )
);

if (scoreRows.length > 0) {
  const { error: scoresError } = await supabase
  .from("local_game_scores")
  .insert(scoreRows);
  

  if (scoresError) {
    console.error("Erreur sauvegarde salon local_game_scores", scoresError);
  }
}
for (const player of leaderboard) {
  const originalPlayer = players.find((item) => item.id === player.id);

  if (!originalPlayer?.profile_id) continue;

  const { data: statsBefore } = await supabase
    .from("profile_stats")
    .select("*")
    .eq("profile_id", originalPlayer.profile_id)
    .maybeSingle();

  const is3Cols = gameMode === "3cols";

  await supabase.rpc("upsert_profile_stats_for_local_game_player", {
    p_game_id: localGame.id,
    p_profile_id: originalPlayer.profile_id,

    p_games_played_3: is3Cols ? 1 : 0,
    p_games_played_6: is3Cols ? 0 : 1,

    p_wins_3: is3Cols && player.rank === 1 && playerCount >= 2 ? 1 : 0,
    p_wins_6: !is3Cols && player.rank === 1 && playerCount >= 2 ? 1 : 0,

    p_best_score_3: is3Cols ? player.total : 0,
    p_best_score_6: !is3Cols ? player.total : 0,

    p_total_points_3: is3Cols ? player.total : 0,
    p_total_points_6: !is3Cols ? player.total : 0,

    p_yams_total: player.yams,
    p_four_of_a_kind_total: player.fourOfAKinds,
    p_full_house_total: countFigure(player.id, "fullHouse"),
    p_straight_total: player.straights,
    p_three_of_a_kind_total: countFigure(player.id, "threeOfAKind"),

    p_bonus_total: activeColumns.filter(
      (column) => getBonus(player.id, column.id) > 0
    ).length,

    p_perfect_games_3: 0,
    p_perfect_games_6: 0,

    p_local_games: 0,
    p_salon_games: 1,

    p_games_2_players: playerCount === 2 ? 1 : 0,
    p_games_3_players: playerCount === 3 ? 1 : 0,
    p_games_4_players: playerCount === 4 ? 1 : 0,
    p_games_5_players: playerCount === 5 ? 1 : 0,
    p_games_6_players: playerCount === 6 ? 1 : 0,
  });

  const { data: statsAfter } = await supabase
    .from("profile_stats")
    .select("*")
    .eq("profile_id", originalPlayer.profile_id)
    .maybeSingle();

  const potentialBadges = achievementDefinitions.flatMap((definition) => {
    const beforeValue = Number(statsBefore?.[definition.metric] ?? 0);
    const afterValue = Number(statsAfter?.[definition.metric] ?? 0);

    const beforeUnlocked = getUnlockedMilestoneIndexes(
      beforeValue,
      definition.milestones
    );

    const afterUnlocked = getUnlockedMilestoneIndexes(
      afterValue,
      definition.milestones
    );

    return afterUnlocked
      .filter((index) => !beforeUnlocked.includes(index))
      .map((index) => ({
        id: definition.id,
        label: definition.label,
        milestone: definition.milestones[index],
        xp: BADGE_XP[index] ?? 0,
      }));
  });

  const { data: claimedBadges } = await supabase.rpc(
    "claim_profile_badges_for_local_game_player",
    {
      p_game_id: localGame.id,
      p_profile_id: originalPlayer.profile_id,
      p_badges: potentialBadges,
    }
  );

  const awardedBadges = (claimedBadges ?? []).map((badge: any) => {
  const definition = potentialBadges.find(
    (item) =>
      item.id === badge.claimed_badge_id &&
      item.milestone === badge.claimed_milestone
  );

  return {
    label: definition?.label ?? badge.claimed_badge_id,
    milestone: badge.claimed_milestone,
    xp: badge.claimed_xp_awarded,
  };
});

const badgeXp = awardedBadges.reduce(
  (total: number, badge: { xp: number }) => total + badge.xp,
  0
);

  const baseXp =
    getParticipationXp(gameMode) +
    getRankXp(player.rank, playerCount, gameMode) +
    countFigure(player.id, "threeOfAKind") * FIGURE_XP.threeOfAKind +
    countFigure(player.id, "fullHouse") * FIGURE_XP.fullHouse +
    player.fourOfAKinds * FIGURE_XP.fourOfAKind +
    player.straights * FIGURE_XP.straight +
    player.yams * FIGURE_XP.yam +
    activeColumns.filter((column) => getBonus(player.id, column.id) > 0).length *
      FIGURE_XP.bonus;

  const { data: xpResult, error: xpError } = await supabase.rpc(
  "add_profile_xp_for_local_game_player",
  {
    p_game_id: localGame.id,
    p_profile_id: originalPlayer.profile_id,
    p_xp_gain: baseXp + badgeXp,
  }
);

if (xpError) {
  console.error("Erreur ajout XP salon", xpError);
} else {
  const result = Array.isArray(xpResult) ? xpResult[0] : xpResult;

  if (result) {
    const totalXpAfter = result.total_xp;
    const totalXpBefore = totalXpAfter - result.xp_gained;

    setXpResultsByPlayer((current) => ({
      ...current,
      [player.id]: {
        xpGain: result.xp_gained,
        oldLevel: getLevelFromTotalXp(totalXpBefore),
        newLevel: getLevelFromTotalXp(totalXpAfter),
        baseXp,
        badgeXp,
        badges: awardedBadges,
      },
    }));
  }
}
}
}
const gameFinished =
players.length > 0 &&
players.every((player) => getRemainingMoves(player.id) === 0);
useEffect(() => {
  async function finishGame() {
    if (!gameId || status !== "playing" || !gameFinished) return;
    
    if (!salonSavedToProfile) {
  setSalonSavedToProfile(true);
  await saveSalonToProfiles();
}
    
    await supabase
    .from("yam_games")
    .update({
      status: "finished",
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId);
    
    setStatus("finished");
  }
  
  finishGame();
}, [gameId, status, gameFinished]);
if (status === "playing" || status === "finished") {
  return (
    <main className="h-screen overflow-hidden bg-black text-white">
    <div className="absolute right-101 top-2 z-40">
    <button
    onClick={undoLastMove}
    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-black text-black hover:bg-amber-500"
    >
    Annuler le dernier coup
    </button>
    </div>
    {process.env.NODE_ENV === "development" && (
  <div className="absolute left-4 top-2 z-40">
    <button
      onClick={simulateSalonGame}
      className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-black text-white hover:bg-purple-600"
    >
      🧪 Simuler une partie
    </button>
  </div>
)}
    <GameScreen
    fitToScreen={fitToScreen}
    setFitToScreen={setFitToScreen}
    toggleFullscreen={toggleFullscreen}
    quitGame={quitSalon}
    useSideLeaderboard={useSideLeaderboard}
    viewportRef={viewportRef}
    sheetRef={sheetRef}
    fitOffsetY={fitOffsetY}
    fitOffsetX={fitOffsetX}
    fitScale={fitScale}
    players={players}
    PlayerSheetComponent={PlayerSheet}
    playerSheetProps={{
      getScore,
      getTopTotal,
      getBonus,
      getBottomTotal,
      getGrandTotal,
      getPlayerTotal,
      isCellPlayable,
      onSelectCell: handleSelectCell,
      startEditingPlayer: noop,
      editingPlayerId: null,
      editingName: "",
      setEditingName: noop,
      savePlayerName: noop,
      setEditingPlayerId: noop,
      activeColumns,
      currentPlayerId:
      players.find((player) => player.player_order === currentPlayerOrder)?.id ??
      null,
      gameFinished,
      lastScoreAnimation: null,
    }}
    LeaderboardComponent={Leaderboard}
    leaderboardProps={{
      players: getLeaderboard(),
      
      gameFinished,
      currentPlayerId:
      players.find((player) => player.player_order === currentPlayerOrder)?.id ??
      null,
    }}
    playerColors={PLAYER_COLORS}
    />
    
    {showQuitModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center shadow-2xl">
      <div className="text-5xl">⚠️</div>
      
      <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
      Confirmation
      </div>
      
      <h2 className="mt-1 text-3xl font-black text-white">
      Quitter le salon ?
      </h2>
      
      <p className="mt-3 text-sm font-bold text-slate-400">
      La partie restera accessible avec le même code salon.
      </p>
      
      <div className="mt-6 grid grid-cols-2 gap-3">
      <button
      onClick={() => setShowQuitModal(false)}
      className="rounded-xl bg-[#241A13] px-4 py-3 font-black text-white hover:bg-[#322217]"
      >
      Annuler
      </button>
      
      <button
      onClick={() => router.push("/")}
      className="rounded-xl bg-[#C44934] px-4 py-3 font-black text-white hover:bg-[#D75A43]"
      >
      Quitter
      </button>
      </div>
      </div>
      </div>
    )}
    {status === "finished" && showFinalModal && (
  <VictoryModal
    players={getLeaderboard()}
    xpResults={xpResultsByPlayer}
    onBackHome={() => router.push("/")}
    onViewGrid={() => setShowFinalModal(false)}
  />
)}
      </main>
    );
  }
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black px-4 py-8 text-white">
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
    <img
    src="/favicon.png"
    alt=""
    className="w-[900px] rotate-[-12deg] select-none"
    />
    </div>
    
    <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-[#9B6A28]/70 bg-black p-8 text-center shadow-2xl">
    <div className="text-5xl">🎲</div>
    
    <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
    Salon hôte
    </div>
    
    <h1 className="mt-1 text-5xl font-black text-white">
    {code}
    </h1>
    
    <p className="mt-3 text-sm font-bold text-slate-400">
    Demande aux joueurs de scanner le QR Code ou d’ouvrir le lien.
    </p>
    
    <div className="mt-5 break-all rounded-xl bg-[#241A13] p-3 text-sm font-black text-slate-300">
    {joinUrl}
    </div>
    
    <div className="mt-6 flex justify-center">
    <div className="rounded-3xl bg-[#F4E9DC] p-5">
    <QRCode value={joinUrl} size={190} />
    </div>
    </div>
    
    <div className="mt-6 rounded-2xl bg-[#F4E9DC] p-5 text-black">
    <div className="text-sm font-black uppercase text-[#C44934]">
    Joueurs connectés
    </div>
    
    <div className="mt-1 text-4xl font-black">
    {players.length} / {playerCount}
    </div>
    </div>
    
    <div className="mt-4 grid gap-2">
    {players.length === 0 ? (
      <div className="rounded-xl bg-[#241A13] p-4 font-bold text-slate-400">
      En attente des joueurs...
      </div>
    ) : (
      players.map((p) => (
        <div
        key={p.id}
        className="rounded-xl bg-[#F4E9DC] p-3 font-black text-black"
        >
        <span className="text-[#C44934]">#{p.player_order}</span>{" "}
        {p.name}
        </div>
      ))
    )}
    </div>
    
    <button
    onClick={startGame}
    disabled={players.length !== playerCount}
    className={[
      "mt-6 w-full rounded-xl p-4 text-lg font-black transition",
      players.length === playerCount
      ? "bg-[#C44934] text-white hover:bg-[#D75A43]"
      : "cursor-not-allowed bg-slate-900 text-slate-600",
    ].join(" ")}
    >
    Démarrer la partie
    </button>
    </div>
    </main>
  );
}