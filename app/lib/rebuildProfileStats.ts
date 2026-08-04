import { supabase } from "./supabase";
import { columns, rows, YamRow } from "./yamRules";

type ScoreValue = number | "X" | null;

function scoreToNumber(value: ScoreValue) {
  return typeof value === "number" ? value : 0;
}

export async function rebuildProfileStats(
  profileId: string,
  options?: {
    admin?: boolean;
  }
) {
  const { data: games, error: gamesError } = await supabase
  .from("local_game_players")
  .select(`
      game_id,
      player_key,
      final_score,
      final_rank,
      yams_count,
      local_games!inner(
  mode,
  player_count,
  status,
  source,
  competition_id,
  competition_round_number,
  competition_match_id
)
    `)
    .eq("profile_id", profileId)
    .eq("local_games.status", "finished");
    
    if (gamesError || !games) {
      console.error("Erreur rebuild stats - parties", gamesError);
      return;
    }
    
    const gameIds = games.map((game) => game.game_id);
    const competitionIds = Array.from(
      new Set(
        games
        .map((game) => {
          const gameInfo = Array.isArray(game.local_games)
          ? game.local_games[0]
          : game.local_games;
          
          return gameInfo?.competition_id ?? null;
        })
        .filter((id): id is string => Boolean(id))
      )
    );
    const matchIds = Array.from(
      new Set(
        games
        .map((game) => {
          const gameInfo = Array.isArray(game.local_games)
          ? game.local_games[0]
          : game.local_games;
          
          return gameInfo?.competition_match_id ?? null;
        })
        .filter((id): id is string => Boolean(id))
      )
    );
    
    const { data: competitionMatches, error: matchesError } =
    matchIds.length > 0
    ? await supabase
    .from("competition_matches")
    .select("id, next_match_id")
    .in("id", matchIds)
    : { data: [], error: null };
    
    if (matchesError) {
      console.error(matchesError);
      return;
    }
    const nextMatchIds = Array.from(
      new Set(
        (competitionMatches ?? [])
        .map((m) => m.next_match_id)
        .filter((id): id is string => Boolean(id))
      )
    );
    
    const { data: nextMatches } =
    nextMatchIds.length > 0
    ? await supabase
    .from("competition_matches")
    .select("id, next_match_id")
    .in("id", nextMatchIds)
    : { data: [] };
    const { data: competitions, error: competitionsError } =
    competitionIds.length > 0
    ? await supabase
    .from("competitions")
    .select("id, competition_type, status, winner_player_id")
    .in("id", competitionIds)
    : { data: [], error: null };
    
    if (competitionsError) {
      console.error(
        "Erreur rebuild stats - compétitions",
        competitionsError
      );
      return;
    }
    
    const worldCupCompetitionIds = new Set(
      (competitions ?? [])
      .filter(
        (competition) =>
          competition.competition_type === "world_cup"
      )
      .map((competition) => competition.id)
    );
    const grandPrixCompetitionIds = new Set(
      (competitions ?? [])
      .filter(
        (competition) =>
          competition.competition_type === "grand_prix"
      )
      .map((competition) => competition.id)
    );
    const grandPrixCompetitionIdList =
    Array.from(grandPrixCompetitionIds);
    
    const {
      data: grandPrixCompetitionPlayers,
      error: grandPrixPlayersError,
    } =
    grandPrixCompetitionIdList.length > 0
    ? await supabase
    .from("competition_players")
    .select("id, competition_id, profile_id")
    .in(
      "competition_id",
      grandPrixCompetitionIdList
    )
    .eq("profile_id", profileId)
    : { data: [], error: null };
    
    if (grandPrixPlayersError) {
      console.error(
        "Erreur rebuild stats - pilotes Grand Prix",
        grandPrixPlayersError
      );
      
      return;
    }
    const { data: scoreRows, error: scoresError } =
    gameIds.length > 0
    ? await supabase
    .from("local_game_scores")
    .select("game_id, player_key, column_id, row_id, value")
    .in("game_id", gameIds)
    
    : { data: [], error: null };
    
    if (scoresError) {
      console.error("Erreur rebuild stats - scores", scoresError);
      return;
    }
    
    const stats = {
      games_played_3: 0,
      games_played_6: 0,
      wins_3: 0,
      wins_6: 0,
      best_score_3: 0,
      best_score_6: 0,
      total_points_3: 0,
      total_points_6: 0,
      yams_total: 0,
      four_of_a_kind_total: 0,
      full_house_total: 0,
      straight_total: 0,
      three_of_a_kind_total: 0,
      bonus_total: 0,
      perfect_games_3: 0,
      perfect_games_6: 0,
      local_games: 0,
      salon_games: 0,
      games_2_players: 0,
      games_3_players: 0,
      games_4_players: 0,
      games_5_players: 0,
      games_6_players: 0,
      world_cup_finals_reached: 0,
      world_cup_wins: 0,
      grand_prix_played: 0,
      grand_prix_wins: 0,
      grand_prix_podiums: 0,
      grand_prix_seasons_completed: 0,
      grand_prix_titles: 0,
    };
    
    for (const game of games) {
      const gameInfo = Array.isArray(game.local_games)
      ? game.local_games[0]
      : game.local_games;
      
      if (!gameInfo) continue;
      
      const mode = gameInfo.mode as "3cols" | "6cols";
      const source = gameInfo.source ?? "local";
      const playerCount = gameInfo.player_count;
      
      const activeColumns =
      mode === "6cols" ? columns : [columns[0], columns[2], columns[4]];
      
      const scores = (scoreRows ?? []).filter(
        (score) =>
          score.game_id === game.game_id &&
        score.player_key === game.player_key
      );
      
      function getScore(columnId: string, rowId: YamRow): ScoreValue {
        const score = scores.find(
          (item) => item.column_id === columnId && item.row_id === rowId
        );
        
        if (!score) return null;
        return score.value === "X" ? "X" : Number(score.value);
      }
      
      function countFigure(rowId: YamRow) {
        return activeColumns.reduce((total, column) => {
          const value = getScore(column.id, rowId);
          return value !== null && value !== "X" ? total + 1 : total;
        }, 0);
      }
      
      function getTopTotal(columnId: string) {
        return rows
        .slice(0, 6)
        .reduce(
          (total, row) =>
            total + scoreToNumber(getScore(columnId, row.id)),
          0
        );
      }
      
      function getBonus(columnId: string) {
        return getTopTotal(columnId) >= 60 ? 35 : 0;
      }
      
      function hasNoX() {
        return activeColumns.every((column) =>
          rows.every((row) => getScore(column.id, row.id) !== "X")
      );
    }
    
    const finalScore = game.final_score ?? 0;
    const finalRank = game.final_rank ?? 999;
    const competitionId =
    gameInfo.competition_id ?? null;
    
    const competitionRoundNumber =
    gameInfo.competition_round_number ?? null;
    
    const isWorldCup =
    Boolean(competitionId) &&
    worldCupCompetitionIds.has(competitionId);
    const isGrandPrix =
    Boolean(competitionId) &&
    grandPrixCompetitionIds.has(competitionId);
    if (mode === "3cols") {
      stats.games_played_3 += 1;
      stats.total_points_3 += finalScore;
      stats.best_score_3 = Math.max(stats.best_score_3, finalScore);
      if (finalRank === 1 && playerCount >= 2) stats.wins_3 += 1;
      if (hasNoX()) stats.perfect_games_3 += 1;
    } else {
      stats.games_played_6 += 1;
      stats.total_points_6 += finalScore;
      stats.best_score_6 = Math.max(stats.best_score_6, finalScore);
      if (finalRank === 1 && playerCount >= 2) stats.wins_6 += 1;
      if (hasNoX()) stats.perfect_games_6 += 1;
    }
    
    if (source === "salon") {
      stats.salon_games += 1;
    } else {
      stats.local_games += 1;
    }
    
    stats.yams_total += countFigure("yam");
    stats.three_of_a_kind_total += countFigure("threeOfAKind");
    stats.full_house_total += countFigure("fullHouse");
    stats.four_of_a_kind_total += countFigure("fourOfAKind");
    stats.straight_total += countFigure("straight");
    stats.bonus_total += activeColumns.filter(
      (column) => getBonus(column.id) > 0
    ).length;
    const competitionMatch =
    competitionMatches?.find(
      (m) => m.id === gameInfo.competition_match_id
    );
    
    const nextMatch =
    nextMatches?.find(
      (m) => m.id === competitionMatch?.next_match_id
    );
    
    const isFinal =
    competitionMatch?.next_match_id == null;
    
    const isSemiFinal =
    competitionMatch?.next_match_id != null &&
    nextMatch?.next_match_id == null;
    
    if (isWorldCup && finalRank === 1) {
      if (isSemiFinal) {
        stats.world_cup_finals_reached++;
      }
      
      if (isFinal) {
        stats.world_cup_wins++;
      }
    }
    if (isGrandPrix) {
  stats.grand_prix_played += 1;

  if (finalRank === 1) {
    stats.grand_prix_wins += 1;
  }

  if (
    playerCount >= 4 &&
    finalRank >= 1 &&
    finalRank <= 3
  ) {
    stats.grand_prix_podiums += 1;
  }
}
    if (playerCount === 2) stats.games_2_players += 1;
    if (playerCount === 3) stats.games_3_players += 1;
    if (playerCount === 4) stats.games_4_players += 1;
    if (playerCount === 5) stats.games_5_players += 1;
    if (playerCount === 6) stats.games_6_players += 1;
  }
  const grandPrixPlayerByCompetitionId = new Map(
  (grandPrixCompetitionPlayers ?? []).map(
    (competitionPlayer) => [
      competitionPlayer.competition_id,
      competitionPlayer,
    ]
  )
);

for (const competition of competitions ?? []) {
  if (
    competition.competition_type !== "grand_prix" ||
    competition.status !== "finished"
  ) {
    continue;
  }

  const competitionPlayer =
    grandPrixPlayerByCompetitionId.get(
      competition.id
    );

  if (!competitionPlayer) {
    continue;
  }

  stats.grand_prix_seasons_completed += 1;

  if (
    competition.winner_player_id ===
    competitionPlayer.id
  ) {
    stats.grand_prix_titles += 1;
  }
}
  console.log("REBUILD STATS FINAL", stats);
  const rpcName = options?.admin
  ? "replace_profile_stats_admin"
  : "replace_my_profile_stats";

const { error } = await supabase.rpc(rpcName, {
  p_profile_id: profileId,
  p_stats: stats,
});

if (error) {
  console.error("Erreur replace profile_stats", {
    profileId,
    rpcName,
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });

  return false;
}

return true;
}