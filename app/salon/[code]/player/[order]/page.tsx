"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { columns, rows, getPossibleValues } from "../../../../lib/yamRules";
import LoadingScreen from "../../../../components/LoadingScreen";
import AuthButton from "../../../../components/AuthButton";
import Image from "next/image";
import {
  getTournamentTheme,
  type TournamentTheme,
  type TournamentThemeConfig,
} from "../../../../lib/tournamentThemes";
import {
  getGrandPrixCircuitTheme,
} from "../../../../lib/grandPrixThemes";
type GameMode = "6cols" | "3cols";
type AccessStatus =
| "checking"
| "allowed"
| "login_required"
| "wrong_profile"
| "guest_confirmation"
| "place_taken";
export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "finished">("waiting");
  const code = String(params.code).toUpperCase();
  const order = Number(params.order);
  const [currentPlayerOrder, setCurrentPlayerOrder] = useState(1);
  const [gameId, setGameId] = useState<string | null>(null);
  const [competitionId, setCompetitionId] =
  useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [isCompetitionSalon, setIsCompetitionSalon] = useState(false);
 const [competitionType, setCompetitionType] = useState<
  | "grand_slam_final"
  | "world_cup"
  | "grand_prix"
  | "basket"
  | null
>(null);
  
  const [competitionTheme, setCompetitionTheme] =
  useState<TournamentThemeConfig | null>(null);
  
  const [competitionRoundNumber, setCompetitionRoundNumber] =
  useState<number | null>(null);
  const [grandPrixCircuitId, setGrandPrixCircuitId] =
  useState<string | null>(null);
  const [expectedProfileId, setExpectedProfileId] =
  useState<string | null>(null);
  
  const [connectedUserId, setConnectedUserId] =
  useState<string | null>(null);
  
  const [connectedProfileName, setConnectedProfileName] =
  useState<string | null>(null);
  const [basketTeam, setBasketTeam] =
  useState<"A" | "B" | null>(null);

