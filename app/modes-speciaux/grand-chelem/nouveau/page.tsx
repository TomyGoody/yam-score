"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuthButton from "../../../components/AuthButton";
import { supabase } from "../../../lib/supabase";
import { QRCodeCanvas } from "qrcode.react";

type TournamentTheme =
  | "australian_open"
  | "roland_garros"
  | "wimbledon"
  | "us_open";

type LinkedProfile = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

type TournamentDefinition = {
  id: TournamentTheme;
  name: string;
  subtitle: string;
  logo: string;
  icon: string;
  backgroundClass: string;
  borderClass: string;
};

const TOURNAMENTS: TournamentDefinition[] = [
  {
    id: "australian_open",
    name: "Open d’Australie",
    subtitle: "Le Grand Chelem de Melbourne",
    icon: "🇦🇺",
    backgroundClass: "bg-[#1779BA]",
    borderClass: "border-[#65BFEA]",
    logo: "/australian-open-logo.png",
  },
  {
    id: "roland_garros",
    name: "Roland-Garros",
    subtitle: "Le tournoi sur terre battue",
    icon: "🟠",
    backgroundClass: "bg-[#B85632]",
    borderClass: "border-[#E49369]",
    logo: "/roland-garros-logo.png",
  },
  {
    id: "wimbledon",
    name: "Wimbledon",
    subtitle: "Le temple du gazon",
    icon: "🌿",
    backgroundClass: "bg-[#315B40]",
    borderClass: "border-[#7AA987]",
    logo: "/wimbledon-logo.png",
  },
  {
    id: "us_open",
    name: "US Open",
    subtitle: "Le Grand Chelem de New York",
    icon: "🇺🇸",
    backgroundClass: "bg-[#183B73]",
    borderClass: "border-[#668AC5]",
    logo: "/us-open-logo.png",
  },
];

export default function NewGrandSlamPage() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] =
    useState<LinkedProfile | null>(null);

  const [theme, setTheme] = useState<TournamentTheme | null>(null);
  const [columnMode, setColumnMode] = useState<3 | 6>(6);
 

  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");

  const [player1Profile, setPlayer1Profile] =
    useState<LinkedProfile | null>(null);
  const [player2Profile, setPlayer2Profile] =
    useState<LinkedProfile | null>(null);
const [linkToken, setLinkToken] = useState<string | null>(null);
const [linkUrl, setLinkUrl] = useState<string | null>(null);
const [linkTargetPlayer, setLinkTargetPlayer] = useState<1 | 2 | null>(null);
const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCurrentProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      if (!user) {
        setCurrentProfile(null);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        console.error("Erreur chargement profil", error);
        return;
      }

      const username =
        profile.username ||
        profile.display_name ||
        user.email ||
        "Joueur";

      const linkedProfile: LinkedProfile = {
        userId: profile.id,
        username,
        avatarUrl: profile.avatar_url ?? null,
      };

      setCurrentProfile(linkedProfile);
      setPlayer1Profile(linkedProfile);
      setPlayer1Name(formatPlayerName(username));
    }

    void loadCurrentProfile();
  }, []);
