"use client";

import QRCode from "react-qr-code";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import LoadingScreen from "../../../components/LoadingScreen";
import {
  TournamentTheme,
  getTournamentTheme,
} from "../../../lib/tournamentThemes";
type SalonPlayer = {
  id: string;
  name: string;
  player_order: number;
  profile_id: string | null;
  is_connected: boolean;
};

type SalonData = {
  id: string;
  code: string;
  status: "waiting" | "playing" | "finished";
  competition_id: string | null;
  competition_round_number: number | null;
  player_count: number;

  competition_type:
    | "grand_slam_final"
    | "world_cup"
    | null;

  competition_theme: TournamentTheme | null;
  competition_name: string | null;
};

export default function PlayerAccessPage() {
  const params = useParams();
  const router = useRouter();

  const code = String(params.code).toUpperCase();

  const [salon, setSalon] = useState<SalonData | null>(null);
  const [players, setPlayers] = useState<SalonPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedPlayerOrder, setCopiedPlayerOrder] =
    useState<number | null>(null);

  useEffect(() => {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let cancelled = false;

  async function loadAccesses(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    const { data: salonData, error: salonError } =
      await supabase
        .from("yam_games")
        .select(`
          id,
          code,
          status,
          player_count,
          competition_id,
          competition_round_number
        `)
        .eq("code", code)
        .maybeSingle();

    if (salonError || !salonData) {
      setErrorMessage("Salon introuvable.");
      setLoading(false);
      return;
    }

    let competitionTheme: TournamentTheme | null = null;
    let competitionName: string | null = null;
let competitionType:
  | "grand_slam_final"
  | "world_cup"
  | null = null;
    if (salonData.competition_id) {
      const { data: competition } = await supabase
        .from("competitions")
        .select("competition_type, theme")
        .eq("id", salonData.competition_id)
        .maybeSingle();

      if (competition?.theme) {
        if (competition?.competition_type) {
  competitionType =
    competition.competition_type as
      | "grand_slam_final"
      | "world_cup";
}
        competitionTheme =
          competition.theme as TournamentTheme;

        competitionName =
  getTournamentName(competitionTheme) ?? null;
      }
    }

    const { data: playersData, error: playersError } =
      await supabase
        .from("yam_players")
        .select("id, name, player_order, profile_id")
        .eq("game_id", salonData.id)
        .order("player_order", { ascending: true });

    if (playersError) {
      setErrorMessage(
        "Impossible de charger les joueurs."
      );

      setLoading(false);
      return;
    }

    const { data: claimsData, error: claimsError } =
      await supabase
        .from("salon_player_claims")
        .select("player_order")
        .eq("game_id", salonData.id);

    console.log("CLAIMS CHARGÉS", {
      salonId: salonData.id,
      claimsData,
      claimsError,
    });

    const connectedOrders = new Set(
      (claimsData ?? []).map(
        (claim) => claim.player_order
      )
    );

    if (cancelled) return;

    setSalon({
  ...salonData,
  competition_type: competitionType,
  competition_theme: competitionTheme,
  competition_name:
    competitionType === "world_cup"
      ? "Coupe du Monde"
      : competitionName,
} as SalonData);

    setPlayers(
      (playersData ?? []).map((player) => ({
        ...player,
        is_connected: connectedOrders.has(
          player.player_order
        ),
      }))
    );

    setLoading(false);

    if (!channel) {
      channel = supabase
        .channel(`salon_claims_${salonData.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "salon_player_claims",
            filter: `game_id=eq.${salonData.id}`,
          },
          (payload) => {
            console.log(
              "CLAIM REALTIME REÇU",
              payload
            );

            void loadAccesses(false);
          }
        )
        .subscribe((status) => {
          console.log(
            "SALON CLAIMS CHANNEL",
            status
          );
        });
    }
  }

  void loadAccesses(true);

  /*
    Sécurité supplémentaire :
    rafraîchissement toutes les 2 secondes.
  */
  const interval = window.setInterval(() => {
    void loadAccesses(false);
  }, 2000);

  return () => {
    cancelled = true;
    window.clearInterval(interval);

    if (channel) {
      void supabase.removeChannel(channel);
    }
  };
}, [code]);
  const playerAccesses = useMemo(() => {
    if (typeof window === "undefined") return [];

    return players.map((player) => ({
      ...player,
      url: `${window.location.origin}/salon/${code}/player/${player.player_order}`,
    }));
  }, [players, code]);
async function startGame() {
  if (!salon) return;

  const { error } = await supabase
    .from("yam_games")
    .update({
      status: "playing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", salon.id);

  if (error) {
    console.error("Erreur démarrage du Salon", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    setErrorMessage("Impossible de démarrer le set.");
    return;
  }

  router.push(`/salon/${code}`);
}
  async function copyPlayerLink(playerOrder: number, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPlayerOrder(playerOrder);

      window.setTimeout(() => {
        setCopiedPlayerOrder((current) =>
          current === playerOrder ? null : current
        );
      }, 1500);
    } catch (error) {
      console.error("Impossible de copier le lien", error);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (errorMessage || !salon) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/50 bg-[#111111] p-6 text-center">
          <h1 className="text-2xl font-black text-red-400">
            Accès indisponibles
          </h1>

          <p className="mt-3 font-bold text-slate-400">
            {errorMessage ?? "Salon introuvable."}
          </p>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-[#C44934] px-5 py-3 font-black text-white"
          >
            Retour à l’accueil
          </button>
        </div>
      </main>
    );
  }
const tournamentTheme = salon.competition_theme
  ? getTournamentTheme(salon.competition_theme)
  : null;
  const isDev = process.env.NODE_ENV === "development";

const allPlayersConnected =
  players.length === salon.player_count &&
  players.every((player) => player.is_connected);
  return (
    <main
  className={[
    "min-h-dvh px-4 py-8 text-white",
    tournamentTheme?.pageBackgroundColor ?? "bg-black",
  ].join(" ")}
>
      <div className="mx-auto w-full max-w-6xl">
        <button
  type="button"
  onClick={() => {
    if (salon.competition_id) {
  router.push(
    salon.competition_type === "world_cup"
      ? `/modes-speciaux/coupe-du-monde/${salon.competition_id}`
      : `/modes-speciaux/grand-chelem/${salon.competition_id}`
  );

  return;
}

    router.push(`/salon/${code}`);
  }}
  className={[
  "rounded-xl border px-4 py-2 font-black text-white transition",
  tournamentTheme
    ? `${tournamentTheme.border} ${tournamentTheme.buttonBackground} ${tournamentTheme.buttonHover}`
    : "border-[#9B6A28]/60 bg-black hover:bg-[#241A13]",
].join(" ")}
>
  {salon.competition_id
  ? salon.competition_type === "world_cup"
    ? "Retour à la Coupe du Monde"
    : "Retour à la finale"
  : "Retour au Salon"}
</button>

        <header className="mt-8 text-center">
          <p className={[
  "text-sm font-black uppercase tracking-[0.3em]",
  tournamentTheme
    ? tournamentTheme.accentText
    : "text-[#C44934]",
].join(" ")}>
  {salon.competition_name ?? `Salon ${code}`}
</p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Accès des joueurs
          </h1>

          <p className="mx-auto mt-4 max-w-2xl font-bold text-slate-400">
            Chaque joueur scanne le QR code associé à sa place pour ouvrir
            directement sa feuille.
          </p>

          {salon.competition_id &&
  salon.competition_round_number && (
    <p className="mt-3 text-sm font-black text-amber-300">
      {salon.competition_type === "world_cup"
        ? `Coupe du Monde · Tour ${salon.competition_round_number}`
        : `Finale de Grand Chelem · Set ${salon.competition_round_number}`}
    </p>
  )}
        </header>

        {playerAccesses.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-700 p-8 text-center font-bold text-slate-500">
            Aucun joueur disponible
          </div>
        ) : (
          <section className="mt-10 flex flex-wrap justify-center gap-6">
            {playerAccesses.map((player) => (
              <article
  key={player.id}
  className={[
  "w-full max-w-[380px] rounded-3xl border p-6",
  tournamentTheme
    ? `${tournamentTheme.border} bg-black/35 backdrop-blur-sm`
    : "border-[#9B6A28]/60 bg-[#111111]",
].join(" ")}
>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#C44934]">
                      Joueur {player.player_order}
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      {player.name}
                    </h2>
                  </div>

                  <div className="flex flex-col items-end gap-2">
  <span
    className={[
      "rounded-full px-3 py-1 text-xs font-black uppercase",
      player.profile_id
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-slate-700 text-slate-300",
    ].join(" ")}
  >
    {player.profile_id
      ? "Profil associé"
      : "Invité"}
  </span>

  <span
    className={[
      "rounded-full px-3 py-1 text-xs font-black uppercase",
      player.is_connected
        ? "bg-emerald-500/20 text-emerald-300"
        : "bg-slate-800 text-slate-400",
    ].join(" ")}
  >
    {player.is_connected
      ? "🟢 Connecté"
      : "⚪ En attente"}
  </span>
</div>
                </div>

                <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-4">
                  <QRCode value={player.url} size={190} />
                </div>

                <p className="mt-5 break-all rounded-xl bg-black p-3 text-xs font-bold text-slate-400">
                  {player.url}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void copyPlayerLink(player.player_order, player.url)
                  }
                  className={[
  "mt-4 w-full rounded-xl px-4 py-3 font-black transition",
  tournamentTheme
    ? `${tournamentTheme.buttonBackground} ${tournamentTheme.buttonHover} ${tournamentTheme.buttonText}`
    : "bg-[#241A13] text-white hover:bg-[#322217]",
].join(" ")}
                >
                  {copiedPlayerOrder === player.player_order
                    ? "Lien copié"
                    : "Copier le lien"}
                </button>
                
              </article>
              
            ))}
            
          </section>
          
        )}
      </div>
      <div className="mt-8 flex justify-center">
        <p className="mb-3 text-center text-sm font-bold text-slate-400">
  {isDev
    ? "Mode développeur : démarrage autorisé sans connexion des joueurs."
    : allPlayersConnected
      ? "Tous les joueurs sont connectés."
      : `${players.filter((player) => player.is_connected).length}/${salon.player_count} joueurs connectés`}
</p>
  <button
  type="button"
  disabled={!isDev && !allPlayersConnected}
  onClick={() => void startGame()}
  className={[
    "w-full max-w-md rounded-xl px-5 py-4 text-lg font-black transition",
    tournamentTheme
      ? `${tournamentTheme.buttonBackground} ${tournamentTheme.buttonHover} ${tournamentTheme.buttonText}`
      : "bg-[#C44934] text-white hover:bg-[#D75A43]",
    "disabled:cursor-not-allowed disabled:opacity-40",
  ].join(" ")}
>
  {salon.competition_type === "world_cup"
    ? "Démarrer le match"
    : "Démarrer le set"}
</button>
</div>
    </main>
  );
}
function getTournamentName(theme: TournamentTheme) {
  switch (theme) {
    case "australian_open":
      return "Open d’Australie";

    case "roland_garros":
      return "Roland-Garros";

    case "wimbledon":
      return "Wimbledon";

    case "us_open":
      return "US Open";
  }
}