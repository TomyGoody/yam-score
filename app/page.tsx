"use client";

import { useEffect, useRef, useState } from "react";
import { columns, rows, YamRow } from "./lib/yamRules";
import Image from "next/image";
import { supabase } from "./lib/supabase";
import VictoryModal from "./components/VictoryModal";
import { useRouter } from "next/navigation";
import GameScreen from "./components/GameScreen";
import Leaderboard from "./components/Leaderboard";
import { getLevelFromTotalXp } from "./lib/levelRules";
import {
  achievementDefinitions,
  BADGE_XP,
  FIGURE_XP,
  getParticipationXp,
  getRankXp,
  getUnlockedMilestoneIndexes,
} from "./lib/xpRules";
import PlayerSheet from "./components/PlayerSheet";
import AuthButton from "./components/AuthButton";
import { QRCodeCanvas } from "qrcode.react";

type ScoreValue = number | "X" | null;
type Player = {
  id: string;
  name: string;
  playerOrder?: number;
  linkedUserId: string | null;
};

type Scores = Record<string, Record<string, Record<YamRow, ScoreValue>>>;

type SelectedCell = {
  playerId: string;
  columnId: string;
  rowId: YamRow;
};
const STORAGE_KEY = "yam-score-save";
const PLAYER_COLORS = [
  {
    text: "text-cyan-300",
    border: "border-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    text: "text-emerald-300",
    border: "border-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    text: "text-amber-300",
    border: "border-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    text: "text-fuchsia-300",
    border: "border-fuchsia-500",
    bg: "bg-fuchsia-500/10",
  },
  {
    text: "text-orange-300",
    border: "border-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    text: "text-violet-300",
    border: "border-violet-500",
    bg: "bg-violet-500/10",
  },
];
export default function Home() {
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [setupPlayerNames, setSetupPlayerNames] = useState<string[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  
  const [linkedProfiles, setLinkedProfiles] = useState<
  Record<
  string,
  {
    userId: string;
    username: string;
    avatarUrl?: string | null;
  }
  >
  >({});
  const [screen, setScreen] = useState<"home" | "setup" | "game">("home");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [associateProfile, setAssociateProfile] = useState(true);
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(2);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [showNewGameWarning, setShowNewGameWarning] = useState(false);
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
  const [savedGameInfo, setSavedGameInfo] = useState<{
    playerCount: number;
    mode: string;
    remainingTurns: number;
  } | null>(null);
  const [partyMode, setPartyMode] = useState<"local" | "salon">("local");
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [gameMode, setGameMode] = useState<"6cols" | "3cols">("6cols");
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [scores, setScores] = useState<Scores>({});
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [lastScoreAnimation, setLastScoreAnimation] = useState<{
    playerId: string;
    columnId: string;
    rowId: string;
    value: number | "X";
  } | null>(null);
  const [salonCode, setSalonCode] = useState<string | null>(null);
  const [isCreatingSalon, setIsCreatingSalon] = useState(false);
  const [salonGameId, setSalonGameId] = useState<string | null>(null);
  const [salonPlayers, setSalonPlayers] = useState<
  { id: string; name: string; player_order: number }[]
  >([]);
  const [scoreInput, setScoreInput] = useState("");
  const [pendingCell, setPendingCell] = useState<SelectedCell | null>(null);
  const [fitToScreen, setFitToScreen] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const [fitOffsetX, setFitOffsetX] = useState(0);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [currentLocalGameId, setCurrentLocalGameId] = useState<string | null>(null);
  const scoreOptions = selectedCell ? getScoreOptions(selectedCell.rowId) : [];
  const useSideLeaderboard = players.length <= 3;
  const activeColumns =
  gameMode === "6cols"
  ? columns
  : [columns[0], columns[2], columns[4]];
  useEffect(() => {
    setSetupPlayerNames((current) =>
      Array.from({ length: playerCount }, (_, index) => {
      return current[index] ?? `Joueur ${index + 1}`;
    })
  );
}, [playerCount]);
useEffect(() => {
  async function loadCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    setCurrentUserId(user?.id ?? null);
    
    if (!user) {
      setCurrentUsername(null);
      return;
    }
    
    const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();
    
    setCurrentUsername(profile?.username ?? null);
  }
  
  loadCurrentUser();
  
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    loadCurrentUser();
  });
  
  return () => subscription.unsubscribe();
}, []);
useEffect(() => {
  updateSavedGameInfo();
}, []);

