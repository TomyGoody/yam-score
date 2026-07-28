"use client";

import { useEffect, useRef, useState } from "react";
import { columns, rows, YamRow } from "./lib/yamRules";
import Image from "next/image";
import { supabase } from "./lib/supabase";
import VictoryModal from "./components/VictoryModal";
import { useRouter,useSearchParams } from "next/navigation";
import GameScreen from "./components/GameScreen";
import Leaderboard from "./components/Leaderboard";
import { getLevelFromTotalXp } from "./lib/levelRules";

import { getTournamentTheme } from "./lib/tournamentThemes";
import type { TournamentThemeConfig } from "./lib/tournamentThemes";
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
import LoadingScreen from "./components/LoadingScreen";

type ScoreValue = number | "X" | null;
type CompetitionLocalSet = {
  competitionId: string;
  competitionType: "grand_slam_final" | "world_cup";
  matchId: string | null;
  matchNumber: number;
  gameId: string;
  roundNumber: number;
  isWorldCupSemiFinal: boolean;
  isWorldCupFinal: boolean;
  theme:
  | "australian_open"
  | "roland_garros"
  | "wimbledon"
  | "us_open"
  | "world_cup";
  
  tournamentName: string;
  
  player1SetsWon: number;
  player2SetsWon: number;
};
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
type HomeStats = {
  gamesPlayed: number;
  winRate: number;
  currentWinStreak: number;
};
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
  const [screen, setScreen] = useState<
  "landing" | "home" | "setup" | "game"
  >("landing");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [associateProfile, setAssociateProfile] = useState(true);
  const [competitionLocalSet, setCompetitionLocalSet] =
  useState<CompetitionLocalSet | null>(null);
  const [homeStats, setHomeStats] = useState<HomeStats | null>(null);
  const [isLoadingCompetitionSet, setIsLoadingCompetitionSet] =
  useState(false);
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
  const [fitOffsetY, setFitOffsetY] = useState(0);
  const [lastScoreAnimation, setLastScoreAnimation] = useState<{
    playerId: string;
    columnId: string;
    rowId: string;
    value: number | "X";
  } | null>(null);
  const [competitionFinishResult, setCompetitionFinishResult] =
  useState<{
    competition_finished: boolean;
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
  const finishLocalGameStartedRef = useRef(false);
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

if (!user) {
  setCurrentUserId(null);
  setCurrentUsername(null);
  setHomeStats(null);
  return;
}

setCurrentUserId(user.id);

    const [
      { data: profile, error: profileError },
      { data: stats, error: statsError },
      { data: recentGames, error: recentGamesError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single(),

      supabase
        .from("profile_stats")
        .select(`
          games_played_3,
          games_played_6,
          wins_3,
          wins_6,
          games_2_players,
          games_3_players,
          games_4_players,
          games_5_players,
          games_6_players
        `)
        .eq("profile_id", user.id)
        .maybeSingle(),

      supabase
  .from("local_game_players")
  .select(`
    final_rank,
    local_games!inner (
      status,
      player_count,
      created_at,
      finished_at
    )
  `)
  .eq("profile_id", user.id)
  .eq("local_games.status", "finished")
  .gte("local_games.player_count", 2)
  .not("final_rank", "is", null),
    ]);

    if (profileError) {
      console.error(
        "Erreur chargement profil :",
        profileError
      );
    }

    if (statsError) {
      console.error(
        "Erreur chargement statistiques :",
        statsError
      );
    }

    if (recentGamesError) {
      console.error(
        "Erreur chargement série actuelle :",
        recentGamesError
      );
    }

    setCurrentUsername(profile?.username ?? null);

    const gamesPlayed =
      (stats?.games_played_3 ?? 0) +
      (stats?.games_played_6 ?? 0);

    const multiplayerGames =
      (stats?.games_2_players ?? 0) +
      (stats?.games_3_players ?? 0) +
      (stats?.games_4_players ?? 0) +
      (stats?.games_5_players ?? 0) +
      (stats?.games_6_players ?? 0);

    const multiplayerWins =
      (stats?.wins_3 ?? 0) +
      (stats?.wins_6 ?? 0);

    const sortedRecentGames = [...(recentGames ?? [])].sort((a, b) => {
  const gameA = Array.isArray(a.local_games)
    ? a.local_games[0]
    : a.local_games;

  const gameB = Array.isArray(b.local_games)
    ? b.local_games[0]
    : b.local_games;

  const dateA = new Date(
    gameA?.finished_at ?? gameA?.created_at ?? 0
  ).getTime();

  const dateB = new Date(
    gameB?.finished_at ?? gameB?.created_at ?? 0
  ).getTime();

  return dateB - dateA;
});

let currentWinStreak = 0;

for (const game of sortedRecentGames) {
  if (game.final_rank !== 1) {
    break;
  }

  currentWinStreak += 1;
}

    setHomeStats({
      gamesPlayed,

      winRate:
        multiplayerGames > 0
          ? Math.round(
              (multiplayerWins / multiplayerGames) * 100
            )
          : 0,

      currentWinStreak,
    });
  }

  void loadCurrentUser();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    void loadCurrentUser();
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);
  useEffect(() => {
    async function loadCompetitionLocalSet() {
      const searchParams = new URLSearchParams(window.location.search);
      
      const competitionId = searchParams.get("competitionId");
      const gameId = searchParams.get("gameId");
      
      if (!competitionId || !gameId) return;
      
      setIsLoadingCompetitionSet(true);
      
      const { data: game, error: gameError } = await supabase
      .from("local_games")
      .select(
        `
        id,
        mode,
        player_count,
        status,
        competition_id,
        competition_round_number
        `
      )
      .eq("id", gameId)
      .eq("competition_id", competitionId)
      .single();
      
      if (gameError || !game) {
        console.error("Erreur chargement set local", {
          message: gameError?.message,
          details: gameError?.details,
          hint: gameError?.hint,
          code: gameError?.code,
        });
        
        alert("Impossible de charger ce set de compétition.");
        setIsLoadingCompetitionSet(false);
        return;
      }
      
      const { data: gamePlayers, error: playersError } = await supabase
      .from("local_game_players")
      .select(
        `
    player_key,
    display_name,
    profile_id,
    player_order,
    competition_player_id
  `
      )
      .eq("game_id", gameId)
      .order("player_order", { ascending: true });
      
      if (playersError || !gamePlayers || gamePlayers.length !== 2) {
        console.error("Erreur chargement joueurs du set", playersError);
        alert("Impossible de charger les joueurs de ce set.");
        setIsLoadingCompetitionSet(false);
        return;
      }
      const { data: competition, error: competitionError } =
      await supabase
      .from("competitions")
      .select("competition_type, theme")
      .eq("id", competitionId)
      .single();
      
      if (competitionError || !competition) {
        console.error("Erreur chargement compétition", {
          message: competitionError?.message,
          details: competitionError?.details,
          hint: competitionError?.hint,
          code: competitionError?.code,
        });
        
        alert("Impossible de charger les informations de la compétition.");
        setIsLoadingCompetitionSet(false);
        return;
      }
      
      const competitionPlayerIds = gamePlayers
      .map((player) => player.competition_player_id)
      .filter(
        (id): id is string => Boolean(id)
      );
      
      const {
        data: competitionPlayers,
        error: competitionPlayersError,
      } = await supabase
      .from("competition_players")
      .select("id, player_order, sets_won")
      .eq("competition_id", competitionId)
      .in("id", competitionPlayerIds);
      
      if (
        competitionPlayersError ||
        !competitionPlayers ||
        competitionPlayers.length !== 2
      ) {
        console.error(
          "Erreur chargement joueurs de la rencontre",
          {
            error: competitionPlayersError,
            competitionPlayerIds,
            competitionType: competition.competition_type,
          }
        );
        
        alert(
          "Impossible de charger les joueurs de cette rencontre."
        );
        
        setIsLoadingCompetitionSet(false);
        return;
      }
      const { data: savedScores, error: scoresError } = await supabase
      .from("local_game_scores")
      .select("player_key, column_id, row_id, value")
      .eq("game_id", gameId);
      
      if (scoresError) {
        console.error("Erreur chargement scores du set", scoresError);
        setIsLoadingCompetitionSet(false);
        return;
      }
      
      const loadedPlayers: Player[] = gamePlayers.map((player) => ({
        id: player.player_key,
        name: player.display_name,
        playerOrder: player.player_order,
        linkedUserId: player.profile_id,
      }));
      
      const loadedScores: Scores = {};
      
      for (const score of savedScores ?? []) {
        const value: ScoreValue =
        score.value === "X" ? "X" : Number(score.value);
        
        loadedScores[score.player_key] = {
          ...loadedScores[score.player_key],
          [score.column_id]: {
            ...loadedScores[score.player_key]?.[score.column_id],
            [score.row_id as YamRow]: value,
          },
        };
      }
      const setPlayer1CompetitionId =
      gamePlayers.find((player) => player.player_order === 1)
      ?.competition_player_id ?? null;
      
      const setPlayer2CompetitionId =
      gamePlayers.find((player) => player.player_order === 2)
      ?.competition_player_id ?? null;
      
      const setPlayer1Competition = competitionPlayers.find(
        (player) => player.id === setPlayer1CompetitionId
      );
      
      const setPlayer2Competition = competitionPlayers.find(
        (player) => player.id === setPlayer2CompetitionId
      );
      const matchId = searchParams.get("matchId");
      
      let worldCupRoundNumber =
      game.competition_round_number;
      
      let worldCupMatchNumber = 1;
      
      let isWorldCupSemiFinal = false;
      let isWorldCupFinal = false;
      
      if (
        competition.competition_type === "world_cup" &&
        matchId
      ) {
        const {
          data: worldCupMatch,
          error: worldCupMatchError,
        } = await supabase
        .from("competition_matches")
        .select(
          "round_number, match_number, next_match_id"
        )
        .eq("id", matchId)
        .single();
        
        if (worldCupMatchError || !worldCupMatch) {
          console.error(
            "Erreur chargement des informations du match",
            worldCupMatchError
          );
        } else {
          worldCupRoundNumber =
          worldCupMatch.round_number;
          
          worldCupMatchNumber =
          worldCupMatch.match_number;
          
          // Aucun match après celui-ci : c'est la finale.
          isWorldCupFinal =
          worldCupMatch.next_match_id === null;
          
          // Il existe un prochain match :
          // on vérifie si ce prochain match est la finale.
          if (worldCupMatch.next_match_id) {
            const {
              data: nextWorldCupMatch,
              error: nextWorldCupMatchError,
            } = await supabase
            .from("competition_matches")
            .select("next_match_id")
            .eq("id", worldCupMatch.next_match_id)
            .single();
            
            if (nextWorldCupMatchError) {
              console.error(
                "Erreur chargement du prochain match",
                nextWorldCupMatchError
              );
            } else {
              isWorldCupSemiFinal =
              nextWorldCupMatch?.next_match_id === null;
            }
          }
        }
      }
      setCompetitionLocalSet({
        competitionId,
        
        competitionType:
        competition.competition_type as
        | "grand_slam_final"
        | "world_cup",
        
        matchId,
        isWorldCupSemiFinal,
        isWorldCupFinal,
        matchNumber: worldCupMatchNumber,
        
        gameId,
        
        roundNumber:
        competition.competition_type === "world_cup"
        ? worldCupRoundNumber
        : game.competition_round_number,
        
        theme: competition.theme,
        
        tournamentName:
        competition.competition_type === "world_cup"
        ? "Coupe du Monde"
        : getTournamentName(competition.theme),
        
        player1SetsWon:
        competition.competition_type === "grand_slam_final"
        ? setPlayer1Competition?.sets_won ?? 0
        : 0,
        
        player2SetsWon:
        competition.competition_type === "grand_slam_final"
        ? setPlayer2Competition?.sets_won ?? 0
        : 0,
      });
      setCurrentLocalGameId(gameId);
      setPartyMode("local");
      setPlayerCount(2);
      setGameMode(game.mode);
      setPlayers(loadedPlayers);
      setScores(loadedScores);
      setFinishedGameSaved(false);
      setHasSavedGame(false);
      setScreen("game");
      setIsLoadingCompetitionSet(false);
    }
    
    void loadCompetitionLocalSet();
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
    
    // Utilise au maximum l'espace disponible sans jamais dépasser.
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
  if (players.length === 0) return;
  
  // Les sets de compétition sont déjà sauvegardés dans Supabase.
  if (competitionLocalSet) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      players,
      scores,
      gameMode,
    })
  );
}, [players, scores, gameMode, competitionLocalSet]);
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
  
  const { error } = await supabase
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
function getTournamentName(
  theme:
  | "australian_open"
  | "roland_garros"
  | "wimbledon"
  | "us_open"
) {
  switch (theme) {
    case "australian_open":
    return "Open d’Australie";
    
    case "roland_garros":
    return "Roland-Garros";
    
    case "wimbledon":
    return "Wimbledon";
    
    case "us_open":
    return "US Open";
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
      xp: definition.xpRewards?.[index] ?? BADGE_XP[index] ?? 0,
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
  finishLocalGameStartedRef.current = false;
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
  if (competitionLocalSet) {
    const competitionId = competitionLocalSet.competitionId;
    
    // Le set reste "playing" dans Supabase et pourra être repris.
    localStorage.removeItem(STORAGE_KEY);
    
    setShowQuitModal(false);
    setSelectedCell(null);
    setScoreInput("");
    setFitToScreen(false);
    setFitScale(1);
    setHasSavedGame(false);
    
    router.push(
      competitionLocalSet.competitionType === "world_cup"
      ? `/modes-speciaux/coupe-du-monde/${competitionId}`
      : `/modes-speciaux/grand-chelem/${competitionId}`
    );
    
    return;
  }
  
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
const tournamentTheme = competitionLocalSet
? getTournamentTheme(competitionLocalSet.theme)
: null;
const quitLabel =
competitionLocalSet?.competitionType === "world_cup"
? "Quitter le match"
: competitionLocalSet?.competitionType === "grand_slam_final"
? "Quitter le set"
: "Quitter la partie";
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
    worldCupFinalReached,
    worldCupWin,
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
    worldCupFinalReached: number;
    worldCupWin: number;
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
      p_world_cup_finals_reached:
      worldCupFinalReached,
      
      p_world_cup_wins:
      worldCupWin,
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
  async function getProfileStatsForGamePlayer(
    gameId: string,
    profileId: string
  ) {
    const { data, error } = await supabase.rpc(
      "get_profile_stats_for_local_game_player",
      {
        p_game_id: gameId,
        p_profile_id: profileId,
      }
    );
    
    if (error) {
      console.error("Erreur lecture sécurisée profile_stats", {
        profileId,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      
      return null;
    }
    
    return Array.isArray(data) ? data[0] ?? null : data;
  }
  async function finishLocalGame() {
    if (!gameFinished) return;
    if (finishLocalGameStartedRef.current) return;
    
    // Verrou immédiat : contrairement à setState, la ref change tout de suite.
    finishLocalGameStartedRef.current = true;
    
    console.log("🏁 finishLocalGame réellement lancée");
    
    // La partie est terminée : on affiche immédiatement la modale.
    setShowVictoryModal(true);
    
    const linkedPlayers = players.filter(
      (player) => Boolean(player.linkedUserId)
    );
    
    console.log("👥 Profils liés :", linkedPlayers);
    
    /*
    Une partie locale classique sans profil n'est pas
    enregistrée dans Supabase.
    
    En revanche, une partie de compétition existe déjà
    dans la base et doit toujours être finalisée, même si
    les deux participants sont invités.
    */
    if (
      !competitionLocalSet &&
      linkedPlayers.length === 0
    ) {
      setFinishedGameSaved(true);
      localStorage.removeItem(STORAGE_KEY);
      setHasSavedGame(false);
      setSavedGameInfo(null);
      return;
    }
    
    const ownerId =
    linkedPlayers[0]?.linkedUserId ??
    currentUserId;
    
    /*
    Le propriétaire est uniquement indispensable pour
    créer une nouvelle partie locale classique.
    */
    if (!competitionLocalSet && !ownerId) {
      console.error(
        "Aucun propriétaire trouvé pour la partie"
      );
      
      finishLocalGameStartedRef.current = false;
      return;
    }
    
    const leaderboard = getLeaderboard();
    
    let createdGameId: string;
    
    if (competitionLocalSet && currentLocalGameId) {
      createdGameId = currentLocalGameId;
      
      console.log("🏆 Finalisation du set local de compétition", {
        createdGameId,
        competitionLocalSet,
      });
      
      const { error: gameError } = await supabase
      .from("local_games")
      .update({
        status: "finished",
        finished_at: new Date().toISOString(),
        
        competition_match_id:
        competitionLocalSet.competitionType === "world_cup"
        ? competitionLocalSet.matchId
        : null,
      })
      .eq("id", createdGameId)
      .eq("competition_id", competitionLocalSet.competitionId);
      
      if (gameError) {
        console.error("Erreur finalisation du set local", {
          message: gameError.message,
          details: gameError.details,
          hint: gameError.hint,
          code: gameError.code,
        });
        
        setFinishedGameSaved(false);
        return;
      }
      
      const { error: playersError } = await supabase
      .from("local_game_players")
      .upsert(
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
        })),
        {
          onConflict: "game_id,player_key",
        }
      );
      
      if (playersError) {
        console.error("Erreur mise à jour joueurs du set", {
          message: playersError.message,
          details: playersError.details,
          hint: playersError.hint,
          code: playersError.code,
        });
        
        setFinishedGameSaved(false);
        return;
      }
    } else {
      console.log("📝 Création de la partie locale classique...");
      if (!ownerId) {
        console.error(
          "Impossible de créer la partie : ownerId absent"
        );
        
        finishLocalGameStartedRef.current = false;
        return;
      }
      const { data: gameData, error: gameError } = await supabase
      .from("local_games")
      .insert({
        mode: gameMode,
        player_count: playerCount,
        status: "finished",
        created_by: ownerId,
        linked_profile_id: ownerId,
        source: "local",
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single();
      
      if (gameError || !gameData) {
        console.error("Erreur création partie terminée", gameError);
        
        // Autorise une nouvelle tentative, par exemple après un rechargement.
        finishLocalGameStartedRef.current = false;
        return;
      }
      
      createdGameId = gameData.id;
      setCurrentLocalGameId(createdGameId);
      
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
        finishLocalGameStartedRef.current = false;
        return;
      }
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
  .upsert(scoreRows, {
    onConflict: "game_id,player_key,column_id,row_id",
  });
  
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
  const statsBefore = await getProfileStatsForGamePlayer(
    createdGameId,
    player.linkedUserId
  );
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
    
    worldCupFinalReached:
    competitionLocalSet?.competitionType === "world_cup" &&
    competitionLocalSet.isWorldCupSemiFinal &&
    player.rank === 1
    ? 1
    : 0,
    
    worldCupWin:
    competitionLocalSet?.competitionType === "world_cup" &&
    competitionLocalSet.isWorldCupFinal &&
    player.rank === 1
    ? 1
    : 0,
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
  const statsAfter = await getProfileStatsForGamePlayer(
    createdGameId,
    player.linkedUserId
  );
  
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
const badgeXp = awardedBadges.reduce(
  (total, badge) => total + badge.xp,
  0
);

const baseXp = getBaseXpGain(player.id, player.rank);



const totalXpGain =
baseXp +
badgeXp;
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
if (competitionLocalSet) {
  const searchParams = new URLSearchParams(window.location.search);
  
  const matchId = searchParams.get("matchId");
  let matchNumber = 1;
  
  
  const { data: competitionData } = await supabase
  .from("competitions")
  .select("competition_type")
  .eq("id", competitionLocalSet.competitionId)
  .single();
  
  const rpcName =
  competitionData?.competition_type === "world_cup"
  ? "finish_world_cup_match"
  : "finish_competition_set";
  
  const rpcParams =
  competitionData?.competition_type === "world_cup"
  ? {
    p_competition_id: competitionLocalSet.competitionId,
    p_match_id: matchId,
    p_game_id: createdGameId,
    p_play_mode: "local",
  }
  : {
    p_competition_id: competitionLocalSet.competitionId,
    p_game_id: createdGameId,
    p_play_mode: "local",
  };
  
  const {
    data: competitionResult,
    error: competitionError,
  } = await supabase.rpc(
    rpcName,
    rpcParams
  );
  
  if (competitionError) {
    console.error(
      "Erreur validation compétition",
      competitionError
    );
    
    setFinishedGameSaved(false);
    return;
  }
  
  setCompetitionFinishResult(
    competitionResult as {
      competition_finished: boolean;
    }
  );
}
console.log("✅ Partie locale complètement sauvegardée");

setFinishedGameSaved(true);

localStorage.removeItem(STORAGE_KEY);
setHasSavedGame(false);
setSavedGameInfo(null);
}

finishLocalGame();
}, [gameFinished]);

if (isLoadingCompetitionSet) {
  return <LoadingScreen />;
}
return (
  <main
  className={
    screen === "game"
    ? "h-dvh overflow-hidden bg-black text-white"
    : "min-h-dvh overflow-y-auto bg-black text-white"
  }
  >
  {screen === "landing" && (
    <HomeMenu
    onQuickGame={() => setScreen("home")}
    onSpecialModes={() => router.push("/modes-speciaux")}
    onRules={() => router.push("/regles")}
    hasSavedGame={hasSavedGame}
    savedGameInfo={savedGameInfo}
    onResumeGame={resumeGame}
    homeStats={homeStats}
    onProfile={() => router.push("/profile?tab=dashboard")}
  onAchievements={() => router.push("/profile?tab=achievements")}
  onHistory={() => router.push("/profile?tab=history")}
  isLoggedIn={Boolean(currentUserId)}
 
    />
  )}
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
    onBack={() => setScreen("landing")}
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
    onBack={() => setScreen("landing")}
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
    fitOffsetY={fitOffsetY}
    useSideLeaderboard={useSideLeaderboard}
    viewportRef={viewportRef}
    sheetRef={sheetRef}
    fitOffsetX={fitOffsetX}
    quitLabel={
      competitionLocalSet
      ? competitionLocalSet.competitionType === "world_cup"
      ? "Quitter le match"
      : "Quitter le set"
      : "Quitter"
    }
    devFillRandomGame={fillRandomGame}
    competitionHeader={
      competitionLocalSet
      ? competitionLocalSet.competitionType === "grand_slam_final"
      ? {
        competitionId:
        competitionLocalSet.competitionId,
        
        competitionType:
        "grand_slam_final",
        
        roundNumber:
        competitionLocalSet.roundNumber,
        
        roundLabel:
        `Finale · Set ${competitionLocalSet.roundNumber}`,
        
        theme:
        competitionLocalSet.theme,
        
        tournamentName:
        competitionLocalSet.tournamentName,
        
        player1SetsWon:
        competitionLocalSet.player1SetsWon,
        
        player2SetsWon:
        competitionLocalSet.player2SetsWon,
      }
      : {
        competitionId:
        competitionLocalSet.competitionId,
        
        competitionType:
        "world_cup",
        
        roundNumber:
        competitionLocalSet.roundNumber,
        
        roundLabel:
        getWorldCupRoundLabel(
          competitionLocalSet.roundNumber,
          competitionLocalSet.matchNumber
        ),
        
        theme: "world_cup",
        
        tournamentName: "Coupe du Monde",
        
        matchId:
        competitionLocalSet.matchId,
      }
      : null
    }
    onBackToCompetition={
      competitionLocalSet
      ? () =>
        router.push(
        competitionLocalSet.competitionType === "world_cup"
        ? `/modes-speciaux/coupe-du-monde/${competitionLocalSet.competitionId}`
        : `/modes-speciaux/grand-chelem/${competitionLocalSet.competitionId}`
      )
      : undefined
    }
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
    tournamentTheme={
      competitionLocalSet
      ? getTournamentTheme(competitionLocalSet.theme)
      : null
    }
    />
  )}
  {showVictoryModal && gameFinished && (
    <VictoryModal
    players={getLeaderboard()}
    onViewGrid={() => setShowVictoryModal(false)}
    xpResults={xpResultsByPlayer}
    tournamentTheme={
      competitionLocalSet
      ? getTournamentTheme(
        competitionLocalSet.theme as
        | "australian_open"
        | "roland_garros"
        | "wimbledon"
        | "us_open"
        | "world_cup"
      )
      : null
    }
    onBackHome={
      competitionLocalSet
      ? () => {
        localStorage.removeItem(STORAGE_KEY);
        
        const victorySuffix =
        competitionFinishResult?.competition_finished
        ? "?tournamentVictory=1"
        : "";
        
        router.push(
          competitionLocalSet.competitionType === "world_cup"
          ? `/modes-speciaux/coupe-du-monde/${competitionLocalSet.competitionId}${victorySuffix}`
          : `/modes-speciaux/grand-chelem/${competitionLocalSet.competitionId}${victorySuffix}`
        );
      }
      : newGameFromVictory
    }
    competitionType={
      competitionLocalSet?.competitionType ?? null
    }
    competitionFinished={
      competitionFinishResult?.competition_finished ?? false
    }
    />
  )}
  {showQuitModal && (
    <QuitModal
    onCancel={() => setShowQuitModal(false)}
    onConfirm={confirmQuitGame}
    quitLabel={quitLabel}
    tournamentTheme={tournamentTheme}
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
  quitLabel,
  tournamentTheme,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  quitLabel: string;
  tournamentTheme?: TournamentThemeConfig | null;
}) {
  const isWorldCup = tournamentTheme?.id === "world_cup";
  const isGrandSlam =
  tournamentTheme &&
  tournamentTheme.id !== "world_cup";
  
  const title = isWorldCup
  ? "Quitter le match ?"
  : isGrandSlam
  ? "Quitter le set ?"
  : "Quitter la partie ?";
  
  const description = isWorldCup
  ? "Le match sera sauvegardé et tu reviendras au tableau de la Coupe du Monde."
  : isGrandSlam
  ? "Le set sera sauvegardé et tu reviendras à la finale."
  : "La partie sera sauvegardée et tu reviendras au menu principal.";
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
    <div
    className={[
      "relative w-full max-w-md overflow-hidden rounded-3xl border-2 p-6 text-center shadow-2xl",
      tournamentTheme
      ? tournamentTheme.border
      : "border-[#9B6A28]/70 bg-black",
    ].join(" ")}
    style={
      tournamentTheme
      ? {
        background: tournamentTheme.headerGradient,
      }
      : undefined
    }
    >
    {tournamentTheme && (
      <div className="mb-4 flex justify-center">
      <Image
      src={tournamentTheme.headerLogo}
      alt={tournamentTheme.name}
      width={72}
      height={72}
      className="h-20 w-auto object-contain drop-shadow-xl"
      />
      </div>
    )}
    
    {!tournamentTheme && (
      <div className="text-4xl">⚠️</div>
    )}
    
    <div
    className={[
      "mt-3 text-sm font-black uppercase",
      tournamentTheme
      ? tournamentTheme.accentText
      : "text-[#C44934]",
    ].join(" ")}
    >
    Confirmation
    </div>
    
    <h2 className="mt-1 text-3xl font-black text-white">
    {title}
    </h2>
    
    <p className="mt-3 text-sm font-bold text-white/70">
    {description}
    </p>
    
    <div className="mt-6 grid grid-cols-2 gap-3">
    <button
    type="button"
    onClick={onCancel}
    className={[
      "rounded-xl border px-4 py-3 font-black text-white transition",
      tournamentTheme
      ? `${tournamentTheme.border} bg-black/25 hover:bg-black/40`
      : "border-transparent bg-[#241A13] hover:bg-[#322217]",
    ].join(" ")}
    >
    Annuler
    </button>
    
    <button
    type="button"
    onClick={onConfirm}
    className={[
      "rounded-xl px-4 py-3 font-black transition",
      tournamentTheme
      ? `${tournamentTheme.buttonBackground} ${tournamentTheme.buttonHover} ${tournamentTheme.buttonText}`
      : "bg-[#C44934] text-white hover:bg-[#D75A43]",
    ].join(" ")}
    >
    {quitLabel}
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
  onBack,
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
  onBack: () => void;
}) {
  const router = useRouter();
  return (
    
    <section className="relative flex min-h-dvh items-center justify-center overflow-y-auto bg-black px-4 py-8 text-white">
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
    <Image
    src="/favicon.png"
    alt=""
    width={1000}
    height={1000}
    className="select-none rotate-[-12deg]"
    />
    </div>
    <AuthButton/>
    <div className="relative z-10 w-full max-w-lg">
    <div className="mb-5 flex justify-start">
    <button
    type="button"
    onClick={onBack}
    className="rounded-xl border border-[#9B6A28]/60 bg-black px-4 py-2 text-sm font-black text-white transition hover:bg-[#241A13]"
    >
    Accueil
    </button>
    </div>
    
    <div className="rounded-3xl border border-[#9B6A28]/50 bg-black p-5 shadow-2xl">
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
  Retour
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




function ScoreModal({
  scoreInput,
  setScoreInput,
  scoreOptions,
  selectedCell,
  saveScore,
  clearScore,
  closeModal,
  isValidScoreForRow,
  tournamentTheme,
}: {
  scoreInput: string;
  setScoreInput: (value: string) => void;
  scoreOptions: number[];
  selectedCell: SelectedCell;
  saveScore: (value: number | "X") => void | Promise<void>;
  clearScore: () => void;
  closeModal: () => void;
  isValidScoreForRow: (rowId: YamRow, value: number) => boolean;
  tournamentTheme?: ReturnType<typeof getTournamentTheme> | null;
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
  
  const isCompetition = Boolean(tournamentTheme);
  
  const competitionButtonClasses = tournamentTheme
  ? `${tournamentTheme.buttonBackground} ${tournamentTheme.buttonHover} ${tournamentTheme.buttonText}`
  : "";
  
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
      "rounded-3xl border p-6 shadow-2xl",
      isPlusMinus ? "w-full max-w-[520px]" : "w-full max-w-sm",
      
      isCompetition
      ? `${tournamentTheme?.border} bg-[#F4E9DC]`
      : "border-[#9B6A28]/60 bg-black",
    ].join(" ")}
    >
    <div className="mb-5 text-center">
    <div
    className={[
      "text-xs font-black uppercase tracking-wider",
      isCompetition
      ? tournamentTheme?.accentDarkText
      : "text-[#C44934]",
    ].join(" ")}
    >
    {columnLabel}
    </div>
    
    <h3
    className={[
      "mt-1 text-3xl font-black",
      isCompetition ? "text-[#241812]" : "text-white",
    ].join(" ")}
    >
    {currentRow?.label}
    </h3>
    
    <div
    className={[
      "mt-1 text-sm font-bold",
      isCompetition ? "text-[#6B584A]" : "text-slate-400",
    ].join(" ")}
    >
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
          "min-h-14 rounded-xl border px-4 py-3 text-xl font-black transition",
          
          option === "X"
          ? isCompetition
          ? `${competitionButtonClasses} ${tournamentTheme?.border}`
          : "border-[#C44934] bg-[#C44934] text-white hover:bg-[#D75A43]"
          : isCompetition
          ? "border-[#CFAF95] bg-[#FFF8EF] text-[#241812] hover:bg-white"
          : "border-transparent bg-[#F4E9DC] text-black hover:bg-[#FFF8EF]",
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
    className={[
      "w-full rounded-xl border bg-[#FFF8EF] p-3 text-center text-2xl font-black text-black outline-none",
      isCompetition
      ? tournamentTheme?.border
      : "border-[#9B6A28]/50 focus:border-[#C44934]",
    ].join(" ")}
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
    className={[
      "rounded-xl py-3 font-black transition",
      isCompetition
      ? competitionButtonClasses
      : "bg-[#C44934] text-white hover:bg-[#D75A43]",
    ].join(" ")}
    >
    ✓ Valider
    </button>
    
    <button
    onClick={clearScore}
    className={[
      "rounded-xl py-3 font-black transition",
      isCompetition
      ? "border border-[#CFAF95] bg-[#E8D8C5] text-[#241812] hover:bg-[#F1E4D5]"
      : "bg-[#241A13] text-white hover:bg-[#322217]",
    ].join(" ")}
    >
    🗑️ Effacer
    </button>
    
    <button
    onClick={closeModal}
    className={[
      "rounded-xl border py-3 font-black transition",
      isCompetition
      ? "border-[#CFAF95] text-[#6B584A] hover:bg-[#E8D8C5]"
      : "border-[#9B6A28]/40 text-slate-300 hover:bg-[#241A13]",
    ].join(" ")}
    >
    ✘ Annuler
    </button>
    </div>
    </div>
    </div>
  );
}
function HomeMenu({
  onQuickGame,
  onSpecialModes,
  onRules,
  hasSavedGame,
  savedGameInfo,
  onResumeGame,
  homeStats,
  onProfile,
  onAchievements,
  onHistory,
  isLoggedIn,
}: {
  onQuickGame: () => void;
  onSpecialModes: () => void;
  onRules: () => void;
  hasSavedGame: boolean;
  savedGameInfo: {
    playerCount: number;
    mode: string;
    remainingTurns: number;
   
  } | null;
  onResumeGame: () => void;
  homeStats: HomeStats | null;
   onProfile: () => void;
  onAchievements: () => void;
  onHistory: () => void;
  isLoggedIn: boolean;
}) {
  const [showSpecialModesModal, setShowSpecialModesModal] =
  useState(false);
  return (
    <section className="relative min-h-dvh overflow-hidden bg-black px-4 py-8 text-white sm:px-6 lg:px-10">
    <AuthButton />
    
    {/* Dé géant en arrière-plan */}
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
    <Image
    src="/favicon.png"
    alt=""
    width={1100}
    height={1100}
    priority
    className="translate-y-10 rotate-[-14deg] select-none opacity-[0.035]"
    />
    </div>
    
    {/* Halo central */}
    <div className="pointer-events-none absolute left-1/2 top-32 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-amber-500/[0.035] blur-[120px]" />
    
    <div className="relative z-10 mx-auto w-full max-w-6xl">
    {/* Hero */}
    <div className="flex flex-col items-center text-center">
    <Image
    src="/favicon.png"
    alt="YamScore"
    width={105}
    height={105}
    priority
    className="drop-shadow-[0_20px_35px_rgba(255,255,255,0.12)]"
    />
    
    <h1 className="mt-2 text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
    YamScore
    </h1>
    
    <p className="mt-3 text-base font-semibold text-slate-400 sm:text-lg">
    Le compteur de score ultime pour tes parties de Yam.
    </p>
    {homeStats && (
  <div className="mt-6 grid w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#101010]/90 shadow-2xl sm:grid-cols-3">
    {/* Parties */}
    <div className="flex min-h-[78px] items-center justify-center gap-3 px-5 py-4">
      <span className="text-2xl">🎲</span>

      <span className="text-base font-black text-white">
        {homeStats.gamesPlayed}{" "}
        {homeStats.gamesPlayed > 1 ? "parties" : "partie"}
      </span>
    </div>

    {/* Victoires */}
    <div className="flex min-h-[78px] items-center justify-center gap-3 border-t border-white/10 px-5 py-4 sm:border-l sm:border-t-0">
      <span className="text-2xl">🏆</span>

      <div className="flex flex-col items-start">
        <span className="text-base font-black leading-none text-white">
          {homeStats.winRate} % de victoires
        </span>

        <span className="mt-2 text-xs font-bold text-slate-500">
          Parties à 2 joueurs et +
        </span>
      </div>
    </div>

    {/* Série */}
    <div className="flex min-h-[78px] items-center justify-center gap-3 border-t border-white/10 px-5 py-4 sm:border-l sm:border-t-0">
      <span className="text-2xl">🔥</span>

      <div className="flex flex-col items-start">
        <span className="text-base font-black leading-none text-white">
          Série actuelle : {homeStats.currentWinStreak ?? 0}
        </span>

        <span className="mt-2 text-xs font-bold text-slate-500">
          Parties à 2 joueurs et +
        </span>
      </div>
    </div>
  </div>
)}
    </div>
    
    {/* Actions principales */}
<div className="mt-10 grid items-stretch gap-6 lg:grid-cols-2">
  {/* Partie rapide */}
  <button
    type="button"
    onClick={onQuickGame}
    className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-[#C44934]/80 bg-[#100C0B]/95 p-6 text-left shadow-2xl transition duration-300 hover:-translate-y-1 hover:border-[#E65F47] hover:shadow-[0_22px_70px_rgba(196,73,52,0.18)] sm:p-8"
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(196,73,52,0.14),transparent_45%)]" />

    <div className="relative flex h-full flex-col">
      <div className="flex min-h-[108px] items-start gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[#C44934]/50 bg-[#C44934]/10 text-4xl shadow-inner">
          🎲
        </div>

        <div>
          <h2 className="text-3xl font-black">
            Partie rapide
          </h2>

          <p className="mt-2 max-w-md text-base font-semibold leading-7 text-slate-400">
            Lance une partie classique en local ou en Salon.
          </p>
        </div>
      </div>

      {/* Zone centrale */}
      <div className="mt-7 flex flex-1 items-stretch">
        <div className="grid min-h-[130px] w-full overflow-hidden rounded-2xl border border-[#C44934]/25 bg-black/30 sm:grid-cols-2">
          <div className="flex items-center gap-4 px-5 py-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C44934]/15 text-2xl">
              🏠
            </div>

            <div>
              <div className="font-black uppercase tracking-wide text-[#F06A52]">
                Local
              </div>

              <div className="mt-1 text-sm font-medium text-slate-400">
                Un joueur note tout
              </div>
            </div>
          </div>

          <div className="border-t border-[#C44934]/20 sm:border-l sm:border-t-0">
            <div className="flex h-full items-center gap-4 px-5 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C44934]/15 text-2xl">
                👥
              </div>

              <div>
                <div className="font-black uppercase tracking-wide text-[#F06A52]">
                  Salon
                </div>

                <div className="mt-1 text-sm font-medium text-slate-400">
                  Chacun note sur son téléphone
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#C44934] px-5 py-4 font-black transition group-hover:bg-[#D95841]">
        <span>Configurer ma partie</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-white/20">
  <span className="text-lg">▶</span>
</div>
      </div>
    </div>
  </button>

  {/* Modes spéciaux */}
  <button
    type="button"
    onClick={() => {
  if (!isLoggedIn) {
    setShowSpecialModesModal(true);
    return;
  }

  onSpecialModes();
}}
    className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-[#B98224]/80 bg-[#100E09]/95 p-6 text-left shadow-2xl transition duration-300 hover:-translate-y-1 hover:border-[#E1A83E] hover:shadow-[0_22px_70px_rgba(185,130,36,0.18)] sm:p-8"
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(185,130,36,0.14),transparent_45%)]" />

    <div className="relative flex h-full flex-col">
      <div className="flex min-h-[108px] items-start gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[#B98224]/50 bg-[#B98224]/10 text-4xl shadow-inner">
          🏆
        </div>

        <div>
          <h2 className="text-3xl font-black">
            Modes spéciaux
          </h2>

          <p className="mt-2 max-w-md text-base font-semibold leading-7 text-slate-400">
            Joue des compétitions et découvre de nouveaux formats.
          </p>
        </div>
      </div>

      {/* Zone centrale */}
      <div className="mt-7 flex flex-1 items-stretch">
        <div className="grid min-h-[130px] w-full grid-cols-3 gap-3">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#B98224]/25 bg-black/30 px-2 py-4 text-center">
            <span className="text-3xl">🎾</span>
            <span className="mt-3 flex min-h-10 items-center justify-center text-sm font-black sm:text-base">
              Grand Chelem
            </span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#B98224]/25 bg-black/30 px-2 py-4 text-center">
            <span className="text-3xl">⚽</span>
            <span className="mt-3 flex min-h-10 items-center justify-center text-sm font-black sm:text-base">
              Coupe du monde
            </span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-2 py-4 text-center">
            <span className="text-3xl opacity-70">🔒</span>
            <span className="mt-3 flex min-h-10 items-center justify-center text-sm font-black text-slate-400 sm:text-base">
              À venir...
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#A77322] px-5 py-4 font-black transition group-hover:bg-[#BD8628]">
        <span>Découvrir les modes</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-white/20">
  <span className="text-lg">▶</span>
