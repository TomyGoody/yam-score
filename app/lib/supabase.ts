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

  const avatarUrl = user.user_metadata?.avatar_url || null;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
  console.error("Erreur création profil :", {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
  return null;
}

  return {
    id: user.id,
    displayName,
    avatarUrl,
  };
}