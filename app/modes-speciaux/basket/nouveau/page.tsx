"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import AuthButton from "../../../components/AuthButton";
import { supabase } from "../../../lib/supabase";

type TeamId = "A" | "B";
type TeamMode = "manual" | "random";

type LinkedProfile = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

type BasketPlayer = {
  playerKey: string;
  name: string;
  linkedProfile: LinkedProfile | null;
  team: TeamId;
};

type CreateBasketResult = {
  competition_id: string;
  player_count: number;
  column_mode: number;
  match_count: number;
};

const PLAYER_COUNTS = [2, 4, 6] as const;
const MATCH_COUNTS = [1, 3, 5] as const;

const BASKET = "#E87524";
const BASKET_LIGHT = "#F59A55";
const BASKET_DARK = "#8C3D0D";
const CREAM = "#F4E9DC";
const BROWN = "#65452F";

export default function NewBasketPage() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] =
    useState<LinkedProfile | null>(null);

  const [playerCount, setPlayerCount] = useState<2 | 4 | 6>(4);
  const [matchCount, setMatchCount] = useState<1 | 3 | 5>(3);
  const [columnMode, setColumnMode] = useState<3 | 6>(6);
  const [teamMode, setTeamMode] = useState<TeamMode>("manual");

  const [players, setPlayers] = useState<BasketPlayer[]>(() =>
    createEmptyPlayers(4)
  );
const [activePlayerKey, setActivePlayerKey] =
  useState<string | null>(null);

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6,
    },
  })
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
      .channel(`basket_player_link_${linkToken}`)
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

const teamA = players.filter((player) => player.team === "A");
const teamB = players.filter((player) => player.team === "B");

const activePlayer =
  players.find(
    (player) => player.playerKey === activePlayerKey
  ) ?? null;

