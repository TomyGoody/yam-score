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
  | "us_open"
  | "world_cup";

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
  matches: CompetitionMatchSummary[];
};
type CompetitionMatchSummary = {
  competition_id: string;
  round_number: number;
  status: "waiting" | "ready" | "playing" | "finished";
};
const TOURNAMENTS: Record<
  TournamentTheme,
  {
  name: string;
  logo: string;
  backgroundClass: string;
  borderClass: string;
}
> = {
  australian_open: {
  name: "Open d’Australie",
  logo: "/australian-open-logo.png",
  backgroundClass: "bg-[#1779BA]",
  borderClass: "border-[#65BFEA]",
},

roland_garros: {
  name: "Roland-Garros",
  logo: "/roland-garros-logo.png",
  backgroundClass: "bg-[#B85632]",
  borderClass: "border-[#E49369]",
},

wimbledon: {
  name: "Wimbledon",
  logo: "/wimbledon-logo.png",
  backgroundClass: "bg-[#315B40]",
  borderClass: "border-[#7AA987]",
},

us_open: {
  name: "US Open",
  logo: "/us-open-logo.png",
  backgroundClass: "bg-[#183B73]",
  borderClass: "border-[#668AC5]",
},

world_cup: {
  name: "Coupe du Monde",
  logo: "/world-cup-trophy.png",
  backgroundClass:
    "bg-gradient-to-br from-[#0D7A46] via-[#0B6B3A] to-[#084B29]",
  borderClass: "border-[#22A866]",
},
};
type SpecialModesTab =
  | "new"
  | "active"
  | "finished"
  | "abandoned";