</div>
      </div>
    </div>
  </button>
</div>
    
    {/* Partie locale sauvegardée */}
    <div
  className={[
    "mt-6 grid gap-5",
    isLoggedIn
      ? "lg:grid-cols-[380px_1fr]"
      : "lg:grid-cols-[1000px_1fr]",
  ].join(" ")}
>
  {/* Partie en cours */}
  <div className="rounded-2xl border border-white/10 bg-[#101010]/90 p-5 shadow-2xl">
    {hasSavedGame && savedGameInfo ? (
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C44934]/15 text-2xl">
            📋
          </div>

          <div>
            <div className="text-base font-black text-[#F06A52]">
              Continuer la partie
            </div>

            <div className="mt-2 text-sm font-bold text-white">
              {savedGameInfo.mode} · {savedGameInfo.playerCount}{" "}
              {savedGameInfo.playerCount > 1 ? "joueurs" : "joueur"}
            </div>

            <div className="mt-1 text-xs font-semibold text-slate-500">
              {savedGameInfo.remainingTurns}{" "}
              {savedGameInfo.remainingTurns > 1
                ? "tours restants"
                : "tour restant"}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onResumeGame}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C44934] px-6 font-black text-white transition hover:bg-[#D95841]"
        >
          <span>▶</span>
          Reprendre
        </button>
      </div>
    ) : (
      <div className="flex h-full items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl">
          💾
        </div>

        <div>
          <div className="text-base font-black text-white">
            Aucune partie en cours
          </div>

          <div className="mt-1 text-sm font-medium text-slate-500">
            Lance une partie rapide pour commencer.
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Navigation secondaire */}
  
  <div
  className={[
    "grid gap-4",
    isLoggedIn
      ? "grid-cols-2 sm:grid-cols-4"
      : "grid-cols-1 justify-items-start",
  ].join(" ")}
