"use client";

import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import AuthButton from "../../../components/AuthButton";
import { supabase } from "../../../lib/supabase";
import { createPortal } from "react-dom";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
type CompetitionStatus = "in_progress" | "finished" | "abandoned";
type RaceStatus = "waiting" | "playing" | "finished";
type PlayMode = "local" | "salon";

type Competition = {
  id: string;
  competition_type: string;
  status: CompetitionStatus;
  column_mode: 3 | 6;
  grand_prix_count: number;
  winner_player_id: string | null;
  current_round_number: number | null;
  current_play_mode: PlayMode | null;
  created_at: string;
  finished_at: string | null;
  abandoned_at: string | null;
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_order: number;
  player_key: string;
  player_name: string;
  profile_id: string | null;
  avatar_url: string | null;
};

type GrandPrixRace = {
  id: string;
  competition_id: string;
  race_number: number;
  circuit_id: string;
  status: RaceStatus;
  play_mode: PlayMode | null;
  game_id: string | null;
  started_at: string | null;
  finished_at: string | null;
};

type GrandPrixResult = {
  id: string;
  grand_prix_id: string;
  competition_player_id: string;
  final_score: number;
  final_rank: number;
  points_awarded: number;
};

type Circuit = {
  name: string;
  shortName: string;
  flag: string;
  country: string;
  accent: string;
  background: string;
};

