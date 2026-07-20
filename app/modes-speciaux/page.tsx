"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthButton from "../components/AuthButton";
import { supabase } from "../lib/supabase";

type CompetitionStatus = "in_progress" | "finished" | "abandoned";

type TournamentTheme =
  | "australian_open"
  | "roland_garros"
  | "wimbledon"
  | "us_open";

type Competition = {
  id: string;
  competition_type: string;
  theme: TournamentTheme;
  status: CompetitionStatus;
  column_mode: 3 | 6;
  wins_required: number;
  winner_player_id: string | null;
  current_round_number: number | null;
  current_play_mode: "local" | "salon" | null;
  created_at: string;
  finished_at: string | null;
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_order: number;
  player_name: string;
  profile_id: string | null;
  avatar_url: string | null;
  sets_won: number;
};

type CompetitionWithPlayers = Competition & {
  players: CompetitionPlayer[];
};

const TOURNAMENTS: Record<
  TournamentTheme,
  {
    name: string;
    icon: string;
    backgroundClass: string;
    borderClass: string;
  }
> = {
  australian_open: {
    name: "Open d’Australie",
    icon: "🇦🇺",
    backgroundClass: "bg-[#1779BA]",
    borderClass: "border-[#65BFEA]",
  },
  roland_garros: {
    name: "Roland-Garros",
    icon: "🟠",
    backgroundClass: "bg-[#B85632]",
    borderClass: "border-[#E49369]",
  },
  wimbledon: {
    name: "Wimbledon",
    icon: "🌿",
    backgroundClass: "bg-[#315B40]",
    borderClass: "border-[#7AA987]",
  },
  us_open: {
    name: "US Open",
    icon: "🇺🇸",
    backgroundClass: "bg-[#183B73]",
    borderClass: "border-[#668AC5]",
  },
};