>
  {isLoggedIn && (
    <>
      <button
        type="button"
        onClick={onProfile}
        className="group flex min-h-[130px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#101318]/90 p-4 text-center transition hover:-translate-y-1 hover:border-blue-500/50 hover:bg-[#151A22]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-2xl">
          📊
        </div>

        <div className="mt-3 font-black text-white">
          Profil
        </div>

        <div className="mt-1 text-xs font-medium text-slate-500">
          Voir mes stats
        </div>
      </button>

      <button
        type="button"
        onClick={onAchievements}
        className="group flex min-h-[130px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#101318]/90 p-4 text-center transition hover:-translate-y-1 hover:border-purple-500/50 hover:bg-[#151A22]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-2xl">
          🏅
        </div>

        <div className="mt-3 font-black text-white">
          Succès
        </div>

        <div className="mt-1 text-xs font-medium text-slate-500">
          Voir mes succès
        </div>
      </button>

      <button
        type="button"
        onClick={onHistory}
        className="group flex min-h-[130px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#101318]/90 p-4 text-center transition hover:-translate-y-1 hover:border-green-500/50 hover:bg-[#151A22]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/10 text-2xl">
          🕘
        </div>

        <div className="mt-3 font-black text-white">
          Historique
        </div>

        <div className="mt-1 text-xs font-medium text-slate-500">
          Mes parties
        </div>
      </button>
    </>
  )}

  <button
    type="button"
    onClick={onRules}
    className="group flex min-h-[130px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#101318]/90 p-4 text-center transition hover:-translate-y-1 hover:border-blue-400/50 hover:bg-[#151A22]"
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10 text-2xl">
      📖
    </div>

    <div className="mt-3 font-black text-white">
      Règles
    </div>

    <div className="mt-1 text-xs font-medium text-slate-500">
      Apprendre à jouer
    </div>
  </button>
