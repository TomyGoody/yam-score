"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthButton from "../components/AuthButton";
import { supabase } from "../lib/supabase";
import { ChevronRight } from "lucide-react";

type CompetitionStatus = "in_progress" | "finished" | "abandoned";

type TournamentTheme =
| "australian_open"
| "roland_garros"
| "wimbledon"
| "us_open"
| "world_cup"
| "grand_prix"
| "basket";
type GrandPrixSummary = {
  competition_id: string;
  race_number: number;
  circuit_id: string;
  status: "waiting" | "playing" | "finished";
};
type Competition = {
  id: string;
  competition_type: string;
  theme: TournamentTheme;
  status: CompetitionStatus;
  column_mode: 3 | 6;
  wins_required: number;
  winner_player_id: string | null;
  winner_team: "A" | "B" | null;
  current_round_number: number | null;
  current_play_mode: "local" | "salon" | null;
  created_at: string;
  finished_at: string | null;
  grand_prix_count: number | null;
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
  grandPrixRaces: GrandPrixSummary[];
  basketTeam: "A" | "B" | null;
  basketPlayerTeams: BasketPlayerTeamLink[];
};
type BasketPlayerTeamLink = {
  competition_id: string;
  competition_player_id: string;
  team: "A" | "B";
};
type CompetitionMatchSummary = {
  competition_id: string;
  round_number: number;
  status: "waiting" | "ready" | "playing" | "finished";
};
const GRAND_PRIX_CIRCUIT_NAMES: Record<string, string> = {
  melbourne: "Melbourne",
  bahrain: "Bahreïn",
  jeddah: "Djeddah",
  suzuka: "Suzuka",
  shanghai: "Shanghai",
  imola: "Imola",
  monaco: "Monaco",
  barcelona: "Barcelone",
  montreal: "Montréal",
  spielberg: "Spielberg",
  silverstone: "Silverstone",
  spa: "Spa-Francorchamps",
  zandvoort: "Zandvoort",
  monza: "Monza",
  singapore: "Singapour",
  austin: "Austin",
  mexico: "Mexico",
  interlagos: "Interlagos",
  abu_dhabi: "Abou Dabi",
};

