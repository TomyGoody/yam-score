"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AuthButton from "../../../components/AuthButton";
import { supabase } from "../../../lib/supabase";
import { rows } from "../../../lib/yamRules";
type CompetitionStatus =
| "in_progress"
| "finished"
| "abandoned";

type MatchStatus =
| "waiting"
| "playing"
| "finished";

type PlayMode =
| "local"
| "salon";

type TeamId =
| "A"
| "B";

type Competition = {
    id: string;
    competition_type: string;
    status: CompetitionStatus;
    column_mode: 3 | 6;
    basket_match_count: number;
    winner_team: TeamId | null;
    created_at: string;
    finished_at: string | null;
};

type CompetitionPlayer = {
    id: string;
    competition_id: string;
    player_order: number;
    player_key: string;
    player_name: string;
    profile_id: string | null;
    avatar_url: string | null;
};

type BasketPlayerLink = {
    id: string;
    competition_id: string;
    competition_player_id: string;
    team: TeamId;
};

type BasketPlayer = CompetitionPlayer & {
    team: TeamId;
};

type BasketMatch = {
    id: string;
    competition_id: string;
    match_number: number;
    status: MatchStatus;
    play_mode: PlayMode | null;
    game_id: string | null;
    winner_team: TeamId | null;
    
    team_a_final_score: number | null;
    team_b_final_score: number | null;
    
    team_a_basket_points: number;
    team_b_basket_points: number;
    
    started_at: string | null;
    finished_at: string | null;
};
type QuarterScore = {
    teamA: number;
    teamB: number;
};

type MatchQuarterScores = Record<
string,
Record<1 | 2 | 3 | 4, QuarterScore>
>;
const BASKET = "#E87524";
const BASKET_LIGHT = "#F59A55";
const BASKET_DARK = "#8C3D0D";

const TEAM_A = "#E87524";
const TEAM_B = "#2563EB";

