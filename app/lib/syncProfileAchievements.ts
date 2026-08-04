import {
  achievementDefinitions,
  BADGE_XP,
  getUnlockedMilestoneIndexes,
} from "./xpRules";
import { supabase } from "./supabase";

type ProfileStats = Record<string, number | null>;

function getAllUnlockedBadges(stats: ProfileStats | null) {
  if (!stats) return [];

  return achievementDefinitions.flatMap((definition) => {
    const value = Number(stats[definition.metric] ?? 0);

    const unlockedIndexes = getUnlockedMilestoneIndexes(
      value,
      definition.milestones
    );

    return unlockedIndexes.map((index) => ({
      id: definition.id,
      label: definition.label,
      milestone: definition.milestones[index],
      xp: definition.xpRewards?.[index] ?? BADGE_XP[index] ?? 0,
    }));
  });
}

export async function syncProfileAchievements(
  profileId: string,
  options?: {
    admin?: boolean;
  }
) {
  const { data: stats, error: statsError } = await supabase
    .from("profile_stats")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (statsError) {
    console.error("Erreur lecture profile_stats sync", statsError);

    return {
      xpAwarded: 0,
      unlockedBadges: [],
    };
  }

  if (!stats) {
    return {
      xpAwarded: 0,
      unlockedBadges: [],
    };
  }

  /*
    Calcule l’exploit Grand Chelem en carrière :
    au moins une victoire dans chacun des quatre tournois.
  */
  const careerGrandSlam =
    Number(stats.australian_open_wins ?? 0) >= 1 &&
    Number(stats.roland_garros_wins ?? 0) >= 1 &&
    Number(stats.wimbledon_wins ?? 0) >= 1 &&
    Number(stats.us_open_wins ?? 0) >= 1
      ? 1
      : 0;

  /*
    On enregistre la métrique avant de rechercher les succès,
    afin que achievementDefinitions utilise immédiatement la bonne valeur.
  */
  if (Number(stats.career_grand_slam ?? 0) !== careerGrandSlam) {
    const { error: careerGrandSlamError } = await supabase
      .from("profile_stats")
      .update({
        career_grand_slam: careerGrandSlam,
      })
      .eq("profile_id", profileId);

    if (careerGrandSlamError) {
      console.error(
        "Erreur mise à jour Grand Chelem en carrière",
        careerGrandSlamError
      );

      return {
        xpAwarded: 0,
        unlockedBadges: [],
      };
    }

    stats.career_grand_slam = careerGrandSlam;
  }

  const potentialBadges = getAllUnlockedBadges(stats);

  const claimRpcName = options?.admin
  ? "claim_profile_badges_admin"
  : "claim_profile_badges";

const { data: claimedBadges, error: claimError } = await supabase.rpc(
  claimRpcName,
  {
    p_profile_id: profileId,
    p_badges: potentialBadges,
  }
);

  if (claimError) {
  console.error("Erreur claim badges sync", {
    profileId,
    claimRpcName,
    message: claimError.message,
    details: claimError.details,
    hint: claimError.hint,
    code: claimError.code,
  });

  return {
    xpAwarded: 0,
    unlockedBadges: [],
  };
}

  const unlockedBadges = (claimedBadges ?? []).map((badge: any) => {
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

  const xpAwarded = unlockedBadges.reduce(
    (total: number, badge: { xp: number }) => total + badge.xp,
    0
  );

  if (xpAwarded > 0) {
    const xpRpcName = options?.admin
  ? "add_profile_xp_admin"
  : "add_profile_xp";

const { error: xpError } = await supabase.rpc(xpRpcName, {
  p_profile_id: profileId,
  p_xp_gain: xpAwarded,
});

    if (xpError) {
      console.error("Erreur ajout XP succès synchronisés", xpError);
    }
  }

  return {
    xpAwarded,
    unlockedBadges,
  };
}