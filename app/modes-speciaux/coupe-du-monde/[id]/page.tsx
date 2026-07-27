"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import AuthButton from "../../../components/AuthButton";
import LoadingScreen from "../../../components/LoadingScreen";
import { supabase } from "../../../lib/supabase";

type CompetitionStatus =
  | "in_progress"
  | "finished"
  | "abandoned";

type Competition = {
  id: string;
  competition_type: "world_cup";
  theme: "world_cup";
  status: CompetitionStatus;
  column_mode: 3 | 6;
  created_by: string;
  winner_player_id: string | null;
  started_at: string;
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

type CompetitionMatchStatus =
  | "waiting"
  | "ready"
  | "playing"
  | "finished";

type CompetitionMatch = {
  id: string;
  competition_id: string;
  round_number: number;
  match_number: number;

  player1_competition_player_id: string | null;
  player2_competition_player_id: string | null;
  winner_competition_player_id: string | null;

  next_match_id: string | null;
  next_match_slot: number | null;

  game_id: string | null;
  play_mode: "local" | "salon" | null;
  status: CompetitionMatchStatus;

  started_at: string | null;
  finished_at: string | null;
};

export default function WorldCupCompetitionPage() {
  const params = useParams();
  const router = useRouter();
const [selectedMatch, setSelectedMatch] =
  useState<CompetitionMatch | null>(null);

const [selectedStartingPlayerId, setSelectedStartingPlayerId] =
  useState<string | null>(null);

const [showMatchConfig, setShowMatchConfig] =
  useState(false);
const [showAbandonModal, setShowAbandonModal] =
  useState(false);

const [isAbandoning, setIsAbandoning] =
  useState(false);
const [isStartingMatch, setIsStartingMatch] =
  useState(false);
  const competitionId = String(params.id);

  const [competition, setCompetition] =
    useState<Competition | null>(null);

  const [players, setPlayers] =
    useState<CompetitionPlayer[]>([]);

  const [matches, setMatches] =
    useState<CompetitionMatch[]>([]);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadCompetition() {
      setLoading(true);
      setErrorMessage(null);

      const {
        data: competitionData,
        error: competitionError,
      } = await supabase
        .from("competitions")
        .select(
          `
          id,
          competition_type,
          theme,
          status,
          column_mode,
          created_by,
          winner_player_id,
          started_at,
          finished_at,
          abandoned_at
          `
        )
        .eq("id", competitionId)
        .eq("competition_type", "world_cup")
        .single();

      if (competitionError || !competitionData) {
        console.error(
          "Erreur chargement Coupe du Monde",
          {
            message: competitionError?.message,
            details: competitionError?.details,
            hint: competitionError?.hint,
            code: competitionError?.code,
          }
        );

        setErrorMessage(
          "Coupe du Monde introuvable ou inaccessible."
        );

        setLoading(false);
        return;
      }

      const {
        data: playersData,
        error: playersError,
      } = await supabase
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
        .order("player_order", {
          ascending: true,
        });

      if (playersError) {
        console.error(
          "Erreur chargement participants",
          playersError
        );

        setErrorMessage(
          "Impossible de charger les participants."
        );

        setLoading(false);
        return;
      }

      const {
        data: matchesData,
        error: matchesError,
      } = await supabase
        .from("competition_matches")
        .select(
          `
          id,
          competition_id,
          round_number,
          match_number,
          player1_competition_player_id,
          player2_competition_player_id,
          winner_competition_player_id,
          next_match_id,
          next_match_slot,
          game_id,
          play_mode,
          status,
          started_at,
          finished_at
          `
        )
        .eq("competition_id", competitionId)
        .order("round_number", {
          ascending: true,
        })
        .order("match_number", {
          ascending: true,
        });

      if (matchesError) {
        console.error(
          "Erreur chargement tableau",
          matchesError
        );

        setErrorMessage(
          "Impossible de charger le tableau."
        );

        setLoading(false);
        return;
      }

      setCompetition(
        competitionData as Competition
      );

      setPlayers(
        (playersData ?? []) as CompetitionPlayer[]
      );

      setMatches(
        (matchesData ?? []) as CompetitionMatch[]
      );

      setLoading(false);
    }

    void loadCompetition();

const competitionChannel = supabase
  .channel(`world_cup_${competitionId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "competition_matches",
      filter: `competition_id=eq.${competitionId}`,
    },
    () => {
      void loadCompetition();
    }
  )
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "competitions",
      filter: `id=eq.${competitionId}`,
    },
    () => {
      void loadCompetition();
    }
  )
  .subscribe((status) => {
    console.log(
      "WORLD CUP REALTIME STATUS =",
      status
    );
  });

return () => {
  void supabase.removeChannel(
    competitionChannel
  );
};
}, [competitionId]);

  const matchesByRound = useMemo(() => {
    const grouped = new Map<
      number,
      CompetitionMatch[]
    >();

    matches.forEach((match) => {
      const roundMatches =
        grouped.get(match.round_number) ?? [];

      roundMatches.push(match);

      grouped.set(
        match.round_number,
        roundMatches
      );
    });

    return Array.from(grouped.entries()).sort(
      ([roundA], [roundB]) => roundA - roundB
    );
  }, [matches]);
function openMatchConfig(match: CompetitionMatch) {
  if (!competition) return;

  if (competition.status !== "in_progress") {
    return;
  }

  if (match.status !== "ready") {
    return;
  }

  if (
    !match.player1_competition_player_id ||
    !match.player2_competition_player_id
  ) {
    return;
  }

  setSelectedMatch(match);
  setSelectedStartingPlayerId(null);
  setShowMatchConfig(true);
}
async function startWorldCupMatch(
  mode: "local" | "salon"
) {
  if (
    !competition ||
    !selectedMatch ||
    !selectedStartingPlayerId
  ) {
    return;
  }

  setIsStartingMatch(true);
  setErrorMessage(null);

  const { data, error } = await supabase.rpc(
    "start_world_cup_match",
    {
      p_competition_id: competition.id,
      p_match_id: selectedMatch.id,
      p_play_mode: mode,
      p_starting_competition_player_id:
        selectedStartingPlayerId,
    }
  );

  if (error || !data) {
    console.error("Erreur lancement du match", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });

    setErrorMessage(
      error?.message ??
        "Impossible de lancer ce match."
    );

    setIsStartingMatch(false);
    return;
  }

  const result = data as {
    play_mode: "local" | "salon";
    game_id: string;
    salon_code: string | null;
  };
const matchId = selectedMatch.id;

setShowMatchConfig(false);
setSelectedMatch(null);
setSelectedStartingPlayerId(null);
setIsStartingMatch(false);

if (
  result.play_mode === "salon" &&
  result.salon_code
) {
  router.push(
    `/salon/${result.salon_code}/access`
  );
  return;
}

sessionStorage.setItem(
  "yam-world-cup-match",
  JSON.stringify({
    competitionId: competition.id,
    matchId,
    gameId: result.game_id,
  })
);

router.push(
  `/?competitionId=${competition.id}&gameId=${result.game_id}&matchId=${matchId}`
);
}
async function resumeWorldCupMatch(
  match: CompetitionMatch
) {
  if (
  !competition ||
  competition.status !== "in_progress" ||
  !match.game_id
) {
  return;
}

  setErrorMessage(null);

  /*
    Match Salon :
    competition_matches.game_id contient l'UUID
    de yam_games, mais la route attend le code du Salon.
  */
  if (match.play_mode === "salon") {
    const { data: salon, error } = await supabase
      .from("yam_games")
      .select("code")
      .eq("id", match.game_id)
      .maybeSingle();

    if (error || !salon) {
      console.error(
        "Erreur reprise du match Salon",
        {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        }
      );

      setErrorMessage(
        "Impossible de retrouver le Salon de ce match."
      );

      return;
    }

    router.push(`/salon/${salon.code}/access`);
    return;
  }

  /*
    Match local :
    on revient sur la page principale avec les identifiants
    de la partie déjà existante.
  */
  sessionStorage.setItem(
    "yam-world-cup-match",
    JSON.stringify({
      competitionId: competition.id,
      matchId: match.id,
      gameId: match.game_id,
    })
  );

  router.push(
    `/?competitionId=${competition.id}&gameId=${match.game_id}&matchId=${match.id}`
  );
}
async function abandonWorldCup() {
  if (!competition) return;

  setIsAbandoning(true);
  setErrorMessage(null);

  const { data, error } = await supabase.rpc(
    "abandon_world_cup",
    {
      p_competition_id: competition.id,
    }
  );

  if (error || !data?.success) {
    console.error(
      "Erreur abandon Coupe du Monde",
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        data,
      }
    );

    setErrorMessage(
      error?.message ??
        "Impossible d’abandonner la Coupe du Monde."
    );

    setIsAbandoning(false);
    return;
  }

  setShowAbandonModal(false);
  setIsAbandoning(false);

  router.push("/modes-speciaux");
}
  if (loading) {
    return <LoadingScreen />;
  }

  if (
    errorMessage ||
    !competition ||
    players.length === 0
  ) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/50 bg-[#111111] p-6 text-center">
          <p className="text-xl font-black text-red-400">
            Impossible d’ouvrir la Coupe du Monde
          </p>

          <p className="mt-3 font-bold text-slate-400">
            {errorMessage ?? "Données incomplètes."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/modes-speciaux")
            }
            className="mt-6 rounded-xl px-5 py-3 font-black text-white"
            style={{
              backgroundColor: "#0B6B3A",
            }}
          >
            Retour aux modes spéciaux
          </button>
        </div>
      </main>
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

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <button
          type="button"
          onClick={() =>
            router.push("/modes-speciaux")
          }
          className="rounded-xl border border-white/20 bg-black px-4 py-2 font-black text-white"
        >
          Modes spéciaux
        </button>

        <header className="mt-8 text-center">
          <div className="flex items-center justify-center gap-3">
  <Image
    src="/world-cup-trophy.png"
    alt="Coupe du Monde"
    width={42}
    height={54}
    className="h-14 w-auto object-contain drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]"
    priority
  />

  <p className="text-xl font-black uppercase tracking-[0.12em] text-[#DDB35A]">
    Coupe du Monde
  </p>
</div>

          <h1 className="mt-3 text-4xl font-black sm:text-6xl">
            Tableau de la compétition
          </h1>

          <p className="mt-4 font-bold text-slate-400">
            {players.length} participants ·{" "}
            {competition.column_mode} colonnes
          </p>
          {competition.status === "in_progress" && (
  <button
    type="button"
    onClick={() => setShowAbandonModal(true)}
    className="mt-6 rounded-xl border border-red-500/50 bg-red-500/10 px-5 py-3 font-black text-red-300 transition hover:bg-red-500/20"
  >
    Abandonner la Coupe du Monde
  </button>
)}
        </header>
{competition.status === "finished" &&
  competition.winner_player_id && (
    <WorldCupChampion
      winner={
        players.find(
          (player) =>
            player.id ===
            competition.winner_player_id
        ) ?? null
      }
    />
  )}
        <section
  className="mt-8 overflow-hidden rounded-3xl p-5 sm:p-7"
  style={{
    backgroundColor: "#F4E9DC",
    border: "1px solid rgba(11, 107, 58, 0.45)",
  }}
>
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p
        className="text-sm font-black uppercase tracking-widest"
        style={{ color: "#0B6B3A" }}
      >
        Tableau final
      </p>

      <h2 className="mt-2 text-2xl font-black text-black">
        Phase à élimination directe
      </h2>

      <p
        className="mt-2 font-bold"
        style={{ color: "#5B6F61" }}
      >
        {matches.length} matchs · {matchesByRound.length} tours
      </p>
    </div>

    <div
      className="rounded-full px-4 py-2 text-sm font-black text-white"
      style={{ backgroundColor: "#0B6B3A" }}
    >
      {players.length} participants
    </div>
  </div>

  <div className="mt-8 overflow-x-auto pb-4">
    <div
  className="grid min-w-max"
  style={{
    columnGap: "96px",
    gridTemplateColumns: `repeat(${matchesByRound.length}, 340px)`,
  }}
>
      {matchesByRound.map(([roundNumber, roundMatches]) => (
        <RoundColumn
  key={roundNumber}
  roundNumber={roundNumber}
  matches={roundMatches}
  players={players}
  totalRounds={matchesByRound.length}
  firstRoundMatchCount={
    matchesByRound[0]?.[1].length ?? 1
  }
  onOpenMatch={openMatchConfig}
  onResumeMatch={resumeWorldCupMatch}
  competitionStatus={competition.status}
/>
      ))}
    </div>
  </div>
</section>
      </div>
      {showMatchConfig && selectedMatch && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
    <div
      className="w-full max-w-md rounded-3xl p-6 text-black"
      style={{
        backgroundColor: "#F4E9DC",
        border: "1px solid #0B6B3A",
      }}
    >
      <p
        className="text-sm font-black uppercase tracking-widest"
        style={{ color: "#0B6B3A" }}
      >
        Match {selectedMatch.match_number}
      </p>

      <h2 className="mt-2 text-2xl font-black">
        Configurer la rencontre
      </h2>

      <p
        className="mt-3 font-bold"
        style={{ color: "#5B6F61" }}
      >
        Choisis le joueur qui commence puis le mode de jeu.
      </p>

      <div className="mt-6">
        <p
          className="text-sm font-black uppercase tracking-widest"
          style={{ color: "#0B6B3A" }}
        >
          Qui commence ?
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            players.find(
              (player) =>
                player.id ===
                selectedMatch.player1_competition_player_id
            ),
            players.find(
              (player) =>
                player.id ===
                selectedMatch.player2_competition_player_id
            ),
          ]
            .filter(
              (
                player
              ): player is CompetitionPlayer =>
                Boolean(player)
            )
            .map((player) => {
              const selected =
                selectedStartingPlayerId ===
                player.id;

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() =>
                    setSelectedStartingPlayerId(
                      player.id
                    )
                  }
                  className="rounded-xl px-4 py-3 text-left font-black transition"
                  style={{
                    backgroundColor: selected
                      ? "#0B6B3A"
                      : "#EBDCCB",
                    border: selected
                      ? "1px solid #0B6B3A"
                      : "1px solid #D0BCA2",
                    color: selected
                      ? "#FFFFFF"
                      : "#241812",
                  }}
                >
                  {player.player_name}
                </button>
              );
            })}
        </div>
      </div>

      <div className="mt-6">
        <p
          className="text-sm font-black uppercase tracking-widest"
          style={{ color: "#0B6B3A" }}
        >
          Mode de jeu
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={
              isStartingMatch ||
              !selectedStartingPlayerId
            }
            onClick={() =>
              void startWorldCupMatch("local")
            }
            className="rounded-xl px-4 py-4 text-left font-black transition enabled:hover:brightness-95 disabled:opacity-40"
            style={{
              backgroundColor: "#EBDCCB",
              border: "1px solid #D0BCA2",
              color: "#241812",
            }}
          >
            <div>Local</div>

            <div className="mt-1 text-xs opacity-70">
              Une personne note tout
            </div>
          </button>

          <button
            type="button"
            disabled={
              isStartingMatch ||
              !selectedStartingPlayerId
            }
            onClick={() =>
              void startWorldCupMatch("salon")
            }
            className="rounded-xl px-4 py-4 text-left font-black transition enabled:hover:brightness-95 disabled:opacity-40"
            style={{
              backgroundColor: "#EBDCCB",
              border: "1px solid #D0BCA2",
              color: "#241812",
            }}
          >
            <div>Salon</div>

            <div className="mt-1 text-xs opacity-70">
              Chacun sur son téléphone
            </div>
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={isStartingMatch}
        onClick={() => {
          setShowMatchConfig(false);
          setSelectedMatch(null);
          setSelectedStartingPlayerId(null);
        }}
        className="mt-4 w-full rounded-xl px-4 py-3 font-black transition disabled:opacity-50"
        style={{
          backgroundColor: "#241A13",
          color: "#FFFFFF",
        }}
      >
        Annuler
      </button>
    </div>
  </div>
)}
{showAbandonModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
    <div className="w-full max-w-md rounded-3xl border border-red-500/60 bg-black p-6 text-center">
      <div className="text-5xl">⚠️</div>

      <p className="mt-4 text-sm font-black uppercase tracking-widest text-red-400">
        Confirmation
      </p>

      <h2 className="mt-2 text-3xl font-black text-white">
        Abandonner la Coupe du Monde ?
      </h2>

      <p className="mt-4 font-bold text-slate-400">
        La compétition sera marquée comme abandonnée et ne pourra plus être reprise.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isAbandoning}
          onClick={() => setShowAbandonModal(false)}
          className="rounded-xl bg-[#241A13] px-4 py-3 font-black text-white disabled:opacity-50"
        >
          Annuler
        </button>

        <button
          type="button"
          disabled={isAbandoning}
          onClick={() => void abandonWorldCup()}
          className="rounded-xl bg-red-600 px-4 py-3 font-black text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          {isAbandoning
            ? "Abandon..."
            : "Confirmer"}
        </button>
      </div>
    </div>
  </div>
)}
    </main>
  );
}
function WorldCupChampion({
  winner,
}: {
  winner: CompetitionPlayer | null;
}) {
  if (!winner) return null;

  return (
    <section className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-3xl border border-amber-400/60 bg-gradient-to-b from-[#3D2B08] to-black p-8 text-center">
      <div className="text-7xl">🏆</div>

      <p className="mt-4 text-sm font-black uppercase tracking-[0.3em] text-amber-300">
        Coupe du Monde terminée
      </p>

      <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
        {winner.player_name}
      </h2>

      <p className="mt-2 font-bold text-amber-100/70">
        Champion du monde YamScore
      </p>

      <div className="mt-5 flex justify-center">
        <PlayerSmallAvatar player={winner} />
      </div>
    </section>
  );
}
function RoundColumn({
  roundNumber,
  matches,
  players,
  totalRounds,
  firstRoundMatchCount,
  onOpenMatch,
  onResumeMatch,
  competitionStatus,
}: {
  roundNumber: number;
  matches: CompetitionMatch[];
  players: CompetitionPlayer[];
  totalRounds: number;
  firstRoundMatchCount: number;
  onOpenMatch: (match: CompetitionMatch) => void;
  onResumeMatch: (match: CompetitionMatch) => void;
  competitionStatus: CompetitionStatus;
}) {
  const matchHeight = 240;
  const baseGap = 20;

  const step = 2 ** (roundNumber - 1);

  const slotHeight =
    matchHeight * step +
    baseGap * (step - 1);

  const firstOffset =
    roundNumber === 1
      ? 0
      : (slotHeight - matchHeight) / 2;

  const columnHeight =
    firstRoundMatchCount * matchHeight +
    (firstRoundMatchCount - 1) * baseGap;

  const hasNextRound = roundNumber < totalRounds;

  return (
    <div className="w-[340px]">
      <div className="mb-4 text-center">
        <p
          className="text-xs font-black uppercase tracking-widest"
          style={{ color: "#0B6B3A" }}
        >
          Tour {roundNumber}
        </p>

        <h3 className="mt-1 text-xl font-black text-black">
          {getRoundName(roundNumber, totalRounds)}
        </h3>
      </div>

      <div
        className="relative"
        style={{ height: `${columnHeight}px` }}
      >
        {matches.map((match, index) => {
          const top =
            firstOffset +
            index * (slotHeight + baseGap);

          return (
            <div
              key={match.id}
              className="absolute left-0 w-full"
              style={{
                top: `${top}px`,
                height: `${matchHeight}px`,
              }}
            >
             <WorldCupMatchCard
  match={match}
  players={players}
  competitionStatus={competitionStatus}
  isFinal={roundNumber === totalRounds}
  onOpen={() => onOpenMatch(match)}
  onResume={onResumeMatch}
/>

              {hasNextRound && (
                <BracketConnector
                  roundNumber={roundNumber}
                  matchIndex={index}
                  matchHeight={matchHeight}
                  baseGap={baseGap}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function BracketConnector({
  roundNumber,
  matchIndex,
  matchHeight,
  baseGap,
}: {
  roundNumber: number;
  matchIndex: number;
  matchHeight: number;
  baseGap: number;
}) {
  const step = 2 ** (roundNumber - 1);

  const slotHeight =
    matchHeight * step +
    baseGap * (step - 1);

  const pairIndex = Math.floor(matchIndex / 2);
  const isTopMatch = matchIndex % 2 === 0;

  const pairDistance =
    slotHeight + baseGap;

  const verticalSize =
    pairDistance / 2;

  const middleY =
    matchHeight / 2;

  return (
    <>
      {/* Trait horizontal qui sort de la carte */}
      <div
        className="absolute"
        style={{
          left: "100%",
          top: `${middleY}px`,
          width: "48px",
          height: "2px",
          backgroundColor: "#0B6B3A",
        }}
      />

      {/* Barre verticale qui relie la paire */}
      <div
        className="absolute"
        style={{
          left: "calc(100% + 48px)",
          top: isTopMatch
            ? `${middleY}px`
            : `${middleY - verticalSize}px`,
          width: "2px",
          height: `${verticalSize}px`,
          backgroundColor: "#0B6B3A",
        }}
      />

      {/* Trait horizontal vers le tour suivant */}
      {isTopMatch && (
        <div
          className="absolute"
          style={{
            left: "calc(100% + 48px)",
            top: `${middleY + verticalSize}px`,
            width: "48px",
            height: "2px",
            backgroundColor: "#0B6B3A",
          }}
        />
      )}
    </>
  );
}
function WorldCupMatchCard({
  match,
  players,
  competitionStatus,
  isFinal,
  onOpen,
  onResume,
}: {
  match: CompetitionMatch;
  players: CompetitionPlayer[];
  competitionStatus: CompetitionStatus;
  isFinal: boolean;
  onOpen: () => void;
  onResume: (match: CompetitionMatch) => void;
}) {
  const player1 =
    players.find(
      (player) =>
        player.id ===
        match.player1_competition_player_id
    ) ?? null;

  const player2 =
    players.find(
      (player) =>
        player.id ===
        match.player2_competition_player_id
    ) ?? null;

  const winnerId =
    match.winner_competition_player_id;

  return (
    <article
  className="flex h-full flex-col overflow-hidden rounded-2xl shadow-sm"
      style={{
        backgroundColor: "#EBDCCB",
        border: "1px solid #D0BCA2",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <p
          className="text-xs font-black uppercase tracking-widest"
          style={{ color: "#0B6B3A" }}
        >
          Match {match.match_number}
        </p>

        <MatchStatusBadge status={match.status} />
      </div>

      <div
  className="flex flex-1 flex-col"
  style={{
    borderTop: "1px solid #D0BCA2",
  }}
>
        <MatchPlayerRow
          player={player1}
          winner={winnerId === player1?.id}
          emptyLabel="À déterminer"
        />

        <div
          className="mx-4"
          style={{
            borderTop: "1px solid #D0BCA2",
          }}
        />

        <MatchPlayerRow
          player={player2}
          winner={winnerId === player2?.id}
          emptyLabel="À déterminer"
        />
      </div>

      {match.status === "finished" && winnerId && (
  <div
    className="px-4 py-3 text-center text-sm font-black"
    style={{
      backgroundColor: isFinal
        ? "#FFF0C9"
        : "#DDEEE2",
      color: isFinal
        ? "#8A5A00"
        : "#0B6B3A",
      borderTop: isFinal
        ? "1px solid #E6C56E"
        : "1px solid #A9D6B9",
    }}
  >
    {isFinal
      ? "🏆 Champion du monde"
      : "✅ Qualifié pour le tour suivant"}
  </div>
)}

      {match.status !== "finished" &&
  (!player1 || !player2) && (
    <div
      className="px-4 py-3 text-center text-xs font-bold"
      style={{
        backgroundColor: "#F7EFE6",
        color: "#756353",
        borderTop: "1px solid #D0BCA2",
      }}
    >
      {match.round_number === 1 &&
      Boolean(player1) !== Boolean(player2)
        ? "Exempté du premier tour"
        : "En attente des matchs précédents"}
    </div>
  )}
        {competitionStatus === "in_progress" &&
  match.status === "ready" && (
  <button
    type="button"
    onClick={onOpen}
    className="mt-auto w-full px-4 py-3 font-black text-white transition hover:brightness-110"
    style={{
      backgroundColor: "#0B6B3A",
      borderTop: "1px solid #D0BCA2",
    }}
  >
    Jouer ce match
  </button>
)}

{competitionStatus === "in_progress" &&
  match.status === "playing" &&
  match.game_id && (
  <button
    type="button"
    onClick={() => onResume(match)}
    className="mt-auto w-full px-4 py-3 font-black text-white transition hover:brightness-110"
    style={{
      backgroundColor: "#B7791F",
      borderTop: "1px solid #D0BCA2",
    }}
  >
    Reprendre le match
  </button>
)}
    </article>
  );
}
function MatchPlayerRow({
  player,
  winner,
  emptyLabel,
}: {
  player: CompetitionPlayer | null;
  winner: boolean;
  emptyLabel: string;
}) {
  return (
    <div
      className="flex min-h-[60px] flex-1 items-center gap-3 px-4 py-3"
      style={{
        backgroundColor: winner
          ? "#DDEEE2"
          : "transparent",
      }}
    >
      {player ? (
        <>
          <PlayerSmallAvatar player={player} />

          <div className="min-w-0 flex-1">
            <p
              className="truncate font-black"
              style={{
                color: winner
                  ? "#0B6B3A"
                  : "#241812",
              }}
            >
              {player.player_name}
            </p>

            <p
              className="mt-0.5 text-xs font-bold"
              style={{ color: "#756353" }}
            >
              {player.profile_id
                ? "Profil associé"
                : "Invité"}
            </p>
          </div>

          {winner && (
            <span className="text-xl">✓</span>
          )}
        </>
      ) : (
        <p
          className="font-bold italic"
          style={{ color: "#9B8B7B" }}
        >
          {emptyLabel}
        </p>
      )}
    </div>
  );
}
function PlayerSmallAvatar({
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
        style={{
          border: "2px solid rgba(11, 107, 58, 0.35)",
        }}
      />
    );
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black text-white"
      style={{ backgroundColor: "#0B6B3A" }}
    >
      {player.player_name.charAt(0).toUpperCase()}
    </div>
  );
}
function MatchStatusBadge({
  status,
}: {
  status: CompetitionMatchStatus;
}) {
  const config = {
    waiting: {
      label: "En attente",
      background: "#EEE5DA",
      color: "#756353",
    },
    ready: {
      label: "À jouer",
      background: "#FFF0C9",
      color: "#8A5A00",
    },
    playing: {
      label: "En cours",
      background: "#DCE8FF",
      color: "#234E8A",
    },
    finished: {
      label: "Terminé",
      background: "#DDEEE2",
      color: "#0B6B3A",
    },
  }[status] ?? {
    label: status,
    background: "#EEE5DA",
    color: "#756353",
  };

  return (
    <span
      className="rounded-full px-3 py-1 text-[10px] font-black uppercase"
      style={{
        backgroundColor: config.background,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}
function getRoundName(
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