useEffect(() => {
  if (!linkToken) return;

  const channel = supabase
    .channel(`grand_slam_player_link_${linkToken}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "player_link_tokens",
        filter: `token=eq.${linkToken}`,
      },
      (payload) => {
        const claimedToken = payload.new as {
          status: string;
          claimed_player_key: string | null;
          claimed_user_id: string | null;
          claimed_username: string | null;
          claimed_avatar_url: string | null;
        };

        if (
          claimedToken.status !== "claimed" ||
          !claimedToken.claimed_player_key ||
          !claimedToken.claimed_user_id ||
          !claimedToken.claimed_username
        ) {
          return;
        }

        applyClaimedProfile({
          playerKey: claimedToken.claimed_player_key,
          userId: claimedToken.claimed_user_id,
          username: claimedToken.claimed_username,
          avatarUrl: claimedToken.claimed_avatar_url,
        });
      }
    )
    .subscribe((status) => {
      console.log("Grand Slam profile link status:", status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [linkToken, player1Profile?.userId, player2Profile?.userId]);
useEffect(() => {
  if (!linkToken) return;

  const interval = window.setInterval(async () => {
    const { data, error } = await supabase
      .from("player_link_tokens")
      .select(
        `
        status,
        claimed_player_key,
        claimed_user_id,
        claimed_username,
        claimed_avatar_url
        `
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
      applyClaimedProfile({
        playerKey: data.claimed_player_key,
        userId: data.claimed_user_id,
        username: data.claimed_username,
        avatarUrl: data.claimed_avatar_url,
      });
    }
  }, 1000);

  return () => window.clearInterval(interval);
}, [linkToken, player1Profile?.userId, player2Profile?.userId]);
  const selectedTournament = useMemo(
    () => TOURNAMENTS.find((tournament) => tournament.id === theme) ?? null,
    [theme]
  );

  const canCreate =
    Boolean(currentUserId) &&
    Boolean(theme) &&
    player1Name.trim().length > 0 &&
    player2Name.trim().length > 0 &&
    !isCreating;

  function assignCurrentProfileToPlayer(playerNumber: 1 | 2) {
    if (!currentProfile) return;

    if (playerNumber === 1) {
      setPlayer2Profile((current) =>
        current?.userId === currentProfile.userId ? null : current
      );

      setPlayer1Profile(currentProfile);
      setPlayer1Name(formatPlayerName(currentProfile.username));
      return;
    }

    setPlayer1Profile((current) =>
      current?.userId === currentProfile.userId ? null : current
    );

    setPlayer2Profile(currentProfile);
    setPlayer2Name(formatPlayerName(currentProfile.username));
  }

  function removeProfileFromPlayer(playerNumber: 1 | 2) {
    if (playerNumber === 1) {
      setPlayer1Profile(null);
      return;
    }

    setPlayer2Profile(null);
  }
async function createPlayerLinkToken(playerNumber: 1 | 2) {
  if (!currentUserId) {
    setErrorMessage(
      "Tu dois être connecté pour associer le profil d’un autre joueur."
    );
    return;
  }

  setIsCreatingLink(true);
  setErrorMessage(null);

  const token = crypto.randomUUID();
  const playerKey = `player-${playerNumber}`;

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  const { error } = await supabase.from("player_link_tokens").insert({
    token,
    host_user_id: currentUserId,
    target_player_key: playerKey,
    status: "pending",
    player_count: 2,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("Erreur création lien profil", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    setErrorMessage(error.message);
    setIsCreatingLink(false);
    return;
  }

  setLinkToken(token);
  setLinkTargetPlayer(playerNumber);
  setLinkUrl(`${window.location.origin}/link-player/${token}`);
  setIsCreatingLink(false);
}
function applyClaimedProfile({
  playerKey,
  userId,
  username,
  avatarUrl,
}: {
  playerKey: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
}) {
  const linkedProfile: LinkedProfile = {
    userId,
    username,
    avatarUrl,
  };

  const formattedName = formatPlayerName(username);

  if (playerKey === "player-1") {
    if (player2Profile?.userId === userId) {
      setPlayer2Profile(null);
    }

    setPlayer1Profile(linkedProfile);
    setPlayer1Name(formattedName);
  }

  if (playerKey === "player-2") {
    if (player1Profile?.userId === userId) {
      setPlayer1Profile(null);
    }

    setPlayer2Profile(linkedProfile);
    setPlayer2Name(formattedName);
  }

  setLinkToken(null);
  setLinkUrl(null);
  setLinkTargetPlayer(null);
}
  async function createFinal() {
    if (!currentUserId) {
      setErrorMessage(
        "Tu dois être connecté pour créer une finale persistante."
      );
      return;
    }

    if (!theme) {
      setErrorMessage("Choisis un tournoi.");
      return;
    }

    if (!player1Name.trim() || !player2Name.trim()) {
      setErrorMessage("Renseigne le nom des deux joueurs.");
      return;
    }

    if (
      player1Profile &&
      player2Profile &&
      player1Profile.userId === player2Profile.userId
    ) {
      setErrorMessage(
        "Le même profil ne peut pas être associé aux deux joueurs."
      );
      return;
    }

    if (
      player1Profile?.userId !== currentUserId &&
      player2Profile?.userId !== currentUserId
    ) {
      setErrorMessage(
        "Ton profil doit être associé à l’un des deux joueurs."
      );
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    const { data: competitionId, error } = await supabase.rpc(
      "create_grand_slam_final",
      {
        p_theme: theme,
        p_column_mode: columnMode,

        p_player_1_name: player1Name.trim(),
        p_player_1_profile_id: player1Profile?.userId ?? null,
        p_player_1_avatar_url: player1Profile?.avatarUrl ?? null,

        p_player_2_name: player2Name.trim(),
        p_player_2_profile_id: player2Profile?.userId ?? null,
        p_player_2_avatar_url: player2Profile?.avatarUrl ?? null,
      }
    );

    if (error || !competitionId) {
      console.error("Erreur création finale", error);

      setErrorMessage(
        error?.message ?? "Impossible de créer la finale."
      );

      setIsCreating(false);
      return;
    }

    
    router.push(`/modes-speciaux/grand-chelem/${competitionId}`);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black px-4 py-8 text-white">
      <AuthButton />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
        <Image
          src="/favicon.png"
          alt=""
          width={1000}
          height={1000}
          priority
          className="select-none rotate-[-12deg]"
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/modes-speciaux/grand-chelem")}
          className="rounded-xl border border-[#9B6A28]/60 bg-black px-4 py-2 font-black text-white transition hover:bg-[#241A13]"
        >
          Grand Chelem
        </button>

        <header className="mt-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#C44934]">
            Nouvelle compétition
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Créer une finale
          </h1>

          <p className="mx-auto mt-4 max-w-2xl font-bold text-slate-400">
            Choisis le tournoi, le format et les deux participants.
          </p>
        </header>

        {!currentUserId && (
          <div className="mt-8 rounded-2xl border border-amber-500/60 bg-amber-500/10 p-5 text-center">
            <p className="font-black text-amber-300">
              Connecte-toi pour créer une finale enregistrée.
            </p>
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-[#9B6A28]/50 bg-[#111111] p-5 sm:p-7">
          <SectionTitle
            number="1"
            title="Choisis le tournoi"
            description="Le tournoi change le thème visuel de la finale."
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {TOURNAMENTS.map((tournament) => {
              const selected = theme === tournament.id;

              return (
                <button
                  key={tournament.id}
                  type="button"
                  onClick={() => setTheme(tournament.id)}
                  className={[
                    "relative overflow-hidden rounded-2xl border-2 p-5 text-left transition",
                    tournament.backgroundClass,
                    selected
                      ? `${tournament.borderClass} scale-[1.01]`
                      : "border-transparent opacity-75 hover:opacity-100",
                  ].join(" ")}
                >
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute left-1/2 top-0 h-full w-px bg-white" />
                    <div className="absolute left-0 top-1/2 h-px w-full bg-white" />
                  </div>

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
  <Image
  src={tournament.logo}
  alt={tournament.name}
  width={72}
  height={72}
  className="h-16 w-auto object-contain drop-shadow-lg"
/>

  <h2 className="mt-4 text-xl font-black text-white">
    {tournament.name}
  </h2>

  <p className="mt-1 text-sm font-bold text-white/70">
    {tournament.subtitle}
  </p>
</div>

                    <div
                      className={[
                        "flex h-7 w-7 items-center justify-center rounded-full border-2 font-black",
                        selected
                          ? "border-white bg-white text-black"
                          : "border-white/40 text-transparent",
                      ].join(" ")}
                    >
                      ✓
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#9B6A28]/50 bg-[#111111] p-5 sm:p-7">
          <SectionTitle
            number="2"
            title="Configure la finale"
            description="Le format de Yam reste identique pendant toute la compétition."
          />

          <div className="mt-5">
            <div className="rounded-2xl border border-slate-800 bg-black p-5">
              <p className="text-sm font-black uppercase tracking-widest text-[#C44934]">
                Mode Yam
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <ChoiceButton
                  selected={columnMode === 3}
                  title="3 colonnes"
                  subtitle="Parties plus rapides"
                  onClick={() => setColumnMode(3)}
                />

                <ChoiceButton
                  selected={columnMode === 6}
                  title="6 colonnes"
                  subtitle="Format complet"
                  onClick={() => setColumnMode(6)}
                />
              </div>
            </div>

            
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#9B6A28]/50 bg-[#111111] p-5 sm:p-7">
          <SectionTitle
            number="3"
            title="Choisis les joueurs"
            description="Les participants seront verrouillés après la création."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <PlayerCard
  label="Joueur 1"
  name={player1Name}
  setName={setPlayer1Name}
  linkedProfile={player1Profile}
  currentProfile={currentProfile}
  onAssignCurrentProfile={() => assignCurrentProfileToPlayer(1)}
  onLinkAnotherProfile={() => void createPlayerLinkToken(1)}
  isCreatingLink={isCreatingLink && linkTargetPlayer === 1}
  onRemoveProfile={() => removeProfileFromPlayer(1)}
/>

            <PlayerCard
  label="Joueur 2"
  name={player2Name}
  setName={setPlayer2Name}
  linkedProfile={player2Profile}
  currentProfile={currentProfile}
  onAssignCurrentProfile={() => assignCurrentProfileToPlayer(2)}
  onLinkAnotherProfile={() => void createPlayerLinkToken(2)}
  isCreatingLink={isCreatingLink && linkTargetPlayer === 2}
  onRemoveProfile={() => removeProfileFromPlayer(2)}
/>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-black p-4">
            <p className="text-sm font-bold text-slate-400">
              Ton profil doit être associé à l’un des deux
              participants. Le second joueur peut rester invité.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#9B6A28]/50 bg-[#F4E9DC] p-5 text-black sm:p-7">
          <p className="text-sm font-black uppercase tracking-widest text-[#C44934]">
            Récapitulatif
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <SummaryPlayer
              label="Joueur 1"
              name={player1Name || "À définir"}
              profile={player1Profile}
            />

            <div className="text-center text-2xl font-black text-[#C44934]">
              VS
            </div>

            <SummaryPlayer
              label="Joueur 2"
              name={player2Name || "À définir"}
              profile={player2Profile}
            />
          </div>

          <div className="mt-5 grid gap-3 text-sm font-black sm:grid-cols-2">
            <SummaryValue
              label="Tournoi"
              value={selectedTournament?.name ?? "Non choisi"}
            />

            <SummaryValue
              label="Format"
              value={`${columnMode} colonnes`}
            />

            
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-500 bg-red-500/10 p-4 font-bold text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="button"
            disabled={!canCreate}
            onClick={() => void createFinal()}
            className="mt-6 w-full rounded-xl bg-[#C44934] px-5 py-4 text-lg font-black text-white transition enabled:hover:bg-[#D75A43] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isCreating
              ? "Création en cours..."
              : selectedTournament
                ? `Commencer ${selectedTournament.name}`
                : "Choisis un tournoi"}
          </button>
        </section>
      </div>
      {linkUrl && linkTargetPlayer && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
    <div className="w-full max-w-md rounded-3xl border border-[#9B6A28] bg-[#111111] p-6 text-center">
      <p className="text-sm font-black uppercase tracking-widest text-[#C44934]">
        Joueur {linkTargetPlayer}
      </p>

      <h2 className="mt-2 text-2xl font-black">
        Associer un autre profil
      </h2>

      <p className="mt-3 font-bold text-slate-400">
        Le joueur doit scanner ce QR code avec son téléphone, puis se
        connecter à son compte YamScore.
      </p>

      <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-4">
        <QRCodeCanvas
          value={linkUrl}
          size={220}
          level="M"
          includeMargin
        />
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-black p-3">
        <p className="break-all text-xs font-bold text-slate-400">
          {linkUrl}
        </p>
      </div>

      <p className="mt-4 animate-pulse text-sm font-black text-amber-300">
        En attente de la connexion du joueur…
      </p>

      <button
        type="button"
        onClick={() => {
          setLinkToken(null);
          setLinkUrl(null);
          setLinkTargetPlayer(null);
        }}
        className="mt-5 w-full rounded-xl bg-[#241A13] px-4 py-3 font-black text-white transition hover:bg-[#322217]"
      >
        Annuler
      </button>
    </div>
  </div>
)}
    </main>
  );
}

function SectionTitle({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C44934] text-lg font-black text-white">
        {number}
      </div>

      <div>
        <h2 className="text-xl font-black">{title}</h2>

        <p className="mt-1 font-bold text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function ChoiceButton({
  selected,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-4 py-3 text-left transition",
        selected
          ? "border-[#C44934] bg-[#C44934] text-white"
          : "border-slate-800 bg-[#111111] text-white hover:border-[#9B6A28]",
      ].join(" ")}
    >
      <div className="font-black">{title}</div>

      <div className="mt-1 text-xs font-bold opacity-70">{subtitle}</div>
    </button>
  );
}

function PlayerCard({
  label,
  name,
  setName,
  linkedProfile,
  currentProfile,
  onAssignCurrentProfile,
  onLinkAnotherProfile,
  isCreatingLink,
  onRemoveProfile,
}: {
  label: string;
  name: string;
  setName: (value: string) => void;
  linkedProfile: LinkedProfile | null;
  currentProfile: LinkedProfile | null;
  onAssignCurrentProfile: () => void;
  onRemoveProfile: () => void;
  onLinkAnotherProfile: () => void;
isCreatingLink: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-black p-5">
      <p className="text-sm font-black uppercase tracking-widest text-[#C44934]">
        {label}
      </p>

      <label className="mt-4 block">
        <span className="text-sm font-black text-slate-400">Nom</span>

        <input
          type="text"
          value={name}
          maxLength={30}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nom du joueur"
          className="mt-2 w-full rounded-xl border border-slate-700 bg-[#111111] px-4 py-3 font-bold text-white outline-none transition focus:border-[#C44934]"
        />
      </label>

      {linkedProfile ? (
        <div className="mt-4 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={linkedProfile} />

            <div className="min-w-0 flex-1">
              <p className="font-black text-emerald-300">
                Profil associé
              </p>

              <p className="truncate text-sm font-bold text-slate-400">
                @{linkedProfile.username}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRemoveProfile}
            className="mt-3 text-sm font-black text-red-400 hover:text-red-300"
          >
            Retirer le profil
          </button>
        </div>
      ) : (
  <div className="mt-4 space-y-3">

    {currentProfile && (
      <button
        type="button"
        onClick={onAssignCurrentProfile}
        className="w-full rounded-xl border border-[#9B6A28] bg-[#241A13] px-4 py-3 font-black text-white transition hover:bg-[#322217]"
      >
        Associer mon profil
      </button>
    )}

    <button
      type="button"
      disabled={isCreatingLink}
      onClick={onLinkAnotherProfile}
      className="w-full rounded-xl bg-[#C44934] px-4 py-3 font-black text-white transition enabled:hover:bg-[#D75A43] disabled:opacity-50"
    >
      {isCreatingLink
        ? "Création du lien..."
        : "Associer un autre profil"}
    </button>

    <p className="text-xs font-bold text-slate-600">
      Le joueur peut rester invité ou associer son propre profil.
    </p>

  </div>
)}

          
    </article>
  );
}

function ProfileAvatar({ profile }: { profile: LinkedProfile }) {
  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt=""
        className="h-11 w-11 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C44934] text-lg font-black text-white">
      {profile.username.charAt(0).toUpperCase()}
    </div>
  );
}

function SummaryPlayer({
  label,
  name,
  profile,
}: {
  label: string;
  name: string;
  profile: LinkedProfile | null;
}) {
  return (
    <div className="rounded-2xl border border-[#D8B996] bg-white/50 p-4 text-center">
      <p className="text-xs font-black uppercase tracking-widest text-[#9B6A28]">
        {label}
      </p>

      <p className="mt-2 text-xl font-black">{name}</p>

      <p className="mt-1 text-xs font-bold text-[#5B4636]">
        {profile ? `@${profile.username}` : "Invité"}
      </p>
    </div>
  );
}

function SummaryValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#241A13] p-3 text-center text-white">
      <p className="text-xs uppercase tracking-widest text-white/60">
        {label}
      </p>

      <p className="mt-1">{value}</p>
    </div>
  );
}

function formatPlayerName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}