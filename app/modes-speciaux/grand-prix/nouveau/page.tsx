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

type GrandPrixPlayer = {
  playerKey: string;
  name: string;
  linkedProfile: LinkedProfile | null;
};

type CreateGrandPrixResult = {
  competition_id: string;
  player_count: number;
  column_mode: number;
  grand_prix_count: number;
  circuits: Array<{
    race_number: number;
    circuit_id: string;
    status: string;
  }>;
};

const PLAYER_COUNTS = [2, 3, 4, 5, 6] as const;
const RACE_COUNTS = [3, 4, 5, 6, 7] as const;

export default function NewGrandPrixPage() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] =
    useState<LinkedProfile | null>(null);

  const [playerCount, setPlayerCount] = useState(3);
  const [grandPrixCount, setGrandPrixCount] = useState(3);
  const [columnMode, setColumnMode] = useState<3 | 6>(6);
  const [players, setPlayers] = useState<GrandPrixPlayer[]>(() =>
    createEmptyPlayers(3)
  );

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [linkTargetPlayerKey, setLinkTargetPlayerKey] =
    useState<string | null>(null);
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
      .channel(`grand_prix_player_link_${linkToken}`)
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
      void supabase.removeChannel(channel);
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

  const linkedProfileIds = useMemo(
    () =>
      players
        .map((player) => player.linkedProfile?.userId ?? null)
        .filter((profileId): profileId is string => Boolean(profileId)),
    [players]
  );

  const hasDuplicateProfiles =
    new Set(linkedProfileIds).size !== linkedProfileIds.length;

  const currentUserIsParticipant = players.some(
    (player) => player.linkedProfile?.userId === currentUserId
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

  function updatePlayerCount(nextCount: number) {
    setPlayerCount(nextCount);
    setPlayers((current) =>
      Array.from({ length: nextCount }, (_, index) =>
        current[index]
          ? current[index]
          : {
              playerKey: `player-${index + 1}`,
              name: `Joueur ${index + 1}`,
              linkedProfile: null,
            }
      )
    );
    setErrorMessage(null);
  }

  function updatePlayerName(playerKey: string, value: string) {
    setPlayers((current) =>
      current.map((player) =>
        player.playerKey === playerKey
          ? { ...player, name: value }
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
            name: formatPlayerName(currentProfile.username),
            linkedProfile: currentProfile,
          };
        }

        if (player.linkedProfile?.userId === currentProfile.userId) {
          return { ...player, linkedProfile: null };
        }

        return player;
      })
    );
  }

  function removeProfile(playerKey: string) {
    setPlayers((current) =>
      current.map((player) =>
        player.playerKey === playerKey
          ? { ...player, linkedProfile: null }
          : player
      )
    );
  }

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

    const { error } = await supabase.from("player_link_tokens").insert({
      token,
      host_user_id: currentUserId,
      target_player_key: playerKey,
      status: "pending",
      player_count: playerCount,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error("Erreur création lien profil", error);
      setErrorMessage(error.message);
      setIsCreatingLink(false);
      return;
    }

    setLinkToken(token);
    setLinkTargetPlayerKey(playerKey);
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
          return { ...player, linkedProfile: null };
        }

        return player;
      })
    );

    closeLinkModal();
  }

  function closeLinkModal() {
    setLinkToken(null);
    setLinkUrl(null);
    setLinkTargetPlayerKey(null);
  }

  async function createGrandPrixSeason() {
    if (!currentUserId) {
      setErrorMessage(
        "Tu dois être connecté pour créer une saison Grand Prix persistante."
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
      "create_grand_prix_season",
      {
        p_column_mode: columnMode,
        p_grand_prix_count: grandPrixCount,
        p_players: formattedPlayers,
      }
    );

    if (error || !data) {
      console.error("Erreur création saison Grand Prix", error);
      setErrorMessage(
        error
          ? `${error.message}${error.details ? ` — ${error.details}` : ""}`
          : "La fonction n’a renvoyé aucune donnée."
      );
      setIsCreating(false);
      return;
    }

    const result = data as CreateGrandPrixResult;
    router.push(`/modes-speciaux/grand-prix/${result.competition_id}`);
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
          onClick={() => router.push("/modes-speciaux/grand-prix")}
          className="rounded-xl border border-red-700/60 bg-black px-4 py-2 font-black text-white transition hover:bg-[#321116]"
        >
          Grand Prix
        </button>

        <header className="relative mt-8 overflow-hidden rounded-3xl border border-red-700/60 bg-gradient-to-br from-[#171717] via-[#6F0D15] to-[#D3202F] px-6 py-10 text-center sm:px-10">
          <RacingBackdrop />

          <div className="relative z-10">
            <div className="text-6xl">🏎️</div>
            <p className="mt-4 text-sm font-black uppercase tracking-[0.3em] text-white/65">
              Nouvelle compétition
            </p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              Créer une saison Grand Prix
            </h1>
            <p className="mx-auto mt-4 max-w-2xl font-bold text-white/75">
              Choisis les pilotes, le nombre de courses et le format de Yam.
              Le calendrier sera tiré aléatoirement au lancement.
            </p>
          </div>
        </header>

        {!currentUserId && (
          <div className="mt-6 rounded-2xl border border-amber-500/60 bg-amber-500/10 p-5 text-center">
            <p className="font-black text-amber-300">
              Connecte-toi pour créer une saison enregistrée.
            </p>
          </div>
        )}

        <section className="mt-6 rounded-3xl border border-red-700/40 bg-[#F4E9DC] p-5 text-black sm:p-7">
          <SectionHeader
            number="1"
            title="Configure la saison"
            description="Définis la durée de la compétition et le format utilisé pour toutes les courses."
          />

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <ConfigBlock title="Pilotes" hint="2 à 6 joueurs">
              <div className="grid grid-cols-5 gap-2">
                {PLAYER_COUNTS.map((count) => (
                  <NumberChoice
                    key={count}
                    value={count}
                    selected={playerCount === count}
                    onClick={() => updatePlayerCount(count)}
                  />
                ))}
              </div>
            </ConfigBlock>

            <ConfigBlock title="Grands Prix" hint="3 à 7 courses">
              <div className="grid grid-cols-5 gap-2">
                {RACE_COUNTS.map((count) => (
                  <NumberChoice
                    key={count}
                    value={count}
                    selected={grandPrixCount === count}
                    onClick={() => setGrandPrixCount(count)}
                  />
                ))}
              </div>
            </ConfigBlock>

            <ConfigBlock title="Mode Yam" hint="Identique toute la saison">
              <div className="grid grid-cols-2 gap-2">
                <ModeChoice
                  selected={columnMode === 3}
                  title="3 colonnes"
                  subtitle="Plus rapide"
                  onClick={() => setColumnMode(3)}
                />
                <ModeChoice
                  selected={columnMode === 6}
                  title="6 colonnes"
                  subtitle="Format complet"
                  onClick={() => setColumnMode(6)}
                />
              </div>
            </ConfigBlock>
          </div>

          <div className="mt-5 rounded-2xl bg-black p-4 text-center text-sm font-bold text-slate-400">
            {playerCount} pilotes · {grandPrixCount} Grands Prix · {columnMode}{" "}
            colonnes
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-red-700/40 bg-[#F4E9DC] p-5 text-black sm:p-7">
          <SectionHeader
            number="2"
            title="Compose la grille"
            description="Chaque pilote peut rester invité ou associer son profil YamScore."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {players.map((player, index) => (
              <PlayerCard
                key={player.playerKey}
                label={`Pilote ${index + 1}`}
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
                  isCreatingLink && linkTargetPlayerKey === player.playerKey
                }
                onRemoveProfile={() => removeProfile(player.playerKey)}
              />
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-[#6C2A30]">
            Ton profil doit être associé à au moins un pilote. Les autres
            participants peuvent rester invités.
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-red-700/40 bg-[#111111] p-5 sm:p-7">
          <SectionHeader
            number="3"
            title="Vérifie le départ"
            description="Le calendrier sera généré sans doublon après la création."
            dark
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryValue label="Pilotes" value={String(playerCount)} />
            <SummaryValue
              label="Calendrier"
              value={`${grandPrixCount} GP`}
            />
            <SummaryValue label="Format" value={`${columnMode} colonnes`} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player, index) => (
              <SummaryPlayer
                key={player.playerKey}
                label={`P${index + 1}`}
                name={player.name || "À définir"}
                profile={player.linkedProfile}
              />
            ))}
          </div>

          {hasDuplicateProfiles && (
            <Alert tone="error">
              Un même profil est associé à plusieurs pilotes.
            </Alert>
          )}

          {!currentUserIsParticipant && currentUserId && (
            <Alert tone="warning">
              Associe ton profil à l’un des pilotes avant de créer la saison.
            </Alert>
          )}

          {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

          <button
            type="button"
            disabled={!canCreate}
            onClick={() => void createGrandPrixSeason()}
            className="mt-6 w-full rounded-xl bg-[#D3202F] px-5 py-4 text-lg font-black text-white transition enabled:hover:bg-[#F13C49] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isCreating ? "Création du calendrier..." : "Lancer la saison"}
          </button>
        </section>
      </div>

      {linkUrl && linkTargetPlayerKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
          <div className="w-full max-w-md rounded-3xl border border-red-700 bg-[#111111] p-6 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-[#F13C49]">
              {linkTargetPlayerKey.replace("player-", "Pilote ")}
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Associer un autre profil
            </h2>
            <p className="mt-3 font-bold text-slate-400">
              Le joueur doit scanner ce QR code puis se connecter à son compte
              YamScore.
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
              onClick={closeLinkModal}
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

function RacingBackdrop() {
  return (
    <>
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute rounded-[45%]"
          style={{
            left: "5%",
            right: "5%",
            top: "12%",
            bottom: "12%",
            border: "32px solid rgba(0,0,0,0.75)",
            transform: "rotate(-5deg)",
          }}
        />
        <div
          className="absolute rounded-[45%]"
          style={{
            left: "9%",
            right: "9%",
            top: "20%",
            bottom: "20%",
            border: "2px dashed rgba(255,255,255,0.9)",
            transform: "rotate(-5deg)",
          }}
        />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-8 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(-45deg, #fff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #fff 75%), linear-gradient(-45deg, transparent 75%, #fff 75%)",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
          backgroundSize: "16px 16px",
        }}
      />
    </>
  );
}

function SectionHeader({
  number,
  title,
  description,
  dark = false,
}: {
  number: string;
  title: string;
  description: string;
  dark?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D3202F] text-lg font-black text-white">
        {number}
      </div>
      <div>
        <h2 className={`text-xl font-black ${dark ? "text-white" : "text-black"}`}>
          {title}
        </h2>
        <p className={`mt-1 font-bold ${dark ? "text-slate-500" : "text-[#6D5544]"}`}>
          {description}
        </p>
      </div>
    </div>
  );
}

function ConfigBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[#D9C5AD] bg-white/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black">{title}</h3>
        <span className="text-xs font-bold text-[#7A6553]">{hint}</span>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function NumberChoice({
  value,
  selected,
  onClick,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-3 font-black transition",
        selected
          ? "border-[#D3202F] bg-[#D3202F] text-white"
          : "border-slate-800 bg-black text-white hover:border-[#D3202F]",
      ].join(" ")}
    >
      {value}
    </button>
  );
}

function ModeChoice({
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
        "rounded-xl border px-3 py-3 text-left transition",
        selected
          ? "border-[#D3202F] bg-[#D3202F] text-white"
          : "border-slate-800 bg-black text-white hover:border-[#D3202F]",
      ].join(" ")}
    >
      <div className="font-black">{title}</div>
      <div className="mt-1 text-xs font-bold opacity-65">{subtitle}</div>
    </button>
  );
}

function PlayerCard({
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
  player: GrandPrixPlayer;
  currentProfile: LinkedProfile | null;
  onChangeName: (value: string) => void;
  onAssignCurrentProfile: () => void;
  onLinkAnotherProfile: () => void;
  isCreatingLink: boolean;
  onRemoveProfile: () => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#D0BCA2] bg-[#EBDCCB] p-5 shadow-sm">
      <p className="text-sm font-black uppercase tracking-widest text-[#D3202F]">
        {label}
      </p>

      <label className="mt-4 block">
        <span className="text-sm font-black text-[#5B4636]">
          Nom du pilote
        </span>
        <input
          type="text"
          value={player.name}
          maxLength={30}
          onChange={(event) => onChangeName(event.target.value)}
          placeholder="Nom du pilote"
          className="mt-2 w-full rounded-xl border border-[#D0BCA2] bg-[#FBF6EF] px-4 py-3 font-bold text-black outline-none transition focus:border-[#D3202F]"
        />
      </label>

      {player.linkedProfile ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={player.linkedProfile} />
            <div className="min-w-0 flex-1">
              <p className="font-black text-[#D3202F]">Profil associé</p>
              <p className="truncate text-sm font-bold text-[#6D5544]">
                @{player.linkedProfile.username}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemoveProfile}
            className="mt-4 text-sm font-black text-[#C43D3D] transition hover:opacity-75"
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
              className="w-full rounded-xl border border-[#D3202F] bg-[#FBF6EF] px-4 py-3 font-black text-[#D3202F] transition hover:bg-white"
            >
              Associer mon profil
            </button>
          )}

          <button
            type="button"
            disabled={isCreatingLink}
            onClick={onLinkAnotherProfile}
            className="w-full rounded-xl bg-[#D3202F] px-4 py-3 font-black text-white transition enabled:hover:bg-[#F13C49] disabled:opacity-50"
          >
            {isCreatingLink
              ? "Création du lien..."
              : "Associer un autre profil"}
          </button>

          <p className="text-center text-xs font-bold text-[#6D5544]">
            Le pilote peut également rester invité.
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
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D3202F] text-lg font-black text-white">
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
    <div className="rounded-2xl border border-slate-800 bg-black p-4 text-center">
      <p className="text-xs font-black uppercase tracking-widest text-[#F13C49]">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-black text-white">{name}</p>
      <p className="mt-1 truncate text-xs font-bold text-slate-500">
        {profile ? `@${profile.username}` : "Invité"}
      </p>
    </div>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#321116] p-4 text-center text-white">
      <p className="text-xs uppercase tracking-widest text-white/55">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "error" | "warning";
  children: React.ReactNode;
}) {
  const className =
    tone === "error"
      ? "border-red-500 bg-red-500/10 text-red-300"
      : "border-amber-500 bg-amber-500/10 text-amber-300";

  return (
    <div className={`mt-5 rounded-xl border p-4 font-bold ${className}`}>
      {children}
    </div>
  );
}

function createEmptyPlayers(count: number): GrandPrixPlayer[] {
  return Array.from({ length: count }, (_, index) => ({
    playerKey: `player-${index + 1}`,
    name: `Joueur ${index + 1}`,
    linkedProfile: null,
  }));
}

function formatPlayerName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