const expectedTeamSize = playerCount / 2;

  const teamsAreBalanced =
    teamA.length === expectedTeamSize &&
    teamB.length === expectedTeamSize;

  const canCreate =
    Boolean(currentUserId) &&
    allPlayersHaveNames &&
    currentUserIsParticipant &&
    !hasDuplicateProfiles &&
    teamsAreBalanced &&
    !isCreating;

  function updatePlayerCount(nextCount: 2 | 4 | 6) {
    setPlayerCount(nextCount);

    setPlayers((current) =>
      Array.from({ length: nextCount }, (_, index) => {
        const existing = current[index];

        return {
          playerKey: `player-${index + 1}`,
          name: existing?.name ?? `Joueur ${index + 1}`,
          linkedProfile: existing?.linkedProfile ?? null,
          team: index % 2 === 0 ? "A" : "B",
        };
      })
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

 function handleDragStart(event: DragStartEvent) {
  setActivePlayerKey(String(event.active.id));
}

function handleDragEnd(event: DragEndEvent) {
  setActivePlayerKey(null);

  const { active, over } = event;

  if (!over) return;

  const draggedPlayerKey = String(active.id);
  const overId = String(over.id);

  const draggedPlayer = players.find(
    (player) =>
      player.playerKey === draggedPlayerKey
  );

  if (!draggedPlayer) return;

  let targetTeam: TeamId | null = null;
  let targetPlayerKey: string | null = null;

  if (overId === "team-A") {
    targetTeam = "A";
  } else if (overId === "team-B") {
    targetTeam = "B";
  } else {
    const targetPlayer = players.find(
      (player) =>
        player.playerKey === overId
    );

    if (!targetPlayer) return;

    targetTeam = targetPlayer.team;
    targetPlayerKey = targetPlayer.playerKey;
  }

  if (
    !targetTeam ||
    targetTeam === draggedPlayer.team
  ) {
    return;
  }

  setTeamMode("manual");

  setPlayers((current) => {
    const movingPlayer = current.find(
      (player) =>
        player.playerKey === draggedPlayerKey
    );

    if (!movingPlayer) return current;

    const sourceTeam = movingPlayer.team;

    /*
      Si on dépose directement sur un joueur
      de l'autre équipe, on échange les deux.
    */
    if (targetPlayerKey) {
      return current.map((player) => {
        if (
          player.playerKey === draggedPlayerKey
        ) {
          return {
            ...player,
            team: targetTeam!,
          };
        }

        if (
          player.playerKey === targetPlayerKey
        ) {
          return {
            ...player,
            team: sourceTeam,
          };
        }

        return player;
      });
    }

    /*
      Dépôt dans la zone vide de l'équipe.
      Si l'équipe cible a une place libre,
      déplacement simple.
    */
    const targetPlayers = current.filter(
      (player) =>
        player.team === targetTeam
    );

    if (
      targetPlayers.length <
      expectedTeamSize
    ) {
      return current.map((player) =>
        player.playerKey === draggedPlayerKey
          ? {
              ...player,
              team: targetTeam!,
            }
          : player
      );
    }

    /*
      Si l'équipe est pleine, échange avec
      son dernier joueur.
    */
    const playerToSwap =
      targetPlayers[
        targetPlayers.length - 1
      ];

    if (!playerToSwap) return current;

    return current.map((player) => {
      if (
        player.playerKey === draggedPlayerKey
      ) {
        return {
          ...player,
          team: targetTeam!,
        };
      }

      if (
        player.playerKey ===
        playerToSwap.playerKey
      ) {
        return {
          ...player,
          team: sourceTeam,
        };
      }

      return player;
    });
  });
}

  function randomizeTeams() {
    if (playerCount === 2) {
      setPlayers((current) =>
        current.map((player, index) => ({
          ...player,
          team: index === 0 ? "A" : "B",
        }))
      );

      return;
    }

    const shuffled = [...players];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));

      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }

    const teamAKeys = new Set(
      shuffled
        .slice(0, expectedTeamSize)
        .map((player) => player.playerKey)
    );

    setPlayers((current) =>
      current.map((player) => ({
        ...player,
        team: teamAKeys.has(player.playerKey) ? "A" : "B",
      }))
    );

    setTeamMode("random");
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
          return {
            ...player,
            linkedProfile: null,
          };
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

  async function createBasketCompetition() {
    if (!currentUserId) {
      setErrorMessage(
        "Tu dois être connecté pour créer une compétition Basket."
      );
      return;
    }

    if (!allPlayersHaveNames) {
      setErrorMessage(
        "Tous les participants doivent avoir un nom."
      );
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

    if (!teamsAreBalanced) {
      setErrorMessage(
        `Chaque équipe doit contenir ${expectedTeamSize} joueur${
          expectedTeamSize > 1 ? "s" : ""
        }.`
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
      team: player.team,
    }));

    /*
      Cette RPC sera créée à l'étape suivante.
    */
    const { data, error } = await supabase.rpc(
      "create_basket_competition",
      {
        p_column_mode: columnMode,
        p_match_count: matchCount,
        p_players: formattedPlayers,
      }
    );

    if (error || !data) {
      console.error("Erreur création compétition Basket", error);

      setErrorMessage(
        error
          ? `${error.message}${
              error.details
                ? ` — ${error.details}`
                : ""
            }`
          : "La fonction n’a renvoyé aucune donnée."
      );

      setIsCreating(false);
      return;
    }

    const result = data as CreateBasketResult;

    router.push(
      `/modes-speciaux/basket/${result.competition_id}`
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
            router.push("/modes-speciaux/basket")
          }
          className="rounded-xl border bg-black px-4 py-2 font-black text-white transition hover:brightness-125"
          style={{
            borderColor: "rgba(232,117,36,0.7)",
          }}
        >
          Basket
        </button>

        <header
          className="relative mt-8 overflow-hidden rounded-3xl border px-6 py-10 text-center sm:px-10"
          style={{
            borderColor: "rgba(232,117,36,0.7)",
            background:
              "linear-gradient(135deg, #1A0D05 0%, #8C3D0D 50%, #E87524 100%)",
          }}
        >
          <BasketCourtBackground />

          <div className="relative z-10">
            <div className="text-6xl">🏀</div>

            <p className="mt-4 text-sm font-black uppercase tracking-[0.3em] text-white/65">
              Nouvelle compétition
            </p>

            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              Créer une compétition Basket
            </h1>

            <p className="mx-auto mt-4 max-w-2xl font-bold text-white/75">
              Choisis les joueurs, compose les équipes et
              définis le nombre de matchs de la compétition.
            </p>
          </div>
        </header>

        {!currentUserId && (
          <div className="mt-6 rounded-2xl border border-amber-500/60 bg-amber-500/10 p-5 text-center">
            <p className="font-black text-amber-300">
              Connecte-toi pour créer une compétition
              enregistrée.
            </p>
          </div>
        )}

        {/* CONFIGURATION */}
        <section
          className="mt-6 rounded-3xl border p-5 text-black sm:p-7"
          style={{
            borderColor: "rgba(232,117,36,0.4)",
            backgroundColor: CREAM,
          }}
        >
          <SectionHeader
            number="1"
            title="Configure le match"
            description="Choisis le nombre de joueurs, la durée de la compétition et le format de Yam."
          />

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <ConfigBlock
              title="Joueurs"
              hint="Deux équipes"
            >
              <div className="grid grid-cols-3 gap-2">
                {PLAYER_COUNTS.map((count) => (
                  <NumberChoice
                    key={count}
                    value={count}
                    selected={playerCount === count}
                    onClick={() =>
                      updatePlayerCount(count)
                    }
                  />
                ))}
              </div>
            </ConfigBlock>

            <ConfigBlock
              title="Matchs"
              hint="1, 3 ou 5"
            >
              <div className="grid grid-cols-3 gap-2">
                {MATCH_COUNTS.map((count) => (
                  <NumberChoice
                    key={count}
                    value={count}
                    selected={matchCount === count}
                    onClick={() =>
                      setMatchCount(count)
                    }
                  />
                ))}
              </div>
            </ConfigBlock>

            <ConfigBlock
              title="Mode Yam"
              hint="Identique pour tous les matchs"
            >
              <div className="grid grid-cols-2 gap-2">
                <ModeChoice
                  selected={columnMode === 3}
                  title="3 colonnes"
                  subtitle="39 coups"
                  onClick={() =>
                    setColumnMode(3)
                  }
                />

                <ModeChoice
                  selected={columnMode === 6}
                  title="6 colonnes"
                  subtitle="78 coups"
                  onClick={() =>
                    setColumnMode(6)
                  }
                />
              </div>
            </ConfigBlock>
          </div>

          <div className="mt-5 rounded-2xl bg-black p-4 text-center text-sm font-bold text-slate-400">
            {playerCount} joueurs ·{" "}
            {playerCount / 2} vs {playerCount / 2} ·{" "}
            {matchCount} match
            {matchCount > 1 ? "s" : ""} ·{" "}
            {columnMode} colonnes
          </div>
        </section>

        {/* JOUEURS */}
        <section
          className="mt-6 rounded-3xl border p-5 text-black sm:p-7"
          style={{
            borderColor: "rgba(232,117,36,0.4)",
            backgroundColor: CREAM,
          }}
        >
          <SectionHeader
            number="2"
            title="Ajoute les joueurs"
            description="Chaque joueur peut rester invité ou associer son profil YamScore."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {players.map((player, index) => (
              <PlayerCard
                key={player.playerKey}
                label={`Joueur ${index + 1}`}
                player={player}
                currentProfile={currentProfile}
                onChangeName={(value) =>
                  updatePlayerName(
                    player.playerKey,
                    value
                  )
                }
                onAssignCurrentProfile={() =>
                  assignCurrentProfile(
                    player.playerKey
                  )
                }
                onLinkAnotherProfile={() =>
                  void createPlayerLinkToken(
                    player.playerKey
                  )
                }
                isCreatingLink={
                  isCreatingLink &&
                  linkTargetPlayerKey ===
                    player.playerKey
                }
                onRemoveProfile={() =>
                  removeProfile(player.playerKey)
                }
              />
            ))}
          </div>

          <div
            className="mt-5 rounded-2xl border p-4 text-sm font-bold"
            style={{
              borderColor: "#E2C4A7",
              backgroundColor: "#FFF6ED",
              color: BROWN,
            }}
          >
            Ton profil doit être associé à au moins un
            joueur. Les autres participants peuvent rester
            invités.
          </div>
        </section>

        {/* ÉQUIPES */}
        <section
          className="mt-6 rounded-3xl border p-5 text-black sm:p-7"
          style={{
            borderColor: "rgba(232,117,36,0.4)",
            backgroundColor: CREAM,
          }}
        >
          <SectionHeader
            number="3"
            title="Compose les équipes"
            description={
              playerCount === 2
                ? "En 1v1, chaque joueur représente automatiquement une équipe."
                : "Répartis les joueurs manuellement ou laisse YamScore tirer les équipes au sort."
            }
          />

          {playerCount > 2 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <TeamModeButton
                selected={teamMode === "manual"}
                icon="✋"
                title="Manuellement"
                description="Choisis toi-même les coéquipiers."
                onClick={() =>
                  setTeamMode("manual")
                }
              />

              <TeamModeButton
                selected={teamMode === "random"}
                icon="🎲"
                title="Tirage aléatoire"
                description="YamScore forme deux équipes équilibrées."
                onClick={randomizeTeams}
              />
            </div>
          )}

          <DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  onDragCancel={() =>
    setActivePlayerKey(null)
  }