const [basketQuarter, setBasketQuarter] =
  useState<1 | 2 | 3 | 4>(1);
  const [accessStatus, setAccessStatus] =
  useState<AccessStatus>("checking");
  const [gameMode, setGameMode] = useState<GameMode>("6cols");
  const [message, setMessage] = useState("Chargement...");
  const [finalPlayers, setFinalPlayers] = useState<
  { id: string; name: string; player_order: number; final_score: number | null }[]
  >([]);
  
  const [finalScores, setFinalScores] = useState<
  { player_id: string; value: string }[]
  >([]);
  useEffect(() => {
  if (
    !gameId ||
    competitionType !== "basket"
  ) {
    return;
  }

  const channel = supabase
    .channel(
      `basket_quarter_${gameId}`
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "yam_scores",
        filter: `game_id=eq.${gameId}`,
      },
      async () => {
        const {
          data: game,
          error,
        } = await supabase
          .from("yam_games")
          .select(
            "player_count, mode"
          )
          .eq("id", gameId)
          .single();

        if (error || !game) return;

        await loadBasketQuarter(
          gameId,
          game.player_count,
          game.mode
        );
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [
  gameId,
  competitionType,
]);
  async function loadFinalResults(currentGameId: string) {
    const { data: playersData } = await supabase
    .from("yam_players")
    .select("*")
    .eq("game_id", currentGameId);
    
    const { data: scoresData } = await supabase
    .from("yam_scores")
    .select("player_id, value")
    .eq("game_id", currentGameId);
    
    setFinalPlayers(playersData ?? []);
    setFinalScores(scoresData ?? []);
  }
  async function loadBasketQuarter(
  currentGameId: string,
  playerCount: number,
  mode: GameMode
) {
  if (playerCount <= 0) return;

  const {
    count,
    error,
  } = await supabase
    .from("yam_scores")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("game_id", currentGameId);

  if (error) {
    console.error(
      "Erreur calcul quart-temps Basket",
      error
    );
    return;
  }

  const totalPlayedMoves = count ?? 0;

  const nextMoveNumber =
    Math.floor(totalPlayedMoves / playerCount) + 1;

  let nextQuarter: 1 | 2 | 3 | 4;

  if (mode === "3cols") {
    if (nextMoveNumber <= 10) {
      nextQuarter = 1;
    } else if (nextMoveNumber <= 20) {
      nextQuarter = 2;
    } else if (nextMoveNumber <= 30) {
      nextQuarter = 3;
    } else {
      nextQuarter = 4;
    }
  } else {
    if (nextMoveNumber <= 20) {
      nextQuarter = 1;
    } else if (nextMoveNumber <= 40) {
      nextQuarter = 2;
    } else if (nextMoveNumber <= 59) {
      nextQuarter = 3;
    } else {
      nextQuarter = 4;
    }
  }

  setBasketQuarter(nextQuarter);
}
  async function loadPlayerSession() {
    setAccessStatus("checking");
    setMessage("Chargement...");
    
    const { data: game, error: gameError } = await supabase
    .from("yam_games")
    .select(`
  id,
  mode,
  player_count,
  current_player_order,
  status,
  competition_id,
  competition_round_number
`)
      .eq("code", code)
      .single();
      
      if (gameError || !game) {
        setMessage("Salon introuvable.");
        return;
      }
      
      setGameId(game.id);
      setGameMode(game.mode);
      setGameStatus(game.status);
      setCurrentPlayerOrder(game.current_player_order ?? 1);
      setIsCompetitionSalon(Boolean(game.competition_id));
      setCompetitionId(game.competition_id ?? null);
      setCompetitionRoundNumber(
        game.competition_round_number ?? null
      );
      let loadedCompetitionType:
  | "grand_slam_final"
  | "world_cup"
  | "grand_prix"
  | "basket"
  | null = null;
      if (game.competition_id) {
  const { data: competitionResult, error: competitionError } =
    await supabase.rpc("get_salon_competition_theme", {
      p_game_id: game.id,
    });

  if (competitionError) {
    console.error(
      "Erreur chargement thème compétition",
      competitionError
    );
setGrandPrixCircuitId(null);
    setCompetitionType(null);
    setCompetitionTheme(null);
  } else {
    const competitionData = Array.isArray(competitionResult)
      ? competitionResult[0]
      : competitionResult;

    if (competitionData) {
  const nextCompetitionType =
    competitionData.competition_type as
      | "grand_slam_final"
      | "world_cup"
      | "basket"
      | "grand_prix";
loadedCompetitionType = nextCompetitionType;
  setCompetitionType(nextCompetitionType);

  if (nextCompetitionType === "grand_prix") {
  const circuitId =
    competitionData.circuit_id ?? null;

  const circuitTheme =
    getGrandPrixCircuitTheme(circuitId);

  setGrandPrixCircuitId(circuitId);
  setCompetitionTheme(circuitTheme);

} else if (nextCompetitionType === "basket") {
  setGrandPrixCircuitId(null);

  // Pour l'instant on garde le thème générique du Salon.
  // On stylisera Basket ensuite.
  setCompetitionTheme(null);

} else {
  const nextTheme =
    competitionData.theme as TournamentTheme;

  setGrandPrixCircuitId(null);

  setCompetitionTheme(
    getTournamentTheme(nextTheme)
  );
}
} else {
  setCompetitionType(null);
  setCompetitionTheme(null);
  setGrandPrixCircuitId(null);
}
  }
} else {
  setCompetitionType(null);
  setCompetitionTheme(null);
  setGrandPrixCircuitId(null);
}
      const { data: player, error: playerError } = await supabase
  .from("yam_players")
  .select(
    "id, name, profile_id, competition_player_id"
  )
  .eq("game_id", game.id)
  .eq("player_order", order)
  .single();
      
      if (playerError || !player) {
        setMessage("Joueur introuvable.");
        return;
      }
      
      setPlayerId(player.id);
      setPlayerName(player.name);
      setExpectedProfileId(player.profile_id ?? null);
      if (
  loadedCompetitionType === "basket" &&
  player.competition_player_id &&
  game.competition_id
) {
  const {
    data: basketTeamResult,
    error: basketTeamError,
  } = await supabase.rpc(
    "get_salon_basket_player_team",
    {
      p_game_id: game.id,
      p_player_id: player.id,
    }
  );

  if (basketTeamError) {
  console.error(
    "Erreur chargement équipe Basket joueur",
    basketTeamError
  );

  setBasketTeam(null);
} else {
  setBasketTeam(
    (basketTeamResult as "A" | "B" | null) ?? null
  );
}

await loadBasketQuarter(
  game.id,
  game.player_count,
  game.mode as GameMode
);
}
      const deviceId = getSalonDeviceId();
      
      const {
        data: claimResult,
        error: claimError,
      } = await supabase.rpc(
        "claim_salon_player_place",
        {
          p_game_id: game.id,
          p_player_order: order,
          p_device_id: deviceId,
        }
      );
      
      if (claimError) {
        console.error(
          "Erreur réservation de la place",
          {
            message: claimError.message,
            details: claimError.details,
            hint: claimError.hint,
            code: claimError.code,
          }
        );
        
        setAccessStatus("place_taken");
        setMessage("");
        return;
      }
      
      if (!claimResult?.success) {
        setAccessStatus("place_taken");
        setMessage("");
        return;
      }
      /*
      Les Salons classiques conservent leur comportement actuel.
      La vérification concerne uniquement les Salons de compétition.
      */
      if (!game.competition_id) {
        setAccessStatus("allowed");
        setMessage("");
        
        if (game.status === "finished") {
          void loadFinalResults(game.id);
        }
        
        return;
      }
      
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      setConnectedUserId(user?.id ?? null);
      
      /*
      Place associée à un profil.
      */
      if (player.profile_id) {
        if (!user) {
          setAccessStatus("login_required");
          setMessage("");
          return;
        }
        
        if (user.id !== player.profile_id) {
          setAccessStatus("wrong_profile");
          setMessage("");
          return;
        }
        
        setAccessStatus("allowed");
        setMessage("");
      } else {
        /*
        Place invitée.
        Sans compte connecté : accès direct.
        Avec un compte connecté : confirmation avant de continuer.
        */
        if (user) {
          setAccessStatus("guest_confirmation");
          setMessage("");
          return;
        }
        
        setAccessStatus("allowed");
        setMessage("");
      }
      
      if (game.status === "finished") {
        void loadFinalResults(game.id);
      }
    }
    
    useEffect(() => {
      loadPlayerSession();
    }, []);
    useEffect(() => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        void loadPlayerSession();
      });
      
      return () => {
        subscription.unsubscribe();
      };
    }, [code, order]);  
    useEffect(() => {
      if (!gameId) return;
      
      const channel = supabase
      .channel(`player_waiting_game_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "yam_games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const nextStatus = payload.new.status ?? "waiting";
          
          setGameStatus(nextStatus);
          setCurrentPlayerOrder(payload.new.current_player_order ?? 1);
          
          if (nextStatus === "finished" && gameId) {
            loadFinalResults(gameId);
            
          }
        }
        
      )
      .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }, [gameId]);
    useEffect(() => {
      if (!gameId) return;
      if (gameStatus === "finished") return;
      
      const interval = window.setInterval(async () => {
        const { data, error } = await supabase
        .from("yam_games")
        .select("status, current_player_order")
        .eq("id", gameId)
        .single();
        
        if (error || !data) return;
        
        setGameStatus(data.status ?? "waiting");
        setCurrentPlayerOrder(data.current_player_order ?? 1);
        
        if (data.status === "finished") {
          loadFinalResults(gameId);
          
        }
      }, 1000);
      
      return () => window.clearInterval(interval);
    }, [gameId, gameStatus]);
    function getSalonDeviceId() {
      if (typeof window === "undefined") {
        return "";
      }
      
      const storageKey = "yam-score-salon-device-id";
      
      const existingId =
      window.localStorage.getItem(storageKey);
      
      if (existingId) {
        return existingId;
      }
      
      const newId = crypto.randomUUID();
      
      window.localStorage.setItem(
        storageKey,
        newId
      );
      
      return newId;
    }
    if (message === "Chargement...") {
      return <LoadingScreen />;
    }
    if (isCompetitionSalon && accessStatus === "checking") {
      return <LoadingScreen />;
    }
    if (accessStatus === "place_taken") {
      return (
        <main className="relative flex min-h-dvh items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/60 bg-black p-7 text-center">
        <div className="text-5xl">⛔</div>
        
        <p className="mt-4 text-sm font-black uppercase tracking-widest text-red-400">
        Place déjà utilisée
        </p>
        
        <h1 className="mt-2 text-3xl font-black">
        Joueur {order}
        </h1>
        
        <p className="mt-4 font-bold text-slate-400">
        Cette feuille est déjà ouverte sur un autre appareil.
        Scanne le QR code d’une autre place.
        </p>
        
        <button
        type="button"
        onClick={() =>
          router.push(`/salon/${code}/access`)
        }
        className="mt-6 w-full rounded-xl bg-[#C44934] px-4 py-3 font-black text-white hover:bg-[#D75A43]"
        >
        Voir les autres places
        </button>
        </div>
        </main>
      );
    }
    if (isCompetitionSalon && accessStatus === "login_required") {
      return (
        <main className="relative flex min-h-dvh items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-7 text-center">
        <div className="text-5xl">🔒</div>
        
        <p className="mt-4 text-sm font-black uppercase tracking-widest text-[#C44934]">
        Feuille réservée
        </p>
        
        <h1 className="mt-2 text-3xl font-black">{playerName}</h1>
        
        <p className="mt-4 font-bold text-slate-400">
  Cette place n’est associée à aucun profil. Les statistiques de cette{" "}
  {competitionType === "world_cup"
  ? "partie de Coupe du Monde"
  : competitionType === "grand_prix"
    ? "course"
    : competitionType === "basket"
      ? "match Basket"
      : competitionType === "grand_slam_final"
        ? "partie de Grand Chelem"
        : "partie"}{" "}
  ne seront pas attribuées au compte actuellement connecté.
</p>
        
        <div className="mt-6 flex justify-center">
        <AuthButton />
        </div>
        </div>
        </main>
      );
    }
    
    if (isCompetitionSalon && accessStatus === "wrong_profile") {
      return (
        <main className="relative flex min-h-dvh items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/50 bg-black p-7 text-center">
        <div className="text-5xl">⛔</div>
        
        <p className="mt-4 text-sm font-black uppercase tracking-widest text-red-400">
        Mauvais profil
        </p>
        
        <h1 className="mt-2 text-3xl font-black">
        Feuille de {playerName}
        </h1>
        
        <p className="mt-4 font-bold text-slate-400">
        Le compte actuellement connecté ne correspond pas au profil
        associé à cette place.
        </p>
        
        <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          await loadPlayerSession();
        }}
        className="mt-6 w-full rounded-xl bg-[#C44934] px-4 py-3 font-black text-white hover:bg-[#D75A43]"
        >
        Se déconnecter et changer de compte
        </button>
        
        <button
        type="button"
        onClick={() => router.push(`/salon/${code}/access`)}
        className="mt-3 w-full rounded-xl bg-[#241A13] px-4 py-3 font-black text-white hover:bg-[#322217]"
        >
        Retour aux accès
        </button>
        </div>
        </main>
      );
    }
    
    if (
      isCompetitionSalon &&
      accessStatus === "guest_confirmation"
    ) {
      return (
        <main className="relative flex min-h-dvh items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-[#9B6A28]/70 bg-black p-7 text-center">
        <div className="text-5xl">👤</div>
        
        <p className="mt-4 text-sm font-black uppercase tracking-widest text-[#C44934]">
        Place invitée
        </p>
        
        <h1 className="mt-2 text-3xl font-black">{playerName}</h1>
        
        <p className="mt-4 font-bold text-slate-400">
        Cette place n’est associée à aucun profil. Les statistiques de ce
        set ne seront pas attribuées au compte actuellement connecté.
        </p>
        
        <button
        type="button"
        onClick={() => setAccessStatus("allowed")}
        className="mt-6 w-full rounded-xl bg-[#C44934] px-4 py-3 font-black text-white hover:bg-[#D75A43]"
        >
        Continuer comme invité
        </button>
        
        <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          setConnectedUserId(null);
          setAccessStatus("allowed");
        }}
        className="mt-3 w-full rounded-xl bg-[#241A13] px-4 py-3 font-black text-white hover:bg-[#322217]"
        >
        Se déconnecter puis continuer
        </button>
        </div>
        </main>
      );
    }
    if (message) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="rounded-3xl border border-[#9B6A28]/70 bg-black p-6 text-center font-black text-[#C44934]">
        {message}
        </div>
        </main>
      );
    }
   if (gameStatus === "waiting") {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-white"
      style={{
        backgroundColor:
          competitionTheme?.pageBackgroundColor ?? "#000000",
      }}
    >
      {competitionTheme?.backgroundImage ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${competitionTheme.backgroundImage}")`,
            }}
          />

          <div className="pointer-events-none absolute inset-0 bg-black/70" />

          {competitionTheme.backgroundGlow && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: competitionTheme.backgroundGlow,
              }}
            />
          )}
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
          <img
            src="/favicon.png"
            alt=""
            className="w-[900px] rotate-[-12deg] select-none"
          />
        </div>
      )}

      <div
        className={[
          "relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 p-8 text-center shadow-2xl",
          competitionTheme
            ? competitionTheme.border
            : "border-[#9B6A28]/70 bg-black",
        ].join(" ")}
        style={
          competitionTheme
            ? {
                background: competitionTheme.headerGradient,
              }
            : undefined
        }
      >
        {competitionTheme?.flagImage ? (
          <Image
            src={competitionTheme.flagImage}
            alt={`Drapeau — ${competitionTheme.name}`}
            width={96}
            height={64}
            className="mx-auto h-16 w-auto rounded-md object-contain drop-shadow-xl"
            priority
          />
        ) : competitionTheme?.headerLogo ? (
          <Image
            src={competitionTheme.headerLogo}
            alt={competitionTheme.name}
            width={80}
            height={80}
            className="mx-auto h-20 w-auto object-contain drop-shadow-xl"
            priority
          />
        ) : (
          <div className="text-5xl">
            {competitionTheme?.icon ?? "🎲"}
          </div>
        )}

        <div
          className={[
            "mt-4 text-sm font-black uppercase tracking-[0.18em]",
            competitionTheme
              ? competitionTheme.accentText
              : "text-[#C44934]",
          ].join(" ")}
        >
          {competitionType === "grand_prix"
  ? competitionTheme?.name ?? "Grand Prix"
  : competitionType === "world_cup"
    ? "Coupe du Monde"
    : competitionType === "basket"
      ? "🏀 Basket"
      : competitionType === "grand_slam_final"
        ? competitionTheme?.name ?? "Grand Chelem"
        : `Salon ${code}`}
        </div>

        {competitionType && (
          <div className="mt-2 text-sm font-bold text-white/65">
            {competitionType === "grand_prix"
  ? `Manche ${competitionRoundNumber ?? 1}`
  : competitionType === "world_cup"
    ? `Match ${competitionRoundNumber ?? 1}`
    : competitionType === "basket"
      ? `Match ${competitionRoundNumber ?? 1}`
      : `Finale · Set ${competitionRoundNumber ?? 1}`}
          </div>
        )}

        <h1 className="mt-4 text-3xl font-black text-white">
          En attente
        </h1>

        <p className="mt-2 font-black text-white/85">
          {playerName || `Joueur ${order}`}
        </p>

        <p className="mt-3 text-sm font-bold text-white/60">
          L’administrateur du salon doit démarrer la partie.
        </p>
      </div>
    </main>
  );
}
    const finalRanking = finalPlayers
    .map((player) => ({
      ...player,
      total: Number(player.final_score ?? 0),
    }))
    .sort((a, b) => b.total - a.total);
    
    const myFinalResult = finalRanking.find(
      (player) => player.player_order === order
    );
    
    const winner = finalRanking[0];
    const myRank = myFinalResult
    ? finalRanking.findIndex((player) => player.id === myFinalResult.id) + 1
    : null;
    if (gameStatus === "finished") {
  const isWorldCup = competitionType === "world_cup";
  const didWin = myRank === 1;
const isGrandPrix =
  competitionType === "grand_prix";
 function getThemeColor(
  className: string | undefined,
  prefix: "bg" | "text" | "border"
) {
  if (!className) return undefined;

  const match = className.match(
    new RegExp(`${prefix}-\\[(#[0-9A-Fa-f]{6})\\]`)
  );

  return match?.[1];
}

const finalButtonBackground =
  getThemeColor(
    competitionTheme?.buttonBackground,
    "bg"
  ) ?? "#C44934";

const finalButtonText =
  getThemeColor(
    competitionTheme?.buttonText,
    "text"
  ) ?? "#FFFFFF";

const finalButtonBorder =
  getThemeColor(
    competitionTheme?.border,
    "border"
  ) ?? finalButtonBackground;
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-white"
      style={{
        backgroundColor:
          competitionTheme?.pageBackgroundColor ?? "#000000",
      }}
    >
      {competitionTheme?.backgroundImage ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${competitionTheme.backgroundImage}")`,
            }}
          />

          <div className="pointer-events-none absolute inset-0 bg-black/75" />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
          <Image
            src="/favicon.png"
            alt=""
            width={900}
            height={900}
            className="rotate-[-12deg] select-none"
          />
        </div>
      )}

      <div
        className={[
          "relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 p-8 text-center shadow-2xl",
          competitionTheme
            ? competitionTheme.border
            : "border-[#9B6A28]/70 bg-black",
        ].join(" ")}
        style={
          competitionTheme
            ? {
                background: competitionTheme.headerGradient,
              }
            : undefined
        }
      >
        {competitionTheme?.flagImage ? (
  <Image
    src={competitionTheme.flagImage}
    alt={`Drapeau — ${competitionTheme.name}`}
    width={96}
    height={64}
    className="mx-auto h-16 w-auto rounded-md object-contain drop-shadow-xl"
    priority
  />
) : competitionTheme?.headerLogo ? (
  <Image
    src={competitionTheme.headerLogo}
    alt={competitionTheme.name}
    width={88}
    height={88}
    className="mx-auto h-20 w-auto object-contain drop-shadow-xl"
    priority
  />
) : (
  <div className="text-5xl">
    {competitionTheme?.icon ?? "🏆"}
  </div>
)}

        <div
          className={[
            "mt-4 text-sm font-black uppercase tracking-[0.18em]",
            competitionTheme
              ? competitionTheme.accentText
              : "text-[#C44934]",
          ].join(" ")}
        >
          {competitionTheme
            ? competitionTheme.name
            : `Salon ${code} · Joueur ${order}`}
        </div>

        <h1 className="mt-2 text-3xl font-black text-white">
          {competitionTheme
  ? isWorldCup
    ? "Match terminé"
    : isGrandPrix
      ? "Grand Prix terminé"
      : "Set terminé"
  : "Partie terminée"}
        </h1>

        {competitionTheme && (
          <p className="mt-2 text-sm font-bold text-white/70">
            {didWin
  ? isWorldCup
    ? "Tu remportes le match"
    : isGrandPrix
      ? "Tu remportes le Grand Prix"
      : "Tu remportes le set"
  : isWorldCup
    ? "Tu es éliminé"
    : isGrandPrix
      ? `Tu termines à la ${myRank ?? "-"}e place`
      : "Tu perds le set"}
          </p>
        )}

        <div
          className={[
            "mt-6 rounded-2xl p-5",
            competitionTheme
              ? `${competitionTheme.scoreBackground} ${competitionTheme.scoreText}`
              : "bg-[#F4E9DC] text-black",
          ].join(" ")}
        >
          <div
            className={[
              "text-sm font-black uppercase",
              competitionTheme
                ? competitionTheme.accentDarkText
                : "text-[#C44934]",
            ].join(" ")}
          >
            Ta position
          </div>

          <div className="mt-2 text-5xl font-black">
            #{myRank ?? "-"}
          </div>

          <div className="mt-2 text-xl font-black">
            {myFinalResult ? myFinalResult.total : 0} points
          </div>
        </div>

        <p className="mt-5 text-sm font-bold text-white/70">
          Vainqueur :{" "}
          <span className="font-black text-white">
            {winner?.name ?? "-"}
          </span>
        </p>

        <button
  type="button"
  onClick={() => {
    window.location.href = "/";
  }}
  className="mt-6 w-full rounded-xl border px-4 py-3 font-black transition"
  style={{
    backgroundColor: finalButtonBackground,
    color: finalButtonText,
    borderColor: finalButtonBorder,
  }}