async function createPlayerLinkToken(playerKey: string) {
  if (!currentUserId) {
    alert("Tu dois être connecté pour ajouter un autre profil.");
    return;
  }
  
  const token = crypto.randomUUID();
  
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);
  
  const { error } = await supabase.from("player_link_tokens").insert({
    token,
    host_user_id: currentUserId,
    target_player_key: playerKey,
    status: "pending",
    player_count: playerCount,
    expires_at: expiresAt.toISOString(),
  });
  
  if (error) {
    alert(error.message);
    return;
  }
  
  setLinkToken(token);
  setLinkUrl(`${window.location.origin}/link-player/${token}`);
}
function applyClaimedProfileToSetup({
  playerKey,
  userId,
  username,
  avatarUrl,
}: {
  playerKey: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
}) {
  const playerIndex = Number(playerKey.replace("player-", "")) - 1;
  
  setLinkedProfiles((current) => {
    // Si la place est déjà prise par un autre profil, on ne remplace pas
    if (current[playerKey] && current[playerKey].userId !== userId) {
      console.log("Place déjà prise, association ignorée :", playerKey);
      return current;
    }
    
    return {
      ...current,
      [playerKey]: {
        userId,
        username,
        avatarUrl,
      },
    };
  });
  
  setSetupPlayerNames((current) =>
    Array.from({ length: playerCount }, (_, index) => {
    if (index === playerIndex) {
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    
    return current[index] ?? `Joueur ${index + 1}`;
  })
);
}
useEffect(() => {
  if (!linkToken) return;
  
  const channel = supabase
  .channel(`player_link_token_${linkToken}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "player_link_tokens",
      filter: `token=eq.${linkToken}`,
    },
    (payload) => {
      const token = payload.new as {
        status: string;
        claimed_player_key: string | null;
        claimed_user_id: string | null;
        claimed_username: string | null;
        claimed_avatar_url: string | null;
      };
      
      if (
        token.status !== "claimed" ||
        !token.claimed_player_key ||
        !token.claimed_user_id ||
        !token.claimed_username
      ) {
        return;
      }
      
      applyClaimedProfileToSetup({
        playerKey: token.claimed_player_key,
        userId: token.claimed_user_id,
        username: token.claimed_username,
        avatarUrl: token.claimed_avatar_url,
      });
      
      setLinkToken(null);
      setLinkUrl(null);
    }
  )
  .subscribe((status) => {
    console.log("Realtime player_link_tokens status:", status);
  });
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [linkToken, playerCount]);
function updateSavedGameInfo() {
  const saved = localStorage.getItem(STORAGE_KEY);
  
  if (!saved) {
    setHasSavedGame(false);
    setSavedGameInfo(null);
    return;
  }
  
  const data = JSON.parse(saved);
  const savedPlayerCount = data.players?.length ?? 0;
  const columnCount = data.gameMode === "6cols" ? 6 : 3;
  const totalCells = savedPlayerCount * columnCount * 13;
  
  const filledCells = Object.values(data.scores ?? {})
  .flatMap((player: any) => Object.values(player))
  .flatMap((column: any) => Object.values(column))
  .filter((value) => value !== null).length;
  
  const remainingTurns = Math.ceil(
    (totalCells - filledCells) / savedPlayerCount
  );
  
  setHasSavedGame(true);
  setSavedGameInfo({
    playerCount: savedPlayerCount,
    mode: data.gameMode === "6cols" ? "6 colonnes" : "3 colonnes",
    remainingTurns,
  });
}
useEffect(() => {
  function updateLayout() {
    const viewport = viewportRef.current;
    const sheet = sheetRef.current;
    
    if (!viewport || !sheet) return;
    
    const contentWidth = sheet.scrollWidth;
    const contentHeight = sheet.scrollHeight;
    
    let nextScale = 1;
    
    if (fitToScreen) {
      const safePadding = 24;
      const scaleX = (viewport.clientWidth - safePadding) / contentWidth;
      const scaleY = (viewport.clientHeight - safePadding) / contentHeight;
      
      nextScale = Math.min(scaleX, scaleY);
    }
    
    const scaledWidth = contentWidth * nextScale;
    const nextOffsetX = Math.max(
      0,
      (viewport.clientWidth - scaledWidth) / 2
    );
    
    setFitScale(nextScale);
    setFitOffsetX(nextOffsetX);
  }
  
  const frame = requestAnimationFrame(updateLayout);
  window.addEventListener("resize", updateLayout);
  
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", updateLayout);
  };
}, [fitToScreen, players.length, gameMode]);
useEffect(() => {
  if (players.length === 0) return;
  
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      players,
      scores,
      gameMode,
    })
  );
}, [players, scores, gameMode]);
useEffect(() => {
  if (!linkToken) return;
  
  const interval = window.setInterval(async () => {
    const { data, error } = await supabase
    .from("player_link_tokens")
    .select(
      "status, claimed_player_key, claimed_user_id, claimed_username, claimed_avatar_url"
    )
    .eq("token", linkToken)
    .maybeSingle();
    
    if (error || !data) return;
    
    if (
      data.status === "claimed" &&
      data.claimed_player_key &&
      data.claimed_user_id &&
      data.claimed_username
    ) {
      applyClaimedProfileToSetup({
        playerKey: data.claimed_player_key,
        userId: data.claimed_user_id,
        username: data.claimed_username,
        avatarUrl: data.claimed_avatar_url,
      });
      
      setLinkToken(null);
      setLinkUrl(null);
    }
  }, 1000);
  
  return () => window.clearInterval(interval);
}, [linkToken, playerCount]);
function handleSelectCell(cell: SelectedCell) {
  if (gameFinished) return;
  const currentValue = getScore(cell.playerId, cell.columnId, cell.rowId);
  
  if (
    currentValue === null &&
    cell.playerId !== currentPlayerId &&
    !gameFinished
  ) {
    setPendingCell(cell);
    return;
  }
  
  setSelectedCell(cell);
}
function generateSalonCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function createSalon() {
  setIsCreatingSalon(true);
  
  const code = generateSalonCode();
  
  const { data, error } = await supabase
  .from("yam_games")
  .insert({
    code,
    mode: gameMode,
    player_count: playerCount,
    status: "waiting",
    current_player_order: 1,
  })
  .select("id")
  .single();
  
  if (error) {
    console.error("SUPABASE ERROR", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    
    alert(error.message);
    
    setIsCreatingSalon(false);
    return;
  }
  
  setIsCreatingSalon(false);
  router.push(`/salon/${code}`);
}
async function loadSalonPlayers() {
  if (!salonGameId) return;
  
  const { data, error } = await supabase
  .from("yam_players")
  .select("id, name, player_order")
  .eq("game_id", salonGameId)
  .order("player_order", { ascending: true });
  
  if (error) {
    console.error(error);
    return;
  }
  
  setSalonPlayers(data ?? []);
}
async function startSalonGame() {
  if (!salonGameId) return;
  
  const { data: playersData, error: playersError } = await supabase
  .from("yam_players")
  .select("id, name, player_order")
  .eq("game_id", salonGameId)
  .order("player_order", { ascending: true });
  
  if (playersError) {
    console.error("Erreur récupération joueurs", playersError);
    return;
  }
  
  const salonPlayersAsLocalPlayers = (playersData ?? []).map((player) => ({
    id: player.id,
    name: player.name,
    playerOrder: player.player_order,
    linkedUserId: null,
  }));
  
  setPlayers(salonPlayersAsLocalPlayers);
  setScores({});
  setSalonCode(null);
  setFitToScreen(false);
  setFitScale(1);
  
  const { error } = await supabase
  .from("yam_games")
  .update({
    status: "playing",
  })
  .eq("id", salonGameId);
  
  if (error) {
    console.error("Erreur démarrage salon", error);
  }
}
useEffect(() => {
  if (!salonGameId) return;
  
  loadSalonPlayers();
  
  const channel = supabase
  .channel(`yam_players_${salonGameId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "yam_players",
      filter: `game_id=eq.${salonGameId}`,
    },
    () => {
      loadSalonPlayers();
    }
  )
  .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [salonGameId]);
useEffect(() => {
  if (!salonGameId) return;
  
  const channel = supabase
  .channel(`yam_scores_${salonGameId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "yam_scores",
      filter: `game_id=eq.${salonGameId}`,
    },
    (payload) => {
      const newScore = payload.new as {
        player_id: string;
        column_id: string;
        row_id: YamRow;
        value: string;
      };
      
      setScores((current) => ({
        ...current,
        [newScore.player_id]: {
          ...current[newScore.player_id],
          [newScore.column_id]: {
            ...current[newScore.player_id]?.[newScore.column_id],
            [newScore.row_id]:
            newScore.value === "X" ? "X" : Number(newScore.value),
          },
        },
      }));
    }
  )
  .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [salonGameId]);
function newGameFromVictory() {
  localStorage.removeItem(STORAGE_KEY);
  
  setPlayers([]);
setSetupPlayerNames([]);
setLinkedProfiles({});
  setScores({});
  setSelectedCell(null);
  setScoreInput("");
  setShowVictoryModal(false);
  setHasSavedGame(false);
  setScreen("home");
}
function startEditingPlayer(playerId: string, currentName: string) {
  if (gameFinished) return;
  setEditingPlayerId(playerId);
  setEditingName(currentName);
}
function resumeGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  
  if (!saved) return;
  
  const data = JSON.parse(saved);
  
  setPlayers(data.players ?? []);
  setScores(data.scores ?? {});
  setGameMode(data.gameMode ?? "6cols");
  setHasSavedGame(false);
  setScreen("game");
}
function startFreshGame() {
  localStorage.removeItem(STORAGE_KEY);
  
  setPlayers([]);
  setScores({});
  setHasSavedGame(false);
}
function savePlayerName(playerId: string) {
  if (!editingName.trim()) return;
  
  setPlayers((current) =>
    current.map((player) =>
      player.id === playerId
  ? { ...player, name: editingName.trim() }
  : player
)
);

setEditingPlayerId(null);
}
function getRemainingMoves(playerId: string) {
  return activeColumns.reduce((total, column) => {
    const remainingInColumn = rows.filter(
      (row) => getScore(playerId, column.id, row.id) === null
    ).length;
    
    return total + remainingInColumn;
  }, 0);
}
function getNewUnlockedBadges(beforeStats: any, afterStats: any) {
  return achievementDefinitions.flatMap((definition) => {
    const beforeValue = beforeStats?.[definition.metric] ?? 0;
    const afterValue = afterStats?.[definition.metric] ?? 0;
    
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
}
function getBaseXpGain(playerId: string, rank: number) {
  return (
    getParticipationXp(gameMode) +
    getRankXp(rank, playerCount, gameMode) +
    countFigure(playerId, "threeOfAKind") * FIGURE_XP.threeOfAKind +
    countFigure(playerId, "fullHouse") * FIGURE_XP.fullHouse +
    countFigure(playerId, "fourOfAKind") * FIGURE_XP.fourOfAKind +
    countFigure(playerId, "straight") * FIGURE_XP.straight +
    countSuccessfulYams(playerId) * FIGURE_XP.yam +
    activeColumns.filter((column) => getBonus(playerId, column.id) > 0).length *
      FIGURE_XP.bonus
  );
}
function countFigure(playerId: string, rowId: YamRow) {
  return activeColumns.reduce((total, column) => {
    const value = getScore(playerId, column.id, rowId);
    
    return value !== null && value !== "X" ? total + 1 : total;
  }, 0);
  
}
function hasNoX(playerId: string) {
  return activeColumns.every((column) =>
    rows.every((row) => getScore(playerId, column.id, row.id) !== "X")
);
}
function countSuccessfulYams(playerId: string) {
  return activeColumns.reduce((total, column) => {
    const value = getScore(playerId, column.id, "yam");
    
    return value === 60 ? total + 1 : total;
  }, 0);
}
function startGame() {
  const newPlayers = Array.from({ length: playerCount }, (_, index) => {
    const playerId = `player-${index + 1}`;
    
    return {
      id: playerId,
      name: setupPlayerNames[index]?.trim() || `Joueur ${index + 1}`,
      linkedUserId: linkedProfiles[playerId]?.userId ?? null,
    };
  });
  
  setCurrentLocalGameId(null);
  setPlayers(newPlayers);
  setScores({});
  setHasSavedGame(false);
  setFitToScreen(false);
  setFitScale(1);
  setScreen("game");
  setFinishedGameSaved(false);
}
function handleStartGame() {
  if (partyMode === "salon") {
    createSalon();
    return;
  }
  
  goToSetup();
}
function goToSetup() {
  if (hasSavedGame && partyMode === "local") {
    setShowNewGameWarning(true);
    return;
  }
  
  setScreen("setup");
}
function quitGame() {
  setShowQuitModal(true);
}
function confirmQuitGame() {
  setPlayers([]);
  setSetupPlayerNames([]);
  setLinkedProfiles({});

  setSelectedCell(null);
  setScoreInput("");
  setFitToScreen(false);
  setFitScale(1);

  setShowQuitModal(false);
  setHasSavedGame(true);
  setScreen("home");

  setTimeout(updateSavedGameInfo, 0);
}
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function getScoreOptions(rowId: YamRow) {
  if (rowId === "plus" || rowId === "minus") {
    return Array.from({ length: 26 }, (_, index) => index + 5);
  }
  
  const optionsByRow: Partial<Record<YamRow, number[]>> = {
    aces: [1, 2, 3, 4, 5],
    twos: [2, 4, 6, 8, 10],
    threes: [3, 6, 9, 12, 15],
    fours: [4, 8, 12, 16, 20],
    fives: [5, 10, 15, 20, 25],
    sixes: [6, 12, 18, 24, 30],
    threeOfAKind: [20],
    fullHouse: [30],
    straight: [50],
    fourOfAKind: [40],
    yam: [60],
  };
  
  return optionsByRow[rowId] ?? [];
}

function isValidScoreForRow(rowId: YamRow, value: number) {
  return getScoreOptions(rowId).includes(value);
}
function fillRandomGame() {
  const nextScores: Scores = { ...scores };

  for (const player of players) {
    nextScores[player.id] = {
      ...(nextScores[player.id] ?? {}),
    };

    for (const column of activeColumns) {
      nextScores[player.id][column.id] = {
        ...(nextScores[player.id][column.id] ?? {}),
      };

      for (const row of rows) {
        const options = getScoreOptions(row.id);

        const value =
          Math.random() < 0.15
            ? "X"
            : options[Math.floor(Math.random() * options.length)];

        nextScores[player.id][column.id][row.id] = value;
      }
    }
  }

  setScores(nextScores);
}
async function saveScore(value: number | "X") {
  if (gameFinished) return;
  if (!selectedCell) return;
  
  const { playerId, columnId, rowId } = selectedCell;
  let finalValue: number | "X" = value;
  
  if (typeof value === "number" && (rowId === "plus" || rowId === "minus")) {
    const oppositeRowId = rowId === "plus" ? "minus" : "plus";
    const oppositeValue = getScore(playerId, columnId, oppositeRowId);
    
    if (typeof oppositeValue === "number") {
      if (rowId === "plus" && value <= oppositeValue) {
        finalValue = -50;
      }
      
      if (rowId === "minus" && value >= oppositeValue) {
        finalValue = -50;
      }
    }
  }
  
  setScores((current) => ({
    ...current,
    [playerId]: {
      ...current[playerId],
      [columnId]: {
        ...current[playerId]?.[columnId],
        [rowId]: finalValue,
      },
    },
  }));
  if (currentLocalGameId) {
    const { error } = await supabase.from("local_game_scores").upsert(
      {
        game_id: currentLocalGameId,
        player_key: playerId,
        column_id: columnId,
        row_id: rowId,
        value: String(finalValue),
      },
      {
        onConflict: "game_id,player_key,column_id,row_id",
      }
    );
    
    if (error) {
      console.error("Erreur sauvegarde score", error);
    }
  }
  setLastScoreAnimation({
    playerId,
    columnId,
    rowId,
    value,
  });
  
  setTimeout(() => {
    setLastScoreAnimation(null);
  }, 800);
  closeModal();
}

function clearScore() {
  if (gameFinished) return;
  if (!selectedCell) return;
  
  const { playerId, columnId, rowId } = selectedCell;
  
  setScores((current) => ({
    ...current,
    [playerId]: {
      ...current[playerId],
      [columnId]: {
        ...current[playerId]?.[columnId],
        [rowId]: null,
      },
    },
  }));
  if (currentLocalGameId) {
    supabase
    .from("local_game_scores")
    .delete()
    .eq("game_id", currentLocalGameId)
    .eq("player_key", playerId)
    .eq("column_id", columnId)
    .eq("row_id", rowId)
    .then(({ error }) => {
      if (error) {
        console.error("Erreur suppression score", error);
      }
    });
  }
  closeModal();
}

function closeModal() {
  setSelectedCell(null);
  setScoreInput("");
}

function getScore(playerId: string, columnId: string, rowId: YamRow) {
  return scores[playerId]?.[columnId]?.[rowId] ?? null;
}

function scoreToNumber(value: ScoreValue) {
  return typeof value === "number" ? value : 0;
}

function isCellFilled(playerId: string, columnId: string, rowId: YamRow) {
  return getScore(playerId, columnId, rowId) !== null;
}

function isCellPlayable(playerId: string, columnId: string, rowId: YamRow) {
  const column = activeColumns.find((item) => item.id === columnId);
  if (!column) return false;
  
  if (isCellFilled(playerId, columnId, rowId)) return true;
  
  const rowIndex = rows.findIndex((row) => row.id === rowId);
  if (rowIndex === -1) return false;
  
  if (column.type === "free") return true;
  
  if (column.type === "down") {
    return rows
    .slice(0, rowIndex)
    .every((row) => isCellFilled(playerId, column.id, row.id));
  }
  
  if (column.type === "up") {
    return rows
    .slice(rowIndex + 1)
    .every((row) => isCellFilled(playerId, column.id, row.id));
  }
  
  return false;
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
function getTotalPlayedMoves() {
  return players.reduce((total, player) => {
    return (
      total +
      activeColumns.reduce((playerTotal, column) => {
        return (
          playerTotal +
          rows.filter(
            (row) =>
              getScore(player.id, column.id, row.id) !== null
          ).length
        );
      }, 0)
    );
  }, 0);
}

function getCurrentPlayerId() {
  if (players.length === 0) return null;
  
  return players[
    getTotalPlayedMoves() % players.length
  ]?.id;
}
function isGameFinished() {
  return players.length > 0 && players.every((player) => getRemainingMoves(player.id) === 0);
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
const currentPlayerId = getCurrentPlayerId();
const gameFinished = isGameFinished();
const [finishedGameSaved, setFinishedGameSaved] = useState(false);
useEffect(() => {
  async function updateProfileStatsAfterGame({
  gameId,
  profileId,
  playerTotal,
  playerRank,
  yamsCount,
  playerCount,
  mode,
  source,
  playerId,
}: {
  gameId: string;
  profileId: string;
  playerTotal: number;
  playerRank: number;
  yamsCount: number;
  playerCount: number;
  mode: "3cols" | "6cols";
  source: "local" | "salon";
  playerId: string;
}) {
    const is3Cols = mode === "3cols";
    const currentPlayerIdForStats = playerId;
    const { error } = await supabase.rpc("upsert_profile_stats_for_local_game_player", {
  p_game_id: gameId,
      p_profile_id: profileId,
      p_games_played_3: is3Cols ? 1 : 0,
      p_games_played_6: is3Cols ? 0 : 1,
      p_wins_3: is3Cols && playerRank === 1 && playerCount >= 2 ? 1 : 0,
      p_wins_6: !is3Cols && playerRank === 1 && playerCount >= 2 ? 1 : 0,
      p_best_score_3: is3Cols ? playerTotal : 0,
      p_perfect_games_3:
      is3Cols && hasNoX(playerId) ? 1 : 0,
      
      p_perfect_games_6:
      !is3Cols && hasNoX(playerId) ? 1 : 0,
      p_best_score_6: !is3Cols ? playerTotal : 0,
      p_total_points_3: is3Cols ? playerTotal : 0,
      p_total_points_6: !is3Cols ? playerTotal : 0,
      p_yams_total: yamsCount,
      p_four_of_a_kind_total: countFigure(currentPlayerIdForStats, "fourOfAKind"),
      p_full_house_total: countFigure(currentPlayerIdForStats, "fullHouse"),
      p_straight_total: countFigure(currentPlayerIdForStats, "straight"),
      p_three_of_a_kind_total: countFigure(currentPlayerIdForStats, "threeOfAKind"),
      p_bonus_total: activeColumns.filter(
        (column) => getBonus(currentPlayerIdForStats, column.id) > 0
      ).length,
      p_local_games: source === "local" ? 1 : 0,
      p_salon_games: source === "salon" ? 1 : 0,
      p_games_2_players: playerCount === 2 ? 1 : 0,
      p_games_3_players: playerCount === 3 ? 1 : 0,
      p_games_4_players: playerCount === 4 ? 1 : 0,
      p_games_5_players: playerCount === 5 ? 1 : 0,
      p_games_6_players: playerCount === 6 ? 1 : 0,
    });
    
    if (error) {
      console.error("Erreur mise à jour profile_stats", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }
  }
  async function finishLocalGame() {
    if (!gameFinished) return;
    if (finishedGameSaved) return;
    
    setFinishedGameSaved(true);
    
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedGame(false);
    setSavedGameInfo(null);
    const linkedPlayers = players.filter((player) => player.linkedUserId);
    
    // Aucun profil associé = rien en base
    if (linkedPlayers.length === 0) return;
    
    const ownerId = linkedPlayers[0].linkedUserId;
    
    const { data: gameData, error: gameError } = await supabase
    .from("local_games")
    .insert({
      mode: gameMode,
      player_count: playerCount,
      status: "finished",
      created_by: ownerId,
      linked_profile_id: ownerId,
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();
    
    if (gameError) {
      console.error("Erreur création partie terminée", gameError);
      return;
    }
    
    const createdGameId = gameData.id;
    setCurrentLocalGameId(createdGameId);
    
    const leaderboard = getLeaderboard();
    
    const { error: playersError } = await supabase
    .from("local_game_players")
    .insert(
      leaderboard.map((player) => ({
        game_id: createdGameId,
        player_key: player.id,
        display_name: player.name,
        profile_id: player.linkedUserId,
        final_score: player.total,
        final_rank: player.rank,
        yams_count: countSuccessfulYams(player.id),
        player_order:
        Number(player.id.replace("player-", "")) || player.rank,
        
      }))
    );
    
    if (playersError) {
      console.error("Erreur sauvegarde joueurs finaux", playersError);
      return;
    }
    
    const scoreRows = players.flatMap((player) =>
      activeColumns.flatMap((column) =>
        rows.flatMap((row) => {
      const value = getScore(player.id, column.id, row.id);
      
      if (value === null) return [];
      
      return [
        {
          game_id: createdGameId,
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
    console.error("Erreur sauvegarde scores finaux", scoresError);
  }
}

for (const player of leaderboard) {
  if (!player.linkedUserId) continue;
  
  // Pour l'instant, depuis le client, on ne met à jour que le profil connecté.
  
  console.log("stats update check", {
    currentUserId,
    linkedUserId: player.linkedUserId,
    same: player.linkedUserId === currentUserId,
  });
  const { data: statsBefore } = await supabase
  .from("profile_stats")
  .select("*")
  .eq("profile_id", player.linkedUserId)
  .maybeSingle();
  await updateProfileStatsAfterGame({
    profileId: player.linkedUserId,
    playerId: player.id,
    playerTotal: player.total,
    playerRank: player.rank,
    yamsCount: countSuccessfulYams(player.id),
    playerCount,
    mode: gameMode,
    source: "local",
    gameId: createdGameId,
  });
  const { error: winStreakError } = await supabase.rpc("update_win_streak", {
  p_game_id: createdGameId,
  p_profile_id: player.linkedUserId,
  p_is_win: player.rank === 1,
  p_player_count: playerCount,
});

if (winStreakError) {
  console.error("Erreur update win streak", {
    message: winStreakError.message,
    details: winStreakError.details,
    hint: winStreakError.hint,
    code: winStreakError.code,
  });
}
  const { data: statsAfter } = await supabase
  .from("profile_stats")
  .select("*")
  .eq("profile_id", player.linkedUserId)
  .maybeSingle();
  
  const potentialBadges = getNewUnlockedBadges(statsBefore, statsAfter);

const { data: claimedBadges, error: claimBadgesError } =
  await supabase.rpc("claim_profile_badges_for_local_game_player", {
    p_game_id: createdGameId,
    p_profile_id: player.linkedUserId,
    p_badges: potentialBadges,
  }
);

if (claimBadgesError) {
  console.error("Erreur claim badges", {
    message: claimBadgesError.message,
    details: claimBadgesError.details,
    hint: claimBadgesError.hint,
    code: claimBadgesError.code,
  });
}

const awardedBadges: {
  label: string;
  milestone: number;
  xp: number;
}[] = (claimedBadges ?? []).map((badge: any) => {
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
const badgeXp = awardedBadges.reduce((total, badge) => total + badge.xp, 0);
const baseXp = getBaseXpGain(player.id, player.rank);
const totalXpGain = baseXp + badgeXp;
const { data: xpResult, error: xpError } = await supabase.rpc(
  "add_profile_xp_for_local_game_player",
  {
    p_game_id: createdGameId,
    p_profile_id: player.linkedUserId,
    p_xp_gain: totalXpGain,
  }
);

if (xpError) {
  console.error("Erreur ajout XP", {
    message: xpError.message,
    details: xpError.details,
    hint: xpError.hint,
    code: xpError.code,
  });
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
console.log("XP total gagné", {
  baseXp,
  badgeXp,
  totalXpGain,
});
  
}
setShowVictoryModal(true);
}

finishLocalGame();
}, [gameFinished]);


return (
  <main
  className={
    screen === "game"
      ? "h-dvh overflow-hidden bg-black text-white"
      : "min-h-dvh overflow-y-auto bg-black text-white"
  }
>
  
  {screen === "home" && (
    <StartScreen
    playerCount={playerCount}
    setPlayerCount={setPlayerCount}
    gameMode={gameMode}
    setGameMode={setGameMode}
    startGame={handleStartGame}
    hasSavedGame={hasSavedGame}
    resumeGame={resumeGame}
    partyMode={partyMode}
    setPartyMode={setPartyMode}
    currentUserId={currentUserId}
    associateProfile={associateProfile}
    setAssociateProfile={setAssociateProfile}
    />
  )}
  
  {screen === "setup" && (
    <SetupScreen
    playerCount={playerCount}
    gameMode={gameMode}
    currentUserId={currentUserId}
    setupPlayerNames={setupPlayerNames}
    setSetupPlayerNames={setSetupPlayerNames}
    linkedProfiles={linkedProfiles}
    setLinkedProfiles={setLinkedProfiles}
    onBack={() => setScreen("home")}
    onStart={startGame}
    currentUsername={currentUsername}
    linkUrl={linkUrl}
    createPlayerLinkToken={createPlayerLinkToken}
    closeLinkModal={() => {
      setLinkToken(null);
      setLinkUrl(null);
    }}
    />
  )}
  
  {screen === "game" && (
    <GameScreen
    fitToScreen={fitToScreen}
    setFitToScreen={setFitToScreen}
    toggleFullscreen={toggleFullscreen}
    quitGame={quitGame}
    useSideLeaderboard={useSideLeaderboard}
    viewportRef={viewportRef}
    sheetRef={sheetRef}
    fitOffsetX={fitOffsetX}
    devFillRandomGame={fillRandomGame}
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
      startEditingPlayer,
      editingPlayerId,
      editingName,
      setEditingName,
      savePlayerName,
      setEditingPlayerId,
      activeColumns,
      currentPlayerId,
      gameFinished,
      lastScoreAnimation,
      
    }}
    LeaderboardComponent={Leaderboard}
    leaderboardProps={{
      players: getLeaderboard(),
      currentPlayerId,
      gameFinished,
    }}
    playerColors={PLAYER_COLORS}
    />
  )}
  
  {selectedCell && (
    <ScoreModal
    scoreInput={scoreInput}
    setScoreInput={setScoreInput}
    scoreOptions={scoreOptions}
    selectedCell={selectedCell}
    saveScore={saveScore}
    clearScore={clearScore}
    closeModal={closeModal}
    isValidScoreForRow={isValidScoreForRow}
    />
  )}
  {showVictoryModal && gameFinished && (
    <VictoryModal
  players={getLeaderboard()}
  xpResults={xpResultsByPlayer}
  onBackHome={newGameFromVictory}
/>
  )}
  {showQuitModal && (
    <QuitModal
    onCancel={() => setShowQuitModal(false)}
    onConfirm={confirmQuitGame}
    />
  )}
  {pendingCell && (
    <WrongPlayerModal
    onCancel={() => setPendingCell(null)}
    onConfirm={() => {
      setSelectedCell(pendingCell);
      setPendingCell(null);
    }}
    />
  )}
  {showNewGameWarning && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
    <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center shadow-2xl">
    
    <div className="text-5xl">💾</div>
    
    <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
    Sauvegarde détectée
    </div>
    
    <h2 className="mt-1 text-3xl font-black text-white">
    Reprendre une partie ?
    </h2>
    
    <div className="mt-6 rounded-2xl bg-[#F4E9DC] p-5 text-black">
    <div className="flex justify-between font-black">
    <span>👥 Joueurs</span>
    <span>{savedGameInfo?.playerCount}</span>
    </div>
    
    <div className="mt-3 flex justify-between font-black">
    <span>🎲 Mode</span>
    <span>{savedGameInfo?.mode}</span>
    </div>
    
    <div className="mt-3 flex justify-between font-black">
    <span>⏳ Tours restants</span>
    <span>{savedGameInfo?.remainingTurns}</span>
    </div>
    </div>
    
    <p className="mt-5 text-sm font-bold text-slate-400">
    Commencer une nouvelle partie supprimera cette sauvegarde.
    </p>
    
    <div className="mt-6 grid grid-cols-2 gap-3">
    <button
    onClick={() => setShowNewGameWarning(false)}
    className="rounded-xl bg-[#241A13] px-4 py-3 font-black text-white hover:bg-[#322217]"
    >
    Annuler
    </button>
    
    <button
    onClick={() => {
      localStorage.removeItem(STORAGE_KEY);
      setHasSavedGame(false);
      setShowNewGameWarning(false);
      setScreen("setup");
      setSavedGameInfo(null);
    }}
    className="rounded-xl bg-[#C44934] px-4 py-3 font-black text-white hover:bg-[#D75A43]"
    >
    Nouvelle partie
    </button>
    </div>
    
    </div>
    </div>
  )}
  </main>
);
}
function WrongPlayerModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
    <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center shadow-2xl">
    <div className="text-5xl">👤</div>
    
    <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
    Mauvais joueur
    </div>
    
    <h2 className="mt-1 text-3xl font-black text-white">
    Ce n'est pas ton tour
    </h2>
    
    <p className="mt-3 text-sm font-bold text-slate-400">
    Continuer permet d'ignorer l'ordre des joueurs.
    </p>
    
    <div className="mt-6 grid grid-cols-2 gap-3">
    <button
    onClick={onCancel}
    className="rounded-xl bg-[#241A13] px-4 py-3 font-black text-white hover:bg-[#322217]"
    >
    Annuler
    </button>
    
    <button
    onClick={onConfirm}
    className="rounded-xl bg-[#C44934] px-4 py-3 font-black text-white hover:bg-[#D75A43]"
    >
    Continuer
    </button>
    </div>
    </div>
    </div>
  );
}
function QuitModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
    <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center shadow-2xl">
    <div className="text-4xl">⚠️</div>
    
    <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
    Confirmation
    </div>
    
    <h2 className="mt-1 text-3xl font-black text-white">
    Quitter la partie ?
    </h2>
    
    <p className="mt-3 text-sm font-bold text-slate-400">
    La partie sera sauvegardée et tu reviendras au menu principal.
    </p>
    
    <div className="mt-6 grid grid-cols-2 gap-3">
    <button
    onClick={onCancel}
    className="rounded-xl bg-[#241A13] px-4 py-3 font-black text-white hover:bg-[#322217]"
    >
    Annuler
    </button>
    
    <button
    onClick={onConfirm}
    className="rounded-xl bg-[#C44934] px-4 py-3 font-black text-white hover:bg-[#D75A43]"
    >
    Quitter
    </button>
    </div>
    </div>
    </div>
  );
}
function StartScreen({
  playerCount,
  setPlayerCount,
  gameMode,
  setGameMode,
  startGame,
  hasSavedGame,
  resumeGame,
  partyMode,
  setPartyMode,
  currentUserId,
  associateProfile,
  setAssociateProfile,
}: {
  playerCount: number;
  setPlayerCount: (count: number) => void;
  gameMode: "6cols" | "3cols";
  setGameMode: (mode: "6cols" | "3cols") => void;
  startGame: () => void;
  hasSavedGame: boolean;
  resumeGame: () => void;
  partyMode: "local" | "salon";
  setPartyMode: (mode: "local" | "salon") => void;
  currentUserId: string | null;
  associateProfile: boolean;
  setAssociateProfile: (value: boolean) => void;
}) {
  const router = useRouter();
  return (
    <section className="relative flex min-h-dvh items-center justify-center overflow-y-auto bg-black px-4 py-8 text-white">
    <AuthButton />
    
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
    <Image
    src="/favicon.png"
    alt=""
    width={1000}
    height={1000}
    className="select-none rotate-[-12deg]"
    />
    </div>
    
    <div className="relative z-10 w-full max-w-lg rounded-3xl border border-[#9B6A28]/50 bg-black p-5 shadow-2xl">
    <div className="mb-5 text-center">
    <div className="text-sm font-black uppercase text-[#C44934]">
    Feuille de score numérique
    </div>
    
    <h1 className="mt-1 text-6xl font-black tracking-tight text-white">
    Yam Score
    </h1>
    
    <p className="mt-3 text-sm font-bold text-slate-400">
    Configure ta partie, lance la feuille, et garde tes scores propres.
    </p>
    </div>
    
    <div className="rounded-3xl border border-[#9B6A28]/40 bg-[#F4E9DC] p-4 text-black">
    <label className="block text-sm font-black uppercase text-[#C44934]">
    Mode de partie
    </label>
    
    <div className="mt-2 grid grid-cols-2 gap-2">
    <button
    type="button"
    onClick={() => setPartyMode("local")}
    className={[
      "rounded-xl px-4 py-3 text-left font-black transition",
      partyMode === "local"
      ? "bg-[#C44934] text-white"
      : "bg-[#241A13] text-white hover:bg-[#322217]",
    ].join(" ")}
    >
    <div>Local</div>
    <div className="mt-1 text-xs font-bold opacity-80">
    Une personne note tout
    </div>
    </button>
    
    <button
    type="button"
    onClick={() => setPartyMode("salon")}
    className={[
      "rounded-xl px-4 py-3 text-left font-black transition",
      partyMode === "salon"
      ? "bg-[#C44934] text-white"
      : "bg-[#241A13] text-white hover:bg-[#322217]",
    ].join(" ")}
    >
    <div>Salon</div>
    <div className="mt-1 text-xs font-bold opacity-80">
    Chacun note sur son téléphone
    </div>
    </button>
    </div>
    
    <div className="my-5 h-px bg-[#D8B996]" />
    
    <label className="block text-sm font-black uppercase text-[#C44934]">
    Nombre de joueurs
    </label>
    
    <div className="mt-2 grid grid-cols-3 gap-2">
    {[1, 2, 3, 4, 5, 6].map((count) => (
      <button
      key={count}
      type="button"
      onClick={() => setPlayerCount(count)}
      className={[
        "rounded-xl px-4 py-3 font-black transition",
        playerCount === count
        ? "bg-[#C44934] text-white"
        : "bg-[#241A13] text-white hover:bg-[#322217]"
      ].join(" ")}
      >
      {count}
      </button>
    ))}
    </div>
    
    <div className="mt-5">
    <label className="block text-sm font-black uppercase text-[#C44934]">
    Mode de jeu
    </label>
    
    <div className="mt-2 space-y-2">
    <button
    onClick={() => setGameMode("6cols")}
    className={[
      "w-full rounded-xl px-4 py-3 text-left font-black transition",
      gameMode === "6cols"
      ? "bg-[#C44934] text-white"
      : "bg-[#241A13] text-white hover:bg-[#322217]"
    ].join(" ")}
    >
    <div>6 colonnes</div>
    <div className="mt-1 text-xs font-bold opacity-80">
    Descente ×2 • Libre ×2 • Montée ×2
    </div>
    </button>
    
    <button
    onClick={() => setGameMode("3cols")}
    className={[
      "w-full rounded-xl px-4 py-3 text-left font-black transition",
      gameMode === "3cols"
      ? "bg-[#C44934] text-white"
      : "bg-[#241A13] text-white hover:bg-[#322217]"
    ].join(" ")}
    >
    <div>3 colonnes</div>
    <div className="mt-1 text-xs font-bold opacity-80">
    Descente • Libre • Montée
    </div>
    </button>
    </div>
    </div>
    </div>
    
    <div className="mt-4 grid gap-3">
    {hasSavedGame && partyMode === "local" && (
      <button
      onClick={resumeGame}
      className="w-full rounded-xl bg-[#241A13] px-4 py-4 text-lg font-black text-white hover:bg-[#322217]"
      >
      Reprendre la partie locale
      </button>
    )}
    
    {partyMode === "salon" ? (
      <>
      <div className="grid grid-cols-2 gap-3">
      <button
      onClick={startGame}
      className="w-full rounded-xl bg-[#C44934] px-4 py-4 text-lg font-black text-white transition hover:bg-[#D75A43]"
      >
      Nouvelle partie
      </button>
      
      <button
      type="button"
      onClick={() => router.push("/join")}
      className="w-full rounded-xl bg-[#241A13] px-4 py-4 text-lg font-black text-white transition hover:bg-[#322217]"
      >
      Rejoindre
      </button>
      </div>
      
      <p className="text-center text-xs font-bold text-slate-500">
      Les parties salon sont sauvegardées en ligne.
      </p>
      </>
    ) : (
      <button
      onClick={startGame}
      className="w-full rounded-xl bg-[#C44934] px-4 py-4 text-lg font-black text-white transition hover:bg-[#D75A43]"
      >
      Nouvelle partie
      </button>
    )}
    </div>
    </div>
    </section>
  );
}
function SetupScreen({
  playerCount,
  gameMode,
  currentUserId,
  setupPlayerNames,
  setSetupPlayerNames,
  linkedProfiles,
  setLinkedProfiles,
  onBack,
  currentUsername,
  onStart,
  linkUrl,
  createPlayerLinkToken,
  closeLinkModal,
}: {
  playerCount: number;
  gameMode: "6cols" | "3cols";
  currentUserId: string | null;
  setupPlayerNames: string[];
  setSetupPlayerNames: React.Dispatch<React.SetStateAction<string[]>>;
  linkUrl: string | null;
  createPlayerLinkToken: (playerKey: string) => void;
  closeLinkModal: () => void;
  linkedProfiles: Record<
  string,
  {
    userId: string;
    username: string;
    avatarUrl?: string | null;
  }
  >;
  setLinkedProfiles: React.Dispatch<
  React.SetStateAction<
  Record<
  string,
  {
    userId: string;
    username: string;
    avatarUrl?: string | null;
  }
  >
  >
  >;
  currentUsername: string | null;
  onBack: () => void;
  onStart: () => void;
}) {
  function formatUsername(username: string) {
    return username.charAt(0).toUpperCase() + username.slice(1);
  }
  
  function linkCurrentProfileToPlayer(playerId: string, index: number) {
    if (!currentUserId || !currentUsername) return;
    
    setLinkedProfiles((current) => {
      const copy = { ...current };
      
      for (const key of Object.keys(copy)) {
        if (copy[key].userId === currentUserId) {
          delete copy[key];
        }
      }
      
      copy[playerId] = {
        userId: currentUserId,
        username: currentUsername,
      };
      
      return copy;
    });
    
    setSetupPlayerNames((current) =>
      Array.from({ length: playerCount }, (_, nameIndex) => {
      if (nameIndex === index) return formatUsername(currentUsername);
      return current[nameIndex] ?? `Joueur ${nameIndex + 1}`;
    })
  );
}

function unlinkPlayer(playerId: string) {
  setLinkedProfiles((current) => {
    const copy = { ...current };
    delete copy[playerId];
    return copy;
  });
}

return (
  <section className="relative flex min-h-screen items-center justify-center overflow-y-auto bg-black px-4 py-8 text-white">
  <AuthButton />
  
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
  <Image
  src="/favicon.png"
  alt=""
  width={1000}
  height={1000}
  className="select-none rotate-[-12deg]"
  />
  </div>
  
  <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-[#9B6A28]/50 bg-black p-6 shadow-2xl">
  <button
  onClick={onBack}
  className="mb-6 rounded-xl bg-[#241A13] px-4 py-2 font-black text-white hover:bg-[#322217]"
  >
  ← Retour
  </button>
  
  <div className="text-center">
  <div className="text-sm font-black uppercase text-[#C44934]">
  Configuration
  </div>
  
  <h1 className="mt-1 text-4xl font-black text-white">
  Joueurs
  </h1>
  
  <p className="mt-2 text-sm font-bold text-slate-400">
  {playerCount} joueur{playerCount > 1 ? "s" : ""} •{" "}
  {gameMode === "6cols" ? "6 colonnes" : "3 colonnes"}
  </p>
  </div>
  
  <div className="mt-8 space-y-3">
  {Array.from({ length: playerCount }, (_, index) => {
    const playerId = `player-${index + 1}`;
    const linkedProfile = linkedProfiles[playerId];
    const isLinked = !!linkedProfile;
    const currentUserAlreadyLinked = currentUserId
    ? Object.values(linkedProfiles).some(
      (profile) => profile.userId === currentUserId
    )
    : false;
    return (
      <div
      key={playerId}
      className={[
        "rounded-3xl border p-4 transition",
        isLinked
        ? "border-[#C44934] bg-[#F4E9DC] text-black"
        : "border-[#9B6A28]/40 bg-[#F4E9DC] text-black",
      ].join(" ")}
      >
      <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#C44934] text-xl font-black text-white">
      {index + 1}
      </div>
      
      <div className="flex-1">
      <label className="mb-1 block text-xs font-black uppercase text-[#C44934]">
      Joueur {index + 1}
      </label>
      
      <input
      value={setupPlayerNames[index] ?? ""}
      onChange={(event) => {
        const value = event.target.value;
        
        setSetupPlayerNames((current) =>
          current.map((name, nameIndex) =>
            nameIndex === index ? value : name
      )
    );
  }}
  className="w-full rounded-xl border border-[#D8B996] bg-[#FFF8EF] px-4 py-3 font-black text-black outline-none focus:border-[#C44934]"
  placeholder={`Joueur ${index + 1}`}
  />
  </div>
  </div>
  
  <div className="mt-3 grid gap-2 sm:grid-cols-2">
  {currentUserId &&
    currentUsername &&
    !isLinked &&
    !currentUserAlreadyLinked && (
      <button
      type="button"
      onClick={() => linkCurrentProfileToPlayer(playerId, index)}
      className="rounded-xl bg-[#241A13] px-4 py-3 text-left text-sm font-black text-white transition hover:bg-[#322217]"
      >
      Associer {currentUsername}
      </button>
    )}
    
    {!isLinked && (
      <button
      type="button"
      onClick={() => createPlayerLinkToken(playerId)}
      className="rounded-xl bg-[#241A13] px-4 py-3 text-left text-sm font-black text-white transition hover:bg-[#322217]"
      >
      Ajouter un autre profil
      </button>
    )}
    
    
    </div>
    
    {isLinked && (
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#C44934]/10 px-4 py-3 text-sm font-black text-[#C44934]">
      <span>
      ✅ {linkedProfile.username} associé à ce joueur
      </span>
      
      <button
      type="button"
      onClick={() => unlinkPlayer(playerId)}
      className="rounded-lg bg-[#C44934] px-3 py-2 text-xs font-black text-white transition hover:bg-[#D75A43]"
      >
      Retirer
      </button>
      </div>
    )}
    </div>
  );
})}
</div>

{Object.keys(linkedProfiles).length > 0 && (
  <button
  type="button"
  onClick={() => setLinkedProfiles({})}
  className="mt-4 w-full rounded-xl border border-[#9B6A28]/40 px-4 py-3 text-sm font-black text-slate-300 hover:bg-[#241A13]"
  >
  Ne pas associer de profil à cette partie
  </button>
)}

{!currentUserId && (
  <div className="mt-6 rounded-2xl border border-[#9B6A28]/40 bg-black p-4 text-center text-sm font-bold text-slate-400">
  Connecte-toi pour associer cette partie à ton profil.
  </div>
)}

{linkUrl && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
  <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/60 bg-black p-6 text-center shadow-2xl">
  <h2 className="text-2xl font-black text-white">
  Ajouter un autre profil
  </h2>
  
  <p className="mt-2 text-sm font-bold text-slate-400">
  Le joueur scanne ce QR Code, se connecte, puis sera associé automatiquement à ce joueur.
  </p>
  
  <div className="mx-auto mt-6 flex w-fit rounded-2xl bg-[#F4E9DC] p-4">
  <QRCodeCanvas value={linkUrl} size={220} />
  </div>
  
  <div className="mt-4 break-all rounded-xl border border-[#9B6A28]/40 bg-[#241A13] p-3 text-xs font-bold text-slate-300">
  {linkUrl}
  </div>
  
  <button
  onClick={closeLinkModal}
  className="mt-5 w-full rounded-xl bg-[#241A13] px-4 py-3 font-black text-white hover:bg-[#322217]"
  >
  Fermer
  </button>
  </div>
  </div>
)}

<button
onClick={onStart}
className="mt-6 w-full rounded-xl bg-[#C44934] px-4 py-4 text-lg font-black text-white hover:bg-[#D75A43]"
>
Lancer la partie
</button>
</div>
</section>
);
}
function GameToolbar({
  fitToScreen,
  setFitToScreen,
  toggleFullscreen,
  quitGame,
}: {
  fitToScreen: boolean;
  setFitToScreen: (value: (current: boolean) => boolean) => void;
  toggleFullscreen: () => void;
  quitGame: () => void;
}) {
  return (
    <div className="flex h-12 items-center justify-between border-b border-slate-800 bg-black px-3">
    <div className="text-xs font-black uppercase text-white">
    {fitToScreen ? "Affichage adapté" : "Affichage normal"}
    </div>
    
    <div className="flex gap-2">
    <button
    onClick={() => setFitToScreen((current) => !current)}
    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-black hover:bg-slate-700"
    >
    {fitToScreen ? "Taille normale" : "Adapter à l'écran"}
    </button>
    
    <button
    onClick={toggleFullscreen}
    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-black hover:bg-slate-700"
    >
    Plein écran
    </button>
    
    <button
    onClick={quitGame}
    className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-black hover:bg-rose-600"
    >
    Quitter
    </button>
    </div>
    </div>
  );
}




function ScoreModal({
  scoreInput,
  setScoreInput,
  scoreOptions,
  selectedCell,
  saveScore,
  clearScore,
  closeModal,
  isValidScoreForRow,
}: {
  scoreInput: string;
  setScoreInput: (value: string) => void;
  scoreOptions: number[];
  selectedCell: SelectedCell;
  saveScore: (value: number | "X") => void | Promise<void>;
  clearScore: () => void;
  closeModal: () => void;
  isValidScoreForRow: (rowId: YamRow, value: number) => boolean;
}) {
  const isPlusMinus =
  selectedCell.rowId === "plus" || selectedCell.rowId === "minus";
  const [errorMessage, setErrorMessage] = useState("");
  const modalOptions: Array<number | "X"> = [...scoreOptions, "X"];
  const currentColumn = columns.find(
    (column) => column.id === selectedCell.columnId
  );
  
  const currentRow = rows.find(
    (row) => row.id === selectedCell.rowId
  );
  
  const columnLabel =
  currentColumn?.type === "down"
  ? "Descente"
  : currentColumn?.type === "free"
  ? "Libre"
  : "Montée";
  function validateManualScore() {
    const value = Number(scoreInput);
    
    if (Number.isNaN(value)) return;
    
    if (!isValidScoreForRow(selectedCell.rowId, value)) {
      setErrorMessage("Score impossible pour cette case.");
      return;
    }
    
    saveScore(value);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
    <div
    className={[
      "rounded-3xl border border-[#9B6A28]/60 bg-black p-6 shadow-2xl",
      isPlusMinus ? "w-full max-w-[520px]" : "w-full max-w-sm",
    ].join(" ")}
    >
    <div className="mb-5 text-center">
    <div className="text-xs font-black uppercase tracking-wider text-[#C44934]">
    {columnLabel}
    </div>
    
    <h3 className="mt-1 text-3xl font-black text-white">
    {currentRow?.label}
    </h3>
    
    <div className="mt-1 text-sm font-bold text-slate-400">
    Entrer un score
    </div>
    </div>
    
    {modalOptions.length > 0 && (
      <div
      className={[
        "mb-5 grid gap-3",
        isPlusMinus ? "grid-cols-5" : "grid-cols-3",
      ].join(" ")}
      >
      {modalOptions.map((option) => (
        <button
        key={option}
        onClick={() =>
          option === "X" ? saveScore("X") : saveScore(option)
        }
        className={[
          "min-h-14 rounded-xl px-4 py-3 text-xl font-black transition",
          option === "X"
          ? "bg-[#C44934] text-white hover:bg-[#D75A43]"
          : "bg-[#F4E9DC] text-black hover:bg-[#FFF8EF]"
        ].join(" ")}
        >
        {option}
        </button>
      ))}
      </div>
    )}
    
    <input
    onKeyDown={(event) => {
      if (event.key === "Enter") {
        validateManualScore();
      }
    }}
    type="number"
    value={scoreInput}
    onChange={(event) => {
      setScoreInput(event.target.value);
      setErrorMessage("");
    }}
    className="w-full rounded-xl border border-[#9B6A28]/50 bg-[#F4E9DC] p-3 text-center text-2xl font-black text-black outline-none focus:border-[#C44934]"
    placeholder="Score manuel"
    autoFocus
    />
    
    {errorMessage && (
      <div className="mt-3 rounded-xl border border-[#C44934] bg-[#C44934]/10 px-3 py-2 text-center text-sm font-black text-[#D75A43]">
      {errorMessage}
      </div>
    )}
    
    <div className="mt-4 grid gap-2">
    <button
    onClick={validateManualScore}
    className="rounded-xl bg-[#C44934] py-3 font-black text-white hover:bg-[#D75A43]"
    >
    ✓ Valider
    </button>
    
    <button
    onClick={clearScore}
    className="rounded-xl bg-[#241A13] py-3 font-black text-white hover:bg-[#322217]"
    >
    🗑️ Effacer
    </button>
    
    <button
    onClick={closeModal}
    className="rounded-xl border border-[#9B6A28]/40 py-3 font-black text-slate-300 hover:bg-[#241A13]"
    >
    ✘ Annuler
    </button>
    </div>
    </div>
    </div>
  );
}