export default function BasketCompetitionPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    
    const competitionId = params.id;
    
    const [
        competition,
        setCompetition,
    ] = useState<Competition | null>(null);
    
    const [
        players,
        setPlayers,
    ] = useState<BasketPlayer[]>([]);
    
    const [
        matches,
        setMatches,
    ] = useState<BasketMatch[]>([]);
    
    
    const [matchQuarterScores, setMatchQuarterScores] =
    useState<MatchQuarterScores>({});
    const [
        loading,
        setLoading,
    ] = useState(true);
    
    const [
        errorMessage,
        setErrorMessage,
    ] = useState<string | null>(null);
    const [
        startingPlayerId,
        setStartingPlayerId,
    ] = useState<string | null>(null);
    const [
        selectedMatch,
        setSelectedMatch,
    ] = useState<BasketMatch | null>(null);
    const [showAbandonConfirm, setShowAbandonConfirm] =
    useState(false);
    
    const [isAbandoning, setIsAbandoning] =
    useState(false);
    useEffect(() => {
        if (!competitionId) return;
        
        void loadCompetition();
    }, [competitionId]);
    
    async function loadCompetition() {
        setLoading(true);
        setErrorMessage(null);
        
        const [
            competitionResponse,
            playersResponse,
            basketPlayersResponse,
            matchesResponse,
        ] = await Promise.all([
            supabase
            .from("competitions")
            .select(
                `
          id,
          competition_type,
          status,
          column_mode,
          basket_match_count,
          winner_team,
          created_at,
          finished_at
          `
            )
            .eq("id", competitionId)
            .maybeSingle(),
            
            supabase
            .from("competition_players")
            .select(
                `
          id,
          competition_id,
          player_order,
          player_key,
          player_name,
          profile_id,
          avatar_url
          `
            )
            .eq("competition_id", competitionId)
            .order("player_order", {
                ascending: true,
            }),
            
            supabase
            .from("competition_basket_players")
            .select(
                `
          id,
          competition_id,
          competition_player_id,
          team
          `
            )
            .eq("competition_id", competitionId),
            
            supabase
            .from("competition_basket_matches")
            .select(
                `
          id,
          competition_id,
          match_number,
          status,
          play_mode,
          game_id,
          winner_team,
          team_a_final_score,
          team_b_final_score,
          team_a_basket_points,
          team_b_basket_points,
          started_at,
          finished_at
          `
            )
            .eq("competition_id", competitionId)
            .order("match_number", {
                ascending: true,
            }),
        ]);
        
        if (
            competitionResponse.error ||
            !competitionResponse.data
        ) {
            console.error(
                "Erreur chargement compétition Basket",
                competitionResponse.error
            );
            
            setErrorMessage(
                "Cette compétition Basket est introuvable ou inaccessible."
            );
            
            setLoading(false);
            return;
        }
        
        const loadedCompetition =
        competitionResponse.data as Competition;
        
        if (
            loadedCompetition.competition_type !==
            "basket"
        ) {
            setErrorMessage(
                "Cette compétition n’est pas une compétition Basket."
            );
            
            setLoading(false);
            return;
        }
        
        if (playersResponse.error) {
            console.error(
                "Erreur chargement joueurs Basket",
                playersResponse.error
            );
            
            setErrorMessage(
                "Impossible de charger les joueurs."
            );
            
            setLoading(false);
            return;
        }
        
        if (basketPlayersResponse.error) {
            console.error(
                "Erreur chargement équipes Basket",
                basketPlayersResponse.error
            );
            
            setErrorMessage(
                "Impossible de charger les équipes."
            );
            
            setLoading(false);
            return;
        }
        
        if (matchesResponse.error) {
            console.error(
                "Erreur chargement matchs Basket",
                matchesResponse.error
            );
            
            setErrorMessage(
                "Impossible de charger les matchs."
            );
            
            setLoading(false);
            return;
        }
        
        const loadedPlayers =
        (playersResponse.data ??
            []) as CompetitionPlayer[];
            
            const links =
            (basketPlayersResponse.data ??
                []) as BasketPlayerLink[];
                
                const teamByPlayerId =
                new Map<string, TeamId>(
                    links.map((link) => [
                        link.competition_player_id,
                        link.team,
                    ])
                );
                
                const mappedPlayers =
                loadedPlayers
                .map((player) => {
                    const team =
                    teamByPlayerId.get(player.id);
                    
                    if (!team) {
                        return null;
                    }
                    
                    return {
                        ...player,
                        team,
                    };
                })
                .filter(
                    (
                        player
                    ): player is BasketPlayer =>
                        player !== null
                );
                
                const loadedMatches =
                (matchesResponse.data ?? []) as BasketMatch[];
                
                setCompetition(loadedCompetition);
                setPlayers(mappedPlayers);
                setMatches(loadedMatches);
                
                await loadMatchQuarterScores(
                    loadedMatches,
                    mappedPlayers
                );
                
                setLoading(false);
            }
            
            const teamA = useMemo(
                () =>
                    players.filter(
                    (player) =>
                        player.team === "A"
                ),
                [players]
            );
            
            const teamB = useMemo(
                () =>
                    players.filter(
                    (player) =>
                        player.team === "B"
                ),
                [players]
            );
            
            const finishedMatches =
            useMemo(
                () =>
                    matches.filter(
                    (match) =>
                        match.status === "finished"
                ),
                [matches]
            );
            
            const activeMatch =
            useMemo(
                () =>
                    matches.find(
                    (match) =>
                        match.status === "playing"
                ) ??
                matches.find(
                    (match) =>
                        match.status === "waiting"
                ) ??
                null,
                [matches]
            );
            
            const teamATotalPoints =
            useMemo(
                () =>
                    finishedMatches.reduce(
                    (total, match) =>
                        total +
                    Number(
                        match.team_a_basket_points ??
                        0
                    ),
                    0
                ),
                [finishedMatches]
            );
            
            const teamBTotalPoints =
            useMemo(
                () =>
                    finishedMatches.reduce(
                    (total, match) =>
                        total +
                    Number(
                        match.team_b_basket_points ??
                        0
                    ),
                    0
                ),
                [finishedMatches]
            );
            
            const teamAMatchWins =
            finishedMatches.filter(
                (match) =>
                    match.winner_team === "A"
            ).length;
            
            const teamBMatchWins =
            finishedMatches.filter(
                (match) =>
                    match.winner_team === "B"
            ).length;
            const teamAQuarterWins = useMemo(() => {
                let total = 0;
                
                for (const match of finishedMatches) {
                    const quarterScores =
                    matchQuarterScores[match.id];
                    
                    if (!quarterScores) continue;
                    
                    for (const quarter of [1, 2, 3, 4] as const) {
                        const score = quarterScores[quarter];
                        
                        if (score.teamA > score.teamB) {
                            total += 1;
                        }
                    }
                }
                
                return total;
            }, [finishedMatches, matchQuarterScores]);
            
            const teamBQuarterWins = useMemo(() => {
                let total = 0;
                
                for (const match of finishedMatches) {
                    const quarterScores =
                    matchQuarterScores[match.id];
                    
                    if (!quarterScores) continue;
                    
                    for (const quarter of [1, 2, 3, 4] as const) {
                        const score = quarterScores[quarter];
                        
                        if (score.teamB > score.teamA) {
                            total += 1;
                        }
                    }
                }
                
                return total;
            }, [finishedMatches, matchQuarterScores]);
            async function loadMatchQuarterScores(
  loadedMatches: BasketMatch[],
  loadedPlayers: BasketPlayer[]
) {
  const finishedWithGame = loadedMatches.filter(
    (match) =>
      match.status === "finished" &&
      Boolean(match.game_id)
  );

  if (finishedWithGame.length === 0) {
    setMatchQuarterScores({});
    return;
  }

  // -----------------------------------
  // SÉPARER LOCAL ET SALON
  // -----------------------------------

  const localMatches = finishedWithGame.filter(
    (match) => match.play_mode === "local"
  );

  const salonMatches = finishedWithGame.filter(
    (match) => match.play_mode === "salon"
  );

  const localGameIds = localMatches
    .map((match) => match.game_id)
    .filter(
      (id): id is string => Boolean(id)
    );

  const salonGameIds = salonMatches
    .map((match) => match.game_id)
    .filter(
      (id): id is string => Boolean(id)
    );

  // -----------------------------------
  // CHARGER LES SCORES LOCAL
  // -----------------------------------

  const localScoresResponse =
    localGameIds.length > 0
      ? await supabase
          .from("local_game_scores")
          .select(
            `
            game_id,
            player_key,
            column_id,
            row_id,
            value,
            basket_quarter
            `
          )
          .in("game_id", localGameIds)
      : {
          data: [],
          error: null,
        };

  if (localScoresResponse.error) {
    console.error(
      "Erreur chargement QT Basket Local",
      localScoresResponse.error
    );
    return;
  }

  // -----------------------------------
  // CHARGER LES JOUEURS SALON
  // -----------------------------------

  const salonPlayersResponse =
    salonGameIds.length > 0
      ? await supabase
          .from("yam_players")
          .select(
            `
            id,
            game_id,
            competition_player_id
            `
          )
          .in("game_id", salonGameIds)
      : {
          data: [],
          error: null,
        };

  if (salonPlayersResponse.error) {
    console.error(
      "Erreur chargement joueurs Basket Salon",
      salonPlayersResponse.error
    );
    return;
  }

  // -----------------------------------
  // CHARGER LES SCORES SALON
  // -----------------------------------

  const salonScoresResponse =
    salonGameIds.length > 0
      ? await supabase
          .from("yam_scores")
          .select(
            `
            game_id,
            player_id,
            column_id,
            row_id,
            value,
            basket_quarter
            `
          )
          .in("game_id", salonGameIds)
      : {
          data: [],
          error: null,
        };

  if (salonScoresResponse.error) {
    console.error(
      "Erreur chargement QT Basket Salon",
      salonScoresResponse.error
    );
    return;
  }

  // -----------------------------------
  // ÉQUIPES DES JOUEURS DE COMPÉTITION
  // -----------------------------------

  const teamByCompetitionPlayerId =
    new Map<string, TeamId>(
      loadedPlayers.map((player) => [
        player.id,
        player.team,
      ])
    );

  // Local :
  // local_game_scores.player_key correspond
  // au player_key du joueur de compétition.
  const teamByPlayerKey =
    new Map<string, TeamId>(
      loadedPlayers.map((player) => [
        player.player_key,
        player.team,
      ])
    );

  // Salon :
  // yam_scores utilise yam_players.id,
  // donc on reconstruit l'équipe via
  // competition_player_id.
  const salonTeamByPlayerId =
    new Map<string, TeamId>();

  for (
    const player of
      salonPlayersResponse.data ?? []
  ) {
    if (!player.competition_player_id) {
      continue;
    }

    const team =
      teamByCompetitionPlayerId.get(
        player.competition_player_id
      );

    if (!team) {
      continue;
    }

    salonTeamByPlayerId.set(
      player.id,
      team
    );
  }

  // -----------------------------------
  // NORMALISER LOCAL + SALON
  // -----------------------------------

  type NormalizedScore = {
    gameId: string;
    playerId: string;
    columnId: string;
    rowId: string;
    value: string | null;
    basketQuarter:
      | 1
      | 2
      | 3
      | 4
      | null;
    team: TeamId | null;
  };

  const normalizedScores: NormalizedScore[] =
    [
      ...(localScoresResponse.data ?? []).map(
        (score) => ({
          gameId: score.game_id,
          playerId: score.player_key,
          columnId: score.column_id,
          rowId: score.row_id,
          value: score.value,
          basketQuarter:
            score.basket_quarter as
              | 1
              | 2
              | 3
              | 4
              | null,
          team:
            teamByPlayerKey.get(
              score.player_key
            ) ?? null,
        })
      ),

      ...(salonScoresResponse.data ?? []).map(
        (score) => ({
          gameId: score.game_id,
          playerId: score.player_id,
          columnId: score.column_id,
          rowId: score.row_id,
          value: score.value,
          basketQuarter:
            score.basket_quarter as
              | 1
              | 2
              | 3
              | 4
              | null,
          team:
            salonTeamByPlayerId.get(
              score.player_id
            ) ?? null,
        })
      ),
    ];

  // -----------------------------------
  // MATCH ASSOCIÉ À CHAQUE GAME
  // -----------------------------------

  const matchByGameId = new Map(
    finishedWithGame.map((match) => [
      match.game_id!,
      match.id,
    ])
  );

  const result: MatchQuarterScores = {};

  for (const match of finishedWithGame) {
    result[match.id] = {
      1: {
        teamA: 0,
        teamB: 0,
      },
      2: {
        teamA: 0,
        teamB: 0,
      },
      3: {
        teamA: 0,
        teamB: 0,
      },
      4: {
        teamA: 0,
        teamB: 0,
      },
    };
  }

  // -----------------------------------
  // 1. SCORES NORMAUX DES CASES
  // -----------------------------------

  for (const score of normalizedScores) {
    const matchId =
      matchByGameId.get(score.gameId);

    const quarter =
      score.basketQuarter;

    if (
      !matchId ||
      !quarter ||
      ![1, 2, 3, 4].includes(quarter)
    ) {
      continue;
    }

    if (!score.team) {
      continue;
    }

    const value =
      score.value === "X"
        ? 0
        : Number(score.value);

    if (!Number.isFinite(value)) {
      continue;
    }

    if (score.team === "A") {
      result[matchId][quarter].teamA +=
        value;
    } else {
      result[matchId][quarter].teamB +=
        value;
    }
  }

  // -----------------------------------
  // 2. BONUS SUPÉRIEUR +35
  // -----------------------------------

 const topRowIds = new Set<string>(
  rows
    .slice(0, 6)
    .map((row) => row.id)
);

  type ColumnKey = string;

  const upperScoresByColumn = new Map<
    ColumnKey,
    {
      gameId: string;
      playerId: string;
      columnId: string;
      team: TeamId;
      scores: {
        quarter: 1 | 2 | 3 | 4;
        value: number;
      }[];
    }
  >();

  for (const score of normalizedScores) {
    if (!topRowIds.has(score.rowId)) {
      continue;
    }

    const quarter =
      score.basketQuarter;

    if (
      !quarter ||
      ![1, 2, 3, 4].includes(quarter)
    ) {
      continue;
    }

    if (!score.team) {
      continue;
    }

    const value =
      score.value === "X"
        ? 0
        : Number(score.value);

    if (!Number.isFinite(value)) {
      continue;
    }

    const key =
      `${score.gameId}::` +
      `${score.playerId}::` +
      `${score.columnId}`;

    const existing =
      upperScoresByColumn.get(key);

    if (existing) {
      existing.scores.push({
        quarter,
        value,
      });
    } else {
      upperScoresByColumn.set(key, {
        gameId: score.gameId,
        playerId: score.playerId,
        columnId: score.columnId,
        team: score.team,
        scores: [
          {
            quarter,
            value,
          },
        ],
      });
    }
  }

  for (
    const column of
      upperScoresByColumn.values()
  ) {
    const matchId =
      matchByGameId.get(
        column.gameId
      );

    if (!matchId) {
      continue;
    }

    let cumulativeTopScore = 0;

    let bonusQuarter:
      | 1
      | 2
      | 3
      | 4
      | null = null;

    for (
      const quarter of
        [1, 2, 3, 4] as const
    ) {
      for (const score of column.scores) {
        if (
          score.quarter === quarter
        ) {
          cumulativeTopScore +=
            score.value;
        }
      }

      if (cumulativeTopScore >= 60) {
        bonusQuarter = quarter;
        break;
      }
    }

    if (!bonusQuarter) {
      continue;
    }

    if (column.team === "A") {
      result[matchId][
        bonusQuarter
      ].teamA += 35;
    } else {
      result[matchId][
        bonusQuarter
      ].teamB += 35;
    }
  }

  setMatchQuarterScores(result);
}
async function openBasketMatchHistory(
  match: BasketMatch
) {
  if (
    match.status !== "finished" ||
    !match.game_id
  ) {
    return;
  }

  // Match Local : game_id est déjà un local_games.id
  if (match.play_mode === "local") {
    router.push(
      `/profile/games/${match.game_id}`
    );
    return;
  }

  // Match Salon :
  // on retrouve la copie créée dans local_games
  const { data: historyGame, error } =
    await supabase
      .from("local_games")
      .select("id")
      .eq("competition_id", competitionId)
      .eq("source", "salon")
      .eq(
        "competition_round_number",
        match.match_number
      )
      .maybeSingle();

  if (error || !historyGame) {
    console.error(
      "Historique Basket Salon introuvable",
      {
        matchId: match.id,
        gameId: match.game_id,
        error,
      }
    );

    setErrorMessage(
      "Impossible de retrouver la feuille de ce match."
    );

    return;
  }

  router.push(
    `/profile/games/${historyGame.id}`
  );
}
            async function startBasketMatch(
                match: BasketMatch,
                mode: PlayMode
            ) {
                setErrorMessage(null);
                if (!startingPlayerId) {
                    setErrorMessage(
                        "Choisis le joueur qui commence."
                    );
                    return;
                }
                const { data, error } = await supabase.rpc(
                    "start_basket_match",
                    {
                        p_competition_id: competitionId,
                        p_basket_match_id: match.id,
                        p_play_mode: mode,
                        p_starting_competition_player_id:
                        startingPlayerId,
                    }
                );
                
                if (error || !data) {
                    console.error(
                        "Erreur lancement match Basket",
                        error
                    );
                    
                    setErrorMessage(
                        error
                        ? `${error.message}${
                            error.details
                            ? ` — ${error.details}`
                            : ""
                        }`
                        : "Impossible de lancer le match."
                    );
                    
                    return;
                }
                
                const result = data as {
  competition_id: string;
  basket_match_id: string;
  match_number: number;
  game_id: string;
  play_mode: PlayMode;
  salon_code: string | null;
  column_mode: 3 | 6;
};
                
                if (result.play_mode === "local") {
                    sessionStorage.setItem(
                        "yam-basket-local-match",
                        JSON.stringify({
                            competitionId: result.competition_id,
                            basketMatchId: result.basket_match_id,
                            matchNumber: result.match_number,
                            gameId: result.game_id,
                        })
                    );
                    
                    router.push(
                        `/?competitionId=${result.competition_id}&gameId=${result.game_id}&basketMatchId=${result.basket_match_id}`
                    );
                    
                    return;
                }
                if (
  result.play_mode === "salon" &&
  result.salon_code
) {
  router.push(
    `/salon/${result.salon_code}/access`
  );

  return;
}
            }
            async function abandonBasketCompetition() {
                if (!competition || isAbandoning) return;
                
                setIsAbandoning(true);
                setErrorMessage(null);
                
                const { error } = await supabase.rpc(
                    "abandon_competition",
                    {
                        p_competition_id: competition.id,
                    }
                );
                
                if (error) {
                    console.error(
                        "Erreur abandon compétition Basket",
                        {
                            message: error.message,
                            details: error.details,
                            hint: error.hint,
                            code: error.code,
                        }
                    );
                    
                    setErrorMessage(
                        "Impossible d’abandonner définitivement la compétition."
                    );
                    
                    setIsAbandoning(false);
                    return;
                }
                
                sessionStorage.removeItem(
                    "yam-basket-local-match"
                );
                
                setShowAbandonConfirm(false);
                setIsAbandoning(false);
                
                router.push("/modes-speciaux");
            }
            if (loading) {
                return (
                    <main className="flex min-h-dvh items-center justify-center bg-black text-white">
                    <div className="text-center">
                    <div className="text-5xl">
                    🏀
                    </div>
                    
                    <p className="mt-4 font-black text-white/70">
                    Chargement de la compétition…
                    </p>
                    </div>
                    </main>
                );
            }
            
            if (
                errorMessage ||
                !competition
            ) {
                return (
                    <main className="flex min-h-dvh items-center justify-center bg-black px-4 text-white">
                    <div
                    className="w-full max-w-lg rounded-3xl border p-7 text-center"
                    style={{
                        borderColor:
                        "rgba(232,117,36,0.5)",
                        backgroundColor:
                        "#111111",
                    }}
                    >
                    <div className="text-5xl">
                    🏀
                    </div>
                    
                    <h1 className="mt-4 text-2xl font-black">
                    Compétition introuvable
                    </h1>
                    
                    <p className="mt-3 font-bold text-slate-400">
                    {errorMessage}
                    </p>
                    
                    <button
                    type="button"
                    onClick={() =>
                        router.push(
                            "/modes-speciaux"
                        )
                    }
                    className="mt-6 rounded-xl px-5 py-3 font-black text-white"
                    style={{
                        backgroundColor:
                        BASKET,
                    }}
                    >
                    Modes spéciaux
                    </button>
                    
                    </div>
                    
                    </main>
                );
            }
            
            const format =
            `${players.length / 2}v${
                players.length / 2
            }`;
            
            const progress =
            competition.basket_match_count
            ? Math.round(
                (finishedMatches.length /
                    competition.basket_match_count) *
                    100
                )
                : 0;
                
                return (
                    <main
                    className="relative min-h-dvh overflow-hidden px-4 py-8 text-white"
                    style={{
                        backgroundColor:
                        "#120904",
                    }}
                    >
                    <AuthButton />
                    
                    <BasketCourtBackground />
                    
                    <div className="relative z-10 mx-auto w-full max-w-6xl">
                    {/* TOP BAR */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                    type="button"
                    onClick={() =>
                        router.push(
                            "/modes-speciaux"
                        )
                    }
                    className="rounded-xl border bg-black px-4 py-2 font-black text-white transition hover:brightness-125"
                    style={{
                        borderColor:
                        "rgba(232,117,36,0.6)",
                    }}
                    >
                    ← Modes spéciaux
                    </button>
                    
                    <div className="flex flex-wrap gap-2">
                    <TopBadge>
                    {format}
                    </TopBadge>
                    
                    <TopBadge>
                    {
                        competition.column_mode
                    }{" "}
                    colonnes
                    </TopBadge>
                    
                    <TopBadge>
                    {
                        competition.basket_match_count
                    }{" "}
                    match
                    {competition.basket_match_count >
                        1
                        ? "s"
                        : ""}
                        </TopBadge>
                        </div>
                        </div>
                        
                        {/* HERO */}
                        <section
                        className="relative mt-6 overflow-hidden rounded-3xl border px-6 py-8 sm:px-8"
                        style={{
                            borderColor:
                            "rgba(232,117,36,0.6)",
                            background:
                            "linear-gradient(135deg, #321204 0%, #8C3D0D 52%, #E87524 100%)",
                        }}
                        >
                        <div className="absolute inset-0 opacity-20">
                        <CourtLines />
                        </div>
                        
                        <div className="relative z-10">
                        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-white/60">
                        Compétition Basket
                        </p>
                        
                        <h1 className="mt-3 text-4xl font-black sm:text-5xl">
                        🏀 Basket
                        </h1>
                        
                        <p className="mt-3 max-w-xl font-bold text-white/75">
                        Remportez les
                        quart-temps et les
                        matchs pour prendre
                        l’avantage au score
                        général.
                        </p>
                        </div>
                        
                        <div className="min-w-[260px] rounded-2xl bg-black/45 p-5 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-sm font-black">
                        <span>
                        Progression
                        </span>
                        
                        <span>
                        {
                            finishedMatches.length
                        }
                        /
                        {
                            competition.basket_match_count
                        }
                        </span>
                        </div>
                        
                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/50">
                        <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${progress}%`,
                            backgroundColor:
                            "#FFFFFF",
                        }}
                        />
                        </div>
                        </div>
                        </div>
                        </div>
                        </section>
                        {competition.status === "finished" &&
                            competition.winner_team && (
                                <section
                                className="mt-6 overflow-hidden rounded-3xl border"
                                style={{
                                    borderColor:
                                    competition.winner_team === "A"
                                    ? "rgba(232,117,36,0.7)"
                                    : "rgba(37,99,235,0.7)",
                                    background:
                                    competition.winner_team === "A"
                                    ? "linear-gradient(135deg, #2A1207 0%, #8C3D0D 100%)"
                                    : "linear-gradient(135deg, #071329 0%, #163C8C 100%)",
                                }}
                                >
                                <div className="px-6 py-8 text-center sm:px-8">
                                <div className="text-5xl">
                                🏆
                                </div>
                                
                                <p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-white/55">
                                Compétition terminée
                                </p>
                                
                                <h2 className="mt-2 text-4xl font-black text-white">
                                Équipe {competition.winner_team}
                                </h2>
                                
                                <p className="mt-2 text-lg font-black text-white/70">
                                remporte la compétition
                                </p>
                                
                                <div className="mt-6 flex flex-wrap justify-center gap-3">
                                {(competition.winner_team === "A"
                                    ? teamA
                                    : teamB
                                ).map((player) => (
                                    <PlayerPill
                                    key={player.id}
                                    player={player}
                                    color={
                                        competition.winner_team === "A"
                                        ? TEAM_A
                                        : TEAM_B
                                    }
                                    />
                                ))}
                                </div>
                                
                                <div className="mt-6 flex items-center justify-center gap-4 text-sm font-black">
                                <span style={{ color: TEAM_A }}>
                                {teamATotalPoints} pts
                                </span>
                                
                                <span className="text-white/30">
                                —
                                </span>
                                
                                <span style={{ color: TEAM_B }}>
                                {teamBTotalPoints} pts
                                </span>
                                </div>
                                </div>
                                </section>
                            )}
                            {/* SCORE PRINCIPAL */}
                            <section
                            className="mt-6 overflow-hidden rounded-3xl border"
                            style={{
                                borderColor:
                                "rgba(232,117,36,0.45)",
                                backgroundColor:
                                "#111111",
                            }}
                            >
                            <div className="grid md:grid-cols-[1fr_auto_1fr]">
                            <TeamScorePanel
                            team="A"
                            players={teamA}
                            points={
                                teamATotalPoints
                            }
                            matchWins={
                                teamAMatchWins
                            }
                            quarterWins={teamAQuarterWins}
                            />
                            
                            <div className="flex items-center justify-center border-y border-white/10 bg-black px-5 py-5 md:border-x md:border-y-0">
                            <div className="text-center">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">
                            Score
                            </p>
                            
                            <p className="mt-2 text-2xl font-black text-white/75">
                            {
                                formatNumber(
                                    teamATotalPoints
                                )
                            }
                            {" — "}
                            {
                                formatNumber(
                                    teamBTotalPoints
                                )
                            }
                            </p>
                            </div>
                            </div>
                            
                            <TeamScorePanel
                            team="B"
                            players={teamB}
                            points={
                                teamBTotalPoints
                            }
                            matchWins={
                                teamBMatchWins
                            }
                            quarterWins={teamBQuarterWins}
                            />
                            </div>
                            </section>
                            
                            {/* PROCHAIN MATCH */}
                            {competition.status ===
                                "in_progress" &&
                                activeMatch && (
                                    <section
                                    className="mt-6 rounded-3xl border p-6 sm:p-7"
                                    style={{
                                        borderColor:
                                        "rgba(232,117,36,0.45)",
                                        backgroundColor:
                                        "#2A1408",
                                    }}
                                    >
                                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                    <p
                                    className="text-xs font-black uppercase tracking-[0.25em]"
                                    style={{
                                        color:
                                        BASKET_LIGHT,
                                    }}
                                    >
                                    {activeMatch.status ===
                                        "playing"
                                        ? "Match en cours"
                                        : "Prochain match"}
                                        </p>
                                        
                                        <h2 className="mt-2 text-3xl font-black">
                                        Match{" "}
                                        {
                                            activeMatch.match_number
                                        }
                                        </h2>
                                        
                                        <p className="mt-2 font-bold text-white/50">
                                        Une partie de Yam
                                        complète · 4
                                        quart-temps
                                        </p>
                                        </div>
                                        
                                        <button
                                        type="button"
                                        onClick={async () => {
                                            if (
                                                activeMatch.status === "playing" &&
                                                !activeMatch.game_id
                                            ) {
                                                setErrorMessage(
                                                    "Impossible de reprendre ce match : aucune partie associée."
                                                );
                                                return;
                                            }
                                            if (
  activeMatch.status === "playing" &&
  activeMatch.game_id
) {
  if (activeMatch.play_mode === "salon") {
    const { data: salon, error } = await supabase
      .from("yam_games")
      .select("code")
      .eq("id", activeMatch.game_id)
      .maybeSingle();

    if (error || !salon) {
      setErrorMessage(
        "Impossible de retrouver le Salon de ce match Basket."
      );

      return;
    }

    router.push(
      `/salon/${salon.code}/access`
    );

    return;
  }

  router.push(
    `/?competitionId=${competitionId}&gameId=${activeMatch.game_id}&basketMatchId=${activeMatch.id}`
  );

  return;
}
                                            
                                            setSelectedMatch(activeMatch);
                                            
                                            if (!startingPlayerId && players.length > 0) {
                                                setStartingPlayerId(players[0].id);
                                            }
                                        }}
                                        
                                        className="rounded-xl px-6 py-4 text-lg font-black text-white transition hover:brightness-110"
                                        style={{
                                            backgroundColor:
                                            BASKET,
                                        }}
                                        >
                                        {activeMatch.status ===
                                            "playing"
                                            ? "Reprendre le match"
                                            : "Préparer le match"}
                                            </button>
                                            </div>
                                            </section>
                                        )}
                                        
                                        {/* LISTE MATCHS */}
                                        <section
                                        className="mt-6 rounded-3xl border p-6 sm:p-7"
                                        style={{
                                            borderColor:
                                            "rgba(232,117,36,0.35)",
                                            backgroundColor:
                                            "#111111",
                                        }}
                                        >
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                        <p
                                        className="text-xs font-black uppercase tracking-[0.25em]"
                                        style={{
                                            color:
                                            BASKET_LIGHT,
                                        }}
                                        >
                                        Calendrier
                                        </p>
                                        
                                        <h2 className="mt-2 text-2xl font-black">
                                        Les matchs
                                        </h2>
                                        </div>
                                        
                                        <p className="font-bold text-white/40">
                                        {
                                            competition.basket_match_count
                                        }{" "}
                                        match
                                        {competition.basket_match_count >
                                            1
                                            ? "s"
                                            : ""}
                                            </p>
                                            </div>
                                            
                                            <div className="mt-6 space-y-3">
                                            {matches.map(
                                                (match) => (
                                                    <MatchCard
  key={match.id}
  match={match}
  active={
    activeMatch?.id === match.id
  }
  quarterScores={
    matchQuarterScores[match.id] ?? null
  }
  onViewHistory={() =>
    openBasketMatchHistory(match)
  }
/>
                                                )
                                            )}
                                            </div>
                                            </section>
                                            {competition.status === "in_progress" && (
                                                <section className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/5 p-5">
                                                <h2 className="font-black text-red-300">
                                                Zone sensible
                                                </h2>
                                                
                                                <p className="mt-2 text-sm font-bold text-slate-500">
                                                La compétition sera clôturée définitivement et ne pourra plus être reprise.
                                                Les matchs déjà terminés resteront enregistrés.
                                                </p>
                                                
                                                <button
                                                type="button"
                                                onClick={() => setShowAbandonConfirm(true)}
                                                className="mt-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 font-black text-red-300 transition hover:bg-red-500/20"
                                                >
                                                Abandonner définitivement la compétition
                                                </button>
                                                </section>
                                            )}
                                            <p className="mt-6 border-t border-white/10 py-6 text-center font-bold text-white/40">
                                            {competition.status === "finished"
                                                ? competition.winner_team
                                                ? `🏆 Équipe ${competition.winner_team} remporte la compétition.`
                                                : "🏁 Compétition terminée sur une égalité."
                                                : "🏆 L’équipe avec le plus de points Basket après le dernier match remporte la compétition."}
                                                </p>
                                                </div>
                                                
                                                {/* MODALE MATCH */}
                                                {selectedMatch && (
                                                    <MatchPreparationModal
                                                    match={selectedMatch}
                                                    players={players}
                                                    startingPlayerId={startingPlayerId}
                                                    onStartingPlayerChange={setStartingPlayerId}
                                                    onClose={() =>
                                                        setSelectedMatch(null)
                                                    }
                                                    onStartLocal={() =>
                                                        void startBasketMatch(
                                                            selectedMatch,
                                                            "local"
                                                        )
                                                    }
                                                    onStartSalon={() =>
                                                        void startBasketMatch(
                                                            selectedMatch,
                                                            "salon"
                                                        )
                                                    }
                                                    />
                                                )}
                                                {showAbandonConfirm &&
                                                    typeof document !== "undefined" &&
                                                    createPortal(
                                                        <div
                                                        className="fixed inset-0 flex items-center justify-center px-4"
                                                        style={{
                                                            zIndex: 999999,
                                                            backgroundColor: "rgba(0, 0, 0, 0.94)",
                                                        }}
                                                        >
                                                        <div
                                                        className="w-full max-w-md rounded-3xl p-6 text-center"
                                                        style={{
                                                            position: "relative",
                                                            zIndex: 1000000,
                                                            backgroundColor: "#080808",
                                                            border: "1px solid rgba(239, 68, 68, 0.65)",
                                                            boxShadow: "0 30px 100px rgba(0, 0, 0, 1)",
                                                        }}
                                                        >
                                                        <div className="text-5xl">
                                                        ⚠️
                                                        </div>
                                                        
                                                        <p className="mt-4 text-sm font-black uppercase tracking-widest text-red-400">
                                                        Confirmation
                                                        </p>
                                                        
                                                        <h2 className="mt-2 text-3xl font-black text-white">
                                                        Abandonner la compétition Basket ?
                                                        </h2>
                                                        
                                                        <p className="mt-4 font-bold text-slate-400">
                                                        Cette compétition sera définitivement clôturée et ne pourra plus être
                                                        reprise. Les matchs déjà terminés resteront visibles dans l’historique.
                                                        </p>
                                                        
                                                        <div className="mt-6 grid grid-cols-2 gap-3">
                                                        <button
                                                        type="button"
                                                        disabled={isAbandoning}
                                                        onClick={() => setShowAbandonConfirm(false)}
                                                        className="rounded-xl px-4 py-3 font-black text-white disabled:opacity-50"
                                                        style={{
                                                            backgroundColor: "#241A13",
                                                        }}
                                                        >
                                                        Annuler
                                                        </button>
                                                        
                                                        <button
                                                        type="button"
                                                        disabled={isAbandoning}
                                                        onClick={() => void abandonBasketCompetition()}
                                                        className="rounded-xl px-4 py-3 font-black text-white transition disabled:opacity-50"
                                                        style={{
                                                            backgroundColor: "#DC2626",
                                                        }}
                                                        >
                                                        {isAbandoning ? "Abandon..." : "Confirmer"}
                                                        </button>
                                                        </div>
                                                        </div>
                                                        </div>,
                                                        document.body
                                                    )}
                                                    </main>
                                                );
                                            }
                                            
                                            function TeamScorePanel({
                                                team,
                                                players,
                                                points,
                                                matchWins,
                                                quarterWins,
                                            }: {
                                                team: TeamId;
                                                players: BasketPlayer[];
                                                points: number;
                                                matchWins: number;
                                                quarterWins: number;
                                            }) {
                                                const isA =
                                                team === "A";
                                                
                                                const color =
                                                isA
                                                ? TEAM_A
                                                : TEAM_B;
                                                
                                                return (
                                                    <div className="p-6 sm:p-7">
                                                    <div
                                                    className={[
                                                        "flex flex-col",
                                                        isA
                                                        ? "items-start"
                                                        : "items-end",
                                                    ].join(" ")}
                                                    >
                                                    <p
                                                    className="text-xs font-black uppercase tracking-[0.25em]"
                                                    style={{
                                                        color,
                                                    }}
                                                    >
                                                    {isA
                                                        ? "🟠 Équipe A"
                                                        : "🔵 Équipe B"}
                                                        </p>
                                                        
                                                        <p className="mt-3 text-5xl font-black">
                                                        {formatNumber(
                                                            points
                                                        )}
                                                        </p>
                                                        
                                                        <p className="mt-1 text-sm font-black text-white/40">
                                                        points Basket
                                                        </p>
                                                        
                                                        <div className="mt-4 space-y-1 text-sm font-bold text-white/45">
                                                        <p>
                                                        {matchWins} victoire
                                                        {matchWins !== 1 ? "s" : ""} de match
                                                        </p>
                                                        
                                                        <p>
                                                        {quarterWins} quart-temps gagné
                                                        {quarterWins !== 1 ? "s" : ""}
                                                        </p>
                                                        </div>
                                                        
                                                        <div
                                                        className={[
                                                            "mt-4 flex flex-wrap gap-2",
                                                            isA
                                                            ? "justify-start"
                                                            : "justify-end",
                                                        ].join(" ")}
                                                        >
                                                        {players.map(
                                                            (player) => (
                                                                <PlayerPill
                                                                key={
                                                                    player.id
                                                                }
                                                                player={
                                                                    player
                                                                }
                                                                color={
                                                                    color
                                                                }
                                                                />
                                                            )
                                                        )}
                                                        </div>
                                                        </div>
                                                        </div>
                                                    );
                                                }
                                                
                                                function PlayerPill({
                                                    player,
                                                    color,
                                                }: {
                                                    player: BasketPlayer;
                                                    color: string;
                                                }) {
                                                    return (
                                                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 py-1.5 pl-1.5 pr-3">
                                                        {player.avatar_url ? (
                                                            <img
                                                            src={
                                                                player.avatar_url
                                                            }
                                                            alt=""
                                                            className="h-7 w-7 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div
                                                            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white"
                                                            style={{
                                                                backgroundColor:
                                                                color,
                                                            }}
                                                            >
                                                            {player.player_name
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                                </div>
                                                            )}
                                                            
                                                            <span className="max-w-[130px] truncate text-sm font-black">
                                                            {
                                                                player.player_name
                                                            }
                                                            </span>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    function MatchCard({
  match,
  active,
  quarterScores,
  onViewHistory,
}: {
  match: BasketMatch;
  active: boolean;
  quarterScores: Record<
    1 | 2 | 3 | 4,
    QuarterScore
  > | null;
  onViewHistory: () => void;
}) {
                                                        const finished =
                                                        match.status ===
                                                        "finished";
                                                        
                                                        const playing =
                                                        match.status ===
                                                        "playing";
                                                        
                                                        return (
                                                            <article
                                                            className="rounded-2xl border p-4 transition"
                                                            style={{
                                                                borderColor: active
                                                                ? BASKET
                                                                : "rgba(255,255,255,0.1)",
                                                                backgroundColor:
                                                                active
                                                                ? "#261208"
                                                                : "#080808",
                                                            }}
                                                            >
                                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="flex items-center gap-4">
                                                            <div
                                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black"
                                                            style={{
                                                                backgroundColor:
                                                                finished
                                                                ? "#202020"
                                                                : active
                                                                ? BASKET
                                                                : "#171717",
                                                            }}
                                                            >
                                                            {
                                                                match.match_number
                                                            }
                                                            </div>
                                                            
                                                            <div>
                                                            <p className="font-black">
                                                            Match{" "}
                                                            {
                                                                match.match_number
                                                            }
                                                            </p>
                                                            
                                                            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/35">
                                                            {finished
                                                                ? "Terminé"
                                                                : playing
                                                                ? "En cours"
                                                                : active
                                                                ? "À jouer"
                                                                : "À venir"}
                                                                </p>
                                                                </div>
                                                                </div>
                                                                
                                                                {finished ? (
                                                                    <div className="flex items-center gap-5">
                                                                    <MatchTeamResult
                                                                    label="A"
                                                                    basketPoints={
                                                                        match.team_a_basket_points
                                                                    }
                                                                    score={
                                                                        match.team_a_final_score
                                                                    }
                                                                    winner={
                                                                        match.winner_team ===
                                                                        "A"
                                                                    }
                                                                    color={
                                                                        TEAM_A
                                                                    }
                                                                    />
                                                                    
                                                                    <span className="font-black text-white/30">
                                                                    —
                                                                    </span>
                                                                    
                                                                    <MatchTeamResult
                                                                    label="B"
                                                                    basketPoints={
                                                                        match.team_b_basket_points
                                                                    }
                                                                    score={
                                                                        match.team_b_final_score
                                                                    }
                                                                    winner={
                                                                        match.winner_team ===
                                                                        "B"
                                                                    }
                                                                    color={
                                                                        TEAM_B
                                                                    }
                                                                    />
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-sm font-bold text-white/35">
                                                                    {match.play_mode ===
                                                                        "local"
                                                                        ? "Local"
                                                                        : match.play_mode ===
                                                                        "salon"
                                                                        ? "Salon"
                                                                        : "Mode à définir"}
                                                                        </div>
                                                                    )}
                                                                    </div>
                                                                    {finished && quarterScores && (
                                                                        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/10 pt-4">
                                                                        {([1, 2, 3, 4] as const).map(
                                                                            (quarter) => {
                                                                                const score =
                                                                                quarterScores[quarter];
                                                                                
                                                                                const winner =
                                                                                score.teamA > score.teamB
                                                                                ? "A"
                                                                                : score.teamB > score.teamA
                                                                                ? "B"
                                                                                : null;
                                                                                
                                                                                return (
                                                                                    <div
                                                                                    key={quarter}
                                                                                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center"
                                                                                    >
                                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/35">
                                                                                    Q{quarter}
                                                                                    </p>
                                                                                    
                                                                                    <div className="mt-1 flex items-center justify-center gap-2 text-sm font-black">
                                                                                    <span
                                                                                    style={{
                                                                                        color:
                                                                                        winner === "A"
                                                                                        ? TEAM_A
                                                                                        : undefined,
                                                                                    }}
                                                                                    >
                                                                                    {score.teamA}
                                                                                    </span>
                                                                                    
                                                                                    <span className="text-white/25">
                                                                                    -
                                                                                    </span>
                                                                                    
                                                                                    <span
                                                                                    style={{
                                                                                        color:
                                                                                        winner === "B"
                                                                                        ? TEAM_B
                                                                                        : undefined,
                                                                                    }}
                                                                                    >
                                                                                    {score.teamB}
                                                                                    </span>
                                                                                    </div>
                                                                                    
                                                                                    <p className="mt-1 text-[9px] font-black text-white/30">
                                                                                    {winner
                                                                                        ? `Équipe ${winner}`
                                                                                        : "Égalité"}
                                                                                        </p>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                            )}
                                                                            </div>
                                                                        )}
                                                                        {finished && quarterScores && (
                                                                            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                                                                            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-black text-white/45">
                                                                            {([1, 2, 3, 4] as const).map((quarter) => {
                                                                                const score = quarterScores[quarter];
                                                                                
                                                                                const winner =
                                                                                score.teamA > score.teamB
                                                                                ? "A"
                                                                                : score.teamB > score.teamA
                                                                                ? "B"
                                                                                : null;
                                                                                
                                                                                return (
                                                                                    <span key={quarter}>
                                                                                    Q{quarter}{" "}
                                                                                    {winner ? (
                                                                                        <>
                                                                                        →{" "}
                                                                                        <span
                                                                                        style={{
                                                                                            color:
                                                                                            winner === "A"
                                                                                            ? TEAM_A
                                                                                            : TEAM_B,
                                                                                        }}
                                                                                        >
                                                                                        +1 Équipe {winner}
                                                                                        </span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <span className="text-white/25">
                                                                                        → 0
                                                                                        </span>
                                                                                    )}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                            
                                                                            {match.winner_team && (
                                                                                <span>
                                                                                Victoire match →{" "}
                                                                                <span
                                                                                style={{
                                                                                    color:
                                                                                    match.winner_team === "A"
                                                                                    ? TEAM_A
                                                                                    : TEAM_B,
                                                                                }}
                                                                                >
                                                                                +4 Équipe {match.winner_team}
                                                                                </span>
                                                                                </span>
                                                                            )}
                                                                            </div>
                                                                            
                                                                            <div className="mt-3 flex items-center justify-center gap-3 border-t border-white/10 pt-3">
                                                                            <span
                                                                            className="text-sm font-black"
                                                                            style={{ color: TEAM_A }}
                                                                            >
                                                                            A {match.team_a_basket_points} pts
                                                                            </span>
                                                                            
                                                                            <span className="text-white/20">
                                                                            —
                                                                            </span>
                                                                            
                                                                            <span
                                                                            className="text-sm font-black"
                                                                            style={{ color: TEAM_B }}
                                                                            >
                                                                            B {match.team_b_basket_points} pts
                                                                            </span>
                                                                            </div>
                                                                            </div>
                                                                        )}
                                                                        {finished && match.game_id && (
  <button
    type="button"
    onClick={onViewHistory}
    className="mt-4 w-full rounded-xl px-4 py-3 font-black text-white transition hover:brightness-110"
    style={{
      backgroundColor: BASKET,
    }}
  >
    Voir la feuille
  </button>
)}
                                                                        </article>
                                                                    );
                                                                }
                                                                
                                                                function MatchTeamResult({
                                                                    label,
                                                                    basketPoints,
                                                                    score,
                                                                    winner,
                                                                    color,
                                                                }: {
                                                                    label: string;
                                                                    basketPoints: number;
                                                                    score: number | null;
                                                                    winner: boolean;
                                                                    color: string;
                                                                }) {
                                                                    return (
                                                                        <div className="text-center">
                                                                        <p
                                                                        className="text-xs font-black uppercase"
                                                                        style={{
                                                                            color,
                                                                        }}
                                                                        >
                                                                        Équipe {label}
                                                                        </p>
                                                                        
                                                                        <p className="mt-1 text-lg font-black">
                                                                        {formatNumber(
                                                                            Number(
                                                                                basketPoints ??
                                                                                0
                                                                            )
                                                                        )}{" "}
                                                                        pt
                                                                        </p>
                                                                        
                                                                        {score !== null && (
                                                                            <div className="mt-1 flex items-center justify-center gap-2">
                                                                            <span className="text-base font-black text-white/70">
                                                                            {score}
                                                                            </span>
                                                                            
                                                                            {winner && (
                                                                                <span className="text-base opacity-100">
                                                                                🏆
                                                                                </span>
                                                                            )}
                                                                            </div>
                                                                        )}
                                                                        </div>
                                                                    );
                                                                }
                                                                
                                                                function MatchPreparationModal({
                                                                    match,
                                                                    players,
                                                                    startingPlayerId,
                                                                    onStartingPlayerChange,
                                                                    onClose,
                                                                    onStartLocal,
                                                                    onStartSalon,
                                                                }: {
                                                                    match: BasketMatch;
                                                                    players: BasketPlayer[];
                                                                    startingPlayerId: string | null;
                                                                    onStartingPlayerChange: (playerId: string) => void;
                                                                    onClose: () => void;
                                                                    onStartLocal: () => void;
                                                                    onStartSalon: () => void;
                                                                }) {
                                                                    return (
                                                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
                                                                        <div
                                                                        className="w-full max-w-lg rounded-3xl border p-6 text-white shadow-2xl"
                                                                        style={{
                                                                            borderColor: BASKET,
                                                                            backgroundColor: "#111111",
                                                                        }}
                                                                        >
                                                                        <div className="text-center">
                                                                        <div className="text-5xl">🏀</div>
                                                                        
                                                                        <p
                                                                        className="mt-4 text-xs font-black uppercase tracking-[0.25em]"
                                                                        style={{
                                                                            color: BASKET_LIGHT,
                                                                        }}
                                                                        >
                                                                        Match {match.match_number}
                                                                        </p>
                                                                        
                                                                        <h2 className="mt-2 text-2xl font-black">
                                                                        Préparer le match
                                                                        </h2>
                                                                        
                                                                        <p className="mt-3 font-bold text-slate-400">
                                                                        Choisis qui commence puis comment ce match sera joué.
                                                                        </p>
                                                                        </div>
                                                                        
                                                                        {/* STARTER */}
                                                                        <div className="mt-6">
                                                                        <p className="text-sm font-black text-white">
                                                                        Qui commence ?
                                                                        </p>
                                                                        
                                                                        <p className="mt-1 text-sm font-bold text-white/40">
                                                                        Choisis le joueur qui effectue la mise en jeu.
                                                                        </p>
                                                                        
                                                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                                        {players.map((player) => {
                                                                            const selected =
                                                                            startingPlayerId === player.id;
                                                                            
                                                                            const color =
                                                                            player.team === "A"
                                                                            ? TEAM_A
                                                                            : TEAM_B;
                                                                            
                                                                            return (
                                                                                <button
                                                                                key={player.id}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    onStartingPlayerChange(player.id)
                                                                                }
                                                                                className="flex items-center gap-3 rounded-xl border p-3 text-left transition hover:brightness-110"
                                                                                style={{
                                                                                    borderColor: selected
                                                                                    ? color
                                                                                    : "rgba(255,255,255,0.1)",
                                                                                    
                                                                                    backgroundColor: selected
                                                                                    ? player.team === "A"
                                                                                    ? "#35190B"
                                                                                    : "#0B1736"
                                                                                    : "#080808",
                                                                                }}
                                                                                >
                                                                                {player.avatar_url ? (
                                                                                    <img
                                                                                    src={player.avatar_url}
                                                                                    alt=""
                                                                                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                                                                                    />
                                                                                ) : (
                                                                                    <div
                                                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black text-white"
                                                                                    style={{
                                                                                        backgroundColor: color,
                                                                                    }}
                                                                                    >
                                                                                    {player.player_name
                                                                                        .charAt(0)
                                                                                        .toUpperCase()}
                                                                                        </div>
                                                                                    )}
                                                                                    
                                                                                    <div className="min-w-0 flex-1">
                                                                                    <p className="truncate font-black">
                                                                                    {player.player_name}
                                                                                    </p>
                                                                                    
                                                                                    <p
                                                                                    className="text-xs font-bold"
                                                                                    style={{
                                                                                        color,
                                                                                    }}
                                                                                    >
                                                                                    Équipe {player.team}
                                                                                    </p>
                                                                                    </div>
                                                                                    
                                                                                    {selected && (
                                                                                        <span className="font-black">
                                                                                        ✓
                                                                                        </span>
                                                                                    )}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                            </div>
                                                                            </div>
                                                                            
                                                                            {/* MODE DE JEU */}
                                                                            <div className="mt-6">
                                                                            <p className="text-sm font-black text-white">
                                                                            Mode de jeu
                                                                            </p>
                                                                            
                                                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                                            <button
                                                                            type="button"
                                                                            onClick={onStartLocal}
                                                                            disabled={!startingPlayerId}
                                                                            className="rounded-2xl border p-5 text-left transition enabled:hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
                                                                            style={{
                                                                                borderColor:
                                                                                "rgba(232,117,36,0.5)",
                                                                                backgroundColor:
                                                                                "#241208",
                                                                            }}
                                                                            >
                                                                            <div className="text-3xl">
                                                                            🏠
                                                                            </div>
                                                                            
                                                                            <p className="mt-3 text-lg font-black">
                                                                            Local
                                                                            </p>
                                                                            
                                                                            <p className="mt-1 text-sm font-bold text-white/45">
                                                                            Jouer sur cet appareil
                                                                            </p>
                                                                            </button>
                                                                            
                                                                            <button
                                                                            type="button"
                                                                            onClick={onStartSalon}
                                                                            disabled={!startingPlayerId}
                                                                            className="rounded-2xl border p-5 text-left transition enabled:hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
                                                                            style={{
                                                                                borderColor: "rgba(37,99,235,0.6)",
                                                                                backgroundColor: "#091329",
                                                                            }}
                                                                            >
                                                                            <div className="text-3xl">
                                                                            📱
                                                                            </div>
                                                                            
                                                                            <p className="mt-3 text-lg font-black">
                                                                            Salon
                                                                            </p>
                                                                            
                                                                            <p className="mt-1 text-sm font-bold text-white/45">
                                                                            Jouer en ligne
                                                                            </p>
                                                                            </button>
                                                                            </div>
                                                                            </div>
                                                                            
                                                                            <button
                                                                            type="button"
                                                                            onClick={onClose}
                                                                            className="mt-6 w-full rounded-xl bg-slate-800 px-4 py-3 font-black text-white transition hover:bg-slate-700"
                                                                            >
                                                                            Annuler
                                                                            </button>
                                                                            </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    function TopBadge({
                                                                        children,
                                                                    }: {
                                                                        children: React.ReactNode;
                                                                    }) {
                                                                        return (
                                                                            <span className="rounded-xl border border-white/10 bg-black/70 px-4 py-2 text-xs font-black uppercase tracking-widest text-white/70">
                                                                            {children}
                                                                            </span>
                                                                        );
                                                                    }
                                                                    
                                                                    function BasketCourtBackground() {
                                                                        return (
                                                                            <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-[0.035]">
                                                                            <div className="absolute left-1/2 top-1/2 h-[900px] w-[1500px] -translate-x-1/2 -translate-y-1/2">
                                                                            <CourtLines />
                                                                            </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    
                                                                    function CourtLines() {
                                                                        return (
                                                                            <div
                                                                            className="absolute inset-[5%]"
                                                                            style={{
                                                                                border:
                                                                                "4px solid white",
                                                                            }}
                                                                            >
                                                                            <div
                                                                            className="absolute inset-y-0 left-1/2"
                                                                            style={{
                                                                                width: "4px",
                                                                                backgroundColor:
                                                                                "#FFFFFF",
                                                                                transform:
                                                                                "translateX(-50%)",
                                                                            }}
                                                                            />
                                                                            
                                                                            <div
                                                                            className="absolute left-1/2 top-1/2 rounded-full"
                                                                            style={{
                                                                                width: "180px",
                                                                                height: "180px",
                                                                                border:
                                                                                "4px solid white",
                                                                                transform:
                                                                                "translate(-50%, -50%)",
                                                                            }}
                                                                            />
                                                                            
                                                                            <div
                                                                            className="absolute bottom-[28%] left-0 top-[28%]"
                                                                            style={{
                                                                                width: "18%",
                                                                                borderTop:
                                                                                "4px solid white",
                                                                                borderRight:
                                                                                "4px solid white",
                                                                                borderBottom:
                                                                                "4px solid white",
                                                                            }}
                                                                            />
                                                                            
                                                                            <div
                                                                            className="absolute bottom-[28%] right-0 top-[28%]"
                                                                            style={{
                                                                                width: "18%",
                                                                                borderTop:
                                                                                "4px solid white",
                                                                                borderLeft:
                                                                                "4px solid white",
                                                                                borderBottom:
                                                                                "4px solid white",
                                                                            }}
                                                                            />
                                                                            </div>
                                                                        );
                                                                    }
                                                                    
                                                                    function formatNumber(
                                                                        value: number
                                                                    ) {
                                                                        return Number.isInteger(value)
                                                                        ? String(value)
                                                                        : value
                                                                        .toFixed(1)
                                                                        .replace(".", ",");
                                                                    }