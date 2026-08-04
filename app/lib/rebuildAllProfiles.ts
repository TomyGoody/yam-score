import { supabase } from "./supabase";
import { rebuildProfileStats } from "./rebuildProfileStats";
import { syncProfileAchievements } from "./syncProfileAchievements";

export async function rebuildAllProfiles() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username")
    .order("username");

  if (error) {
    throw error;
  }

  let success = 0;
  let failed = 0;
  let totalXpAwarded = 0;

  const results: Array<{
    profileId: string;
    username: string | null;
    success: boolean;
    xpAwarded: number;
    error?: string;
  }> = [];

  for (const profile of profiles ?? []) {
    console.log(
      `Rebuild ${success + failed + 1}/${profiles.length} : ${profile.username ?? profile.id}`
    );

    try {
      const rebuilt = await rebuildProfileStats(profile.id, {
        admin: true,
      });

      if (!rebuilt) {
        failed += 1;

        results.push({
          profileId: profile.id,
          username: profile.username,
          success: false,
          xpAwarded: 0,
          error: "Échec du rebuild des statistiques",
        });

        continue;
      }

      const achievementResult = await syncProfileAchievements(
        profile.id,
        {
          admin: true,
        }
      );

      success += 1;
      totalXpAwarded += achievementResult.xpAwarded;

      results.push({
        profileId: profile.id,
        username: profile.username,
        success: true,
        xpAwarded: achievementResult.xpAwarded,
      });
    } catch (error) {
      failed += 1;

      results.push({
        profileId: profile.id,
        username: profile.username,
        success: false,
        xpAwarded: 0,
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      });
    }
  }

  console.log("Rebuild global terminé", {
    success,
    failed,
    totalXpAwarded,
    results,
  });

  return {
    success,
    failed,
    totalXpAwarded,
    results,
  };
}