const CIRCUITS: Record<string, Circuit> = {
  melbourne: {
    name: "Grand Prix d’Australie",
    shortName: "Melbourne",
    flag: "au",
    country: "Australie",
    accent: "#55C2E8",
    background: "from-[#082E45] via-[#075985] to-[#0EA5E9]",
  },
  bahrain: {
    name: "Grand Prix de Bahreïn",
    shortName: "Bahreïn",
    flag: "bh",
    country: "Bahreïn",
    accent: "#E7B35A",
    background: "from-[#3B1D0B] via-[#8A4B19] to-[#D99A3B]",
  },
  jeddah: {
    name: "Grand Prix d’Arabie saoudite",
    shortName: "Djeddah",
    flag: "sa",
    country: "Arabie saoudite",
    accent: "#48C78E",
    background: "from-[#062A22] via-[#075E4A] to-[#0A9B76]",
  },
  suzuka: {
    name: "Grand Prix du Japon",
    shortName: "Suzuka",
    flag: "jp",
    country: "Japon",
    accent: "#F05A67",
    background: "from-[#3B0A10] via-[#8F1827] to-[#E11D48]",
  },
  shanghai: {
    name: "Grand Prix de Chine",
    shortName: "Shanghai",
    flag: "cn",
    country: "Chine",
    accent: "#F1C75B",
    background: "from-[#3A0707] via-[#991B1B] to-[#DC2626]",
  },
  imola: {
    name: "Grand Prix d’Émilie-Romagne",
    shortName: "Imola",
    flag: "it",
    country: "Italie",
    accent: "#57C28B",
    background: "from-[#082E1C] via-[#166534] to-[#22C55E]",
  },
  monaco: {
    name: "Grand Prix de Monaco",
    shortName: "Monaco",
    flag: "mc",
    country: "Monaco",
    accent: "#F04A54",
    background: "from-[#3B090E] via-[#991B1B] to-[#EF3340]",
  },
  barcelona: {
    name: "Grand Prix d’Espagne",
    shortName: "Barcelone",
    flag: "es",
    country: "Espagne",
    accent: "#F4C64E",
    background: "from-[#3A1605] via-[#B45309] to-[#F59E0B]",
  },
  montreal: {
    name: "Grand Prix du Canada",
    shortName: "Montréal",
    flag: "ca",
    country: "Canada",
    accent: "#F06464",
    background: "from-[#3B0909] via-[#991B1B] to-[#EF4444]",
  },
  spielberg: {
    name: "Grand Prix d’Autriche",
    shortName: "Spielberg",
    flag: "at",
    country: "Autriche",
    accent: "#F15B64",
    background: "from-[#32090D] via-[#8F1722] to-[#D9273A]",
  },
  silverstone: {
    name: "Grand Prix de Grande-Bretagne",
    shortName: "Silverstone",
    flag: "gb",
    country: "Grande-Bretagne",
    accent: "#6E96F2",
    background: "from-[#0A1739] via-[#1D3B79] to-[#315BB5]",
  },
  spa: {
    name: "Grand Prix de Belgique",
    shortName: "Spa-Francorchamps",
    flag: "be",
    country: "Belgique",
    accent: "#E3C64B",
    background: "from-[#2E2607] via-[#705E13] to-[#B59B23]",
  },
  zandvoort: {
    name: "Grand Prix des Pays-Bas",
    shortName: "Zandvoort",
    flag: "nl",
    country: "Pays-Bas",
    accent: "#F3934E",
    background: "from-[#3D1907] via-[#A3470D] to-[#E8731A]",
  },
  monza: {
    name: "Grand Prix d’Italie",
    shortName: "Monza",
    flag: "it",
    country: "Italie",
    accent: "#58C58C",
    background: "from-[#082E1C] via-[#166534] to-[#22C55E]",
  },
  singapore: {
    name: "Grand Prix de Singapour",
    shortName: "Singapour",
    flag: "sg",
    country: "Singapour",
    accent: "#BE78EE",
    background: "from-[#240B36] via-[#581C87] to-[#9333EA]",
  },
  austin: {
    name: "Grand Prix des États-Unis",
    shortName: "Austin",
    flag: "us",
    country: "États-Unis",
    accent: "#678DE9",
    background: "from-[#0A1739] via-[#1E3A8A] to-[#315BC7]",
  },
  mexico: {
    name: "Grand Prix du Mexique",
    shortName: "Mexico",
    flag: "mx",
    country: "Mexique",
    accent: "#52BB83",
    background: "from-[#082E1C] via-[#166534] to-[#22A45D]",
  },
  interlagos: {
    name: "Grand Prix de São Paulo",
    shortName: "Interlagos",
    flag: "br",
    country: "Brésil",
    accent: "#E2C84E",
    background: "from-[#18320B] via-[#3F7015] to-[#7DAD21]",
  },
  abu_dhabi: {
    name: "Grand Prix d’Abou Dabi",
    shortName: "Abou Dabi",
    flag: "ae",
    country: "Émirats arabes unis",
    accent: "#58C5B8",
    background: "from-[#082B2B] via-[#0F6762] to-[#13A89E]",
  },
};
export default function GrandPrixSeasonPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const competitionId = params.id;
  const [selectedRaceId, setSelectedRaceId] =
  useState<string | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [players, setPlayers] = useState<CompetitionPlayer[]>([]);
  const [races, setRaces] = useState<GrandPrixRace[]>([]);
  const [results, setResults] = useState<GrandPrixResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRaceConfig, setShowRaceConfig] = useState(false);
  const [orderedPlayerIds, setOrderedPlayerIds] = useState<string[]>([]);
  const [isStartingRace, setIsStartingRace] = useState(false);
  const [raceStartError, setRaceStartError] = useState<string | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] =
  useState(false);
  
  const [isAbandoning, setIsAbandoning] =
  useState(false);
  const searchParams = useSearchParams();
  const [podiumOpen, setPodiumOpen] = useState(
    searchParams.get("victory") === "1"
  );
  const showChampionPodium =
  competition?.status === "finished" && podiumOpen;
  
  useEffect(() => {
    if (!competitionId) return;
    
    async function loadSeason() {
      setLoading(true);
      setErrorMessage(null);
      
      const [
        competitionResponse,
        playersResponse,
        racesResponse,
      ] = await Promise.all([
        supabase
        .from("competitions")
        .select(
          `
            id,
            competition_type,
            status,
            column_mode,
            grand_prix_count,
            winner_player_id,
            current_round_number,
            current_play_mode,
            created_at,
            finished_at,
            abandoned_at
            `
        )
        .eq("id", competitionId)
        .maybeSingle(),
        
        supabase
        .from("competition_players")
        .select(
          `
            id,
            competition_id,
            player_order,
            player_key,
            player_name,
            profile_id,
            avatar_url
            `
        )
        .eq("competition_id", competitionId)
        .order("player_order", { ascending: true }),
        
        supabase
        .from("competition_grand_prix")
        .select(
          `
            id,
            competition_id,
            race_number,
            circuit_id,
            status,
            play_mode,
            game_id,
            started_at,
            finished_at
            `
        )
        .eq("competition_id", competitionId)
        .order("race_number", { ascending: true }),
      ]);
      
      if (
        competitionResponse.error ||
        !competitionResponse.data
      ) {
        console.error(
          "Erreur chargement saison Grand Prix",
          competitionResponse.error
        );
        setErrorMessage(
          "Cette saison est introuvable ou inaccessible."
        );
        setLoading(false);
        return;
      }
      
      const loadedCompetition =
      competitionResponse.data as Competition;
      
      if (loadedCompetition.competition_type !== "grand_prix") {
        setErrorMessage(
          "Cette compétition n’est pas une saison Grand Prix."
        );
        setLoading(false);
        return;
      }
      
      if (playersResponse.error) {
        console.error(
          "Erreur chargement pilotes",
          playersResponse.error
        );
        setErrorMessage(
          "Impossible de charger les pilotes de la saison."
        );
        setLoading(false);
        return;
      }
      
      if (racesResponse.error) {
        console.error(
          "Erreur chargement calendrier",
          racesResponse.error
        );
        setErrorMessage(
          "Impossible de charger le calendrier de la saison."
        );
        setLoading(false);
        return;
      }
      
      const loadedRaces =
      (racesResponse.data ?? []) as GrandPrixRace[];
      
      const raceIds = loadedRaces.map((race) => race.id);
      
      let loadedResults: GrandPrixResult[] = [];
      
      if (raceIds.length > 0) {
        const resultsResponse = await supabase
        .from("competition_grand_prix_results")
        .select(
          `
            id,
            grand_prix_id,
            competition_player_id,
            final_score,
            final_rank,
            points_awarded
            `
        )
        .in("grand_prix_id", raceIds);
        
        if (resultsResponse.error) {
          console.error(
            "Erreur chargement résultats Grand Prix",
            resultsResponse.error
          );
          setErrorMessage(
            "Impossible de charger les résultats de la saison."
          );
          setLoading(false);
          return;
        }
        
        loadedResults =
        (resultsResponse.data ?? []) as GrandPrixResult[];
      }
      
      setCompetition(loadedCompetition);
      setPlayers(
        (playersResponse.data ?? []) as CompetitionPlayer[]
      );
      setRaces(loadedRaces);
      setResults(loadedResults);
      setLoading(false);
    }
    
    void loadSeason();
    
    const channel = supabase
    .channel(`grand_prix_season_${competitionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "competition_grand_prix",
        filter: `competition_id=eq.${competitionId}`,
      },
      () => void loadSeason()
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "competitions",
        filter: `id=eq.${competitionId}`,
      },
      () => void loadSeason()
    )
    .subscribe();
    
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [competitionId]);
  
  const finishedRaces = useMemo(
    () => races.filter((race) => race.status === "finished"),
    [races]
  );
  
  const activeRace =
  races.find((race) => race.status === "playing") ??
  races.find((race) => race.status === "waiting") ??
  null;
  
  const standings = useMemo(() => {
    return players
    .map((player) => {
      const playerResults = results.filter(
        (result) =>
          result.competition_player_id === player.id
      );
      
      return {
        player,
        
        points: playerResults.reduce(
          (total, result) =>
            total + result.points_awarded,
          0
        ),
        
        wins: playerResults.filter(
          (result) => result.final_rank === 1
        ).length,
        
        podiums: playerResults.filter(
          (result) => result.final_rank <= 3
        ).length,
        averageScore:
        playerResults.length > 0
        ? Math.round(
          playerResults.reduce(
            (total, result) => total + result.final_score,
            0
          ) / playerResults.length
        )
        : null,
        bestScore:
        playerResults.length > 0
        ? Math.max(
          ...playerResults.map(
            (result) => result.final_score
          )
        )
        : null,
      };
      
    })
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      
      return (
        (b.bestScore ?? -1) -
        (a.bestScore ?? -1)
      );
    });
  }, [players, results]);
  
  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-black px-4 text-white">
      <div className="text-center">
      <div className="text-6xl">🏎️</div>
      <p className="mt-4 animate-pulse font-black text-slate-400">
      Chargement de la grille…
      </p>
      </div>
      </main>
    );
  }
  
  if (!competition || errorMessage) {
    return (
      <main className="min-h-dvh bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-red-500/40 bg-[#111111] p-7 text-center">
      <div className="text-6xl">🏁</div>
      <h1 className="mt-4 text-2xl font-black">
      Saison inaccessible
      </h1>
      <p className="mt-3 font-bold text-slate-400">
      {errorMessage ??
        "Impossible de charger cette saison."}
        </p>
        <button
        type="button"
        onClick={() => router.push("/modes-speciaux")}
        className="mt-6 rounded-xl bg-white px-5 py-3 font-black text-black"
        >
        Retour aux modes spéciaux
        </button>
        </div>
        </main>
      );
    }
    
    const progress =
    competition.grand_prix_count > 0
    ? Math.round(
      (finishedRaces.length /
        competition.grand_prix_count) *
        100
      )
      : 0;
      
      const activeCircuit = activeRace
      ? getCircuit(activeRace.circuit_id)
      : null;
      
      function openRaceConfig() {
        if (!activeRace || activeRace.status !== "waiting") return;
        
        setOrderedPlayerIds(
          [...players]
          .sort((a, b) => a.player_order - b.player_order)
          .map((player) => player.id)
        );
        setRaceStartError(null);
        setShowRaceConfig(true);
      }
      
      function handlePlayerDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        
        if (!over || active.id === over.id) {
          return;
        }
        
        setOrderedPlayerIds((current) => {
          const oldIndex = current.indexOf(String(active.id));
          const newIndex = current.indexOf(String(over.id));
          
          if (oldIndex === -1 || newIndex === -1) {
            return current;
          }
          
          return arrayMove(current, oldIndex, newIndex);
        });
      }
      async function startGrandPrix(mode: PlayMode) {
        if (!competition || !activeRace) return;
        
        if (orderedPlayerIds.length !== players.length) {
          setRaceStartError("L’ordre doit contenir tous les pilotes.");
          return;
        }
        
        setIsStartingRace(true);
        setRaceStartError(null);
        
        const { data, error } = await supabase.rpc("start_grand_prix", {
          p_competition_id: competition.id,
          p_grand_prix_id: activeRace.id,
          p_play_mode: mode,
          p_ordered_competition_player_ids: orderedPlayerIds,
        });
        
        if (error || !data) {
          console.error("Erreur lancement Grand Prix", {
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
          });
          
          setRaceStartError(
            error?.message ?? "Impossible de lancer ce Grand Prix."
          );
          setIsStartingRace(false);
          return;
        }
        
        const result = data as {
          play_mode: PlayMode;
          game_id: string;
          salon_code: string | null;
          grand_prix_id: string;
          race_number: number;
        };
        
        setShowRaceConfig(false);
        setIsStartingRace(false);
        
        if (result.play_mode === "salon" && result.salon_code) {
          router.push(`/salon/${result.salon_code}/access`);
          return;
        }
        
        sessionStorage.setItem(
          "yam-grand-prix-local-race",
          JSON.stringify({
            competitionId: competition.id,
            grandPrixId: result.grand_prix_id,
            raceNumber: result.race_number,
            gameId: result.game_id,
          })
        );
        
        router.push(
          `/?competitionId=${competition.id}&gameId=${result.game_id}&grandPrixId=${result.grand_prix_id}`
        );
      }
      
      async function resumeGrandPrix() {
        if (!competition || !activeRace || !activeRace.game_id) return;
        
        setRaceStartError(null);
        
        if (activeRace.play_mode === "salon") {
          const { data: salon, error } = await supabase
          .from("yam_games")
          .select("code")
          .eq("id", activeRace.game_id)
          .maybeSingle();
          
          if (error || !salon) {
            setRaceStartError("Impossible de retrouver le Salon de ce Grand Prix.");
            return;
          }
          
          router.push(`/salon/${salon.code}/access`);
          return;
        }
        
        sessionStorage.setItem(
          "yam-grand-prix-local-race",
          JSON.stringify({
            competitionId: competition.id,
            grandPrixId: activeRace.id,
            raceNumber: activeRace.race_number,
            gameId: activeRace.game_id,
          })
        );
        
        router.push(
          `/?competitionId=${competition.id}&gameId=${activeRace.game_id}&grandPrixId=${activeRace.id}`
        );
      }
      async function abandonGrandPrixSeason() {
        if (!competition || isAbandoning) return;
        
        setIsAbandoning(true);
        setRaceStartError(null);
        
        const { error } = await supabase.rpc(
          "abandon_competition",
          {
            p_competition_id: competition.id,
          }
        );
        
        if (error) {
          console.error("Erreur abandon saison Grand Prix", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          
          setRaceStartError(
            "Impossible d’abandonner définitivement la saison."
          );
          
          setIsAbandoning(false);
          return;
        }
        
        sessionStorage.removeItem(
          "yam-grand-prix-local-race"
        );
        
        setShowAbandonConfirm(false);
        setIsAbandoning(false);
        
        router.push("/modes-speciaux");
      }
      function handleActiveRaceAction() {
        if (!activeRace) return;
        
        if (activeRace.status === "playing") {
          void resumeGrandPrix();
          return;
        }
        
        openRaceConfig();
      }
      const selectedRace =
      races.find((race) => race.id === selectedRaceId) ?? null;
      
      const selectedRaceResults = selectedRace
      ? results
      .filter(
        (result) =>
          result.grand_prix_id === selectedRace.id
      )
      .sort(
        (a, b) =>
          a.final_rank - b.final_rank
      )
      : [];
      return (
        <main className="min-h-dvh bg-black px-4 py-8 text-white">
        <AuthButton />
        
        <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <button
        type="button"
        onClick={() => router.push("/modes-speciaux")}
        className="rounded-xl border border-white/15 bg-[#0B0B0B] px-4 py-2 font-black transition hover:border-[#E12636] hover:bg-[#151515]"
        >
        ← Modes spéciaux
        </button>
        
        <span className="rounded-xl border border-white/15 bg-[#0B0B0B] px-5 py-2 text-xs font-black uppercase tracking-widest text-white/75">
        {competition.column_mode} colonnes
        </span>
        </div>
        
        <SeasonHero
        competition={competition}
        finishedRaceCount={finishedRaces.length}
        progress={progress}
        />
        {competition.status === "finished" && (
          <div className="mt-5 flex justify-center">
          <button
          type="button"
          onClick={() => setPodiumOpen(true)}
          className="rounded-xl border border-[#D4AF37]/60 bg-[#D4AF37]/10 px-6 py-3 font-black text-[#F2D675] transition hover:bg-[#D4AF37]/20"
          >
          🏆 Voir le podium final
          </button>
          </div>
        )}
        <div className="gp-dashboard mt-6">
        <NextGrandPrixCard
        race={activeRace}
        circuit={activeCircuit}
        competition={competition}
        onPrepare={handleActiveRaceAction}
        />
        
        <StandingsCard standings={standings} playerCount={players.length} />
        </div>
        
        <CalendarCard
        races={races}
        results={results}
        activeRaceId={activeRace?.id ?? null}
        finishedRaceCount={finishedRaces.length}
        grandPrixCount={competition.grand_prix_count}
        onOpenRace={(raceId) =>
          setSelectedRaceId(raceId)
        }
        />
        {competition.status === "in_progress" && (
          <section className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/5 p-5">
          <h2 className="font-black text-red-300">
          Zone sensible
          </h2>
          
          <p className="mt-2 text-sm font-bold text-slate-500">
          La saison sera clôturée définitivement et ne pourra plus être reprise.
          Les Grands Prix déjà terminés resteront enregistrés.
          </p>
          
          <button
          type="button"
          onClick={() => setShowAbandonConfirm(true)}
          className="mt-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 font-black text-red-300 transition hover:bg-red-500/20"
          >
          Abandonner définitivement la saison
          </button>
          </section>
        )}
        <p className="mt-6 border-t border-white/10 py-6 text-center font-bold text-white/50">
        🏆 Le pilote avec le plus de points à la fin de la saison remporte le
        titre de Champion Grand Prix.
        </p>
        </div>
        
        {showRaceConfig && activeRace && activeCircuit && (
          <GrandPrixPreparationModal
          race={activeRace}
          circuit={activeCircuit}
          players={players}
          orderedPlayerIds={orderedPlayerIds}
          isStarting={isStartingRace}
          errorMessage={raceStartError}
          onDragEnd={handlePlayerDragEnd}
          onStart={startGrandPrix}
          onClose={() => {
            if (isStartingRace) return;
            
            setShowRaceConfig(false);
            setRaceStartError(null);
          }}
          />
        )}
        {selectedRace && (
          <GrandPrixResultModal
          race={selectedRace}
          circuit={getCircuit(selectedRace.circuit_id)}
          results={selectedRaceResults}
          players={players}
          onClose={() => setSelectedRaceId(null)}
          onViewGame={async () => {
  if (!selectedRace.game_id) return;

  // En local, game_id est directement l’id de local_games.
  if (selectedRace.play_mode === "local") {
    router.push(
      `/profile/games/${selectedRace.game_id}`
    );
    return;
  }

  // En salon, game_id est l’id de yam_games.
  // On retrouve donc la copie enregistrée dans local_games.
  const { data: localGame, error } = await supabase
    .from("local_games")
    .select("id")
    .eq("competition_id", competition.id)
    .eq(
      "competition_round_number",
      selectedRace.race_number
    )
    .eq("source", "salon")
    .maybeSingle();

  if (error || !localGame) {
    console.error(
      "Impossible de retrouver l’historique du GP Salon",
      {
        competitionId: competition.id,
        raceNumber: selectedRace.race_number,
        error,
      }
    );

    return;
  }

  router.push(`/profile/games/${localGame.id}`);
}}
          />
        )}
        {showChampionPodium && standings.length > 0 && (
          <GrandPrixChampionPodium
          standings={standings}
          onViewSeason={() => {
            setPodiumOpen(false);
            
            router.replace(
              `/modes-speciaux/grand-prix/${competition.id}`,
              {
                scroll: false,
              }
            );
          }}
          onBackHome={() => {
            router.push("/");
          }}
          />
        )}
        {showAbandonConfirm &&
          typeof document !== "undefined" &&
          createPortal(
            <div
            className="fixed inset-0 flex items-center justify-center px-4"
            style={{
              zIndex: 999999,
              backgroundColor: "rgba(0, 0, 0, 0.94)",
            }}
            >
            <div
            className="w-full max-w-md rounded-3xl p-6 text-center"
            style={{
              position: "relative",
              zIndex: 1000000,
              backgroundColor: "#080808",
              border: "1px solid rgba(239, 68, 68, 0.65)",
              boxShadow: "0 30px 100px rgba(0, 0, 0, 1)",
            }}
            >
            <div className="text-5xl">⚠️</div>
            
            <p className="mt-4 text-sm font-black uppercase tracking-widest text-red-400">
            Confirmation
            </p>
            
            <h2 className="mt-2 text-3xl font-black text-white">
            Abandonner la saison Grand Prix ?
            </h2>
            
            <p className="mt-4 font-bold text-slate-400">
            Cette saison sera définitivement clôturée et ne pourra plus être
            reprise. Les courses déjà terminées resteront visibles dans
            l’historique.
            </p>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
            <button
            type="button"
            disabled={isAbandoning}
            onClick={() => setShowAbandonConfirm(false)}
            className="rounded-xl px-4 py-3 font-black text-white disabled:opacity-50"
            style={{
              backgroundColor: "#241A13",
            }}
            >
            Annuler
            </button>
            
            <button
            type="button"
            disabled={isAbandoning}
            onClick={() => void abandonGrandPrixSeason()}
            className="rounded-xl px-4 py-3 font-black text-white transition disabled:opacity-50"
            style={{
              backgroundColor: "#DC2626",
            }}
            >
            {isAbandoning ? "Abandon..." : "Confirmer"}
            </button>
            </div>
            </div>
            </div>,
            document.body
          )}
          <style jsx>{`
        .gp-dashboard {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 24px;
          align-items: stretch;
        }
            
        @media (min-width: 900px) {
          .gp-dashboard {
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          }
        }
      `}</style>
            </main>
          );
        }
        
        
        function GrandPrixPreparationModal({
          race,
          circuit,
          players,
          orderedPlayerIds,
          isStarting,
          errorMessage,
          onDragEnd,
          onStart,
          onClose,
        }: {
          race: GrandPrixRace;
          circuit: Circuit;
          players: CompetitionPlayer[];
          orderedPlayerIds: string[];
          isStarting: boolean;
          errorMessage: string | null;
          onDragEnd: (event: DragEndEvent) => void;
          onStart: (mode: PlayMode) => void;
          onClose: () => void;
        }) {
          const orderedPlayers = orderedPlayerIds
          .map((playerId) =>
            players.find((player) => player.id === playerId)
        )
        .filter(
          (player): player is CompetitionPlayer => Boolean(player)
        );
        
        if (typeof document === "undefined") {
  return null;
}

return createPortal(
  <div
    className="fixed inset-0 overflow-y-auto px-4 py-8"
    style={{
      zIndex: 999999,
      backgroundColor: "rgba(0, 0, 0, 0.94)",
    }}
  >
    <div
      className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
      style={{
        position: "relative",
        zIndex: 1000000,
        backgroundColor: "#0B0B0B",
        boxShadow: "0 30px 100px rgba(0, 0, 0, 1)",
      }}
    >
      <div
        className="relative overflow-hidden border-b border-white/10 px-6 py-6 sm:px-8"
        style={{
          background: `radial-gradient(circle at 85% 20%, ${circuit.accent}28, transparent 38%), linear-gradient(120deg, ${circuit.accent}12, rgba(0,0,0,.85))`,
        }}
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p
              className="text-xs font-black uppercase tracking-[0.22em]"
              style={{ color: circuit.accent }}
            >
              Manche {race.race_number}
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Préparer le GP de {circuit.shortName}
            </h2>

            <p className="mt-2 font-bold text-white/50">
              Glissez les joueurs pour définir leur ordre autour de la table.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl font-black text-white/70 transition hover:bg-white/10 disabled:opacity-40"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.45)",
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div
          className="rounded-2xl border border-white/10 p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.55)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-white/65">
                Ordre de jeu
              </p>

              <p className="mt-1 text-sm font-bold text-white/35">
                Le joueur en position 1 commence le Grand Prix.
              </p>
            </div>

            <span
              className="rounded-lg px-3 py-2 text-xs font-black text-white/45"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.06)",
              }}
            >
              {orderedPlayers.length} joueurs
            </span>
          </div>

          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={orderedPlayerIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-4 space-y-2">
                {orderedPlayers.map((player, index) => (
                  <SortablePlayerRow
                    key={player.id}
                    player={player}
                    position={index + 1}
                    disabled={isStarting}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {errorMessage && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onStart("local")}
            disabled={isStarting}
            className="rounded-2xl border border-white/15 px-5 py-4 text-left text-black transition hover:brightness-95 disabled:cursor-wait disabled:opacity-50"
            style={{
              backgroundColor: "#FFFFFF",
            }}
          >
            <span className="block text-lg font-black">
              {isStarting ? "Lancement…" : "Jouer en Local"}
            </span>

            <span className="mt-1 block text-sm font-bold text-black/55">
              Tous les joueurs sur cet écran
            </span>
          </button>

          <button
            type="button"
            onClick={() => onStart("salon")}
            disabled={isStarting}
            className="rounded-2xl px-5 py-4 text-left text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-50"
            style={{
              background:
                "linear-gradient(90deg, #B20F2A, #E12636)",
              boxShadow:
                "0 8px 24px rgba(200,16,46,.25)",
            }}
          >
            <span className="block text-lg font-black">
              {isStarting ? "Lancement…" : "Créer un Salon"}
            </span>

            <span className="mt-1 block text-sm font-bold text-white/65">
              Les joueurs rejoignent avec leur téléphone
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>,
  document.body
);
      }
      function SortablePlayerRow({
        player,
        position,
        disabled,
      }: {
        player: CompetitionPlayer;
        position: number;
        disabled: boolean;
      }) {
        const {
          attributes,
          listeners,
          setNodeRef,
          transform,
          transition,
          isDragging,
        } = useSortable({
          id: player.id,
          disabled,
        });
        
        return (
          <div
          ref={setNodeRef}
          style={{
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.65 : 1,
            boxShadow: isDragging
            ? "0 14px 35px rgba(0,0,0,.55)"
            : undefined,
            zIndex: isDragging ? 20 : undefined,
          }}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111111] px-3 py-3"
          >
          <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-lg border border-white/10 bg-black text-xl text-white/45 transition hover:bg-white/10 hover:text-white active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Déplacer ${player.player_name}`}
          >
          ⠿
          </button>
          
          <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white"
          style={{
            backgroundColor:
            position === 1 ? "#E12636" : "#292929",
          }}
          >
          {position}
          </div>
          
          <PlayerAvatar player={player} />
          
          <div className="min-w-0 flex-1">
          <p className="truncate font-black">
          {player.player_name}
          </p>
          
          <p className="text-xs font-bold text-white/35">
          {position === 1
            ? "Commence la partie"
            : `Joue en position ${position}`}
            </p>
            </div>
            </div>
          );
        }
        
        function SeasonHero({
          competition,
          finishedRaceCount,
          progress,
        }: {
          competition: Competition;
          finishedRaceCount: number;
          progress: number;
        }) {
          return (
            <section className="relative mt-8 min-h-[350px] overflow-hidden rounded-3xl border border-red-500/30 bg-[#160305]">
            <Image
            src="/grand-prix/grand-prix-hero.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 1200px) 100vw, 1152px"
            className="object-cover"
            style={{ objectPosition: "50% 50%" }}
            />
            
            <div
            className="absolute inset-0"
            style={{
              background:
              "linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 75px, rgba(4,0,1,.72) 150px, rgba(5,0,2,.72) 34%, rgba(5,0,2,.28) 60%, rgba(0,0,0,.03) 100%)",
            }}
            />
            
            <div
            className="absolute inset-0"
            style={{
              background:
              "linear-gradient(120deg, rgba(190,0,25,.10), transparent 62%)",
            }}
            />
            
            <div className="relative z-10 px-6 pb-7 pt-10 sm:px-12 sm:pl-24">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-white mt-2">
            Championnat YamScore
            </p>
            
            <h1 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
            Saison Grand Prix
            </h1>
            
            <p className="mt-6 font-bold text-white/70">
            {competition.status === "finished"
              ? "La saison est terminée."
              : competition.status === "abandoned"
              ? "Cette saison a été abandonnée."
              : `${finishedRaceCount} Grand Prix terminé${
                finishedRaceCount > 1 ? "s" : ""
              } sur ${competition.grand_prix_count}.`}
              </p>
              
              <div className="mt-10 rounded-2xl border border-white/10 bg-black/65 px-5 py-4 backdrop-blur-md">
              <div className="flex items-center gap-6">
              <div className="shrink-0">
              <p className="text-xs font-black uppercase tracking-widest text-white">
              Progression
              </p>
              <p className="mt-2 text-3xl font-black">
              {finishedRaceCount}
              <span className="text-xl text-white/45">
              {" "}
              / {competition.grand_prix_count}
              </span>
              </p>
              </div>
              
              <div className="flex min-w-0 flex-1 items-center gap-5">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #E12636 0%, #FF5966 100%)",
                borderRadius: "9999px",
                transition: "width .7s ease",
              }}
              />
              </div>
              <p className="min-w-[62px] text-right text-3xl font-black text-[#F04452]">
              {progress}%
              </p>
              </div>
              </div>
              </div>
              </div>
              </section>
            );
          }
          
          function NextGrandPrixCard({
            race,
            circuit,
            competition,
            onPrepare,
          }: {
            race: GrandPrixRace | null;
            circuit: Circuit | null;
            competition: Competition;
            onPrepare: () => void;
          }) {
            if (!race || !circuit) {
              return (
                <section className="flex min-h-[300px] items-center justify-center rounded-3xl border border-white/10 bg-[#07100A] p-8 text-center">
                <div>
                <div className="text-5xl">🏆</div>
                <h2 className="mt-4 text-2xl font-black">Saison terminée</h2>
                </div>
                </section>
              );
            }
            
            return (
              <section
              className="relative flex min-w-0 flex-col overflow-hidden rounded-3xl border bg-[#07100A]"
              style={{
                minHeight: 380,
                borderColor: `${circuit.accent}70`,
                boxShadow: `inset 5px 0 0 ${circuit.accent}`,
              }}
              >
              <div
              className="relative flex-1 overflow-hidden"
              style={{
                padding: "30px 28px 22px",
              }}
              >
              <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 78% 42%, ${circuit.accent}22 0%, transparent 36%), linear-gradient(110deg, ${circuit.accent}0F 0%, rgba(0,0,0,.74) 100%)`,
              }}
              />
              
              <div
              className="absolute inset-y-0 right-0 w-[48%]"
              style={{
                opacity: 0.055,
                backgroundImage:
                "linear-gradient(45deg,#fff 25%,transparent 25%), linear-gradient(-45deg,#fff 25%,transparent 25%), linear-gradient(45deg,transparent 75%,#fff 75%), linear-gradient(-45deg,transparent 75%,#fff 75%)",
                backgroundPosition:
                "0 0, 0 14px, 14px -14px, -14px 0",
                backgroundSize: "28px 28px",
                maskImage: "linear-gradient(to right, transparent, black 30%)",
                WebkitMaskImage:
                "linear-gradient(to right, transparent, black 30%)",
              }}
              />
              
              <div className="relative z-10">
              <p
              className="text-sm font-black uppercase tracking-[0.18em]"
              style={{ color: circuit.accent }}
              >
              Prochain Grand Prix
              </p>
              
              <div className="mt-6 flex min-w-0 items-center justify-between gap-5">
              <div className="flex min-w-0 items-center gap-5">
              <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 shadow-lg">
              <Image
              src={`/grand-prix/flags/${circuit.flag}.svg`}
              alt={circuit.country}
              width={56}
              height={42}
              className="h-10 w-auto rounded object-contain"
              />
              </div>
              
              <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-widest text-white/55">
              Manche {race.race_number} / {competition.grand_prix_count}
              </p>
              <h2
              className="mt-1 text-3xl font-black leading-none sm:text-4xl"
              style={{ color: circuit.accent }}
              >
              {circuit.shortName}
              </h2>
              <p className="mt-3 text-lg font-bold text-white/65">
              {circuit.country}
              </p>
              </div>
              </div>
              
              <div className="mr-3 flex justify-end">
              <CircuitOutline
              circuitId={race.circuit_id}
              size="large"
              />
              </div>
              </div>
              </div>
              </div>
              
              {competition.status === "in_progress" && (
                <div
                style={{
                  padding: "14px 24px 24px",
                }}
                >
                <button
                type="button"
                onClick={onPrepare}
                className="group flex h-14 w-full overflow-hidden rounded-xl text-white transition hover:brightness-110 active:scale-[0.99]"
                style={{
                  background: "linear-gradient(90deg, #B20F2A 0%, #E12636 100%)",
                  border: "1px solid rgba(255, 89, 102, 0.45)",
                  boxShadow: "0 8px 24px rgba(200, 16, 46, 0.35)",
                }}
                >
                <span className="flex min-w-0 flex-1 items-center justify-center px-4 text-base font-black sm:text-lg">
                {race.status === "playing"
                  ? `Reprendre le GP de ${circuit.shortName}`
                  : `Préparer le GP de ${circuit.shortName}`}
                  </span>
                  
                  <span
                  className="flex w-16 shrink-0 items-center justify-center text-xl"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.18)",
                    borderLeft: "1px solid rgba(255, 255, 255, 0.18)",
                  }}
                  >
                  🏁
                  </span>
                  </button>
                  </div>
                )}
                </section>
              );
            }
            
            function StandingsCard({
              standings,
              playerCount,
            }: {
              standings: Array<{
                player: CompetitionPlayer;
                points: number;
                wins: number;
                podiums: number;
                bestScore: number | null;
                averageScore: number | null;
              }>;
              playerCount: number;
            }) {
              return (
                <section
                className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-[#0B0B0B] p-6"
                style={{ minHeight: 380 }}
                >
                <div className="flex items-end justify-between gap-4">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F04452]">
                Classement général
                </p>
                <span className="text-sm font-bold text-white/45">
                {playerCount} pilotes
                </span>
                </div>
                
                <div className="mt-5 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/35">
                <div
                className="grid items-center gap-3 border-b border-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/35"
                style={{ gridTemplateColumns: "42px minmax(0, 1fr) auto" }}
                >
                <span className="text-center">#</span>
                <span>Pilote</span>
                <span className="text-right">Pts</span>
                </div>
                
                <div className="divide-y divide-white/10">
                {standings.map((entry, index) => (
                  <StandingRow
                  key={entry.player.id}
                  position={index + 1}
                  player={entry.player}
                  points={entry.points}
                  wins={entry.wins}
                  podiums={entry.podiums}
                  bestScore={entry.bestScore}
                  
                  />
                ))}
                </div>
                </div>
                </section>
              );
            }
            
            function CalendarCard({
              races,
              results,
              activeRaceId,
              finishedRaceCount,
              grandPrixCount,
              onOpenRace,
            }: {
              races: GrandPrixRace[];
              results: GrandPrixResult[];
              activeRaceId: string | null;
              finishedRaceCount: number;
              grandPrixCount: number;
              onOpenRace: (raceId: string) => void;
            }) {
              return (
                <section className="mt-6 rounded-3xl border border-white/10 bg-[#0B0B0B] p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F04452]">
                Calendrier
                </p>
                <p className="text-sm font-bold text-white/45">
                {finishedRaceCount} / {grandPrixCount} terminés
                </p>
                </div>
                
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {races.map((race) => (
                  <RaceCard
                  key={race.id}
                  race={race}
                  resultCount={
                    results.filter((result) => result.grand_prix_id === race.id)
                    .length
                  }
                  isCurrent={activeRaceId === race.id}
                  onOpen={() => onOpenRace(race.id)}
                  />
                ))}
                </div>
                </section>
              );
            }
            
            function RaceCard({
              race,
              resultCount,
              isCurrent,
              onOpen,
            }: {
              race: GrandPrixRace;
              resultCount: number;
              isCurrent: boolean;
              onOpen: () => void;
            }) {
              const circuit = getCircuit(race.circuit_id);
              const isFinished = race.status === "finished";
              
              return (
                <button
                type="button"
                onClick={() => {
                  if (isFinished) {
                    onOpen();
                  }
                }}
                disabled={!isFinished}
                className={[
                  "relative w-full overflow-hidden rounded-2xl border bg-[#0A0A0A] p-4 text-left transition",
                  isFinished
                  ? "cursor-pointer hover:-translate-y-0.5 hover:border-white/30"
                  : "cursor-default",
                ].join(" ")}
                style={{
                  borderColor: isCurrent
                  ? circuit.accent
                  : "rgba(255,255,255,.10)",
                  boxShadow: isCurrent
                  ? `inset 4px 0 0 ${circuit.accent}`
                  : undefined,
                }}
                >
                <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: `radial-gradient(circle at 85% 25%, ${circuit.accent}40, transparent 40%)`,
                }}
                />
                
                <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
                style={{
                  backgroundColor: circuit.accent,
                }}
                >
                {String(race.race_number).padStart(2, "0")}
                </div>
                
                <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-white/35">
                Manche {race.race_number}
                </p>
                
                <h3 className="mt-1 truncate text-xl font-black">
                {circuit.shortName}
                </h3>
                
                <p className="mt-1 truncate text-sm font-bold text-white/55">
                {circuit.country}
                </p>
                </div>
                </div>
                
                <CircuitOutline
                circuitId={race.circuit_id}
                size="compact"
                />
                </div>
                
                <div className="relative z-10 mt-4">
                <RaceStatusBadge
                status={race.status}
                resultCount={resultCount}
                accent={circuit.accent}
                />
                </div>
                </button>
              );
            }
            
            function RaceStatusBadge({
              status,
              resultCount,
              accent,
            }: {
              status: RaceStatus;
              resultCount: number;
              accent: string;
            }) {
              if (status === "finished") {
                return (
                  <div
                  className="rounded-xl border px-3 py-2 text-center text-xs font-black uppercase"
                  style={{
                    borderColor: `${accent}66`,
                    color: accent,
                    backgroundColor: `${accent}14`,
                  }}
                  >
                  Terminé · {resultCount}
                  </div>
                );
              }
              
              if (status === "playing") {
                return (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-center text-xs font-black uppercase text-amber-300">
                  En course
                  </div>
                );
              }
              
              return (
                <div
                className="rounded-xl border px-3 py-2 text-center text-xs font-black uppercase"
                style={{
                  borderColor: `${accent}4D`,
                  color: accent,
                  backgroundColor: `${accent}0F`,
                }}
                >
                À venir
                </div>
              );
            }
            
            function StandingRow({
              position,
              player,
              points,
              wins,
              podiums,
              bestScore,
              
            }: {
              position: number;
              player: CompetitionPlayer;
              points: number;
              wins: number;
              podiums: number;
              bestScore: number | null;
              
            }) {
              return (
                <div
                className="grid items-center gap-3 px-4 py-3.5"
                style={{ gridTemplateColumns: "42px minmax(0, 1fr) auto" }}
                >
                <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black"
                style={{
                  background:
                  position === 1
                  ? "linear-gradient(135deg, #FFF1A8 0%, #D4AF37 55%, #9B7412 100%)"
                  : position === 2
                  ? "linear-gradient(135deg, #FFFFFF 0%, #C0C0C0 55%, #7E8792 100%)"
                  : position === 3
                  ? "linear-gradient(135deg, #E8B17A 0%, #B87333 55%, #74401D 100%)"
                  : "rgba(255,255,255,0.06)",
                  color:
                  position === 1
                  ? "#3B2A00"
                  : position === 2
                  ? "#20242A"
                  : position === 3
                  ? "#FFFFFF"
                  : "rgba(255,255,255,0.5)",
                  border:
                  position === 1
                  ? "1px solid rgba(255, 225, 120, 0.7)"
                  : position === 2
                  ? "1px solid rgba(255,255,255,0.55)"
                  : position === 3
                  ? "1px solid rgba(224,160,95,0.55)"
                  : "1px solid rgba(255,255,255,0.04)",
                  boxShadow:
                  position === 1
                  ? "0 0 12px rgba(212,175,55,0.35)"
                  : position === 2
                  ? "0 0 10px rgba(192,192,192,0.2)"
                  : position === 3
                  ? "0 0 10px rgba(184,115,51,0.25)"
                  : "none",
                }}
                >
                {position}
                </div>
                
                <div className="flex min-w-0 items-center gap-3">
                <PlayerAvatar player={player} />
                <div className="min-w-0">
                <p className="truncate text-lg font-black text-white">
                {player.player_name}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-white/35">
                <span>
                🏆 {wins} victoire{wins > 1 ? "s" : ""}
                </span>
                
                <span>
                🥉 {podiums} podium{podiums > 1 ? "s" : ""}
                </span>
                
                {bestScore !== null && (
                  <span>
                  🎲 Record {bestScore}
                  </span>
                )}
                </div>
                </div>
                </div>
                
                <p className="text-right text-2xl font-black text-white">{points}</p>
                </div>
              );
            }
            
            function CircuitOutline({
              circuitId,
              size,
            }: {
              circuitId: string;
              size: "large" | "compact";
            }) {
              const circuit = getCircuit(circuitId);
              const dimensions =
              size === "large"
              ? { width: 205, height: 145 }
              : { width: 105, height: 70 };
              
              return (
                <div
                className="relative flex shrink-0 items-center justify-center"
                style={dimensions}
                >
                <img
                src={`/grand-prix/tracks/${circuitId}.svg`}
                alt={`Tracé du circuit ${circuit.shortName}`}
                className="h-full w-full object-contain"
                style={{ filter: `drop-shadow(0 0 3px ${circuit.accent}80)` }}
                />
                </div>
              );
            }
            
            function PlayerAvatar({
              player,
            }: {
              player: CompetitionPlayer;
            }) {
              if (player.avatar_url) {
                return (
                  <img
                  src={player.avatar_url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                );
              }
              
              return (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D3202F] text-base font-black">
                {player.player_name.charAt(0).toUpperCase()}
                </div>
              );
            }
            
            function getCircuit(circuitId: string): Circuit {
              return (
                CIRCUITS[circuitId] ?? {
                  name: "Grand Prix",
                  shortName: circuitId,
                  flag: "🏁",
                  country: "Circuit YamScore",
                  accent: "#D3202F",
                  background: "from-[#171717] via-[#5B1118] to-[#D3202F]",
                }
              );
            }
            function GrandPrixResultModal({
              race,
              circuit,
              results,
              players,
              onClose,
              onViewGame,
            }: {
              race: GrandPrixRace;
              circuit: Circuit;
              results: GrandPrixResult[];
              players: CompetitionPlayer[];
              onClose: () => void;
              onViewGame: () => void;
            }) {
              if (typeof document === "undefined") {
  return null;
}

return createPortal(
  <div
    className="fixed inset-0 overflow-y-auto px-4 py-8"
    style={{
      zIndex: 999999,
      backgroundColor: "rgba(0, 0, 0, 0.94)",
    }}
  >
    <div
      className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
      style={{
        position: "relative",
        zIndex: 1000000,
        backgroundColor: "#0B0B0B",
        boxShadow: "0 30px 100px rgba(0, 0, 0, 1)",
      }}
    >
                <div
                className="border-b border-white/10 px-6 py-6"
                style={{
                  background: `linear-gradient(120deg, ${circuit.accent}35, rgba(0,0,0,.9))`,
                }}
                >
                <div className="flex items-start justify-between gap-4">
                <div>
                <p
                className="text-xs font-black uppercase tracking-[0.22em]"
                style={{ color: circuit.accent }}
                >
                Manche {race.race_number}
                </p>
                
                <h2 className="mt-2 text-3xl font-black">
                {circuit.name}
                </h2>
                
                <p className="mt-2 font-bold text-white/50">
                Résultats définitifs
                </p>
                </div>
                
                <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-xl font-black text-white/70 hover:bg-white/10"
                >
                ×
                </button>
                </div>
                </div>
                
                <div className="space-y-3 p-6">
                {results.map((result) => {
                  const player = players.find(
                    (item) =>
                      item.id === result.competition_player_id
                  );
                  
                  return (
                    <div
                    key={result.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-4"
                    >
                    <div>
                    <p className="text-lg font-black">
                    {result.final_rank === 1
                      ? "🥇"
                      : result.final_rank === 2
                      ? "🥈"
                      : result.final_rank === 3
                      ? "🥉"
                      : `#${result.final_rank}`}{" "}
                      {player?.player_name ?? "Pilote"}
                      </p>
                      
                      <p className="mt-1 text-sm font-bold text-white/45">
                      Score : {result.final_score}
                      </p>
                      </div>
                      
                      <p
                      className="text-xl font-black"
                      style={{ color: circuit.accent }}
                      >
                      +{result.points_awarded} pts
                      </p>
                      </div>
                    );
                  })}
                  
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button
                  type="button"
                  onClick={onViewGame}
                  disabled={!race.game_id}
                  className="rounded-xl bg-white px-4 py-3 font-black text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                  Voir la feuille
                  </button>
                  
                  <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-black text-white transition hover:bg-white/10"
                  >
                  Fermer
                  </button>
                  </div>
                  </div>
                  </div>
                  </div>,
                  document.body
                );
              }
              function GrandPrixChampionPodium({
                standings,
                onViewSeason,
                onBackHome,
              }: {
                standings: Array<{
                  player: CompetitionPlayer;
                  points: number;
                  wins: number;
                  podiums: number;
                  bestScore: number | null;
                  averageScore: number | null;
                }>;
                onViewSeason: () => void;
                onBackHome: () => void;
              }) {
                const champion = standings[0] ?? null;
                const second = standings[1] ?? null;
                const third = standings[2] ?? null;
                const otherDrivers = standings.slice(3);
                
                if (!champion) return null;
                
                return (
                  <div
                  className="fixed inset-0 z-[70] overflow-y-auto px-4 py-8"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.98)",
                  }}
                  >
                  <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center">
                  <div
                  className="relative w-full overflow-hidden rounded-3xl border px-5 py-8 text-white shadow-2xl sm:px-10"
                  style={{
                    backgroundColor: "#080808",
                    borderColor: "rgba(212, 175, 55, 0.55)",
                    boxShadow:
                    "0 30px 80px rgba(0,0,0,0.8), 0 0 40px rgba(212,175,55,0.12)",
                  }}
                  >
                  <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                    "radial-gradient(circle at 50% 15%, rgba(212,175,55,.24), transparent 38%), linear-gradient(180deg, rgba(120,0,15,.18), transparent 55%)",
                  }}
                  />
                  
                  <div className="relative z-10 text-center">
                  <p className="text-sm font-black uppercase tracking-[0.32em] text-[#F2D675]">
                  Championnat terminé
                  </p>
                  
                  <div className="mt-3 text-6xl">🏆</div>
                  
                  <h2 className="mt-3 text-4xl font-black uppercase sm:text-6xl">
                  Champion Grand Prix
                  </h2>
                  
                  <p className="mt-3 text-xl font-black text-[#F2D675]">
                  {champion.player.player_name}
                  </p>
                  
                  <p className="mt-1 font-bold text-white/50">
                  {champion.points} points · {champion.wins} victoire
                  {champion.wins > 1 ? "s" : ""}
                  </p>
                  
                  <div className="mx-auto mt-4 grid max-w-3xl grid-cols-3 items-end gap-2 sm:gap-5">
                  <PodiumDriver
                  entry={second}
                  position={2}
                  />
                  
                  <PodiumDriver
                  entry={champion}
                  position={1}
                  isChampion
                  />
                  
                  <PodiumDriver
                  entry={third}
                  position={3}
                  />
                  </div>
                  <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
                  <SeasonStat
                  icon="🏆"
                  label="Victoires"
                  value={String(champion.wins)}
                  />
                  
                  <SeasonStat
                  icon="🥉"
                  label="Podiums"
                  value={String(champion.podiums)}
                  />
                  
                  <SeasonStat
                  icon="🎲"
                  label="Meilleur score"
                  value={
                    champion.bestScore !== null
                    ? String(champion.bestScore)
                    : "—"
                  }
                  />
                  
                  <SeasonStat
                  icon="📈"
                  label="Score moyen"
                  value={
                    champion.averageScore !== null
                    ? String(champion.averageScore)
                    : "—"
                  }
                  />
                  </div>
                  {otherDrivers.length > 0 && (
                    <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-black/45">
                    {otherDrivers.map((entry, index) => (
                      <div
                      key={entry.player.id}
                      className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3 text-left last:border-b-0"
                      >
                      <div className="flex min-w-0 items-center gap-3">
                      <span className="w-7 text-center font-black text-white/40">
                      {index + 4}
                      </span>
                      
                      <PlayerAvatar player={entry.player} />
                      
                      <span className="truncate font-black">
                      {entry.player.player_name}
                      </span>
                      </div>
                      
                      <span className="shrink-0 font-black text-white/65">
                      {entry.points} pts
                      </span>
                      </div>
                    ))}
                    </div>
                  )}
                  
                  <div className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
                  <button
                  type="button"
                  onClick={onViewSeason}
                  className="rounded-xl bg-white px-5 py-3 font-black text-black transition hover:bg-slate-200"
                  >
                  Voir la saison
                  </button>
                  
                  <button
                  type="button"
                  onClick={onBackHome}
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-black text-white transition hover:bg-white/10"
                  >
                  Retour à l’accueil
                  </button>
                  </div>
                  </div>
                  </div>
                  </div>
                  </div>
                );
              }
              function PodiumDriver({
                entry,
                position,
                isChampion = false,
              }: {
                entry:
                | {
                  player: CompetitionPlayer;
                  points: number;
                  wins: number;
                  podiums: number;
                  bestScore: number | null;
                  averageScore: number | null;
                }
                | null;
                position: 1 | 2 | 3;
                
                isChampion?: boolean;
              }) {
                if (!entry) {
                  return <div />;
                }
                
                const podiumStyle =
                position === 1
                ? {
                  background:
                  "linear-gradient(180deg, #F7E38A 0%, #D4AF37 48%, #8A6511 100%)",
                  color: "#2E2100",
                  borderColor: "rgba(255,232,140,.75)",
                }
                : position === 2
                ? {
                  background:
                  "linear-gradient(180deg, #FFFFFF 0%, #C7CDD5 50%, #707985 100%)",
                  color: "#20242A",
                  borderColor: "rgba(255,255,255,.65)",
                }
                : {
                  background:
                  "linear-gradient(180deg, #E6AF78 0%, #B87333 50%, #683815 100%)",
                  color: "#FFFFFF",
                  borderColor: "rgba(230,175,120,.65)",
                };
                const avatarBorder =
                position === 1
                ? {
                  borderColor: "#D4AF37",
                  boxShadow: "0 0 22px rgba(212,175,55,.45)",
                }
                : position === 2
                ? {
                  borderColor: "#C7CDD5",
                  boxShadow: "0 0 18px rgba(199,205,213,.35)",
                }
                : {
                  borderColor: "#CD7F32",
                  boxShadow: "0 0 18px rgba(205,127,50,.35)",
                };
                const podiumHeightPx =
                position === 1
                ? 240
                : position === 2
                ? 176
                : 136;
                return (
                  <div className="flex h-[330px] min-w-0 flex-col items-center justify-end">
                  <div className="relative mb-3">
                  {isChampion && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-4xl">
                    👑
                    </div>
                  )}
                  
                  <div
                  className={[
                    "flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-[3px]",
                    isChampion ? "scale-110" : "",
                  ].join(" ")}
                  style={avatarBorder}
                  >
                  <PlayerAvatarLarge player={entry.player} />
                  </div>
                  </div>
                  
                  <p className="w-full truncate px-1 text-center text-sm font-black sm:text-lg">
                  {entry.player.player_name}
                  </p>
                  
                  <p className="mt-1 text-xs font-black text-white/50 sm:text-sm">
                  {entry.points} pts
                  </p>
                  
                  <div
                  className="mt-3 flex w-full items-start justify-center rounded-t-2xl border-2 px-2 pt-5 text-4xl font-black shadow-xl sm:text-6xl"
                  style={{
                    ...podiumStyle,
                    height: `${podiumHeightPx}px`,
                  }}
                  >
                  {position}
                  </div>
                  </div>
                );
              }
              function PlayerAvatarLarge({ player }: { player: CompetitionPlayer }) {
                if (player.avatar_url) {
                  return (
                    <img
                    src={player.avatar_url}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                    />
                  );
                }
                
                return (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#D3202F] text-2xl font-black text-white sm:text-4xl">
                  {player.player_name.charAt(0).toUpperCase()}
                  </div>
                );
              }
              function SeasonStat({
                icon,
                label,
                value,
              }: {
                icon: string;
                label: string;
                value: string;
              }) {
                return (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center">
                  <div className="text-2xl">{icon}</div>
                  
                  <p className="mt-2 text-xs font-black uppercase tracking-wider text-white/40">
                  {label}
                  </p>
                  
                  <p className="mt-1 text-2xl font-black text-white">
                  {value}
                  </p>
                  </div>
                );
              }