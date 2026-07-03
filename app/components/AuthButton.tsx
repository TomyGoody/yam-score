"use client";

import { useEffect, useState } from "react";
import { supabase, ensureUserProfile } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthButton() {
  const router = useRouter();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");
  
  async function refreshUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      setUserId(null);
      setDisplayName(null);
      setAvatarUrl(null);
      setUsername(null);
      setUsernameModalOpen(false);
      return;
    }
    
    const ensuredProfile = await ensureUserProfile();
    
    const { data: profileData } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .single();
    
    const nextDisplayName =
    profileData?.display_name ||
    ensuredProfile?.displayName ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "Utilisateur";
    
    const nextAvatarUrl =
    profileData?.avatar_url ||
    ensuredProfile?.avatarUrl ||
    user.user_metadata?.avatar_url ||
    null;
    
    setUserId(user.id);
    setDisplayName(nextDisplayName);
    setAvatarUrl(nextAvatarUrl);
    setUsername(profileData?.username ?? null);
    setUsernameModalOpen(!profileData?.username);
  }
  
  useEffect(() => {
    refreshUser();
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  }
  
  async function signInWithEmail() {
    if (!email.trim()) {
      alert("Entre un email.");
      return;
    }
    
    if (!password) {
      alert("Entre ton mot de passe.");
      return;
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    
    if (error) {
      alert(error.message);
      return;
    }
    
    setAuthModalOpen(false);
    await refreshUser();
  }
  
  async function signUpWithEmail() {
    if (!email.trim()) {
      alert("Entre un email.");
      return;
    }
    
    if (password.length < 6) {
      alert("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    
    if (error) {
      alert(error.message);
      return;
    }
    
    alert("Compte créé. Vérifie tes emails si une confirmation est demandée.");
    setAuthModalOpen(false);
  }
  
  async function signOut() {
    await supabase.auth.signOut();
    
    setUserId(null);
    setDisplayName(null);
    setAvatarUrl(null);
    setUsername(null);
    setUsernameModalOpen(false);
    setMenuOpen(false);
  }
  
  async function saveUsername() {
    const cleanedUsername = usernameInput.trim().toLowerCase();
    
    if (!/^[a-z0-9_]{3,20}$/.test(cleanedUsername)) {
      setUsernameError(
        "Ton pseudo doit faire 3 à 20 caractères : lettres, chiffres ou underscore."
      );
      return;
    }
    
    if (!userId) return;
    
    const { error } = await supabase
    .from("profiles")
    .update({ username: cleanedUsername })
    .eq("id", userId);
    
    if (error) {
      setUsernameError("Ce pseudo est déjà pris ou impossible à enregistrer.");
      return;
    }
    
    setUsername(cleanedUsername);
    setUsernameInput("");
    setUsernameError("");
    setUsernameModalOpen(false);
  }
  
  return (
    <>
    {displayName ? (
      <div className="absolute right-4 top-4 z-40">
      <button
      onClick={() => setMenuOpen((current) => !current)}
      className="flex items-center gap-3 rounded-2xl border border-[#9B6A28]/50 bg-[#241A13] hover:bg-[#322217] px-3 py-2 transition"
      >
      {avatarUrl ? (
        <img
        src={avatarUrl}
        alt=""
        className="h-8 w-8 rounded-full border border-white/20"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C44934] text-sm">
        👤
        </div>
      )}
      
      <div className="hidden text-left sm:block">
      <div className="text-sm font-black text-white">{displayName}</div>
      <div className="text-xs font-bold text-[#C44934]">
      @{username || "pseudo"}
      </div>
      </div>
      
      <span className="text-xs text-[#C44934]">▼</span>
      </button>
      
      {menuOpen && (
        <div className="mt-2 w-56 rounded-2xl border border-[#9B6A28]/50 bg-black p-2 shadow-2xl">
        <button
        onClick={() => {
          setMenuOpen(false);
          router.push("/profile");
        }}
        className="w-full rounded-xl px-3 py-3 text-left text-sm font-black text-white hover:bg-[#241A13]"
        >
        👤 Mon profil
        </button>
        
        
        
        <div className="my-2 h-px bg-slate-800" />
        
        <button
        onClick={signOut}
        className="w-full rounded-xl px-3 py-3 text-left text-sm font-black text-[#C44934] hover:bg-[#C44934]/10"
        >
        🚪 Déconnexion
        </button>
        </div>
      )}
      </div>
    ) : (
      <button
      onClick={() => setAuthModalOpen(true)}
      className="absolute right-5 top-5 z-40 rounded-2xl border border-[#9B6A28]/50 bg-[#241A13] px-4 py-3 font-black text-white transition hover:bg-[#322217]"
      >
      👤 Se connecter
      </button>
    )}
    
    {authModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-6 shadow-2xl">
      <div className="text-center">
      <div className="text-5xl">🎲</div>
      
      <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
      Connexion
      </div>
      
      <h2 className="mt-1 text-3xl font-black text-white">
      Yam Score
      </h2>
      
      <p className="mt-2 text-sm font-bold text-slate-400">
      Retrouve tes parties, tes statistiques et ton historique.
      </p>
      </div>
      
      <button
      onClick={signInWithGoogle}
      className="mt-6 w-full rounded-xl bg-[#F4E9DC] px-4 py-3 font-black text-black transition hover:bg-[#FFF8EF]"
      >
      Continuer avec Google
      </button>
      
      <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-[#9B6A28]/40" />
      <span className="text-xs font-black text-slate-500">OU</span>
      <div className="h-px flex-1 bg-[#9B6A28]/40" />
      </div>
      
      <div className="space-y-3">
      <input
      type="email"
      placeholder="Email"
      value={email}
      onChange={(event) => setEmail(event.target.value)}
      className="w-full rounded-xl border border-[#9B6A28]/50 bg-[#F4E9DC] px-4 py-3 font-black text-black outline-none focus:border-[#C44934]"
      />
      
      <input
      type="password"
      placeholder="Mot de passe"
      value={password}
      onChange={(event) => setPassword(event.target.value)}
      className="w-full rounded-xl border border-[#9B6A28]/50 bg-[#F4E9DC] px-4 py-3 font-black text-black outline-none focus:border-[#C44934]"
      />
      </div>
      
      <div className="mt-5 grid grid-cols-2 gap-3">
      <button
      onClick={signInWithEmail}
      className="rounded-xl bg-[#C44934] px-4 py-3 font-black text-white transition hover:bg-[#D75A43]"
      >
      Se connecter
      </button>
      
      <button
      onClick={signUpWithEmail}
      className="rounded-xl bg-[#241A13] px-4 py-3 font-black text-white transition hover:bg-[#322217]"
      >
      Créer un compte
      </button>
      </div>
      
      <button
      onClick={() => setAuthModalOpen(false)}
      className="mt-4 w-full rounded-xl border border-[#9B6A28]/40 px-4 py-3 font-black text-slate-300 transition hover:bg-[#241A13]"
      >
      Annuler
      </button>
      </div>
      </div>
    )}
    
    {usernameModalOpen && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-6 shadow-2xl">
      <div className="text-center">
      <div className="text-5xl">🎲</div>
      
      <div className="mt-3 text-sm font-black uppercase text-[#C44934]">
      Bienvenue
      </div>
      
      <h2 className="mt-1 text-3xl font-black text-white">
      Choisis ton pseudo
      </h2>
      
      <p className="mt-2 text-sm font-bold text-slate-400">
      Il sera visible lorsque tu participeras à une partie.
      </p>
      </div>
      
      <input
      value={usernameInput}
      onChange={(event) => {
        setUsernameInput(event.target.value);
        setUsernameError("");
      }}
      placeholder="pseudo"
      className="mt-6 w-full rounded-xl border border-[#9B6A28]/50 bg-[#F4E9DC] px-4 py-3 text-center font-black text-black outline-none focus:border-[#C44934]"
      autoFocus
      />
      
      {usernameError && (
        <div className="mt-3 rounded-xl border border-[#C44934] bg-[#C44934]/10 px-3 py-2 text-center text-sm font-black text-[#D75A43]">
        {usernameError}
        </div>
      )}
      
      <button
      onClick={saveUsername}
      className="mt-5 w-full rounded-xl bg-[#C44934] px-4 py-3 font-black text-white hover:bg-[#D75A43]"
      >
      Continuer
      </button>
      </div>
      </div>
    )}
    </>
  );
}