</div>
</div>
      </div>
      {showSpecialModesModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
    onClick={() => setShowSpecialModesModal(false)}
  >
    <div
      className="w-full max-w-md rounded-3xl border border-[#B98224]/60 bg-[#111111] p-7 text-center shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#B98224]/40 bg-[#B98224]/10 text-4xl">
        🏆
      </div>

      <h2 className="mt-5 text-2xl font-black text-white">
        Connecte-toi pour en profiter
      </h2>

      <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
        Les modes spéciaux nécessitent un profil YamScore pour
        sauvegarder tes compétitions et ta progression.
      </p>

      <p className="mt-3 text-sm font-bold text-[#D6A14A]">
        Utilise le bouton de connexion en haut à droite.
      </p>

      <button
        type="button"
        onClick={() => setShowSpecialModesModal(false)}
        className="mt-6 w-full rounded-xl bg-[#A77322] px-5 py-3 font-black text-white transition hover:bg-[#BD8628]"
      >
        Compris
      </button>
    </div>
  </div>
)}
      </section>
    );
    
  }
  
  function getWorldCupRoundLabel(
    roundNumber: number,
    matchNumber: number
  ) {
    if (roundNumber === 1) {
      return `Quart de finale ${matchNumber}`;
    }
    
    if (roundNumber === 2) {
      return `Demi-finale ${matchNumber}`;
    }
    
    if (roundNumber === 3) {
      return "Finale";
    }
    
    return `Tour ${roundNumber}`;
  }