>
  <div className="mt-6 grid gap-5 md:grid-cols-2">
    <TeamDropZone
      team="A"
      title="Équipe A"
      players={teamA}
      locked={playerCount === 2}
    />

    <TeamDropZone
      team="B"
      title="Équipe B"
      players={teamB}
      locked={playerCount === 2}
    />
  </div>

  <DragOverlay>
    {activePlayer ? (
      <DraggedPlayerCard
        player={activePlayer}
      />
    ) : null}
  </DragOverlay>
</DndContext>
        </section>

        {/* RÉSUMÉ */}
        <section
          className="mt-6 rounded-3xl border p-5 sm:p-7"
          style={{
            borderColor: "rgba(232,117,36,0.4)",
            backgroundColor: "#111111",
          }}
        >
          <SectionHeader
            number="4"
            title="Vérifie l’entre-deux"
            description="Tout est prêt pour lancer la compétition."
            dark
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryValue
              label="Format"
              value={`${playerCount / 2}v${
                playerCount / 2
              }`}
            />

            <SummaryValue
              label="Matchs"
              value={String(matchCount)}
            />

            <SummaryValue
              label="Yam"
              value={`${columnMode} colonnes`}
            />
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <TeamSummary
              title="Équipe A"
              players={teamA}
              tone="orange"
            />

            <TeamSummary
              title="Équipe B"
              players={teamB}
              tone="blue"
            />
          </div>

          {!teamsAreBalanced && (
            <Alert tone="error">
              Chaque équipe doit contenir exactement{" "}
              {expectedTeamSize} joueur
              {expectedTeamSize > 1 ? "s" : ""}.
            </Alert>
          )}

          {hasDuplicateProfiles && (
            <Alert tone="error">
              Un même profil est associé à plusieurs
              joueurs.
            </Alert>
          )}

          {!currentUserIsParticipant &&
            currentUserId && (
              <Alert tone="warning">
                Associe ton profil à l’un des joueurs
                avant de créer la compétition.
              </Alert>
            )}

          {errorMessage && (
            <Alert tone="error">
              {errorMessage}
            </Alert>
          )}

          <button
            type="button"
            disabled={!canCreate}
            onClick={() =>
              void createBasketCompetition()
            }
            className="mt-6 w-full rounded-xl px-5 py-4 text-lg font-black text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundColor: BASKET,
            }}
          >
            {isCreating
              ? "Création de la compétition..."
              : "Lancer la compétition"}
          </button>
        </section>
      </div>

      {/* QR CODE */}
      {linkUrl && linkTargetPlayerKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
          <div
            className="w-full max-w-md rounded-3xl border p-6 text-center"
            style={{
              borderColor: BASKET,
              backgroundColor: "#111111",
            }}
          >
            <p
              className="text-sm font-black uppercase tracking-widest"
              style={{
                color: BASKET_LIGHT,
              }}
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
              onClick={closeLinkModal}
              className="mt-5 w-full rounded-xl bg-slate-800 px-4 py-3 font-black text-white transition hover:bg-slate-700"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function BasketCourtBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-20">
      <div
        className="absolute"
        style={{
          left: "5%",
          right: "5%",
          top: "10%",
          bottom: "10%",
          border:
            "3px solid rgba(255,255,255,0.75)",
        }}
      >
        <div
          className="absolute"
          style={{
            left: "50%",
            top: 0,
            bottom: 0,
            width: "3px",
            backgroundColor:
              "rgba(255,255,255,0.75)",
            transform: "translateX(-50%)",
          }}
        />

        <div
          className="absolute rounded-full"
          style={{
            left: "50%",
            top: "50%",
            width: "110px",
            height: "110px",
            border:
              "3px solid rgba(255,255,255,0.75)",
            transform:
              "translate(-50%, -50%)",
          }}
        />

        <div
          className="absolute"
          style={{
            left: 0,
            top: "28%",
            bottom: "28%",
            width: "18%",
            borderTop:
              "3px solid rgba(255,255,255,0.75)",
            borderRight:
              "3px solid rgba(255,255,255,0.75)",
            borderBottom:
              "3px solid rgba(255,255,255,0.75)",
          }}
        />

        <div
          className="absolute"
          style={{
            right: 0,
            top: "28%",
            bottom: "28%",
            width: "18%",
            borderTop:
              "3px solid rgba(255,255,255,0.75)",
            borderLeft:
              "3px solid rgba(255,255,255,0.75)",
            borderBottom:
              "3px solid rgba(255,255,255,0.75)",
          }}
        />
      </div>
    </div>
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
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black text-white"
        style={{
          backgroundColor: BASKET,
        }}
      >
        {number}
      </div>

      <div>
        <h2
          className="text-xl font-black"
          style={{
            color: dark ? "#FFFFFF" : "#000000",
          }}
        >
          {title}
        </h2>

        <p
          className="mt-1 font-bold"
          style={{
            color: dark
              ? "#64748B"
              : "#6D5544",
          }}
        >
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
    <article
      className="rounded-2xl border p-4"
      style={{
        borderColor: "#D9C5AD",
        backgroundColor:
          "rgba(255,255,255,0.6)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black">
          {title}
        </h3>

        <span
          className="text-xs font-bold"
          style={{
            color: "#7A6553",
          }}
        >
          {hint}
        </span>
      </div>

      <div className="mt-4">
        {children}
      </div>
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
      className="rounded-xl border px-3 py-3 font-black text-white transition hover:brightness-125"
      style={{
        borderColor: selected
          ? BASKET
          : "#1E293B",
        backgroundColor: selected
          ? BASKET
          : "#000000",
      }}
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
      className="rounded-xl border px-3 py-3 text-left text-white transition hover:brightness-125"
      style={{
        borderColor: selected
          ? BASKET
          : "#1E293B",
        backgroundColor: selected
          ? BASKET
          : "#000000",
      }}
    >
      <div className="font-black">
        {title}
      </div>

      <div className="mt-1 text-xs font-bold opacity-65">
        {subtitle}
      </div>
    </button>
  );
}

function TeamModeButton({
  selected,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border p-4 text-left transition hover:brightness-105"
      style={{
        borderColor: selected
          ? BASKET
          : "#D0BCA2",
        backgroundColor: selected
          ? "#FFF0E4"
          : "#EBDCCB",
      }}
    >
      <div className="text-2xl">
        {icon}
      </div>

      <div
        className="mt-2 font-black"
        style={{
          color: selected
            ? BASKET_DARK
            : "#241A13",
        }}
      >
        {title}
      </div>

      <div
        className="mt-1 text-sm font-bold"
        style={{
          color: "#6D5544",
        }}
      >
        {description}
      </div>
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
  player: BasketPlayer;
  currentProfile: LinkedProfile | null;
  onChangeName: (value: string) => void;
  onAssignCurrentProfile: () => void;
  onLinkAnotherProfile: () => void;
  isCreatingLink: boolean;
  onRemoveProfile: () => void;
}) {
  const isCurrentProfile =
    currentProfile &&
    player.linkedProfile?.userId ===
      currentProfile.userId;

  return (
    <article
      className="flex h-full flex-col rounded-2xl border p-5 shadow-sm"
      style={{
        borderColor: "#D0BCA2",
        backgroundColor: "#EBDCCB",
      }}
    >
      <p
        className="text-sm font-black uppercase tracking-widest"
        style={{
          color: BASKET,
        }}
      >
        {label}
      </p>

      <label className="mt-4 block">
        <span
          className="text-sm font-black"
          style={{
            color: "#5B4636",
          }}
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
          className="mt-2 w-full rounded-xl border px-4 py-3 font-bold text-black outline-none"
          style={{
            borderColor: "#D0BCA2",
            backgroundColor: "#FBF6EF",
          }}
        />
      </label>

      {player.linkedProfile ? (
        <div
          className="mt-5 rounded-xl border p-4"
          style={{
            borderColor: "#F2C7A5",
            backgroundColor: "#FFF5ED",
          }}
        >
          <div className="flex items-center gap-3">
            <ProfileAvatar
              profile={player.linkedProfile}
            />

            <div className="min-w-0 flex-1">
              <p
                className="font-black"
                style={{
                  color: BASKET_DARK,
                }}
              >
                Profil associé
              </p>

              <p
                className="truncate text-sm font-bold"
                style={{
                  color: "#6D5544",
                }}
              >
                @{player.linkedProfile.username}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRemoveProfile}
            className="mt-4 w-full rounded-xl border bg-white px-4 py-2 text-sm font-black text-black transition hover:bg-slate-100"
            style={{
              borderColor: "#D0BCA2",
            }}
          >
            Retirer le profil
          </button>
        </div>
      ) : (
        <div className="mt-5 flex flex-1 flex-col gap-3">
          {currentProfile && (
            <button
              type="button"
              onClick={onAssignCurrentProfile}
              className="rounded-xl px-4 py-3 font-black text-white transition hover:brightness-110"
              style={{
                backgroundColor: BASKET,
              }}
            >
              Associer mon profil
            </button>
          )}

          <button
            type="button"
            onClick={onLinkAnotherProfile}
            disabled={isCreatingLink}
            className="rounded-xl bg-black px-4 py-3 font-black text-white transition hover:brightness-125 disabled:opacity-50"
          >
            {isCreatingLink
              ? "Création du lien..."
              : "Associer un autre profil"}
          </button>

          <p
            className="text-center text-xs font-bold"
            style={{
              color: "#6D5544",
            }}
          >
            Le joueur peut également rester invité.
          </p>
        </div>
      )}

      {isCurrentProfile && (
        <p
          className="mt-3 text-center text-xs font-black"
          style={{
            color: BASKET_DARK,
          }}
        >
          ✓ Ton profil
        </p>
      )}
    </article>
  );
}