export default function SpecialModesPage() {
  const router = useRouter();
const [activeTab, setActiveTab] =
  useState<SpecialModesTab>("new");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [competitions, setCompetitions] = useState<
    CompetitionWithPlayers[]
  >([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [competitionsError, setCompetitionsError] =
    useState<string | null>(null);
const ITEMS_PER_PAGE = 10;

const [finishedPage, setFinishedPage] = useState(1);
const [abandonedPage, setAbandonedPage] = useState(1);
  useEffect(() => {
    async function loadCompetitions() {
      setLoadingCompetitions(true);
      setCompetitionsError(null);

      const {
  data: { session },
  error: sessionError,
} = await supabase.auth.getSession();

if (sessionError) {
  console.error(
    "Erreur récupération session",
    sessionError
  );

  setCompetitionsError(
    "Impossible de vérifier le profil connecté."
  );

  setLoadingCompetitions(false);
  return;
}

const user = session?.user ?? null;

setCurrentUserId(user?.id ?? null);

if (!user) {
  setCompetitions([]);
  setCompetitionsError(null);
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
        .in("competition_type", [
  "grand_slam_final",
  "world_cup",
])
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
const {
  data: matchRows,
  error: matchesError,
} = await supabase
  .from("competition_matches")
  .select(
    `
    competition_id,
    round_number,
    status
    `
  )
  .in("competition_id", competitionIds);

if (matchesError) {
  console.error(
    "Erreur chargement matchs des compétitions",
    {
      message: matchesError.message,
      details: matchesError.details,
      hint: matchesError.hint,
      code: matchesError.code,
    }
  );

  setCompetitionsError(
    "Impossible de charger la progression des compétitions."
  );

  setLoadingCompetitions(false);
  return;
}
      const competitionsWithPlayers = (
  (competitionRows ?? []) as Competition[]
).map((competition) => ({
  ...competition,

  players: (
    (playerRows ?? []) as CompetitionPlayer[]
  ).filter(
    (player) =>
      player.competition_id === competition.id
  ),

  matches: (
    (matchRows ?? []) as CompetitionMatchSummary[]
  ).filter(
    (match) =>
      match.competition_id === competition.id
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

const competitionsChannel = supabase
  .channel("special_modes_competitions")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "competitions",
    },
    () => {
      void loadCompetitions();
    }
  )
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "competition_matches",
    },
    () => {
      void loadCompetitions();
    }
  )
  .subscribe();

return () => {
  subscription.unsubscribe();
  void supabase.removeChannel(competitionsChannel);
};
  }, []);

  const activeCompetitions = useMemo(
    () =>
      competitions.filter(
        (competition) => competition.status === "in_progress"
      ),
    [competitions]
  );
const finishedCompetitions = useMemo(
  () =>
    competitions.filter(
      (competition) => competition.status === "finished"
    ),
  [competitions]
);

const abandonedCompetitions = useMemo(
  () =>
    competitions.filter(
      (competition) => competition.status === "abandoned"
    ),
  [competitions]
);
const finishedPageCount = Math.max(
  1,
  Math.ceil(finishedCompetitions.length / ITEMS_PER_PAGE)
);

const abandonedPageCount = Math.max(
  1,
  Math.ceil(abandonedCompetitions.length / ITEMS_PER_PAGE)
);

const visibleFinishedCompetitions =
  finishedCompetitions.slice(
    (finishedPage - 1) * ITEMS_PER_PAGE,
    finishedPage * ITEMS_PER_PAGE
  );

const visibleAbandonedCompetitions =
  abandonedCompetitions.slice(
    (abandonedPage - 1) * ITEMS_PER_PAGE,
    abandonedPage * ITEMS_PER_PAGE
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
<nav className="mt-8 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-[#111111] p-2 md:grid-cols-4">
  {[
    {
      id: "new" as const,
      label: "Nouvelle compétition",
    },
    {
      id: "active" as const,
      label: `En cours (${activeCompetitions.length})`,
    },
    {
      id: "finished" as const,
      label: `Terminées (${finishedCompetitions.length})`,
    },
    {
      id: "abandoned" as const,
      label: `Abandonnées (${abandonedCompetitions.length})`,
    },
  ].map((tab) => {
    const selected = activeTab === tab.id;

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setActiveTab(tab.id)}
        className={[
          "rounded-xl px-4 py-3 text-sm font-black transition",
          selected
            ? "bg-[#F4E9DC] text-black"
            : "text-slate-400 hover:bg-white/5 hover:text-white",
        ].join(" ")}
      >
        {tab.label}
      </button>
    );
  })}
</nav>
{activeTab === "new" && (
       <section className="mt-8 grid items-stretch gap-5 md:grid-cols-2">
  {/* Grand Chelem */}
  <button
  type="button"
  onClick={() =>
    router.push("/modes-speciaux/grand-chelem")
  }
  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#C44934]/70 bg-[#F4E9DC] text-left text-black transition hover:-translate-y-1 hover:border-[#D75A43]"
>
  <div
  className="relative h-48 overflow-hidden"
  style={{ backgroundColor: "#B85632" }}
>
  {/* Rectangle extérieur */}
  <div
    className="absolute border-2 border-white"
    style={{
      left: "10%",
      right: "10%",
      top: "15%",
      bottom: "15%",
    }}
  >
    {/* Ligne du haut (couloir) */}
    <div
      className="absolute left-0 right-0 border-t-2 border-white"
      style={{ top: "12%" }}
    />

    {/* Ligne du bas (couloir) */}
    <div
      className="absolute left-0 right-0 border-b-2 border-white"
      style={{ bottom: "12%" }}
    />
{/* Ligne de double haute */}
<div
  className="absolute bg-white"
  style={{
    left: 0,
    right: 0,
    top: "10%",
    height: "2px",
  }}
/>

{/* Ligne de double basse */}
<div
  className="absolute bg-white"
  style={{
    left: 0,
    right: 0,
    bottom: "10%",
    height: "2px",
  }}
/>
    {/* Filet */}
    <div
      className="absolute bg-white"
      style={{
        left: "50%",
        top: "-8px",
        bottom: "-8px",
        width: "2px",
        transform: "translateX(-50%)",
      }}
    />

    {/* Ligne de service gauche */}
    <div
      className="absolute bg-white"
      style={{
        left: "25%",
        top: "12%",
        bottom: "12%",
        width: "2px",
      }}
    />

    {/* Ligne de service droite */}
    <div
      className="absolute bg-white"
      style={{
        right: "25%",
        top: "12%",
        bottom: "12%",
        width: "2px",
      }}
    />

    {/* Ligne centrale de service */}
<div
  className="absolute bg-white"
  style={{
    left: "25%",
    right: "25%",
    top: "50%",
    height: "2px",
    transform: "translateY(-50%)",
  }}
/>
  </div>

  {/* Raquette */}
  <div className="absolute inset-0 flex items-center justify-center text-7xl group-hover:scale-110">
    🎾
  </div>

  <div className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-black uppercase text-white">
    Disponible
  </div>
</div>

  {/* Contenu */}
  <div className="flex flex-1 flex-col p-6">
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-[#C44934]">
        2 joueurs
      </p>

      <h2 className="mt-2 text-2xl font-black">
        Finale de Grand Chelem
      </h2>

      <p className="mt-3 font-bold leading-relaxed text-[#5B4636]">
        Chaque partie de Yam représente un set. Le premier joueur à
        remporter trois sets gagne la finale.
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm font-black">
        <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
          3 à 5 parties
        </span>

        <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
          1 Vs 1
        </span>

        <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
          4 thèmes différents
        </span>
      </div>
    </div>

    <div className="mt-10 pt-10 font-black text-[#C44934]">
      Découvrir le mode 👆
    </div>
  </div>
</button>
  {/* Coupe du Monde */}
  <button
    type="button"
    onClick={() =>
      router.push("/modes-speciaux/coupe-du-monde")
    }
    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#0B5D35]/70 bg-[#F4E9DC] text-left text-black transition hover:-translate-y-1 hover:border-[#15965B]"
  >
   <div
  className="relative h-48 shrink-0 overflow-hidden"
  style={{ backgroundColor: "#0B6B3A" }}
>
  {/* Limites du terrain */}
  <div
    className="absolute border-2 border-white"
    style={{
      left: "8%",
      right: "8%",
      top: "12%",
      bottom: "12%",
    }}
  >
    {/* Ligne médiane */}
    <div
      className="absolute bg-white"
      style={{
        left: "50%",
        top: 0,
        bottom: 0,
        width: "2px",
        transform: "translateX(-50%)",
      }}
    />

    {/* Rond central */}
    <div
      className="absolute rounded-full border-2 border-white"
      style={{
        left: "50%",
        top: "50%",
        width: "80px",
        height: "80px",
        transform: "translate(-50%, -50%)",
      }}
    />

    {/* Point central */}
    <div
      className="absolute rounded-full bg-white"
      style={{
        left: "50%",
        top: "50%",
        width: "5px",
        height: "5px",
        transform: "translate(-50%, -50%)",
      }}
    />

    {/* Surface de réparation gauche */}
<div
  className="absolute"
  style={{
    left: 0,
    top: "24%",
    bottom: "24%",
    width: "12%",
    borderTop: "2px solid white",
    borderRight: "2px solid white",
    borderBottom: "2px solid white",
  }}
/>

{/* Surface de réparation droite */}
<div
  className="absolute"
  style={{
    right: 0,
    top: "24%",
    bottom: "24%",
    width: "12%",
    borderTop: "2px solid white",
    borderLeft: "2px solid white",
    borderBottom: "2px solid white",
  }}
/>

{/* Corner haut gauche */}
<div
  className="absolute"
  style={{
    left: 0,
    top: 0,
    width: "16px",
    height: "16px",
    borderRight: "2px solid white",
    borderBottom: "2px solid white",
    borderBottomRightRadius: "16px",
  }}
/>

{/* Corner bas gauche */}
<div
  className="absolute"
  style={{
    left: 0,
    bottom: 0,
    width: "16px",
    height: "16px",
    borderRight: "2px solid white",
    borderTop: "2px solid white",
    borderTopRightRadius: "16px",
  }}
/>

{/* Corner haut droit */}
<div
  className="absolute"
  style={{
    right: 0,
    top: 0,
    width: "16px",
    height: "16px",
    borderLeft: "2px solid white",
    borderBottom: "2px solid white",
    borderBottomLeftRadius: "16px",
  }}
/>

{/* Corner bas droit */}
<div
  className="absolute"
  style={{
    right: 0,
    bottom: 0,
    width: "16px",
    height: "16px",
    borderLeft: "2px solid white",
    borderTop: "2px solid white",
    borderTopLeftRadius: "16px",
  }}
/>
  </div>

  <div className="absolute inset-0 flex items-center justify-center text-7xl transition group-hover:scale-110">
    ⚽
  </div>

  <div className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-black uppercase text-white">
    Disponible
  </div>
</div>

    <div className="flex flex-1 flex-col p-6">
      <div>
        <p
  className="text-xs font-black uppercase tracking-widest"
  style={{ color: "#0B6B3A" }}
>
  4 à 16 joueurs
</p>
        <h2 className="mt-2 text-2xl font-black">
          Coupe du Monde
        </h2>

        <p className="mt-3 font-bold leading-relaxed text-[#5B4636]">
          Un tournoi à élimination directe avec un tableau généré
          aléatoirement et des qualifications automatiques.
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-sm font-black">
          <span
            className="rounded-full px-3 py-1 text-white"
            style={{ backgroundColor: "#241A13" }}
          >
            Élim. directe
          </span>

          <span
            className="rounded-full px-3 py-1 text-white"
            style={{ backgroundColor: "#241A13" }}
          >
            Tableau aléatoire
          </span>

          <span
            className="rounded-full px-3 py-1 text-white"
            style={{ backgroundColor: "#241A13" }}
          >
            1 partie par tour
          </span>
        </div>
      </div>
<p
  className="mt-10 pt-10 font-black"
  style={{ color: "#0B6B3A" }}
>
  Découvrir le mode 👆
</p>
      
    </div>
  </button>
</section>
)}
{activeTab === "active" && (
        <section className="mt-10 rounded-3xl border border-[#9B6A28]/40 bg-[#111111] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">
                Compétitions en cours
              </h2>

              <p className="mt-2 font-bold text-slate-500">
                Retrouve toutes les compétitions liées à ton profil.
              </p>
            </div>

            
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
              {activeCompetitions.map((competition) =>
  competition.competition_type === "world_cup" ? (
    <WorldCupCompetitionCard
      key={competition.id}
      competition={competition}
      onOpen={() =>
        router.push(
          `/modes-speciaux/coupe-du-monde/${competition.id}`
        )
      }
    />
  ) : (
    <CompetitionCard
      key={competition.id}
      competition={competition}
      onOpen={() =>
        router.push(
          `/modes-speciaux/grand-chelem/${competition.id}`
        )
      }
    />
  )
)}
            </div>
          )}
        </section>
)}
        {activeTab === "finished" && (
          
  <section className="mt-6 rounded-3xl border border-slate-800 bg-[#111111] p-6">
    <h2 className="text-xl font-black">
  Compétitions terminées
</h2>
{finishedCompetitions.length === 0 ? (
  <div className="mt-5 rounded-2xl border border-dashed border-slate-700 p-6 text-center font-bold text-slate-500">
    Aucune compétition terminée récemment
  </div>
) : (
  <div className="mt-5 space-y-3">
    {/* ton map actuel */}
  </div>
)}
    <div className="mt-5 space-y-3">
      {visibleFinishedCompetitions.map((competition) =>
        competition.competition_type === "world_cup" ? (
          <WorldCupCompetitionCard
            key={competition.id}
            competition={competition}
            onOpen={() =>
              router.push(
                `/modes-speciaux/coupe-du-monde/${competition.id}`
              )
            }
          />
        ) : (
          <CompetitionCard
            key={competition.id}
            competition={competition}
            onOpen={() =>
              router.push(
                `/modes-speciaux/grand-chelem/${competition.id}`
              )
            }
          />
        )
      )}
    </div>
    {finishedPageCount > 1 && (
  <div className="mt-6 flex items-center justify-between gap-3">
    <button
      type="button"
      disabled={finishedPage === 1}
      onClick={() =>
        setFinishedPage((page) => Math.max(1, page - 1))
      }
      className="rounded-xl border border-slate-700 bg-black px-4 py-2 font-black text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Précédent
    </button>

    <span className="text-sm font-black text-slate-400">
      Page {finishedPage} / {finishedPageCount}
    </span>

    <button
      type="button"
      disabled={finishedPage === finishedPageCount}
      onClick={() =>
        setFinishedPage((page) =>
          Math.min(finishedPageCount, page + 1)
        )
      }
      className="rounded-xl border border-slate-700 bg-black px-4 py-2 font-black text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Suivant
    </button>
  </div>
)}
  </section>
)}
        {activeTab === "abandoned" && (
  <section className="mt-6 rounded-3xl border border-red-500/20 bg-[#111111] p-6">
    <h2 className=" text-xl font-black">
      Compétitions abandonnées
    </h2>

    <p className="mt-2 font-bold text-slate-500">
      Ces compétitions ne peuvent plus être reprises.
    </p>
    {abandonedCompetitions.length === 0 ? (
  <div className="mt-5 rounded-2xl border border-dashed border-slate-700 p-6 text-center font-bold text-slate-500">
    Aucune compétition abandonnée
  </div>
) : (
  <div className="mt-5 space-y-3">
    {/* ton map actuel */}
  </div>
)}
    

    <div className="mt-5 space-y-3">
      {visibleAbandonedCompetitions.map((competition) => 
        competition.competition_type === "world_cup" ? (
    <WorldCupCompetitionCard
      key={competition.id}
      competition={competition}
      onOpen={() =>
        router.push(
          `/modes-speciaux/coupe-du-monde/${competition.id}`
        )
      }
    />
  ) : (
    <CompetitionCard
      key={competition.id}
      competition={competition}
      onOpen={() =>
        router.push(
          `/modes-speciaux/grand-chelem/${competition.id}`
        )
      }
    />
  )
)}
    </div>
    {abandonedPageCount > 1 && (
  <div className="mt-6 flex items-center justify-between gap-3">
    <button
      type="button"
      disabled={abandonedPage === 1}
      onClick={() =>
        setAbandonedPage((page) => Math.max(1, page - 1))
      }
      className="rounded-xl border border-slate-700 bg-black px-4 py-2 font-black text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Précédent
    </button>

    <span className="text-sm font-black text-slate-400">
      Page {abandonedPage} / {abandonedPageCount}
    </span>

    <button
      type="button"
      disabled={abandonedPage === abandonedPageCount}
      onClick={() =>
        setAbandonedPage((page) =>
          Math.min(abandonedPageCount, page + 1)
        )
      }
      className="rounded-xl border border-slate-700 bg-black px-4 py-2 font-black text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Suivant
    </button>
  </div>
)}
  </section>
)}
      </div>
    </main>
  );
}
function WorldCupCompetitionCard({
  competition,
  onOpen,
}: {
  competition: CompetitionWithPlayers;
  onOpen: () => void;
}) {
  const isFinished =
    competition.status === "finished";

  const isAbandoned =
    competition.status === "abandoned";

  const winner =
    competition.players.find(
      (player) =>
        player.id === competition.winner_player_id
    ) ?? null;

  const playableRounds = competition.matches
    .filter(
      (match) =>
        match.status === "ready" ||
        match.status === "playing"
    )
    .map((match) => match.round_number);

  const unfinishedRounds = competition.matches
    .filter(
      (match) => match.status !== "finished"
    )
    .map((match) => match.round_number);

  const currentRoundNumber =
    playableRounds.length > 0
      ? Math.min(...playableRounds)
      : unfinishedRounds.length > 0
        ? Math.min(...unfinishedRounds)
        : Math.max(
            1,
            ...competition.matches.map(
              (match) => match.round_number
            )
          );

  const currentRoundMatches =
    competition.matches.filter(
      (match) =>
        match.round_number === currentRoundNumber
    );

  const totalRoundMatches =
    currentRoundMatches.length;

  const finishedRoundMatches =
    currentRoundMatches.filter(
      (match) => match.status === "finished"
    ).length;

  const totalRounds = Math.max(
    1,
    ...competition.matches.map(
      (match) => match.round_number
    )
  );

  const currentRoundName = getWorldCupRoundName(
    currentRoundNumber,
    totalRounds
  );

  const totalFinishedMatches =
    competition.matches.filter(
      (match) => match.status === "finished"
    ).length;

  const remainingPlayers = isFinished
    ? 1
    : Math.max(
        2,
        competition.players.length -
          totalFinishedMatches
      );

  const playingMatchesCount =
    competition.matches.filter(
      (match) => match.status === "playing"
    ).length;

  const buttonLabel = isFinished
    ? "Voir le tableau final"
    : isAbandoned
      ? "Voir la compétition"
      : playingMatchesCount > 0
        ? "Reprendre un match en cours"
        : "Continuer la Coupe du Monde";

  return (
    <article
      className="overflow-hidden rounded-3xl border shadow-xl"
      style={{
        backgroundColor: isAbandoned
  ? "#2D2A28"
  : "#0B6B3A",
borderColor: isAbandoned
  ? "#8B8178"
  : isFinished
    ? "#D7B14B"
    : "#1A9E5B",
      }}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
  style={{
    backgroundColor: isAbandoned
      ? "#403A36"
      : "#09532E",
  }}
>
  <Image
    src="/world-cup-trophy.png"
    alt="Coupe du Monde"
    width={44}
    height={56}
    className={[
      "h-12 w-auto object-contain",
      isAbandoned ? "grayscale opacity-60" : "",
    ].join(" ")}
  />
</div>

            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{
                  color: isAbandoned
  ? "#D0C4BC"
  : "#B9E8CE",
                }}
              >
                Tournoi à élimination directe
              </p>

              <h3 className="mt-1 text-2xl font-black text-white">
                Coupe du Monde
              </h3>

              <p className="mt-1 text-sm font-bold text-white/70">
                {isFinished
                  ? "Compétition terminée"
                  : isAbandoned
                    ? "Compétition abandonnée"
                    : "Compétition en cours"}
              </p>
            </div>
          </div>

          <WorldCupStatusBadge
            competition={competition}
          />
        </div>

        {isFinished && winner ? (
          <div
            className="mt-6 rounded-2xl border p-5"
            style={{
              backgroundColor: "#F4E9DC",
              borderColor: "#D9BE88",
            }}
          >
           <p
  className="text-center text-sm font-black uppercase tracking-[0.22em]"
  style={{ color: "#8A671F" }}
>
  Champion du monde
</p>

            <div className="mt-4 flex items-center justify-center gap-4 text-black">
              <SmallAvatar player={winner} />

              <div>
                <p className="text-xl font-black">
                  {winner.player_name}
                </p>

                <p className="mt-1 text-sm font-bold text-[#6A5138]">
                  Vainqueur du tournoi
                </p>
              </div>

              <div className="text-4xl">🏆</div>
            </div>
          </div>
        ) : isAbandoned ? (
          <div
  className="mt-6 rounded-2xl border p-5"
  style={{
    backgroundColor: "#3B3734",
    borderColor: "#6F6660",
  }}
>
  <p className="font-black text-white">
    Compétition arrêtée
  </p>

  <p className="mt-2 text-sm font-bold text-white/65">
    Cette Coupe du Monde a été abandonnée avant son terme.
  </p>
</div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
  <div className="rounded-2xl bg-[#09532E] p-5 text-center">
    <p className="text-xs font-black uppercase tracking-widest text-white/55">
      Tour actuel
    </p>

    <p className="mt-3 text-3xl font-black text-white">
      {currentRoundName}
    </p>
  </div>

  <div className="rounded-2xl bg-[#09532E] p-5 text-center">
    <p className="text-xs font-black uppercase tracking-widest text-white/55">
      Progression
    </p>

    <p className="mt-3 text-3xl font-black text-white">
      {finishedRoundMatches}/{totalRoundMatches}
    </p>

    <p className="mt-2 text-xs font-bold text-white/55">
      match{totalRoundMatches > 1 ? "s" : ""} du tour
    </p>
  </div>

  <div className="rounded-2xl bg-[#09532E] p-5 text-center">
    <p className="text-xs font-black uppercase tracking-widest text-white/55">
      Joueurs restants
    </p>

    <p className="mt-3 text-3xl font-black text-white">
      {remainingPlayers}
    </p>
  </div>
</div>
        )}

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
function WorldCupStatusBadge({
  competition,
}: {
  competition: CompetitionWithPlayers;
}) {
  if (competition.status === "finished") {
    return (
      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase text-white">
  Terminée
</span>
    );
  }

  if (competition.status === "abandoned") {
    return (
      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase text-white">
  Abandonnée
</span>
    );
  }

  const playingMatchesCount =
    competition.matches.filter(
      (match) => match.status === "playing"
    ).length;

  if (playingMatchesCount > 0) {
    return (
      <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black uppercase text-[#624600]">
        {playingMatchesCount}{" "}
        {playingMatchesCount > 1
          ? "matchs en cours"
          : "match en cours"}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase text-white">
      À continuer
    </span>
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

  const isWorldCup =
  competition.competition_type === "world_cup";

const completedSets =
  (player1?.sets_won ?? 0) +
  (player2?.sets_won ?? 0);

const nextSetNumber = completedSets + 1;

const isFinished =
  competition.status === "finished";

const isAbandoned =
  competition.status === "abandoned";

const hasGameInProgress =
  competition.current_round_number !== null &&
  competition.current_play_mode !== null;

let buttonLabel: string;

if (isWorldCup) {
  if (isFinished || isAbandoned) {
    buttonLabel = "Voir le tableau";
  } else if (hasGameInProgress) {
    buttonLabel = "Reprendre la Coupe du Monde";
  } else {
    buttonLabel = "Continuer la Coupe du Monde";
  }
} else {
  buttonLabel = isFinished
    ? "Voir la finale"
    : isAbandoned
      ? "Voir la finale"
      : hasGameInProgress
        ? `Reprendre le set ${competition.current_round_number}`
        : completedSets === 0
          ? "Commencer la finale"
          : `Jouer le set ${nextSetNumber}`;
}

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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/20">
  <Image
    src={tournament.logo}
    alt={tournament.name}
    width={42}
    height={42}
    className="h-10 w-auto object-contain"
  />
</div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
  {isWorldCup
    ? "Coupe du Monde"
    : "Finale de Grand Chelem"}
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
  {isWorldCup ? "Match" : "Sets"}
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
      <span className="rounded-full border border-[#F7E3A5]/60 bg-[#F2D27A] px-3 py-1 text-xs font-black uppercase text-[#5C4300]">
  Terminée
</span>
    );
  }

  if (competition.status === "abandoned") {
    return (
      <span className="rounded-full border border-[#E2D8D0]/60 bg-[#C9BCB1] px-3 py-1 text-xs font-black uppercase text-[#433A34]">
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
function getWorldCupRoundName(
  roundNumber: number,
  totalRounds: number
) {
  const roundsRemaining =
    totalRounds - roundNumber;

  if (roundsRemaining === 0) {
    return "Finale";
  }

  if (roundsRemaining === 1) {
    return "Demi-finales";
  }

  if (roundsRemaining === 2) {
    return "Quarts de finale";
  }

  if (roundsRemaining === 3) {
    return "Huitièmes de finale";
  }

  return `Tour ${roundNumber}`;
}