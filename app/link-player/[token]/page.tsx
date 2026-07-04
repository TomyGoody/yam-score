"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, ensureUserProfile } from "../../lib/supabase";
import AuthButton from "../../components/AuthButton";
import LoadingScreen from "@/app/components/LoadingScreen";

type TokenData = {
  token: string;
  host_user_id: string;
  status: string;
  expires_at: string;
  target_player_key: string | null;
};

export default function LinkPlayerPage() {
  const params = useParams();
  const router = useRouter();

  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
const [successMessage, setSuccessMessage] = useState<string | null>(null);
  useEffect(() => {
    async function load() {
      const { data: tokenRow, error: tokenError } = await supabase
        .from("player_link_tokens")
        .select("token, host_user_id, status, expires_at, target_player_key")
        .eq("token", token)
        .maybeSingle();

      if (tokenError || !tokenRow) {
        setTokenData(null);
        setLoading(false);
        return;
      }

      setTokenData(tokenRow);

      const profile = await ensureUserProfile();

      if (profile) {
        setCurrentUserId(profile.id);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", profile.id)
          .single();

        setUsername(profileData?.username ?? null);
      }

      setLoading(false);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, [token]);

  async function validateLink() {
    if (!currentUserId || !username) {
      alert("Connecte-toi et choisis un pseudo avant de continuer.");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", currentUserId)
      .single();

    const { data, error } = await supabase.rpc("claim_player_link_token", {
      p_token: token,
      p_username: profileData?.username ?? username,
      p_avatar_url: profileData?.avatar_url ?? null,
    });

    if (error) {
      console.error(error);
      alert("Impossible d’associer ce profil.");
      return;
    }

    if (!data?.success) {
      alert(data?.message || "Impossible d’associer ce profil.");
      return;
    }

    setClaimSuccess(true);
setSuccessMessage("Profil associé avec succès.");
  }

  if (loading) {  
  return <LoadingScreen />;
}

if (!tokenData || !tokenData.target_player_key) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center shadow-2xl">
        <div className="text-5xl">⚠️</div>
        <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
          Lien invalide
        </div>
        <h1 className="mt-1 text-3xl font-black text-white">
          QR Code indisponible
        </h1>
        <p className="mt-2 text-sm font-bold text-slate-400">
          Ce QR Code est invalide ou n’existe plus.
        </p>
      </div>
    </main>
  );
}

const isExpired = new Date(tokenData.expires_at).getTime() < Date.now();
const playerNumber = tokenData.target_player_key.replace("player-", "");

if (isExpired || tokenData.status !== "pending") {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center shadow-2xl">
        <div className="text-5xl">⏳</div>
        <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
          Lien expiré
        </div>
        <h1 className="mt-1 text-3xl font-black text-white">
          Nouveau QR Code requis
        </h1>
        <p className="mt-2 text-sm font-bold text-slate-400">
          Demande à l’hôte de générer un nouveau QR Code.
        </p>
      </div>
    </main>
  );
}

return (
  <main className="relative flex min-h-screen items-center justify-center bg-black px-4 text-white">
    <AuthButton />

    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
      <img
        src="/favicon.png"
        alt=""
        className="w-[900px] rotate-[-12deg] select-none"
      />
    </div>

    <div className="relative z-10 w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center shadow-2xl">
      <div className="text-5xl">🎲</div>

      <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
        Association profil
      </div>

      <h1 className="mt-1 text-3xl font-black text-white">
        Joueur {playerNumber}
      </h1>

      <p className="mt-2 text-sm font-bold text-slate-400">
        Ce lien associera ton profil à cette place.
      </p>

      {currentUserId && username ? (
        <>
          <div className="mt-6 rounded-2xl bg-[#F4E9DC] p-4 text-black">
            <div className="text-sm font-black uppercase text-[#C44934]">
              Profil connecté
            </div>
            <div className="mt-1 text-2xl font-black">
              @{username}
            </div>
          </div>

          <button
            disabled={claimSuccess}
            onClick={validateLink}
            className={[
              "mt-6 w-full rounded-xl px-4 py-4 font-black transition",
              claimSuccess
                ? "cursor-not-allowed bg-[#241A13] text-slate-500"
                : "bg-[#C44934] text-white hover:bg-[#D75A43]",
            ].join(" ")}
          >
            {claimSuccess
              ? "Profil associé"
              : `Associer mon profil au Joueur ${playerNumber}`}
          </button>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-[#9B6A28]/40 bg-black p-4 text-sm font-bold text-slate-400">
          Utilise le bouton en haut à droite pour te connecter.
        </div>
      )}

      <button
        onClick={() => router.push("/")}
        className="mt-4 w-full rounded-xl bg-[#241A13] px-4 py-3 font-black text-white hover:bg-[#322217]"
      >
        Retour accueil
      </button>
    </div>
    {successMessage && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
    <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center shadow-2xl">
      <div className="text-5xl">✅</div>

      <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
        Profil associé
      </div>

      <h2 className="mt-1 text-3xl font-black text-white">
        C’est validé
      </h2>

      <p className="mt-3 font-bold text-slate-400">
        Tu peux maintenant revenir sur l’écran principal.
      </p>

      <button
        onClick={() => setSuccessMessage(null)}
        className="mt-6 w-full rounded-xl bg-[#C44934] py-3 font-black text-white hover:bg-[#D75A43]"
      >
        Terminé
      </button>
    </div>
  </div>
)}
  </main>
);
}