function TeamDropZone({
  team,
  title,
  players,
  locked,
}: {
  team: TeamId;
  title: string;
  players: BasketPlayer[];
  locked: boolean;
}) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: `team-${team}`,
    disabled: locked,
  });

  const isTeamA = team === "A";

  const color = isTeamA
    ? BASKET
    : "#2563EB";

  return (
    <article
      className="overflow-hidden rounded-2xl border transition"
      style={{
        borderColor: isOver
          ? "#FFFFFF"
          : color,
        backgroundColor: "#FFFFFF",
        boxShadow: isOver
          ? `0 0 0 3px ${color}`
          : "none",
      }}
    >
      <div
        className="px-5 py-4 text-white"
        style={{
          backgroundColor: color,
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black">
            {isTeamA ? "🟠" : "🔵"}{" "}
            {title}
          </h3>

          <span className="text-sm font-black text-white/70">
            {players.length} joueur
            {players.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="min-h-[170px] space-y-3 p-4"
        style={{
          backgroundColor: isOver
            ? isTeamA
              ? "#FFF4EB"
              : "#EFF6FF"
            : "#FFFFFF",
        }}
      >
        <SortableContext
          items={players.map(
            (player) => player.playerKey
          )}
          strategy={
            verticalListSortingStrategy
          }
        >
          {players.map((player) => (
            <SortablePlayerCard
              key={player.playerKey}
              player={player}
              team={team}
              locked={locked}
            />
          ))}
        </SortableContext>

        {players.length === 0 && (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-sm font-bold text-slate-400">
            Glisse un joueur ici
          </div>
        )}

        {!locked && (
          <div className="pt-1 text-center text-xs font-bold text-slate-400">
            Glisse les joueurs pour modifier
            les équipes
          </div>
        )}
      </div>
    </article>
  );
}

function SortablePlayerCard({
  player,
  team,
  locked,
}: {
  player: BasketPlayer;
  team: TeamId;
  locked: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: player.playerKey,
    disabled: locked,
  });

  const style = {
    transform: CSS.Transform.toString(
      transform
    ),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const color =
    team === "A"
      ? BASKET
      : "#2563EB";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        locked
          ? "cursor-default"
          : "cursor-grab active:cursor-grabbing",
      ].join(" ")}
    >
      {player.linkedProfile?.avatarUrl ? (
  <img
    src={player.linkedProfile.avatarUrl}
    alt=""
    className="h-9 w-9 shrink-0 rounded-full object-cover"
  />
) : (
  <div
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black text-white"
    style={{
      backgroundColor: color,
    }}
  >
    {player.name.charAt(0).toUpperCase()}
  </div>
)}

      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-black">
          {player.name || "Joueur"}
        </p>

        <p className="mt-1 truncate text-xs font-bold text-slate-500">
          {player.linkedProfile
            ? `@${player.linkedProfile.username}`
            : "Invité"}
        </p>
      </div>

      {!locked && (
        <span className="text-xl text-slate-400">
          ⋮⋮
        </span>
      )}
    </div>
  );
}