export default function SpecialModesPage() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [competitions, setCompetitions] = useState<
    CompetitionWithPlayers[]
  >([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [competitionsError, setCompetitionsError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadCompetitions() {
      setLoadingCompetitions(true);
      setCompetitionsError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Erreur utilisateur", userError);
        setCompetitionsError(
          "Impossible de vérifier le profil connecté."
        );
        setLoadingCompetitions(false);
        return;
      }

      setCurrentUserId(user?.id ?? null);

      if (!user) {
        setCompetitions([]);
        setLoadingCompetitions(false);
        return;
      }

      /*
        Première requête :
        retrouver les compétitions auxquelles le profil participe.
      */
      const {
        data: participantRows,
        error: participantError,
      } = await supabase
        .from("competition_players")
        .select("competition_id")
        .eq("profile_id", user.id);

      if (participantError) {
        console.error("Erreur recherche compétitions du profil", {
          message: participantError.message,
          details: participantError.details,
          hint: participantError.hint,
          code: participantError.code,
        });

        setCompetitionsError(
          "Impossible de charger tes compétitions."
        );
        setLoadingCompetitions(false);
        return;
      }

      const competitionIds = Array.from(
        new Set(
          (participantRows ?? []).map(
            (row) => row.competition_id as string
          )
        )
      );

      if (competitionIds.length === 0) {
        setCompetitions([]);
        setLoadingCompetitions(false);
        return;
      }

      /*
        Deuxième requête :
        charger les compétitions concernées.
      */
      const {
        data: competitionRows,
        error: competitionsRequestError,
      } = await supabase
        .from("competitions")
        .select(
          `
          id,
          competition_type,
          theme,
          status,
          column_mode,
          wins_required,
          winner_player_id,
          current_round_number,
          current_play_mode,
          created_at,
          finished_at
          `
        )
        .in("id", competitionIds)
        .eq("competition_type", "grand_slam_final")
        .order("created_at", { ascending: false });

      if (competitionsRequestError) {
        console.error("Erreur chargement compétitions", {
          message: competitionsRequestError.message,
          details: competitionsRequestError.details,
          hint: competitionsRequestError.hint,
          code: competitionsRequestError.code,
        });

        setCompetitionsError(
          "Impossible de charger les finales."
        );
        setLoadingCompetitions(false);
        return;
      }

      /*
        Troisième requête :
        charger les deux joueurs de chaque finale.
      */
      const {
        data: playerRows,
        error: playersError,
      } = await supabase
        .from("competition_players")
        .select(
          `
          id,
          competition_id,
          player_order,
          player_name,
          profile_id,
          avatar_url,
          sets_won
          `
        )
        .in("competition_id", competitionIds)
        .order("player_order", { ascending: true });

      if (playersError) {
        console.error("Erreur chargement joueurs des compétitions", {
          message: playersError.message,
          details: playersError.details,
          hint: playersError.hint,
          code: playersError.code,
        });

        setCompetitionsError(
          "Impossible de charger les participants."
        );
        setLoadingCompetitions(false);
        return;
      }

      const competitionsWithPlayers = (
        (competitionRows ?? []) as Competition[]
      ).map((competition) => ({
        ...competition,
        players: ((playerRows ?? []) as CompetitionPlayer[]).filter(
          (player) =>
            player.competition_id === competition.id
        ),
      }));

      setCompetitions(competitionsWithPlayers);
      setLoadingCompetitions(false);
    }

    void loadCompetitions();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadCompetitions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const activeCompetitions = useMemo(
    () =>
      competitions.filter(
        (competition) => competition.status === "in_progress"
      ),
    [competitions]
  );
const abandonedCompetitions = useMemo(
  () =>
    competitions
      .filter(
        (competition) => competition.status === "abandoned"
      )
      .slice(0, 3),
  [competitions]
);
  const recentFinishedCompetitions = useMemo(
    () =>
      competitions
        .filter(
          (competition) => competition.status === "finished"
        )
        .slice(0, 3),
    [competitions]
  );

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black px-4 py-8 text-white">
      <AuthButton />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
        <Image
          src="/favicon.png"
          alt=""
          width={1000}
          height={1000}
          className="select-none rotate-[-12deg]"
          priority
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-xl border border-[#9B6A28]/60 bg-black px-4 py-2 font-black text-white transition hover:bg-[#241A13]"
        >
          Retour
        </button>

        <header className="mt-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#C44934]">
            YamScore
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Modes spéciaux
          </h1>

          <p className="mx-auto mt-4 max-w-2xl font-bold text-slate-400">
            Enchaîne plusieurs parties de Yam dans des compétitions
            persistantes et reprends-les sur plusieurs jours.
          </p>
        </header>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              router.push("/modes-speciaux/grand-chelem")
            }
            className="group overflow-hidden rounded-3xl border border-[#9B6A28]/60 bg-[#F4E9DC] text-left text-black transition hover:-translate-y-1 hover:border-[#C44934]"
          >
            <div className="relative h-48 overflow-hidden bg-[#315B40]">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute left-1/2 top-0 h-full w-px bg-white" />
                <div className="absolute left-0 top-1/2 h-px w-full bg-white" />
                <div className="absolute left-1/2 top-1/2 h-24 w-36 -translate-x-1/2 -translate-y-1/2 border border-white" />
              </div>

              <div className="absolute inset-0 flex items-center justify-center text-7xl transition group-hover:scale-110">
                🎾
              </div>

              <div className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-black uppercase text-white">
                Disponible
              </div>
            </div>

            <div className="p-6">
              <p className="text-xs font-black uppercase tracking-widest text-[#C44934]">
                2 joueurs
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Finale de Grand Chelem
              </h2>

              <p className="mt-3 font-bold text-[#5B4636]">
                Chaque partie de Yam représente un set. Le premier joueur
                à remporter trois sets gagne la finale.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-sm font-black">
                <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
                  3 à 5 parties
                </span>

                <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
                  Local ou Salon
                </span>

                <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
                  Reprise possible
                </span>
              </div>

              <div className="mt-6 font-black text-[#C44934]">
                Découvrir le mode 👆
              </div>
            </div>
          </button>

          <div className="rounded-3xl border border-dashed border-slate-700 bg-[#111111] p-6 opacity-70">
            <div className="flex h-48 items-center justify-center text-7xl">
              🏆
            </div>

            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Prochainement
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Coupe du monde
            </h2>

            <p className="mt-3 font-bold text-slate-500">
              Plusieurs joueurs, un tableau généré aléatoirement et des
              matchs à élimination directe.
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-[#9B6A28]/40 bg-[#111111] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">
                Compétitions en cours
              </h2>

              <p className="mt-2 font-bold text-slate-500">
                Les finales liées à ton profil apparaissent ici.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/modes-speciaux/grand-chelem/nouveau"
                )
              }
              className="rounded-xl bg-[#C44934] px-4 py-3 text-sm font-black text-white transition hover:bg-[#D75A43]"
            >
              Créer une finale
            </button>
          </div>

          {!currentUserId ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-700 p-6 text-center">
              <p className="font-black text-white">
                Connecte-toi pour retrouver tes compétitions.
              </p>

              <p className="mt-2 text-sm font-bold text-slate-500">
                Une compétition est accessible depuis chaque profil
                participant.
              </p>
            </div>
          ) : loadingCompetitions ? (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-black p-6 text-center font-bold text-slate-400">
              Chargement des compétitions...
            </div>
          ) : competitionsError ? (
            <div className="mt-5 rounded-2xl border border-red-500/50 bg-red-500/10 p-6 text-center font-bold text-red-300">
              {competitionsError}
            </div>
          ) : activeCompetitions.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-700 p-6 text-center font-bold text-slate-500">
              Aucune compétition en cours
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {activeCompetitions.map((competition) => (
                <CompetitionCard
                  key={competition.id}
                  competition={competition}
                  onOpen={() =>
                    router.push(
                      `/modes-speciaux/grand-chelem/${competition.id}`
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>

        {recentFinishedCompetitions.length > 0 && (
          <section className="mt-6 rounded-3xl border border-slate-800 bg-[#111111] p-6">
            <h2 className="text-xl font-black">
              Compétitions récemment terminées
            </h2>

            <div className="mt-5 space-y-3">
              {recentFinishedCompetitions.map((competition) => (
                <CompetitionCard
                  key={competition.id}
                  competition={competition}
                  onOpen={() =>
                    router.push(
                      `/modes-speciaux/grand-chelem/${competition.id}`
                    )
                  }
                />
              ))}
            </div>
          </section>
        )}
        {abandonedCompetitions.length > 0 && (
  <section className="mt-6 rounded-3xl border border-red-500/20 bg-[#111111] p-6">
    <h2 className="text-xl font-black">
      Compétitions abandonnées
    </h2>

    <p className="mt-2 font-bold text-slate-500">
      Ces compétitions ne peuvent plus être reprises.
    </p>

    <div className="mt-5 space-y-3">
      {abandonedCompetitions.map((competition) => (
        <CompetitionCard
          key={competition.id}
          competition={competition}
          onOpen={() =>
            router.push(
              `/modes-speciaux/grand-chelem/${competition.id}`
            )
          }
        />
      ))}
    </div>
  </section>
)}
      </div>
    </main>
  );
}

function CompetitionCard({
  competition,
  onOpen,
}: {
  competition: CompetitionWithPlayers;
  onOpen: () => void;
}) {
  const tournament = TOURNAMENTS[competition.theme];

  const player1 =
    competition.players.find(
      (player) => player.player_order === 1
    ) ?? null;

  const player2 =
    competition.players.find(
      (player) => player.player_order === 2
    ) ?? null;

  const completedSets =
    (player1?.sets_won ?? 0) + (player2?.sets_won ?? 0);

  const nextSetNumber = completedSets + 1;

  const isFinished = competition.status === "finished";
  const hasSetInProgress =
    competition.current_round_number !== null &&
    competition.current_play_mode !== null;

  const isAbandoned = competition.status === "abandoned";

const buttonLabel = isFinished
  ? "Voir la finale"
  : isAbandoned
    ? "Voir la finale"
    : hasSetInProgress
      ? `Reprendre le set ${competition.current_round_number}`
      : completedSets === 0
        ? "Commencer la finale"
        : `Jouer le set ${nextSetNumber}`;

  return (
    <article
      className={[
        "overflow-hidden rounded-2xl border",
        tournament.borderClass,
        tournament.backgroundClass,
      ].join(" ")}
    >
      <div className="bg-black/30 p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="text-3xl">{tournament.icon}</div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
                Finale de Grand Chelem
              </p>

              <h3 className="truncate text-xl font-black">
                {tournament.name}
              </h3>

              <p className="mt-1 text-sm font-bold text-white/65">
                {competition.column_mode} colonnes
              </p>
            </div>
          </div>

          <CompetitionStatusBadge
            competition={competition}
          />
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <CompetitionPlayerSummary
            player={player1}
            align="left"
          />

          <div className="rounded-xl bg-black/35 px-4 py-2 text-center">
            <p className="text-2xl font-black">
              {player1?.sets_won ?? 0}–
              {player2?.sets_won ?? 0}
            </p>

            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
              Sets
            </p>
          </div>

          <CompetitionPlayerSummary
            player={player2}
            align="right"
          />
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="mt-5 w-full rounded-xl bg-[#F4E9DC] px-4 py-3 font-black text-black transition hover:bg-white"
        >
          {buttonLabel}
        </button>
      </div>
    </article>
  );
}

function CompetitionStatusBadge({
  competition,
}: {
  competition: Competition;
}) {
  if (competition.status === "finished") {
    return (
      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black uppercase text-emerald-200">
        Terminée
      </span>
    );
  }

  if (competition.status === "abandoned") {
    return (
      <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-black uppercase text-red-200">
        Abandonnée
      </span>
    );
  }

  if (
    competition.current_round_number &&
    competition.current_play_mode
  ) {
    return (
      <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black uppercase text-amber-200">
        Set {competition.current_round_number} en cours
      </span>
    );
  }

  return (
    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase text-white/80">
      À continuer
    </span>
  );
}

function CompetitionPlayerSummary({
  player,
  align,
}: {
  player: CompetitionPlayer | null;
  align: "left" | "right";
}) {
  return (
    <div
      className={[
        "min-w-0",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center gap-2",
          align === "right" ? "justify-end" : "justify-start",
        ].join(" ")}
      >
        {align === "left" && <SmallAvatar player={player} />}

        <p className="truncate font-black">
          {player?.player_name ?? "Joueur"}
        </p>

        {align === "right" && <SmallAvatar player={player} />}
      </div>

      <p className="mt-1 text-xs font-bold text-white/55">
        {player?.profile_id ? "Profil associé" : "Invité"}
      </p>
    </div>
  );
}

function SmallAvatar({
  player,
}: {
  player: CompetitionPlayer | null;
}) {
  if (player?.avatar_url) {
    return (
      <img
        src={player.avatar_url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-white/30 object-cover"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/30 text-sm font-black">
      {player?.player_name?.charAt(0).toUpperCase() ?? "?"}
    </div>
  );
}