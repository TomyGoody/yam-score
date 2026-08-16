"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import AuthButton from "../../../components/AuthButton";
import { supabase } from "../../../lib/supabase";

type LinkedProfile = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

type WorldCupPlayer = {
  playerKey: string;
  name: string;
  linkedProfile: LinkedProfile | null;
};

export default function NewWorldCupPage() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [currentProfile, setCurrentProfile] =
    useState<LinkedProfile | null>(null);

  const [playerCount, setPlayerCount] = useState(4);
  const [columnMode, setColumnMode] = useState<3 | 6>(6);

  const [players, setPlayers] = useState<WorldCupPlayer[]>(() =>
    createEmptyPlayers(4)
  );

  const [linkToken, setLinkToken] =
    useState<string | null>(null);

  const [linkUrl, setLinkUrl] =
    useState<string | null>(null);

  const [linkTargetPlayerKey, setLinkTargetPlayerKey] =
    useState<string | null>(null);

  const [isCreatingLink, setIsCreatingLink] =
    useState(false);

  const [isCreating, setIsCreating] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

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

      setPlayers((current) =>
        current.map((player, index) =>
          index === 0
            ? {
                ...player,
                name: formatPlayerName(username),
                linkedProfile,
              }
            : player
        )
      );
    }

    void loadCurrentProfile();
  }, []);
useEffect(() => {
  if (!linkToken) return;

  const channel = supabase
    .channel(`world_cup_player_link_${linkToken}`)
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
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [linkToken]);
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
}, [linkToken]);
  function updatePlayerCount(nextCount: number) {
    setPlayerCount(nextCount);

    setPlayers((current) =>
      Array.from({ length: nextCount }, (_, index) => {
        return (
          current[index] ?? {
            playerKey: `player-${index + 1}`,
            name: `Joueur ${index + 1}`,
            linkedProfile: null,
          }
        );
      })
    );

    setErrorMessage(null);
  }

  function updatePlayerName(
    playerKey: string,
    value: string
  ) {
    setPlayers((current) =>
      current.map((player) =>
        player.playerKey === playerKey
          ? {
              ...player,
              name: value,
            }
          : player
      )
    );
  }

  function assignCurrentProfile(playerKey: string) {
    if (!currentProfile) return;

    setPlayers((current) =>
      current.map((player) => {
        if (player.playerKey === playerKey) {
          return {
            ...player,
            name: formatPlayerName(
              currentProfile.username
            ),
            linkedProfile: currentProfile,
          };
        }

        if (
          player.linkedProfile?.userId ===
          currentProfile.userId
        ) {
          return {
            ...player,
            linkedProfile: null,
          };
        }

        return player;
      })
    );
  }

  function removeProfile(playerKey: string) {
    setPlayers((current) =>
      current.map((player) =>
        player.playerKey === playerKey
          ? {
              ...player,
              linkedProfile: null,
            }
          : player
      )
    );
  }

  const linkedProfileIds = useMemo(
    () =>
      players
        .map(
          (player) =>
            player.linkedProfile?.userId ?? null
        )
        .filter(
          (profileId): profileId is string =>
            Boolean(profileId)
        ),
    [players]
  );

  const hasDuplicateProfiles =
    new Set(linkedProfileIds).size !==
    linkedProfileIds.length;

  const currentUserIsParticipant = players.some(
    (player) =>
      player.linkedProfile?.userId === currentUserId
  );

  const allPlayersHaveNames = players.every(
    (player) => player.name.trim().length > 0
  );

  const canCreate =
    Boolean(currentUserId) &&
    allPlayersHaveNames &&
    currentUserIsParticipant &&
    !hasDuplicateProfiles &&
    !isCreating;
