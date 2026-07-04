import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function ensureUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "Utilisateur";

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  const { data: existingProfile, error: existingError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("Erreur lecture profil :", existingError);
    return null;
  }

  if (!existingProfile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
    });

    if (insertError) {
      console.error("Erreur création profil :", insertError);
      return null;
    }

    return {
      id: user.id,
      displayName,
      avatarUrl,
    };
  }

  return {
    id: existingProfile.id,
    displayName: existingProfile.display_name,
    avatarUrl: existingProfile.avatar_url,
  };
}