function DraggedPlayerCard({
  player,
}: {
  player: BasketPlayer;
}) {
  const color =
    player.team === "A"
      ? BASKET
      : "#2563EB";

  return (
    <div
      className="flex w-[280px] items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-2xl"
      style={{
        borderColor: color,
      }}
    >
      {player.linkedProfile?.avatarUrl ? (
  <img
    src={player.linkedProfile.avatarUrl}
    alt=""
    className="h-9 w-9 shrink-0 rounded-full object-cover"
  />
) : (
  <div
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black text-white"
    style={{
      backgroundColor: color,
    }}
  >
    {player.name.charAt(0).toUpperCase()}
  </div>
)}

      <div>
        <p className="font-black text-black">
          {player.name}
        </p>

        <p className="text-xs font-bold text-slate-500">
          {player.linkedProfile
            ? `@${player.linkedProfile.username}`
            : "Invité"}
        </p>
      </div>
    </div>
  );
}
function TeamSummary({
  title,
  players,
  tone,
}: {
  title: string;
  players: BasketPlayer[];
  tone: "orange" | "blue";
}) {
  const color =
    tone === "orange"
      ? BASKET
      : "#2563EB";

  return (
    <div
      className="rounded-2xl border bg-black p-5"
      style={{
        borderColor: color,
      }}
    >
      <h3
        className="text-center text-lg font-black"
        style={{
          color,
        }}
      >
        {tone === "orange" ? "🟠" : "🔵"}{" "}
        {title}
      </h3>

      <div className="mt-4 space-y-2">
        {players.map((player) => (
          <div
            key={player.playerKey}
            className="rounded-xl bg-slate-900 px-4 py-3 text-center"
          >
            <p className="font-black text-white">
              {player.name || "À définir"}
            </p>

            <p className="mt-1 text-xs font-bold text-slate-500">
              {player.linkedProfile
                ? `@${player.linkedProfile.username}`
                : "Invité"}
            </p>
          </div>
        ))}
      </div>
    </div>
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
      style={{
        backgroundColor: BASKET,
      }}
    >
      {profile.username
        .charAt(0)
        .toUpperCase()}
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
      className="rounded-xl p-4 text-center text-white"
      style={{
        backgroundColor: "#3A1E0D",
      }}
    >
      <p className="text-xs uppercase tracking-widest text-white/55">
        {label}
      </p>

      <p className="mt-1 text-lg font-black">
        {value}
      </p>
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
  const isError = tone === "error";

  return (
    <div
      className="mt-5 rounded-xl border p-4 font-bold"
      style={{
        borderColor: isError
          ? "#EF4444"
          : "#F59E0B",
        backgroundColor: isError
          ? "rgba(239,68,68,0.1)"
          : "rgba(245,158,11,0.1)",
        color: isError
          ? "#FCA5A5"
          : "#FCD34D",
      }}
    >
      {children}
    </div>
  );
}

function createEmptyPlayers(
  count: number
): BasketPlayer[] {
  return Array.from(
    { length: count },
    (_, index) => ({
      playerKey: `player-${index + 1}`,
      name: `Joueur ${index + 1}`,
      linkedProfile: null,
      team: index % 2 === 0 ? "A" : "B",
    })
  );
}

function formatPlayerName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  return (
    trimmed.charAt(0).toUpperCase() +
    trimmed.slice(1)
  );
}