>
  Retour à l'accueil
</button>
      </div>
    </main>
  );
}
    
    if (
  isCompetitionSalon &&
  competitionType &&
  (competitionTheme || competitionType === "basket")
) {
  return (
    <CompetitionPlayerMobileSheet
      code={code}
      playerName={playerName}
      selectedOrder={order}
      gameMode={gameMode}
      gameId={gameId}
      playerId={playerId}
      currentPlayerOrder={currentPlayerOrder}
      setCurrentPlayerOrder={setCurrentPlayerOrder}
      competitionType={competitionType}
      competitionTheme={competitionTheme}
      competitionRoundNumber={competitionRoundNumber}
      grandPrixCircuitId={grandPrixCircuitId}
      basketTeam={basketTeam}
basketQuarter={basketQuarter}
    />
  );
}

return (
  <ClassicPlayerMobileSheet
    code={code}
    playerName={playerName}
    selectedOrder={order}
    gameMode={gameMode}
    gameId={gameId}
    playerId={playerId}
    currentPlayerOrder={currentPlayerOrder}
    setCurrentPlayerOrder={setCurrentPlayerOrder}
  />
);
  }
  function CompetitionPlayerMobileSheet({
  code,
  playerName,
  selectedOrder,
  gameMode,
  gameId,
  playerId,
  currentPlayerOrder,
  setCurrentPlayerOrder,
  competitionType,
  competitionTheme,
  grandPrixCircuitId,
  competitionRoundNumber,
  basketTeam,
basketQuarter,
}: {
  code: string;
  playerName: string;
  selectedOrder: number;
  gameMode: GameMode;
  gameId: string | null;
  playerId: string | null;
  currentPlayerOrder: number;
  setCurrentPlayerOrder: (value: number) => void;
  grandPrixCircuitId: string | null;
  competitionType:
  | "grand_slam_final"
  | "world_cup"
  | "basket"
  | "grand_prix";
  competitionTheme: TournamentThemeConfig | null;
  competitionRoundNumber: number | null;
  basketTeam: "A" | "B" | null;
basketQuarter: 1 | 2 | 3 | 4;
}) {
  return (
  <ClassicPlayerMobileSheet
    code={code}
    playerName={playerName}
    selectedOrder={selectedOrder}
    gameMode={gameMode}
    gameId={gameId}
    playerId={playerId}
    currentPlayerOrder={currentPlayerOrder}
    setCurrentPlayerOrder={setCurrentPlayerOrder}
    competitionType={competitionType}
    competitionTheme={competitionTheme}
    competitionRoundNumber={competitionRoundNumber}
    grandPrixCircuitId={grandPrixCircuitId}
    basketTeam={basketTeam}
  basketQuarter={basketQuarter}
  />
);
}
  function ClassicPlayerMobileSheet({
    code,
    playerName,
    selectedOrder,
    gameMode,
    gameId,
    currentPlayerOrder,
    setCurrentPlayerOrder,
    playerId,
    competitionType,
competitionTheme,
competitionRoundNumber,
grandPrixCircuitId,
basketTeam,
basketQuarter,
  }: {
    code: string;
    playerName: string;
    selectedOrder: number;
    gameMode: GameMode;
    gameId: string | null;
    playerId: string | null;
    currentPlayerOrder: number;
    setCurrentPlayerOrder: (value: number) => void;
    grandPrixCircuitId?: string | null;
    competitionType?:
  | "grand_slam_final"
  | "world_cup"
  | "grand_prix"
  | "basket";
  competitionTheme?: TournamentThemeConfig | null;
  competitionRoundNumber?: number | null;
  basketTeam?: "A" | "B" | null;
basketQuarter?: 1 | 2 | 3 | 4;
  }) {
    const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
    const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
    const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [filledCells, setFilledCells] = useState<string[]>([]);
    const [playerScores, setPlayerScores] = useState<
  {
    column_id: string;
    row_id: string;
    value: string;
    basket_quarter: number | null;
  }[]
>([]);
    const playerColors = [
      {
        text: "text-[#C44934]",
        border: "border-[#9B6A28]/70",
        bg: "bg-[#F4E9DC]",
        button: "bg-[#C44934] text-white",
        valueButton: "bg-[#F4E9DC] text-black hover:bg-[#FFF8EF]",
        hoverBorder: "hover:bg-[#322217]",
      },
    ];
    
    const playerColor = playerColors[0];
    const isMyTurn = selectedOrder === currentPlayerOrder;
    const isCompetition = Boolean(
  competitionType &&
  (competitionTheme || competitionType === "basket")
);

const isWorldCup =
  competitionType === "world_cup";
const isBasket =
  competitionType === "basket";
const isGrandPrix =
  competitionType === "grand_prix";
 function getThemeColor(
  className: string | undefined,
  prefix: "bg" | "text" | "border"
) {
  if (!className) return undefined;

  const match = className.match(
    new RegExp(`${prefix}-\\[(#[0-9A-Fa-f]{6})\\]`)
  );

  return match?.[1];
}

const themeButtonBackground = getThemeColor(
  competitionTheme?.buttonBackground,
  "bg"
);

const themeScoreBackground = getThemeColor(
  competitionTheme?.scoreBackground,
  "bg"
);

const themeButtonText = getThemeColor(
  competitionTheme?.buttonText,
  "text"
) ?? "#FFFFFF";

const themeScoreText = getThemeColor(
  competitionTheme?.scoreText,
  "text"
);

const themeBorder = getThemeColor(
  competitionTheme?.border,
  "border"
);
const competitionLabel = isWorldCup
  ? "Coupe du Monde"
  : isGrandPrix
    ? competitionTheme?.name ?? "Grand Prix"
    : isBasket
      ? "🏀 Basket"
      : competitionTheme?.name ?? "";

const roundLabel = isWorldCup
  ? `Match ${competitionRoundNumber ?? 1}`
  : isGrandPrix
    ? `Manche ${competitionRoundNumber ?? 1}`
    : isBasket
      ? `Match ${competitionRoundNumber ?? 1}`
      : `Finale · Set ${competitionRoundNumber ?? 1}`;
    const activeColumns =
    gameMode === "6cols"
    ? columns
    : [columns[0], columns[2], columns[4]];
    const upperRows = rows.filter((row) =>
      ["1", "2", "3", "4", "5", "6", "-", "+"].includes(row.id)
  );
  useEffect(() => {
    if (!selectedColumnId) return;
    
    const firstPlayableRow = rows.find((row) =>
      isMobileCellPlayable(selectedColumnId, row.id)
  );
  
  if (!firstPlayableRow) return;
  
  const timer = setTimeout(() => {
    rowRefs.current[firstPlayableRow.id]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 150);
  
  return () => clearTimeout(timer);
}, [selectedColumnId, filledCells]);
const lowerRows = rows.filter(
  (row) => !["1", "2", "3", "4", "5", "6", "-", "+"].includes(row.id)
);
useEffect(() => {
  loadFilledCells();
}, [gameId, playerId]);
useEffect(() => {
  if (!gameId) return;
  
  const channel = supabase
  .channel(`player_game_${gameId}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "yam_games",
      filter: `id=eq.${gameId}`,
    },
    (payload) => {
      setCurrentPlayerOrder(payload.new.current_player_order ?? 1);
      
      setSelectedColumnId(null);
      setSelectedRowId(null);
      
      loadFilledCells();
    }
  )
  .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [gameId]);
useEffect(() => {
  if (!gameId || !playerId) return;
  
  const channel = supabase
  .channel(`player_scores_${gameId}_${playerId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "yam_scores",
      filter: `game_id=eq.${gameId}`,
    },
    () => {
      loadFilledCells();
    }
  )
  .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [gameId, playerId]);
async function loadFilledCells() {
  if (!gameId || !playerId) return;
  
  const { data, error } = await supabase
  .from("yam_scores")
  .select(
  "column_id, row_id, value, basket_quarter"
)
  .eq("game_id", gameId)
  .eq("player_id", playerId);
  
  if (error) {
    console.error(error);
    return;
  }
  
  setFilledCells(
    (data ?? []).map((score) => `${score.column_id}:${score.row_id}`)
  );
  
  setPlayerScores(data ?? []);
}

function isMobileCellPlayable(columnId: string, rowId: string) {
  const column = activeColumns.find((item) => item.id === columnId);
  if (!column) return false;
  
  const cellKey = `${columnId}:${rowId}`;
  if (filledCells.includes(cellKey)) return false;
  
  const rowIndex = rows.findIndex((row) => row.id === rowId);
  if (rowIndex === -1) return false;
  
  if (column.type === "free") return true;
  
  if (column.type === "down") {
    return rows
    .slice(0, rowIndex)
    .every((row) => filledCells.includes(`${columnId}:${row.id}`));
  }
  
  if (column.type === "up") {
    return rows
    .slice(rowIndex + 1)
    .every((row) => filledCells.includes(`${columnId}:${row.id}`));
  }
  
  return false;
}
async function saveMobileScore(
  columnId: string,
  rowId: string,
  value: number | "X"
) {
  if (!gameId || !playerId) return;
  
  const { error } = await supabase.from("yam_scores").upsert(
  {
    game_id: gameId,
    player_id: playerId,
    column_id: columnId,
    row_id: rowId,
    value: String(value),

    basket_quarter: isBasket
      ? basketQuarter ?? 1
      : null,
  },
  {
    onConflict: "game_id,player_id,column_id,row_id",
  }
);
  
  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }
  
  const { data: game, error: gameError } = await supabase
  .from("yam_games")
  .select("player_count, current_player_order")
  .eq("id", gameId)
  .single();
  
  if (gameError) {
    console.error(gameError);
    alert(gameError.message);
    return;
  }
  
  const nextPlayerOrder =
  game.current_player_order >= game.player_count
  ? 1
  : game.current_player_order + 1;
  
  const { error: updateError } = await supabase
  .from("yam_games")
  .update({
    current_player_order: nextPlayerOrder,
  })
  .eq("id", gameId);
  
  if (updateError) {
    console.error(updateError);
    alert(updateError.message);
    return;
  }
  
  setSelectedRowId(null);
  setSelectedColumnId(null);
}

function renderRowButton(row: (typeof rows)[number]) {
  if (!selectedColumnId) return null;
  
  const cellKey = `${selectedColumnId}:${row.id}`;
  const isFilled = filledCells.includes(cellKey);
  const isPlayable = isMobileCellPlayable(selectedColumnId, row.id);
  
  return (
    <div
    key={row.id}
    ref={(element) => {
      rowRefs.current[row.id] = element;
    }}
    >
    <button
  type="button"
  onClick={() => {
    if (!isPlayable) return;

    setSelectedRowId(row.id);

    setTimeout(() => {
      rowRefs.current[row.id]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }}
  className={[
  "flex h-14 w-full items-center justify-center rounded-xl border font-black transition",

  !isPlayable
    ? "cursor-not-allowed border-slate-900 bg-slate-950 text-slate-600"
    : "",
].join(" ")}
style={
  isPlayable
    ? isBasket
      ? {
          backgroundColor:
            selectedRowId === row.id
              ? basketTeam === "A"
                ? "#E87524"
                : "#2563EB"
              : basketTeam === "A"
                ? "rgba(232,117,36,0.12)"
                : "rgba(37,99,235,0.12)",

          color: "#FFFFFF",

          borderColor:
            basketTeam === "A"
              ? "#E87524"
              : "#2563EB",
        }
      : competitionTheme
        ? {
            backgroundColor:
              selectedRowId === row.id
                ? themeButtonBackground
                : themeScoreBackground,

            color:
              selectedRowId === row.id
                ? themeButtonText
                : themeScoreText,

            borderColor: themeBorder,
          }
        : undefined
    : undefined
}
>
  <span className="text-base">
    {isFilled ? "✓ " : ""}
    {row.label}
  </span>
</button>
    
    {selectedRowId === row.id && isPlayable && (
      <div className="mb-3 mt-2 grid grid-cols-3 gap-2">
      {getPossibleValues(row.id).map((value) => (
        <button
  key={String(value)}
  type="button"
  onClick={() =>
    saveMobileScore(selectedColumnId, row.id, value)
  }
  className="rounded-xl border p-3 font-black transition"
style={
  isBasket
    ? {
        backgroundColor:
          value === "X"
            ? basketTeam === "A"
              ? "#E87524"
              : "#2563EB"
            : basketTeam === "A"
              ? "rgba(232,117,36,0.12)"
              : "rgba(37,99,235,0.12)",

        color: "#FFFFFF",

        borderColor:
          basketTeam === "A"
            ? "#E87524"
            : "#2563EB",
      }
    : competitionTheme
      ? {
          backgroundColor:
            value === "X"
              ? themeButtonBackground
              : themeScoreBackground,

          color:
            value === "X"
              ? themeButtonText
              : themeScoreText,

          borderColor: themeBorder,
        }
      : undefined
}
>
  {value}
</button>
      ))}
      </div>
    )}
    </div>
  );
}
const playerTotal = playerScores.reduce((total, score) => {
  if (score.value === "X") return total;
  
  const value = Number(score.value);
  return Number.isNaN(value) ? total : total + value;
}, 0);

const totalCells = activeColumns.length * rows.length;
const remainingMoves = totalCells - filledCells.length;
return (
  <main
    className="relative min-h-screen overflow-hidden px-4 py-6 text-white"
    style={{
      backgroundColor:
        competitionTheme?.pageBackgroundColor ?? "#000000",
    }}
  >
    {competitionTheme?.backgroundImage && (
      <>
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("${competitionTheme.backgroundImage}")`,
          }}
        />

        <div className="pointer-events-none absolute inset-0 bg-black/75" />
      </>
    )}

    <div className="relative z-10 mx-auto max-w-md">
      <div
        className={[
          "rounded-3xl border p-6 text-center shadow-2xl",
          competitionTheme
            ? competitionTheme.border
            : "border-[#9B6A28]/70 bg-black",
        ].join(" ")}
        style={
          competitionTheme
            ? {
                background: competitionTheme.headerGradient,
              }
            : undefined
        }
      >
        {isCompetition ? (
          <>
            {isBasket ? (
  <div className="text-5xl">
    🏀
  </div>
) : competitionTheme?.flagImage ? (
  <Image
    src={competitionTheme.flagImage}
    alt={`Drapeau — ${competitionTheme.name}`}
    width={84}
    height={56}
    className="mx-auto h-14 w-auto rounded-md object-contain drop-shadow-xl"
    priority
  />
) : competitionTheme?.headerLogo ? (
  <Image
    src={competitionTheme.headerLogo}
    alt={competitionTheme.name}
    width={72}
    height={72}
    className="mx-auto h-16 w-auto object-contain drop-shadow-xl"
    priority
  />
) : (
  <div className="text-5xl">
    {competitionTheme?.icon ?? "🏁"}
  </div>
)}

            <div
              className={[
  "mt-3 text-sm font-black uppercase tracking-[0.18em]",
  isBasket
    ? "text-[#E87524]"
    : competitionTheme?.accentText ?? "text-[#C44934]",
].join(" ")}
            >
              {competitionLabel}
            </div>

            <div className="mt-1 text-sm font-bold text-white/70">
              {roundLabel}
            </div>
{isBasket && (
  <div className="mt-3 flex items-center justify-center gap-3 text-sm font-black">
    <span
      className="rounded-full px-3 py-1"
      style={{
        backgroundColor:
          basketTeam === "A"
            ? "rgba(232,117,36,0.18)"
            : "rgba(37,99,235,0.18)",
        color:
          basketTeam === "A"
            ? "#E87524"
            : "#60A5FA",
      }}
    >
      Équipe {basketTeam ?? "?"}
    </span>

    <span className="rounded-full bg-white/10 px-3 py-1 text-white/70">
      Q{basketQuarter ?? 1}
    </span>
  </div>
)}
            <h1 className="mt-3 text-4xl font-black">
              {playerName}
            </h1>

            <div className="mt-1 text-xs font-bold text-white/60">
              Joueur {selectedOrder} · Salon {code}
            </div>
          </>
        ) : (
          <>
            <div
              className={`text-sm font-black uppercase ${playerColor.text}`}
            >
              Salon {code} · Joueur {selectedOrder}
            </div>

            <h1 className="mt-2 text-4xl font-black">
              {playerName}
            </h1>
          </>
        )}
  <div className="mt-3 grid grid-cols-2 gap-3">
  <div
  className="rounded-xl border p-3"
  style={
    isBasket
      ? {
          backgroundColor:
            basketTeam === "A"
              ? "rgba(232,117,36,0.12)"
              : "rgba(37,99,235,0.12)",
          borderColor:
            basketTeam === "A"
              ? "#E87524"
              : "#2563EB",
          color: "#FFFFFF",
        }
      : undefined
  }
>
  <div
    className={[
      "text-xs font-black uppercase",
      isBasket ? "text-white/60" : "text-slate-500",
    ].join(" ")}
  >
    Score
  </div>

  <div
    className={[
      "mt-1 text-2xl font-black",
      isBasket
        ? "text-white"
        : competitionTheme
          ? competitionTheme.accentDarkText
          : playerColor.text,
    ].join(" ")}
  >
    {playerTotal}
  </div>
</div>
  
 
  <div
  className="rounded-xl border p-3"
  style={
    isBasket
      ? {
          backgroundColor:
            basketTeam === "A"
              ? "rgba(232,117,36,0.12)"
              : "rgba(37,99,235,0.12)",
          borderColor:
            basketTeam === "A"
              ? "#E87524"
              : "#2563EB",
          color: "#FFFFFF",
        }
      : undefined
  }
>
  <div
    className={[
      "text-xs font-black uppercase",
      isBasket ? "text-white/60" : "text-slate-500",
    ].join(" ")}
  >
    Restants
  </div>

  <div
    className={[
      "mt-1 text-2xl font-black",
      isBasket
        ? "text-white"
        : competitionTheme
          ? competitionTheme.accentDarkText
          : playerColor.text,
    ].join(" ")}
  >
    {remainingMoves}
  </div>
</div>
  </div>
  <p
  className={[
    "mt-3 text-sm font-bold",
    competitionTheme
      ? competitionTheme.accentText
      : "text-slate-400",
  ].join(" ")}
>
  {isMyTurn
    ? "C'est à toi de jouer."
    : `En attente du joueur ${currentPlayerOrder}.`}
</p>
    </div>
    
    <div className="mt-6 grid grid-cols-2 gap-3">
    {activeColumns.map((column, index) => {
      const sameTypeBefore = activeColumns
      .slice(0, index)
      .filter((item) => item.type === column.type).length;
      
      const labelNumber = sameTypeBefore + 1;
      
      const label =
      column.type === "down"
      ? `↓ Descente ${gameMode === "6cols" ? labelNumber : ""}`
      : column.type === "free"
      ? `L Libre ${gameMode === "6cols" ? labelNumber : ""}`
      : `↑ Montée ${gameMode === "6cols" ? labelNumber : ""}`;
      
      const isSelected = selectedColumnId === column.id;
      
      return (
        <button
  key={column.id}
  type="button"
  onClick={() => {
    if (!isMyTurn) return;

    setSelectedColumnId(column.id);
    setSelectedRowId(null);
  }}
  className={[
  "min-h-[56px] rounded-2xl border p-3 text-center font-black transition",

  !isMyTurn
    ? "cursor-not-allowed border-slate-900 bg-slate-950 text-slate-600"
    : "",
].join(" ")}
style={
  isMyTurn
    ? isBasket
      ? {
          backgroundColor: isSelected
            ? basketTeam === "A"
              ? "#E87524"
              : "#2563EB"
            : basketTeam === "A"
              ? "rgba(232,117,36,0.12)"
              : "rgba(37,99,235,0.12)",

          color: "#FFFFFF",

          borderColor:
            basketTeam === "A"
              ? "#E87524"
              : "#2563EB",
        }
      : competitionTheme
        ? {
            backgroundColor: isSelected
              ? themeButtonBackground
              : themeScoreBackground,
            color: isSelected
              ? themeButtonText
              : themeScoreText,
            borderColor: themeBorder,
          }
        : undefined
    : undefined
}
>
  {label}
</button>
      );
    })}
    </div>
    
    {selectedColumnId && (
      <div className="mt-6">
      <div
  className={[
    "mb-3 text-sm font-black uppercase tracking-wider",
    competitionTheme
      ? competitionTheme.accentText
      : "text-slate-400",
  ].join(" ")}
>
  Choisis une case
</div>
      
      
      
      <div className="grid grid-cols-3 gap-3">
      {upperRows.map((row) => renderRowButton(row))}
      </div>
      
      <div className="mt-4 grid grid-cols-1 gap-3">
      {lowerRows.map((row) => renderRowButton(row))}
      </div>
      
      </div>
    )}
    </div>
    </main>
  );
}