async function createPlayerLinkToken(playerKey: string) {
  if (!currentUserId) {
    setErrorMessage(
      "Tu dois être connecté pour associer le profil d’un autre joueur."
    );
    return;
  }

  setIsCreatingLink(true);
  setErrorMessage(null);

  const token = crypto.randomUUID();

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  const { error } = await supabase
    .from("player_link_tokens")
    .insert({
      token,
      host_user_id: currentUserId,
      target_player_key: playerKey,
      status: "pending",
      player_count: playerCount,
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
  setLinkTargetPlayerKey(playerKey);
  setLinkUrl(
    `${window.location.origin}/link-player/${token}`
  );

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

  setPlayers((current) =>
    current.map((player) => {
      if (player.playerKey === playerKey) {
        return {
          ...player,
          name: formatPlayerName(username),
          linkedProfile,
        };
      }

      if (player.linkedProfile?.userId === userId) {
        return {
          ...player,
          linkedProfile: null,
        };
      }

      return player;
    })
  );

  setLinkToken(null);
  setLinkUrl(null);
  setLinkTargetPlayerKey(null);
}
async function createWorldCup() {
  if (!currentUserId) {
    setErrorMessage(
      "Tu dois être connecté pour créer une Coupe du Monde persistante."
    );
    return;
  }

  if (!allPlayersHaveNames) {
    setErrorMessage("Tous les participants doivent avoir un nom.");
    return;
  }

  if (!currentUserIsParticipant) {
    setErrorMessage(
      "Ton profil doit être associé à l’un des participants."
    );
    return;
  }

  if (hasDuplicateProfiles) {
    setErrorMessage(
      "Le même profil ne peut pas être associé à plusieurs participants."
    );
    return;
  }

  setIsCreating(true);
  setErrorMessage(null);

  const formattedPlayers = players.map((player) => ({
    player_name: player.name.trim(),
    player_key: player.playerKey,
    profile_id: player.linkedProfile?.userId ?? null,
    avatar_url: player.linkedProfile?.avatarUrl ?? null,
  }));

  const { data, error } = await supabase.rpc(
    "create_world_cup",
    {
      p_column_mode: columnMode,
      p_players: formattedPlayers,
    }
  );

  if (error || !data) {
  console.error("Erreur Supabase brute :", error);

  

  setErrorMessage(
    error
      ? `${error.message}${error.details ? ` — ${error.details}` : ""}`
      : "La fonction n’a renvoyé aucune donnée."
  );

  setIsCreating(false);
  return;
}

  const result = data as {
    competition_id: string;
    player_count: number;
    column_mode: number;
  };

  router.push(
    `/modes-speciaux/coupe-du-monde/${result.competition_id}`
  );
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
          onClick={() =>
            router.push(
              "/modes-speciaux/coupe-du-monde"
            )
          }
          className="rounded-xl border border-white/20 bg-black px-4 py-2 font-black text-white transition hover:bg-[#123C28]"
        >
          Coupe du Monde
        </button>

        <header className="mt-8 text-center">
          <p
            className="text-sm font-black uppercase tracking-[0.3em]"
            style={{ color: "#22A866" }}
          >
            Nouvelle compétition
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Créer une Coupe du Monde
          </h1>

          <p className="mx-auto mt-4 max-w-2xl font-bold text-slate-400">
            Choisis le nombre de participants, le format
            de Yam et les profils associés.
          </p>
        </header>

        {!currentUserId && (
  <div className="mt-8 rounded-2xl border border-amber-500/60 bg-amber-500/10 p-5 text-center">
    <p className="font-black text-amber-300">
      Connecte-toi pour créer une Coupe du Monde enregistrée.
    </p>
  </div>
)}

<section className="mt-8 rounded-3xl border border-emerald-700/40 bg-[#F4E9DC] p-5 text-black sm:p-7">
  <SectionTitle
  number="1"
  title="Choisis le nombre de joueurs"
  description="La compétition doit contenir entre 4 et 16 participants."
  light
/>

  <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-7">
    {Array.from({ length: 13 }, (_, index) => index + 4).map(
      (count) => {
        const selected = playerCount === count;

        return (
          <button
            key={count}
            type="button"
            onClick={() => updatePlayerCount(count)}
            className={[
              "rounded-xl border px-3 py-3 font-black transition",
              selected
                ? "border-white text-white"
                : "border-slate-800 bg-black text-white hover:border-slate-600",
            ].join(" ")}
            style={
              selected
                ? {
                    backgroundColor: "#0B6B3A",
                  }
                : undefined
            }
          >
            {count}
          </button>
        );
      }
    )}
  </div>

  <div className="mt-5 rounded-2xl border border-slate-800 bg-black p-4">
    <p className="text-sm font-bold text-slate-400">
      Avec {playerCount} joueurs, l’application générera
      automatiquement le tableau et les éventuelles qualifications
      directes.
    </p>
  </div>
</section>

<section className="mt-6 rounded-3xl border border-emerald-700/40 bg-[#F4E9DC] p-5 text-black sm:p-7">
  <SectionTitle
  number="2"
  title="Configure la compétition"
  description="Le format de Yam restera identique pendant toute la Coupe du Monde."
  light
/>

  <div className="mt-5 rounded-2xl border border-slate-800 bg-black p-5">
    <p
      className="text-sm font-black uppercase tracking-widest"
      style={{ color: "#22A866" }}
    >
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
</section>
<section
  className="mt-6 rounded-3xl p-5 text-black sm:p-7"
  style={{
    backgroundColor: "#F4E9DC",
    border: "1px solid rgba(11, 107, 58, 0.4)",
  }}
>
  <SectionTitle
  number="3"
  title="Ajoute les participants"
  description="Chaque joueur peut rester invité ou associer son profil YamScore."
  light
/>

  <div className="mt-5 grid gap-5 md:grid-cols-2">
    {players.map((player, index) => (
      <WorldCupPlayerCard
        key={player.playerKey}
        label={`Joueur ${index + 1}`}
        player={player}
        currentProfile={currentProfile}
        onChangeName={(value) =>
          updatePlayerName(player.playerKey, value)
        }
        onAssignCurrentProfile={() =>
          assignCurrentProfile(player.playerKey)
        }
        onLinkAnotherProfile={() =>
          void createPlayerLinkToken(player.playerKey)
        }
        isCreatingLink={
          isCreatingLink &&
          linkTargetPlayerKey === player.playerKey
        }
        onRemoveProfile={() =>
          removeProfile(player.playerKey)
        }
      />
    ))}
  </div>

  <div className="mt-5 rounded-2xl border border-[#B7CDBE] bg-[#E6F1E9] p-4">
    <p className="text-sm font-bold text-[#40594A]">
      Ton profil doit être associé à au moins un participant.
      Les autres joueurs peuvent rester invités.
    </p>
  </div>
</section>
<section className="mt-6 rounded-3xl bg-[#F4E9DC] p-5 text-black sm:p-7">
  <p
    className="text-sm font-black uppercase tracking-widest"
    style={{ color: "#0B6B3A" }}
  >
    Récapitulatif
  </p>

  <div className="mt-5 grid gap-3 sm:grid-cols-3">
    <SummaryValue
      label="Participants"
      value={`${playerCount} joueurs`}
    />

    <SummaryValue
      label="Format"
      value={`${columnMode} colonnes`}
    />

    <SummaryValue
      label="Tableau"
      value="Élimination directe"
    />
  </div>

  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {players.map((player, index) => (
      <SummaryPlayer
        key={player.playerKey}
        label={`Joueur ${index + 1}`}
        name={player.name || "À définir"}
        profile={player.linkedProfile}
      />
    ))}
  </div>

  {hasDuplicateProfiles && (
    <div className="mt-5 rounded-xl border border-red-500 bg-red-500/10 p-4 font-bold text-red-700">
      Un même profil est associé à plusieurs participants.
    </div>
  )}

  {!currentUserIsParticipant && currentUserId && (
    <div className="mt-5 rounded-xl border border-amber-500 bg-amber-500/10 p-4 font-bold text-amber-800">
      Associe ton profil à l’un des participants avant de créer la
      compétition.
    </div>
  )}

  {errorMessage && (
    <div className="mt-5 rounded-xl border border-red-500 bg-red-500/10 p-4 font-bold text-red-700">
      {errorMessage}
    </div>
  )}

  <button
    type="button"
    disabled={!canCreate}
    onClick={() => void createWorldCup()}
    className="mt-6 w-full rounded-xl px-5 py-4 text-lg font-black text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
    style={{ backgroundColor: "#0B6B3A" }}
  >
    {isCreating
      ? "Génération du tableau..."
      : "Créer la Coupe du Monde"}
  </button>
</section>
      </div>
      
      {linkUrl && linkTargetPlayerKey && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
    <div className="w-full max-w-md rounded-3xl border border-emerald-700 bg-[#111111] p-6 text-center">
      <p
        className="text-sm font-black uppercase tracking-widest"
        style={{ color: "#22A866" }}
      >
        {linkTargetPlayerKey.replace(
          "player-",
          "Joueur "
        )}
      </p>

      <h2 className="mt-2 text-2xl font-black">
        Associer un autre profil
      </h2>

      <p className="mt-3 font-bold text-slate-400">
        Le joueur doit scanner ce QR code puis se
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
          setLinkTargetPlayerKey(null);
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

function createEmptyPlayers(
  count: number
): WorldCupPlayer[] {
  return Array.from({ length: count }, (_, index) => ({
    playerKey: `player-${index + 1}`,
    name: `Joueur ${index + 1}`,
    linkedProfile: null,
  }));
}

function formatPlayerName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  return (
    trimmed.charAt(0).toUpperCase() +
    trimmed.slice(1)
  );
}
function SectionTitle({
  number,
  title,
  description,
  light = false,
}: {
  number: string;
  title: string;
  description: string;
  light?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black text-white"
        style={{ backgroundColor: "#0B6B3A" }}
      >
        {number}
      </div>

      <div>
        <h2
          className="text-xl font-black"
          style={{
            color: light ? "#111111" : "#FFFFFF",
          }}
        >
          {title}
        </h2>

        <p
          className="mt-1 font-bold"
          style={{
            color: light ? "#5B6F61" : "#94A3B8",
          }}
        >
          {description}
        </p>
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
          ? "border-white text-white"
          : "border-slate-800 bg-[#111111] text-white hover:border-slate-600",
      ].join(" ")}
      style={
        selected
          ? {
              backgroundColor: "#0B6B3A",
            }
          : undefined
      }
    >
      <div className="font-black">{title}</div>

      <div className="mt-1 text-xs font-bold opacity-70">
        {subtitle}
      </div>
    </button>
  );
}
function WorldCupPlayerCard({
  label,
  player,
  currentProfile,
  onChangeName,
  onAssignCurrentProfile,
  onLinkAnotherProfile,
  isCreatingLink,
  onRemoveProfile,
}: {
  label: string;
  player: WorldCupPlayer;
  currentProfile: LinkedProfile | null;
  onChangeName: (value: string) => void;
  onAssignCurrentProfile: () => void;
  onLinkAnotherProfile: () => void;
  isCreatingLink: boolean;
  onRemoveProfile: () => void;
}) {
 return (
  <article
    className="flex h-full flex-col rounded-2xl p-5 shadow-sm"
    style={{
  backgroundColor: "#EBDCCB",
  border: "1px solid #D0BCA2",
}}
  >
    <p
      className="text-sm font-black uppercase tracking-widest"
      style={{ color: "#0B6B3A" }}
    >
      {label}
    </p>

    <label className="mt-4 block">
      <span
        className="text-sm font-black"
        style={{ color: "#40594A" }}
      >
        Nom du joueur
      </span>

      <input
        type="text"
        value={player.name}
        maxLength={30}
        onChange={(event) =>
          onChangeName(event.target.value)
        }
        placeholder="Nom du joueur"
        className="mt-2 w-full rounded-xl px-4 py-3 font-bold outline-none transition"
        style={{
          backgroundColor: "#FBF6EF",
          border: "1px solid #B7CDBE",
          color: "#111111",
        }}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = "#0B6B3A";
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = "#B7CDBE";
        }}
      />
    </label>

    {player.linkedProfile ? (
      <div
        className="mt-5 rounded-xl p-4"
        style={{
          backgroundColor: "#E6F1E9",
          border: "1px solid #A9D6B9",
        }}
      >
        <div className="flex items-center gap-3">
          <ProfileAvatar profile={player.linkedProfile} />

          <div className="min-w-0 flex-1">
            <p
              className="font-black"
              style={{ color: "#0B6B3A" }}
            >
              Profil associé
            </p>

            <p
              className="truncate text-sm font-bold"
              style={{ color: "#40594A" }}
            >
              @{player.linkedProfile.username}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemoveProfile}
          className="mt-4 text-sm font-black transition hover:opacity-75"
          style={{ color: "#C43D3D" }}
        >
          Retirer le profil
        </button>
      </div>
    ) : (
      <div className="mt-5 flex flex-1 flex-col justify-end gap-3">
        {currentProfile && (
          <button
            type="button"
            onClick={onAssignCurrentProfile}
            className="w-full rounded-xl px-4 py-3 font-black transition hover:brightness-95"
            style={{
              backgroundColor: "#FBF6EF",
              border: "1px solid #0B6B3A",
              color: "#0B6B3A",
            }}
          >
            Associer mon profil
          </button>
        )}

        <button
          type="button"
          disabled={isCreatingLink}
          onClick={onLinkAnotherProfile}
          className="w-full rounded-xl px-4 py-3 font-black text-white transition enabled:hover:brightness-110 disabled:opacity-50"
          style={{
            backgroundColor: "#0B6B3A",
          }}
        >
          {isCreatingLink
            ? "Création du lien..."
            : "Associer un autre profil"}
        </button>

        <p
          className="text-center text-xs font-bold"
          style={{ color: "#5B6F61" }}
        >
          Le joueur peut également rester invité.
        </p>
      </div>
    )}
  </article>
);
}

function ProfileAvatar({
  profile,
}: {
  profile: LinkedProfile;
}) {
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
    <div
      className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-black text-white"
      style={{ backgroundColor: "#0B6B3A" }}
    >
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
    <div className="rounded-2xl border border-[#A9C8B5] bg-white/60 p-4 text-center">
      <p
        className="text-xs font-black uppercase tracking-widest"
        style={{ color: "#0B6B3A" }}
      >
        {label}
      </p>

      <p className="mt-2 truncate text-lg font-black">
        {name}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-[#40594A]">
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
    <div
      className="rounded-xl p-3 text-center text-white"
      style={{ backgroundColor: "#123C28" }}
    >
      <p className="text-xs uppercase tracking-widest text-white/60">
        {label}
      </p>

      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}