function getGrandPrixCircuitName(circuitId: string) {
  return GRAND_PRIX_CIRCUIT_NAMES[circuitId] ?? circuitId;
}
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
  grand_prix: {
    name: "Grand Prix",
    logo: "/favicon.png",
    backgroundClass:
    "bg-gradient-to-br from-[#171717] via-[#8E111B] to-[#D3202F]",
    borderClass: "border-[#D3202F]",
  },
  basket: {
    name: "Basket",
    logo: "/favicon.png",
    backgroundClass: "",
    borderClass: "",
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
      const [
        {
          data: participantRows,
          error: participantError,
        },
        {
          data: basketParticipantRows,
          error: basketParticipantError,
        },
      ] = await Promise.all([
        supabase
        .from("competition_players")
        .select("competition_id")
        .eq("profile_id", user.id),
        
        supabase
        .from("competition_basket_players")
        .select(`
    competition_id,
    competition_player_id,
    team,
    competition_players!inner (
      profile_id
    )
  `)
          .eq("competition_players.profile_id", user.id),
        ]);
        
        if (participantError) {
          console.error(
            "Erreur recherche compétitions du profil",
            participantError
          );
          
          setCompetitionsError(
            "Impossible de charger tes compétitions."
          );
          
          setLoadingCompetitions(false);
          return;
        }
        
        if (basketParticipantError) {
          console.error(
            "Erreur recherche compétitions Basket du profil",
            basketParticipantError
          );
        }
        
        const competitionIds = Array.from(
          new Set([
            ...(participantRows ?? []).map(
              (row) => row.competition_id as string
            ),
            
            ...(basketParticipantRows ?? []).map(
              (row) => row.competition_id as string
            ),
          ])
        );
        const {
          data: basketPlayerTeamRows,
          error: basketPlayerTeamError,
        } = await supabase
        .from("competition_basket_players")
        .select(`
    competition_id,
    competition_player_id,
    team
  `)
          .in("competition_id", competitionIds);
          
          if (basketPlayerTeamError) {
            console.error(
              "Erreur chargement compositions Basket",
              basketPlayerTeamError
            );
          }
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
          winner_team,
          current_round_number,
          current_play_mode,
          created_at,
          grand_prix_count,
          finished_at
          `
          )
          .in("id", competitionIds)
          .in("competition_type", [
            "grand_slam_final",
            "world_cup",
            "grand_prix",
            "basket",
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
          const {
            data: grandPrixRows,
            error: grandPrixError,
          } = await supabase
          .from("competition_grand_prix")
          .select(`
    competition_id,
    race_number,
    circuit_id,
    status
  `)
            .in("competition_id", competitionIds);
            
            if (grandPrixError) {
              console.error(
                "Erreur chargement des Grands Prix",
                grandPrixError
              );
              
              setCompetitionsError(
                "Impossible de charger la progression des saisons Grand Prix."
              );
              
              setLoadingCompetitions(false);
              return;
            }
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
              
              grandPrixRaces: (
                (grandPrixRows ?? []) as GrandPrixSummary[]
              ).filter(
                (race) =>
                  race.competition_id === competition.id
              ),
              basketTeam:
              competition.competition_type === "basket"
              ? (
                (basketParticipantRows ?? []).find(
                  (row) =>
                    row.competition_id === competition.id
                )?.team as "A" | "B" | undefined
              ) ?? null
              : null,
              basketPlayerTeams: (
                (basketPlayerTeamRows ?? []) as BasketPlayerTeamLink[]
              ).filter(
                (link) =>
                  link.competition_id === competition.id
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
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "competition_grand_prix",
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
            competitions
          .filter(
            (competition) => competition.status === "finished"
          )
          .sort((a, b) => {
            const dateA = a.finished_at
            ? new Date(a.finished_at).getTime()
            : 0;
            
            const dateB = b.finished_at
            ? new Date(b.finished_at).getTime()
            : 0;
            
            return dateB - dateA;
          }),
          [competitions]
        );
        
        const abandonedCompetitions = useMemo(
          () =>
            competitions.filter(
            (competition) => competition.status === "abandoned"
          ),
          [competitions]
        );
        const titlesWon = useMemo(() => {
          if (!currentUserId) return 0;
          
          return finishedCompetitions.filter((competition) => {
            if (competition.competition_type === "basket") {
              return (
                competition.basketTeam !== null &&
                competition.basketTeam === competition.winner_team
              );
            }
            
            const me = competition.players.find(
              (player) => player.profile_id === currentUserId
            );
            
            return me?.id === competition.winner_player_id;
          }).length;
        }, [finishedCompetitions, currentUserId]);
        const grandSlamFinished = finishedCompetitions.filter(
          (competition) =>
            competition.competition_type === "grand_slam_final"
        );
        
        const worldCupFinished = finishedCompetitions.filter(
          (competition) =>
            competition.competition_type === "world_cup"
        );
        const grandPrixFinished = finishedCompetitions.filter(
          (competition) =>
            competition.competition_type === "grand_prix"
        );
        const basketFinished = finishedCompetitions.filter(
          (competition) =>
            competition.competition_type === "basket"
        );
        
        const basketTitles = basketFinished.filter(
          (competition) =>
            competition.basketTeam !== null &&
          competition.basketTeam === competition.winner_team
        ).length;
        const grandSlamTitles = grandSlamFinished.filter(
          (competition) => {
            const me = competition.players.find(
              (player) => player.profile_id === currentUserId
            );
            
            return me?.id === competition.winner_player_id;
          }
        ).length;
        
        const worldCupTitles = worldCupFinished.filter(
          (competition) => {
            const me = competition.players.find(
              (player) => player.profile_id === currentUserId
            );
            
            return me?.id === competition.winner_player_id;
          }
        ).length;
        const grandPrixTitles = grandPrixFinished.filter(
          (competition) => {
            const me = competition.players.find(
              (player) =>
                player.profile_id === currentUserId
            );
            
            return me?.id === competition.winner_player_id;
          }
        ).length;
        const competitionsPlayed = finishedCompetitions.length;
        
        const wonModeTypes = useMemo(() => {
          if (!currentUserId) return 0;
          
          const wonTypes = new Set<string>();
          
          for (const competition of finishedCompetitions) {
            if (competition.competition_type === "basket") {
              if (
                competition.basketTeam !== null &&
                competition.basketTeam === competition.winner_team
              ) {
                wonTypes.add("basket");
              }
              
              continue;
            }
            
            const me = competition.players.find(
              (player) => player.profile_id === currentUserId
            );
            
            if (me?.id === competition.winner_player_id) {
              wonTypes.add(competition.competition_type);
            }
          }
          
          return wonTypes.size;
        }, [finishedCompetitions, currentUserId]);
        
        const availableModeTypes = new Set(
          competitions.map(
            (competition) => competition.competition_type
          )
        ).size;
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
          🏆 Entre dans la compétition.
          
          Affronte tes amis dans des formats exclusifs,
          reprends tes tournois quand tu veux
          et construis ton palmarès.
          </p>
          </header>
          <section className="mt-8 rounded-3xl border border-[#9B6A28]/30 bg-[#111111] p-6">
          <div>
          <h2 className="text-xl font-black text-white">
          🏆 Ton palmarès
          </h2>
          
          <p className="mt-1 text-sm font-bold text-slate-500">
          Toutes tes performances en compétitions.
          </p>
          </div>
          
          {/* TOTAL GLOBAL */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <PalmaresCard
          icon="🏆"
          value={String(titlesWon)}
          label="Titres remportés"
          />
          
          <PalmaresCard
          icon="🎮"
          value={String(finishedCompetitions.length)}
          label="Compétitions terminées"
          />
          </div>
          
          {/* DÉTAIL PAR MODE */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* GRAND CHELEM */}
          <div className="rounded-2xl border border-[#C44934]/30 bg-[#C44934]/10 p-4">
          <div className="flex items-center justify-between">
          <span className="text-2xl">
          🎾
          </span>
          
          <span className="text-xs font-black uppercase tracking-wider text-[#C44934]">
          Grand Chelem
          </span>
          </div>
          
          <div className="mt-4 text-2xl font-black text-white">
          {grandSlamTitles}
          </div>
          
          <div className="mt-1 text-sm font-bold text-slate-400">
          {grandSlamTitles > 1 ? "titres" : "titre"}
          </div>
          
          <div className="mt-3 border-t border-white/10 pt-3 text-xs font-black text-slate-500">
          {grandSlamFinished.length}{" "}
          {grandSlamFinished.length > 1
            ? "finales disputées"
            : "finale disputée"}
            </div>
            </div>
            
            {/* COUPE DU MONDE */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between">
            <span className="text-2xl">
            ⚽
            </span>
            
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
            Coupe du Monde
            </span>
            </div>
            
            <div className="mt-4 text-2xl font-black text-white">
            {worldCupTitles}
            </div>
            
            <div className="mt-1 text-sm font-bold text-slate-400">
            {worldCupTitles > 1 ? "titres" : "titre"}
            </div>
            
            <div className="mt-3 border-t border-white/10 pt-3 text-xs font-black text-slate-500">
            {worldCupFinished.length}{" "}
            {worldCupFinished.length > 1
              ? "compétitions disputées"
              : "compétition disputée"}
              </div>
              </div>
              
              {/* GRAND PRIX */}
              <div className="rounded-2xl border border-[#D3202F]/30 bg-[#D3202F]/10 p-4">
              <div className="flex items-center justify-between">
              <span className="text-2xl">
              🏎️
              </span>
              
              <span className="text-xs font-black uppercase tracking-wider text-[#D3202F]">
              Grand Prix
              </span>
              </div>
              
              <div className="mt-4 text-2xl font-black text-white">
              {grandPrixTitles}
              </div>
              
              <div className="mt-1 text-sm font-bold text-slate-400">
              {grandPrixTitles > 1 ? "titres" : "titre"}
              </div>
              
              <div className="mt-3 border-t border-white/10 pt-3 text-xs font-black text-slate-500">
              {grandPrixFinished.length}{" "}
              {grandPrixFinished.length > 1
                ? "saisons disputées"
                : "saison disputée"}
                </div>
                </div>
                
                {/* BASKET */}
                <div className="rounded-2xl border border-[#E87524]/30 bg-[#E87524]/10 p-4">
                <div className="flex items-center justify-between">
                <span className="text-2xl">
                🏀
                </span>
                
                <span className="text-xs font-black uppercase tracking-wider text-[#E87524]">
                Basket
                </span>
                </div>
                
                <div className="mt-4 text-2xl font-black text-white">
                {basketTitles}
                </div>
                
                <div className="mt-1 text-sm font-bold text-slate-400">
                {basketTitles > 1 ? "titres" : "titre"}
                </div>
                
                <div className="mt-3 border-t border-white/10 pt-3 text-xs font-black text-slate-500">
                {basketFinished.length}{" "}
                {basketFinished.length > 1
                  ? "compétitions disputées"
                  : "compétition disputée"}
                  </div>
                  </div>
                  
                  </div>
                  </section>
                  <nav className="mt-8 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-[#111111] p-2 md:grid-cols-4">
                  {[
                    {
                      id: "new" as const,
                      label: "🆕 Nouvelle compétition",
                    },
                    {
                      id: "active" as const,
                      label: `🟡 En cours (${activeCompetitions.length})`,
                    },
                    {
                      id: "finished" as const,
                      label: `🏆 Terminées (${finishedCompetitions.length})`,
                    },
                    {
                      id: "abandoned" as const,
                      label: `❌ Abandonnées (${abandonedCompetitions.length})`,
                    },
                  ].map((tab) => {
                    const selected = activeTab === tab.id;
                    
                    return (
                      <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        
                        window.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        });
                      }}
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
                    </div>
                    
                    <div className="mt-auto space-y-4">
                    <div className="flex flex-wrap gap-2 text-sm font-black">
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
                    
                    {grandSlamFinished.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-sm font-black text-[#7A3A2B]">
                      <span>
                      🏆 {grandSlamTitles}{" "}
                      {grandSlamTitles > 1 ? "titres" : "titre"}
                      </span>
                      
                      <span className="text-[#9A7A68]">•</span>
                      
                      <span>
                      🎮 {grandSlamFinished.length}{" "}
                      {grandSlamFinished.length > 1
                        ? "compétitions"
                        : "compétition"}
                        </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                      <span className="font-black text-[#C44934]">
                      Découvrir le mode
                      </span>
                      
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C44934]/15 text-[#C44934] transition group-hover:bg-[#C44934] group-hover:text-white">
                      <ChevronRight className="h-6 w-6" strokeWidth={3} />
                      </div>
                      </div>
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
                      </div>
                      
                      <div className="mt-auto space-y-4">
                      <div className="flex flex-wrap gap-2 text-sm font-black">
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
                      
                      {worldCupFinished.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-sm font-black text-[#0B6B3A]">
                        <span>
                        🏆 {worldCupTitles}{" "}
                        {worldCupTitles > 1 ? "titres" : "titre"}
                        </span>
                        
                        <span className="text-[#6F8F7B]">•</span>
                        
                        <span>
                        🎮 {worldCupFinished.length}{" "}
                        {worldCupFinished.length > 1
                          ? "compétitions"
                          : "compétition"}
                          </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                        <span className="font-black text-[#0B6B3A]">
                        Découvrir le mode
                        </span>
                        
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B6B3A]/15 text-[#0B6B3A] transition group-hover:bg-[#0B6B3A] group-hover:text-white">
                        <ChevronRight className="h-6 w-6" strokeWidth={3} />
                        </div>
                        </div>
                        </div>
                        </div>
                        </button>
                        {/* Grand Prix */}
                        <button
                        type="button"
                        onClick={() =>
                          router.push("/modes-speciaux/grand-prix")
                        }
                        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#D3202F]/70 bg-[#F4E9DC] text-left text-black transition hover:-translate-y-1 hover:border-[#F13C49]"
                        >
                        <div className="relative h-48 shrink-0 overflow-hidden bg-gradient-to-br from-[#171717] via-[#8E111B] to-[#D3202F]">
                        {/* Piste */}
                        <div className="absolute inset-0 opacity-25">
                        <div
                        className="absolute rounded-[45%]"
                        style={{
                          left: "7%",
                          right: "7%",
                          top: "15%",
                          bottom: "15%",
                          border: "26px solid rgba(0,0,0,0.8)",
                          transform: "rotate(-5deg)",
                        }}
                        />
                        
                        <div
                        className="absolute rounded-[45%]"
                        style={{
                          left: "11%",
                          right: "11%",
                          top: "24%",
                          bottom: "24%",
                          border: "2px dashed rgba(255,255,255,0.9)",
                          transform: "rotate(-5deg)",
                        }}
                        />
                        </div>
                        
                        {/* Damier */}
                        <div
                        className="absolute inset-x-0 bottom-0 h-8 opacity-30"
                        style={{
                          backgroundImage:
                          "linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(-45deg, #fff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #fff 75%), linear-gradient(-45deg, transparent 75%, #fff 75%)",
                          backgroundPosition:
                          "0 0, 0 8px, 8px -8px, -8px 0px",
                          backgroundSize: "16px 16px",
                        }}
                        />
                        
                        <div className="absolute inset-0 flex items-center justify-center text-7xl transition group-hover:scale-110">
                        🏎️
                        </div>
                        
                        <div className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-black uppercase text-white">
                        Disponible
                        </div>
                        </div>
                        
                        <div className="flex flex-1 flex-col p-6">
                        <div>
                        <p className="text-xs font-black uppercase tracking-widest text-[#D3202F]">
                        2 à 6 joueurs
                        </p>
                        
                        <h2 className="mt-2 text-2xl font-black">
                        Grand Prix
                        </h2>
                        
                        <p className="mt-3 font-bold leading-relaxed text-[#5B4636]">
                        Disputez plusieurs Grands Prix, cumulez des points selon
                        votre classement et devenez champion de la saison.
                        </p>
                        </div>
                        
                        <div className="mt-auto pt-5">
                        <div className="flex flex-wrap gap-2 text-sm font-black">
                        <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
                        3 à 7 GP
                        </span>
                        
                        <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
                        Circuits aléatoires
                        </span>
                        
                        <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
                        Classement par pts
                        </span>
                        </div>
                        {grandPrixFinished.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2 text-sm font-black text-[#D3202F]">
                          <span>
                          🏆 {grandPrixTitles}{" "}
                          {grandPrixTitles > 1 ? "titres" : "titre"}
                          </span>
                          
                          <span className="text-[#9A7A68]">•</span>
                          
                          <span>
                          🎮 {grandPrixFinished.length}{" "}
                          {grandPrixFinished.length > 1
                            ? "compétitions"
                            : "compétition"}
                            </span>
                            </div>
                          )}
                          <div className="mt-5 flex items-center justify-between">
                          <span className="font-black text-[#D3202F]">
                          Découvrir le mode
                          </span>
                          
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D3202F]/15 text-[#D3202F] transition group-hover:bg-[#D3202F] group-hover:text-white">
                          <ChevronRight
                          className="h-6 w-6"
                          strokeWidth={3}
                          />
                          </div>
                          </div>
                          </div>
                          </div>
                          </button>
                          {/* Basket */}
                          <button
                          type="button"
                          onClick={() => router.push("/modes-speciaux/basket")}
                          className="group flex h-full flex-col overflow-hidden rounded-3xl border bg-[#F4E9DC] text-left text-black transition hover:-translate-y-1"
                          style={{
                            borderColor: "rgba(232,117,36,0.7)",
                          }}
                          >
                          <div
                          className="relative h-48 shrink-0 overflow-hidden"
                          style={{
                            background:
                            "linear-gradient(135deg, #1A0D05 0%, #8C3D0D 50%, #E87524 100%)",
                          }}
                          >
                          {/* Terrain de basket */}
                          <div className="absolute inset-0 opacity-30">
                          <div
                          className="absolute border-2 border-white"
                          style={{
                            left: "7%",
                            right: "7%",
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
                          
                          {/* Cercle central */}
                          <div
                          className="absolute rounded-full border-2 border-white"
                          style={{
                            left: "50%",
                            top: "50%",
                            width: "76px",
                            height: "76px",
                            transform: "translate(-50%, -50%)",
                          }}
                          />
                          
                          {/* Raquette gauche */}
                          <div
                          className="absolute"
                          style={{
                            left: 0,
                            top: "27%",
                            bottom: "27%",
                            width: "18%",
                            borderTop: "2px solid white",
                            borderRight: "2px solid white",
                            borderBottom: "2px solid white",
                          }}
                          />
                          
                          {/* Raquette droite */}
                          <div
                          className="absolute"
                          style={{
                            right: 0,
                            top: "27%",
                            bottom: "27%",
                            width: "18%",
                            borderTop: "2px solid white",
                            borderLeft: "2px solid white",
                            borderBottom: "2px solid white",
                          }}
                          />
                          
                          {/* Cercle lancer franc gauche */}
                          <div
                          className="absolute rounded-full"
                          style={{
                            left: "18%",
                            top: "50%",
                            width: "58px",
                            height: "58px",
                            border: "2px solid white",
                            transform: "translate(-50%, -50%)",
                          }}
                          />
                          
                          {/* Cercle lancer franc droit */}
                          <div
                          className="absolute rounded-full"
                          style={{
                            right: "18%",
                            top: "50%",
                            width: "58px",
                            height: "58px",
                            border: "2px solid white",
                            transform: "translate(50%, -50%)",
                          }}
                          />
                          </div>
                          </div>
                          
                          <div className="absolute inset-0 flex items-center justify-center text-7xl transition group-hover:scale-110">
                          🏀
                          </div>
                          
                          <div className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-black uppercase text-white">
                          Disponible
                          </div>
                          </div>
                          
                          <div className="flex flex-1 flex-col p-6">
                          <div>
                          <p
                          className="text-xs font-black uppercase tracking-widest"
                          style={{
                            color: "#E87524",
                          }}
                          >
                          2, 4 ou 6 joueurs
                          </p>
                          
                          <h2 className="mt-2 text-2xl font-black">
                          Basket
                          </h2>
                          
                          <p className="mt-3 font-bold leading-relaxed text-[#5B4636]">
                          Formez deux équipes, remportez les quart-temps et cumulez
                          des points pour gagner la compétition.
                          </p>
                          </div>
                          
                          <div className="mt-auto pt-5">
                          <div className="flex flex-wrap gap-2 text-sm font-black">
                          <span
                          className="rounded-full px-3 py-1 text-white"
                          style={{
                            backgroundColor: "#241A13",
                          }}
                          >
                          1v1 · 2v2 · 3v3
                          </span>
                          
                          <span
                          className="rounded-full px-3 py-1 text-white"
                          style={{
                            backgroundColor: "#241A13",
                          }}
                          >
                          1, 3 ou 5 matchs
                          </span>
                          
                          <span
                          className="rounded-full px-3 py-1 text-white"
                          style={{
                            backgroundColor: "#241A13",
                          }}
                          >
                          4 quart-temps
                          </span>
                          </div>
                          {basketFinished.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 text-sm font-black text-[#E87524]">
                            <span>
                            🏆 {basketTitles}{" "}
                            {basketTitles > 1 ? "titres" : "titre"}
                            </span>
                            
                            <span className="text-[#9A7A68]">
                            •
                            </span>
                            
                            <span>
                            🎮 {basketFinished.length}{" "}
                            {basketFinished.length > 1
                              ? "compétitions"
                              : "compétition"}
                              </span>
                              </div>
                            )}
                            <div className="mt-5 flex items-center justify-between">
                            <span
                            className="font-black"
                            style={{
                              color: "#E87524",
                            }}
                            >
                            Découvrir le mode
                            </span>
                            
                            <div className="basket-chevron flex h-11 w-11 items-center justify-center rounded-full transition">
                            <ChevronRight
                            className="h-6 w-6"
                            strokeWidth={3}
                            />
                            </div>
                            </div>
                            </div>
                            </div>
                            </button>
                            {/* À venir */}
                            <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#F4E9DC] text-left text-black opacity-90">
                            <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-[#111111] via-[#2A2A2A] to-[#444444]">
                            
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_70%)]" />
                            
                            <div className="text-8xl opacity-70">
                            ❓
                            </div>
                            
                            <div className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-black uppercase text-white">
                            Prochainement
                            </div>
                            </div>
                            
                            <div className="flex flex-1 flex-col p-6">
                            <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                            Nouveau mode
                            </p>
                            
                            <h2 className="mt-2 text-2xl font-black">
                            À venir...
                            </h2>
                            
                            <p className="mt-3 font-bold leading-relaxed text-[#5B4636]">
                            De nouveaux modes spéciaux sont en préparation.
                            Revenez bientôt pour découvrir la prochaine compétition.
                            </p>
                            </div>
                            
                            <div className="mt-auto">
                            <div className="flex flex-wrap gap-2 text-sm font-black">
                            <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
                            Nouveaux défis
                            </span>
                            
                            <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
                            Plus de formats
                            </span>
                            
                            <span className="rounded-full bg-[#241A13] px-3 py-1 text-white">
                            Gratuit
                            </span>
                            </div>
                            
                            <div className="mt-5 flex items-center justify-between">
                            <span className="font-black text-slate-500">
                            Bientôt disponible
                            </span>
                            
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-300 text-slate-600">
                            ?
                            </div>
                            </div>
                            </div>
                            </div>
                            </div>
                            </section>
                          )}
                          {activeTab === "active" && (
                            <section className="mt-5 rounded-3xl border border-[#9B6A28]/40 bg-[#111111] p-6">
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
                              {activeCompetitions.map((competition) => {
                                if (competition.competition_type === "world_cup") {
                                  return (
                                    <WorldCupCompetitionCard
                                    key={competition.id}
                                    competition={competition}
                                    onOpen={() =>
                                      router.push(
                                        `/modes-speciaux/coupe-du-monde/${competition.id}`
                                      )
                                    }
                                    />
                                  );
                                }
                                
                                if (competition.competition_type === "grand_prix") {
                                  return (
                                    <GrandPrixCompetitionCard
                                    key={competition.id}
                                    competition={competition}
                                    onOpen={() =>
                                      router.push(
                                        `/modes-speciaux/grand-prix/${competition.id}`
                                      )
                                    }
                                    />
                                  );
                                }
                                if (competition.competition_type === "basket") {
                                  return (
                                    <BasketCompetitionCard
                                    key={competition.id}
                                    competition={competition}
                                    onOpen={() =>
                                      router.push(
                                        `/modes-speciaux/basket/${competition.id}`
                                      )
                                    }
                                    />
                                  );
                                }
                                return (
                                  <CompetitionCard
                                  key={competition.id}
                                  competition={competition}
                                  onOpen={() =>
                                    router.push(
                                      `/modes-speciaux/grand-chelem/${competition.id}`
                                    )
                                  }
                                  />
                                );
                              })}
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
                            {visibleFinishedCompetitions.map((competition) => {
                              if (competition.competition_type === "world_cup") {
                                return (
                                  <WorldCupCompetitionCard
                                  key={competition.id}
                                  competition={competition}
                                  onOpen={() =>
                                    router.push(
                                      `/modes-speciaux/coupe-du-monde/${competition.id}`
                                    )
                                  }
                                  />
                                );
                              }
                              
                              if (competition.competition_type === "grand_prix") {
                                return (
                                  <GrandPrixCompetitionCard
                                  key={competition.id}
                                  competition={competition}
                                  onOpen={() =>
                                    router.push(
                                      `/modes-speciaux/grand-prix/${competition.id}`
                                    )
                                  }
                                  />
                                );
                              }
                              if (competition.competition_type === "basket") {
                                return (
                                  <BasketCompetitionCard
                                  key={competition.id}
                                  competition={competition}
                                  onOpen={() =>
                                    router.push(
                                      `/modes-speciaux/basket/${competition.id}`
                                    )
                                  }
                                  />
                                );
                              }
                              return (
                                <CompetitionCard
                                key={competition.id}
                                competition={competition}
                                onOpen={() =>
                                  router.push(
                                    `/modes-speciaux/grand-chelem/${competition.id}`
                                  )
                                }
                                />
                              );
                            })}
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
                          {visibleAbandonedCompetitions.map((competition) => {
                            if (competition.competition_type === "world_cup") {
                              return (
                                <WorldCupCompetitionCard
                                key={competition.id}
                                competition={competition}
                                onOpen={() =>
                                  router.push(
                                    `/modes-speciaux/coupe-du-monde/${competition.id}`
                                  )
                                }
                                />
                              );
                            }
                            
                            if (competition.competition_type === "grand_prix") {
                              return (
                                <GrandPrixCompetitionCard
                                key={competition.id}
                                competition={competition}
                                onOpen={() =>
                                  router.push(
                                    `/modes-speciaux/grand-prix/${competition.id}`
                                  )
                                }
                                />
                              );
                            }
                            if (competition.competition_type === "basket") {
                              return (
                                <BasketCompetitionCard
                                key={competition.id}
                                competition={competition}
                                onOpen={() =>
                                  router.push(
                                    `/modes-speciaux/basket/${competition.id}`
                                  )
                                }
                                />
                              );
                            }
                            return (
                              <CompetitionCard
                              key={competition.id}
                              competition={competition}
                              onOpen={() =>
                                router.push(
                                  `/modes-speciaux/grand-chelem/${competition.id}`
                                )
                              }
                              />
                            );
                          })}
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
                  function BasketCompetitionCard({
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
                    
                    const playerCount = competition.players.length;
                    
                    const teamSize =
                    playerCount === 6
                    ? 3
                    : playerCount === 4
                    ? 2
                    : 1;
                    const basketPlayerTeams =
                    competition.basketPlayerTeams ?? [];
                    
                    const teamAPlayers = competition.players.filter(
                      (player) =>
                        basketPlayerTeams.some(
                        (link) =>
                          link.competition_player_id === player.id &&
                        link.team === "A"
                      )
                    );
                    
                    const teamBPlayers = competition.players.filter(
                      (player) =>
                        basketPlayerTeams.some(
                        (link) =>
                          link.competition_player_id === player.id &&
                        link.team === "B"
                      )
                    );
                    const buttonLabel = isFinished
                    ? "Voir la compétition"
                    : isAbandoned
                    ? "Voir la compétition abandonnée"
                    : competition.current_round_number !== null
                    ? "Reprendre la compétition"
                    : "Continuer la compétition";
                    
                    return (
                      <article
                      className="overflow-hidden rounded-2xl border"
                      style={{
                        borderColor: "rgba(232,117,36,0.65)",
                        background:
                        "linear-gradient(135deg, #1A0D05 0%, #5A260C 50%, #9A4518 100%)",
                      }}
                      >
                      <div className="bg-black/25 p-5 backdrop-blur-sm">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                      <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-3xl"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.25)",
                      }}
                      >
                      🏀
                      </div>
                      
                      <div className="min-w-0">
                      <p
                      className="text-xs font-black uppercase tracking-[0.2em]"
                      style={{
                        color: "rgba(255,190,135,0.8)",
                      }}
                      >
                      Basket
                      </p>
                      
                      <h3 className="mt-1 text-xl font-black text-white">
                      {teamSize}v{teamSize} ·{" "}
                      {competition.column_mode} colonnes
                      </h3>
                      </div>
                      </div>
                      
                      <BasketStatusBadge competition={competition} />
                      </div>
                      
                      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div
                      className="rounded-xl border p-4 text-center"
                      style={{
                        borderColor: "rgba(244,123,32,0.55)",
                        backgroundColor: "rgba(244,123,32,0.12)",
                      }}
                      >
                      <div
                      className="mx-auto h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: "#F47B20",
                      }}
                      />
                      
                      <p className="mt-2 font-black text-white">
                      Équipe A
                      </p>
                      
                      <p className="mt-1 text-xs font-bold text-white/65">
                      {teamAPlayers
                        .map((player) => player.player_name)
                        .join(" · ")}
                        </p>
                        
                        {isFinished &&
                          competition.winner_team === "A" && (
                            <p className="mt-2 text-xs font-black text-amber-300">
                            🏆 Vainqueur
                            </p>
                          )}
                          </div>
                          
                          <div className="text-sm font-black text-white/45">
                          VS
                          </div>
                          
                          <div
                          className="rounded-xl border p-4 text-center"
                          style={{
                            borderColor: "rgba(59,130,246,0.55)",
                            backgroundColor: "rgba(59,130,246,0.12)",
                          }}
                          >
                          <div
                          className="mx-auto h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: "#3B82F6",
                          }}
                          />
                          
                          <p className="mt-2 font-black text-white">
                          Équipe B
                          </p>
                          
                          <p className="mt-1 text-xs font-bold text-white/65">
                          {teamBPlayers
                            .map((player) => player.player_name)
                            .join(" · ")}
                            </p>
                            
                            {isFinished &&
                              competition.winner_team === "B" && (
                                <p className="mt-2 text-xs font-black text-amber-300">
                                🏆 Vainqueur
                                </p>
                              )}
                              </div>
                              </div>
                              
                              {!isFinished && !isAbandoned && (
                                <div className="mt-4 flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                                <span className="text-xs font-black uppercase tracking-widest text-white/50">
                                Match
                                </span>
                                
                                <span className="font-black text-white">
                                {competition.current_round_number
                                  ? `Match ${competition.current_round_number}`
                                  : "À jouer"}
                                  </span>
                                  </div>
                                )}
                                
                                <button
                                type="button"
                                onClick={onOpen}
                                className="mt-5 w-full rounded-xl px-4 py-3 font-black text-white transition hover:brightness-110"
                                style={{
                                  backgroundColor: "#E87524",
                                }}
                                >
                                {buttonLabel}
                                </button>
                                </div>
                                </article>
                              );
                            }
                            
                            function BasketStatusBadge({
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
                                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase text-white/70">
                                  Abandonnée
                                  </span>
                                );
                              }
                              
                              if (
                                competition.current_round_number !== null &&
                                competition.current_play_mode !== null
                              ) {
                                return (
                                  <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black uppercase text-amber-200">
                                  Match en cours
                                  </span>
                                );
                              }
                              
                              return (
                                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase text-white">
                                À continuer
                                </span>
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
                                function GrandPrixCompetitionCard({
                                  competition,
                                  onOpen,
                                }: {
                                  competition: CompetitionWithPlayers;
                                  onOpen: () => void;
                                }) {
                                  const isFinished = competition.status === "finished";
                                  const isAbandoned = competition.status === "abandoned";
                                  const playingRace =
                                  competition.grandPrixRaces.find(
                                    (race) => race.status === "playing"
                                  ) ?? null;
                                  
                                  const nextRace =
                                  competition.grandPrixRaces
                                  .filter((race) => race.status === "waiting")
                                  .sort((a, b) => a.race_number - b.race_number)[0] ?? null;
                                  
                                  const displayedRace = playingRace ?? nextRace;
                                  const completedRaceCount =
                                  competition.grandPrixRaces.filter(
                                    (race) => race.status === "finished"
                                  ).length;
                                  
                                  const totalRaceCount =
                                  competition.grand_prix_count ?? 0;
                                  
                                  const progress =
                                  totalRaceCount > 0
                                  ? Math.round(
                                    (completedRaceCount / totalRaceCount) * 100
                                  )
                                  : 0;
                                  
                                  const champion =
                                  competition.players.find(
                                    (player) =>
                                      player.id === competition.winner_player_id
                                  ) ?? null;
                                  
                                  let buttonLabel = "Voir la saison";
                                  
                                  if (isFinished) {
                                    buttonLabel = "Voir le classement final";
                                  } else if (isAbandoned) {
                                    buttonLabel = "Voir la saison abandonnée";
                                  } else if (
                                    competition.current_round_number !== null &&
                                    competition.current_play_mode !== null
                                  ) {
                                    buttonLabel = "Reprendre le Grand Prix";
                                  } else if (completedRaceCount > 0) {
                                    buttonLabel = "Continuer la saison";
                                  }
                                  
                                  return (
                                    <button
                                    type="button"
                                    onClick={onOpen}
                                    className="group w-full overflow-hidden rounded-3xl border border-[#D3202F]/60 bg-[#111111] text-left text-white transition hover:-translate-y-1 hover:border-[#F13C49]"
                                    >
                                    <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#171717] via-[#8E111B] to-[#D3202F] px-6 py-5">
                                    <div className="absolute inset-0 opacity-20">
                                    <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[28px] border-black/70" />
                                    <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full border-[28px] border-black/70" />
                                    </div>
                                    
                                    <div className="relative flex items-start justify-between gap-4">
                                    <div>
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200">
                                    🏎️ Saison Grand Prix
                                    </p>
                                    
                                    <h3 className="mt-2 text-2xl font-black">
                                    Championnat · {competition.column_mode} colonnes
                                    </h3>
                                    
                                    <p className="mt-2 font-bold text-white/65">
                                    {competition.players.length} pilotes ·{" "}
                                    {totalRaceCount} Grands Prix
                                    </p>
                                    </div>
                                    
                                    <GrandPrixStatusBadge
                                    competition={competition}
                                    />
                                    </div>
                                    </div>
                                    
                                    <div className="p-6">
                                    <div className="flex items-center justify-between gap-4">
                                    <div>
                                    <p className="text-sm font-black uppercase tracking-widest text-white/45">
                                    Progression
                                    </p>
                                    
                                    <p className="mt-1 text-xl font-black">
                                    {completedRaceCount} / {totalRaceCount} GP terminés
                                    </p>
                                    </div>
                                    
                                    <div className="text-right">
                                    <p className="text-3xl font-black text-[#F13C49]">
                                    {progress}%
                                    </p>
                                    </div>
                                    </div>
                                    
                                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                                    <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${progress}%`,
                                      background:
                                      "linear-gradient(90deg, #8E111B 0%, #F13C49 100%)",
                                    }}
                                    />
                                    </div>
                                    <div className="mt-5 flex flex-wrap gap-2">
                                    {competition.players.slice(0, 6).map((player) => (
                                      <span
                                      key={player.id}
                                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-black text-white/75"
                                      >
                                      {player.player_name}
                                      </span>
                                    ))}
                                    </div>
                                    
                                    {!isFinished && !isAbandoned && displayedRace && (
                                      <div className="mt-5 rounded-2xl border border-[#D3202F]/40 bg-[#D3202F]/10 p-4">
                                      <p className="text-xs font-black uppercase tracking-widest text-[#F13C49]">
                                      {playingRace
                                        ? "Grand Prix en cours"
                                        : "Prochain Grand Prix"}
                                        </p>
                                        
                                        <p className="mt-1 font-black">
                                        Manche {displayedRace.race_number} ·{" "}
                                        {getGrandPrixCircuitName(displayedRace.circuit_id)}
                                        </p>
                                        </div>
                                      )}
                                      
                                      {isFinished && champion && (
                                        <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
                                        <p className="text-xs font-black uppercase tracking-widest text-amber-300">
                                        Champion
                                        </p>
                                        
                                        <p className="mt-1 text-lg font-black">
                                        🏆 {champion.player_name}
                                        </p>
                                        </div>
                                      )}
                                      
                                      <div className="mt-6 flex items-center justify-between">
                                      <span className="font-black text-[#F13C49]">
                                      {buttonLabel}
                                      </span>
                                      
                                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D3202F]/15 text-[#F13C49] transition group-hover:bg-[#D3202F] group-hover:text-white">
                                      <ChevronRight
                                      className="h-6 w-6"
                                      strokeWidth={3}
                                      />
                                      </div>
                                      </div>
                                      </div>
                                      </button>
                                    );
                                  }
                                  function GrandPrixStatusBadge({
                                    competition,
                                  }: {
                                    competition: CompetitionWithPlayers;
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
                                    
                                    const playingRace =
                                    competition.grandPrixRaces.find(
                                      (race) => race.status === "playing"
                                    );
                                    
                                    if (playingRace) {
                                      return (
                                        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black uppercase text-amber-200">
                                        GP {playingRace.race_number} en cours
                                        </span>
                                      );
                                    }
                                    
                                    return (
                                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase text-white/80">
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
                                    function PalmaresCard({
                                      icon,
                                      value,
                                      label,
                                    }: {
                                      icon: string;
                                      value: string;
                                      label: string;
                                    }) {
                                      return (
                                        <div className="rounded-2xl border border-white/5 bg-black/30 p-5 text-center transition hover:border-[#9B6A28]/30">
                                        <div className="text-3xl">
                                        {icon}
                                        </div>
                                        
                                        <div className="mt-3 text-3xl font-black text-white">
                                        {value}
                                        </div>
                                        
                                        <div className="mt-1 text-sm font-bold text-slate-500">
                                        {label}
                                        </div>
                                        </div>
                                      );
                                    }