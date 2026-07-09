import { supabase } from "./supabase";
import { columns, rows, YamRow } from "./yamRules";
import { FIGURE_XP, getParticipationXp, getRankXp } from "./xpRules";

type ScoreValue = number | "X" | null;

function scoreToNumber(value: ScoreValue) {
  return typeof value === "number" ? value : 0;
}

export async function syncMissingGameXp(profileId: string) {
  const { data: games } = await supabase
    .from("local_game_players")
    .select(`
      game_id,
      player_key,
      final_rank,
      local_games!inner(
        mode,
        player_count,
        status
      )
    `)
    .eq("profile_id", profileId)
    .eq("local_games.status", "finished");

  if (!games || games.length === 0) return { synced: 0, xp: 0 };

  const gameIds = games.map((game) => game.game_id);

  const { data: claims } = await supabase
    .from("profile_game_xp_claims")
    .select("game_id")
    .eq("profile_id", profileId)
    .in("game_id", gameIds);

  const alreadyClaimed = new Set((claims ?? []).map((claim) => claim.game_id));
  const missingGames = games.filter((game) => !alreadyClaimed.has(game.game_id));

  if (missingGames.length === 0) return { synced: 0, xp: 0 };

  const { data: scoreRows } = await supabase
    .from("local_game_scores")
    .select("game_id, player_key, column_id, row_id, value")
    .in(
      "game_id",
      missingGames.map((game) => game.game_id)
    );

  let synced = 0;
  let totalXp = 0;

  for (const game of missingGames) {
    const gameInfo = Array.isArray(game.local_games)
      ? game.local_games[0]
      : game.local_games;

    const mode = gameInfo.mode as "3cols" | "6cols";
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

    function getTopTotal(columnId: string) {
      return rows
        .slice(0, 6)
        .reduce((total, row) => total + scoreToNumber(getScore(columnId, row.id)), 0);
    }

    function getBonus(columnId: string) {
      return getTopTotal(columnId) >= 60 ? 35 : 0;
    }

    function countFigure(rowId: YamRow) {
      return activeColumns.reduce((total, column) => {
        const value = getScore(column.id, rowId);
        return value !== null && value !== "X" ? total + 1 : total;
      }, 0);
    }

    function countSuccessfulYams() {
      return activeColumns.reduce((total, column) => {
        return getScore(column.id, "yam") === 60 ? total + 1 : total;
      }, 0);
    }

    const xpGain =
      getParticipationXp(mode) +
      getRankXp(game.final_rank ?? 999, playerCount, mode) +
      countFigure("threeOfAKind") * FIGURE_XP.threeOfAKind +
      countFigure("fullHouse") * FIGURE_XP.fullHouse +
      countFigure("fourOfAKind") * FIGURE_XP.fourOfAKind +
      countFigure("straight") * FIGURE_XP.straight +
      countSuccessfulYams() * FIGURE_XP.yam +
      activeColumns.filter((column) => getBonus(column.id) > 0).length *
        FIGURE_XP.bonus;

    const { data, error } = await supabase.rpc("claim_own_game_xp", {
      p_game_id: game.game_id,
      p_xp_gain: xpGain,
    });

    if (error) {
      console.error("Erreur sync XP rétroactive", error);
      continue;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (result?.xp_gained > 0) {
      synced += 1;
      totalXp += result.xp_gained;
    }
  }

  return { synced, xp: totalXp };
}