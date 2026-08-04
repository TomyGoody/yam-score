import type {
  GrandPrixCircuitId,
  TournamentThemeConfig,
} from "./tournamentThemes";

type GrandPrixThemeInput = {
  id: GrandPrixCircuitId;
  name: string;
  shortName: string;
  icon: string;

  pageBackgroundColor: string;
  panelBackgroundColor: string;

  border: string;
  accentBackground: string;
  accentText: string;
  accentDarkText: string;
flagImage: string;
  courtBackground: string;

  scoreBackground: string;
  scoreText: string;

  buttonBackground: string;
  buttonHover: string;

  backgroundImage?: string;
  backgroundGlow: string;
  headerGradient: string;

  sheetCardBackground: string;
  sheetBorder: string;
  sheetTotalBackground: string;
  sheetTotalText: string;
  sheetFinalBackground: string;

  leaderboardBackground: string;
  leaderboardCardBorder: string;
  leaderboardCardBackground: string;
};

function createGrandPrixTheme(
  input: GrandPrixThemeInput
): TournamentThemeConfig {
  return {
    id: input.id,
    name: input.name,
    shortName: input.shortName,
    icon: input.icon,
flagImage: input.flagImage,
    pageBackgroundColor: input.pageBackgroundColor,
    panelBackgroundColor: input.panelBackgroundColor,
    border: input.border,

    accentBackground: input.accentBackground,
    accentText: input.accentText,
    accentDarkText: input.accentDarkText,

    courtBackground: input.courtBackground,
    courtLine: "bg-white/15",

    scoreBackground: input.scoreBackground,
    scoreText: input.scoreText,

    buttonBackground: input.buttonBackground,
    buttonHover: input.buttonHover,
    buttonText: "text-white",

    backgroundImage: input.backgroundImage,
    backgroundGlow: input.backgroundGlow,

    headerGradient: input.headerGradient,

    // Tant qu’on n’a pas de logos dédiés, GameScreen affichera l’emoji.
    headerLogo: "",

    sheet: {
      cardBackground: input.sheetCardBackground,
      cardBorder: input.sheetBorder,

      totalBackground: input.sheetTotalBackground,
      totalText: input.sheetTotalText,

      finalBackground: input.sheetFinalBackground,
      finalText: "#FFFFFF",

      diceBorder: input.sheetFinalBackground,
      diceDot: input.sheetFinalBackground,

      scoreText: input.sheetTotalText,
      activeText: input.sheetFinalBackground,
    },

    leaderboard: {
      border: input.sheetBorder,
      background: input.leaderboardBackground,

      titleText: input.sheetFinalBackground,
      rankText: input.sheetFinalBackground,

      cardBorder: input.leaderboardCardBorder,
      cardBackground: input.leaderboardCardBackground,
    },
  };
}

export const GRAND_PRIX_CIRCUIT_THEMES: Record<
  GrandPrixCircuitId,
  TournamentThemeConfig
> = {
  melbourne: createGrandPrixTheme({
    id: "melbourne",
    name: "Grand Prix d’Australie",
    shortName: "Melbourne",
    icon: "🇦🇺",
    flagImage: "/grand-prix/flags/AU.svg",

    pageBackgroundColor: "#020B10",
    panelBackgroundColor: "#082E45",

    border: "border-[#0EA5E9]",
    accentBackground: "bg-[#0EA5E9]",
    accentText: "text-[#55C2E8]",
    accentDarkText: "text-[#075985]",

    courtBackground: "bg-[#075985]",

    scoreBackground: "bg-[#DCEFF7]",
    scoreText: "text-[#075985]",

    buttonBackground: "bg-[#075985]",
    buttonHover: "hover:bg-[#0EA5E9]",
backgroundImage:
  "/grand-prix/backgrounds/melbourne.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(14,165,233,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #082E45 0%, #075985 55%, #0EA5E9 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #F1FAFD 0%, #D9EEF6 100%)",
    sheetBorder: "#0EA5E9",
    sheetTotalBackground: "#DCEFF7",
    sheetTotalText: "#075985",
    sheetFinalBackground: "#0EA5E9",

    leaderboardBackground: "rgba(2,11,16,.92)",
    leaderboardCardBorder: "rgba(14,165,233,.55)",
    leaderboardCardBackground: "rgba(14,165,233,.08)",
  }),

  bahrain: createGrandPrixTheme({
    id: "bahrain",
    name: "Grand Prix de Bahreïn",
    shortName: "Bahreïn",
    icon: "🇧🇭",
flagImage: "/grand-prix/flags/BH.svg",
    pageBackgroundColor: "#100803",
    panelBackgroundColor: "#39200C",

    border: "border-[#D99A3B]",
    accentBackground: "bg-[#D99A3B]",
    accentText: "text-[#F3C675]",
    accentDarkText: "text-[#8A4B19]",

    courtBackground: "bg-[#8A4B19]",

    scoreBackground: "bg-[#F3E4CA]",
    scoreText: "text-[#8A4B19]",

    buttonBackground: "bg-[#8A4B19]",
    buttonHover: "hover:bg-[#D99A3B]",
backgroundImage:
  "/grand-prix/backgrounds/bahrain.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(217,154,59,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #241205 0%, #8A4B19 55%, #D99A3B 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #FFF8EC 0%, #F1E0C4 100%)",
    sheetBorder: "#D99A3B",
    sheetTotalBackground: "#F3E4CA",
    sheetTotalText: "#8A4B19",
    sheetFinalBackground: "#D99A3B",

    leaderboardBackground: "rgba(16,8,3,.92)",
    leaderboardCardBorder: "rgba(217,154,59,.55)",
    leaderboardCardBackground: "rgba(217,154,59,.08)",
  }),

  jeddah: createGrandPrixTheme({
    id: "jeddah",
    name: "Grand Prix d’Arabie saoudite",
    shortName: "Djeddah",
    icon: "🇸🇦",
    flagImage: "/grand-prix/flags/SA.svg",
    pageBackgroundColor: "#020D0A",
    panelBackgroundColor: "#063B2E",

    border: "border-[#0A9B76]",
    accentBackground: "bg-[#0A9B76]",
    accentText: "text-[#55D3B4]",
    accentDarkText: "text-[#075E4A]",

    courtBackground: "bg-[#075E4A]",

    scoreBackground: "bg-[#DDEFE9]",
    scoreText: "text-[#075E4A]",

    buttonBackground: "bg-[#075E4A]",
    buttonHover: "hover:bg-[#0A9B76]",
backgroundImage:
  "/grand-prix/backgrounds/jeddah.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(10,155,118,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #03251C 0%, #075E4A 55%, #0A9B76 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #F0FBF7 0%, #D9EFE7 100%)",
    sheetBorder: "#0A9B76",
    sheetTotalBackground: "#DDEFE9",
    sheetTotalText: "#075E4A",
    sheetFinalBackground: "#0A9B76",

    leaderboardBackground: "rgba(2,13,10,.92)",
    leaderboardCardBorder: "rgba(10,155,118,.55)",
    leaderboardCardBackground: "rgba(10,155,118,.08)",
  }),

  suzuka: createGrandPrixTheme({
    id: "suzuka",
    name: "Grand Prix du Japon",
    shortName: "Suzuka",
    icon: "🇯🇵",
    flagImage: "/grand-prix/flags/JP.svg",
    pageBackgroundColor: "#090203",
    panelBackgroundColor: "#28050A",

    border: "border-[#D71920]",
    accentBackground: "bg-[#D71920]",
    accentText: "text-[#FF6676]",
    accentDarkText: "text-[#A30D22]",

    courtBackground: "bg-[#A30D22]",

    scoreBackground: "bg-[#F5E8E8]",
    scoreText: "text-[#A30D22]",

    buttonBackground: "bg-[#A30D22]",
    buttonHover: "hover:bg-[#D71920]",
backgroundImage:
  "/grand-prix/backgrounds/suzuka.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(215,25,32,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #28050A 0%, #8F1827 55%, #E11D48 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #FFF7F7 0%, #F1DDDF 100%)",
    sheetBorder: "#D71920",
    sheetTotalBackground: "#F5E8E8",
    sheetTotalText: "#A30D22",
    sheetFinalBackground: "#D71920",

    leaderboardBackground: "rgba(9,2,3,.92)",
    leaderboardCardBorder: "rgba(215,25,32,.55)",
    leaderboardCardBackground: "rgba(215,25,32,.08)",
  }),

  shanghai: createGrandPrixTheme({
    id: "shanghai",
    name: "Grand Prix de Chine",
    shortName: "Shanghai",
    icon: "🇨🇳",
    flagImage: "/grand-prix/flags/CN.svg",
    pageBackgroundColor: "#100302",
    panelBackgroundColor: "#450B09",

    border: "border-[#DC2626]",
    accentBackground: "bg-[#DC2626]",
    accentText: "text-[#FCA5A5]",
    accentDarkText: "text-[#991B1B]",

    courtBackground: "bg-[#991B1B]",

    scoreBackground: "bg-[#F4E5CA]",
    scoreText: "text-[#991B1B]",

    buttonBackground: "bg-[#991B1B]",
    buttonHover: "hover:bg-[#DC2626]",
backgroundImage:
  "/grand-prix/backgrounds/shanghai.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(220,38,38,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #310805 0%, #991B1B 55%, #DC2626 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #FFF7E8 0%, #F3E1C3 100%)",
    sheetBorder: "#DC2626",
    sheetTotalBackground: "#F4E5CA",
    sheetTotalText: "#991B1B",
    sheetFinalBackground: "#DC2626",

    leaderboardBackground: "rgba(16,3,2,.92)",
    leaderboardCardBorder: "rgba(220,38,38,.55)",
    leaderboardCardBackground: "rgba(220,38,38,.08)",
  }),

  imola: createGrandPrixTheme({
    id: "imola",
    name: "Grand Prix d’Émilie-Romagne",
    shortName: "Imola",
    icon: "🇮🇹",
    flagImage: "/grand-prix/flags/IT.svg",
    pageBackgroundColor: "#020A06",
    panelBackgroundColor: "#09351D",

    border: "border-[#22C55E]",
    accentBackground: "bg-[#22C55E]",
    accentText: "text-[#6EE7A0]",
    accentDarkText: "text-[#166534]",

    courtBackground: "bg-[#166534]",

    scoreBackground: "bg-[#E5EFE9]",
    scoreText: "text-[#166534]",

    buttonBackground: "bg-[#166534]",
    buttonHover: "hover:bg-[#22C55E]",
backgroundImage:
  "/grand-prix/backgrounds/imola.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(34,197,94,.20), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #071F13 0%, #166534 55%, #22C55E 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #F3FBF6 0%, #DDEEE4 100%)",
    sheetBorder: "#22C55E",
    sheetTotalBackground: "#E5EFE9",
    sheetTotalText: "#166534",
    sheetFinalBackground: "#22C55E",

    leaderboardBackground: "rgba(2,10,6,.92)",
    leaderboardCardBorder: "rgba(34,197,94,.55)",
    leaderboardCardBackground: "rgba(34,197,94,.08)",
  }),

  monaco: createGrandPrixTheme({
    id: "monaco",
    name: "Grand Prix de Monaco",
    shortName: "Monaco",
    icon: "🇲🇨",
    flagImage: "/grand-prix/flags/MC.svg",
    pageBackgroundColor: "#0A0203",
    panelBackgroundColor: "#210609",

    border: "border-[#C8102E]",
    accentBackground: "bg-[#C8102E]",
    accentText: "text-[#FF6670]",
    accentDarkText: "text-[#A71930]",

    courtBackground: "bg-[#A71930]",

    scoreBackground: "bg-[#F3E7E7]",
    scoreText: "text-[#A71930]",

    buttonBackground: "bg-[#A71930]",
    buttonHover: "hover:bg-[#C8102E]",
backgroundImage:
  "/grand-prix/backgrounds/monaco.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(239,51,64,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #2B0509 0%, #991B1B 55%, #EF3340 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #FFF6F6 0%, #F3DEDE 100%)",
    sheetBorder: "#C8102E",
    sheetTotalBackground: "#F3E7E7",
    sheetTotalText: "#A71930",
    sheetFinalBackground: "#C8102E",

    leaderboardBackground: "rgba(10,2,3,.92)",
    leaderboardCardBorder: "rgba(200,16,46,.55)",
    leaderboardCardBackground: "rgba(200,16,46,.08)",
  }),

  barcelona: createGrandPrixTheme({
    id: "barcelona",
    name: "Grand Prix d’Espagne",
    shortName: "Barcelone",
    icon: "🇪🇸",
    flagImage: "/grand-prix/flags/ES.svg",
    pageBackgroundColor: "#100901",
    panelBackgroundColor: "#4D2C04",

    border: "border-[#F59E0B]",
    accentBackground: "bg-[#F59E0B]",
    accentText: "text-[#FCD27B]",
    accentDarkText: "text-[#B45309]",

    courtBackground: "bg-[#B45309]",

    scoreBackground: "bg-[#F4E5C7]",
    scoreText: "text-[#B45309]",

    buttonBackground: "bg-[#B45309]",
    buttonHover: "hover:bg-[#F59E0B]",
backgroundImage:
  "/grand-prix/backgrounds/barcelona.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(245,158,11,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #2D1702 0%, #B45309 55%, #F59E0B 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #FFF8E8 0%, #F3E2BC 100%)",
    sheetBorder: "#F59E0B",
    sheetTotalBackground: "#F4E5C7",
    sheetTotalText: "#B45309",
    sheetFinalBackground: "#F59E0B",

    leaderboardBackground: "rgba(16,9,1,.92)",
    leaderboardCardBorder: "rgba(245,158,11,.55)",
    leaderboardCardBackground: "rgba(245,158,11,.08)",
  }),

  montreal: createGrandPrixTheme({
    id: "montreal",
    name: "Grand Prix du Canada",
    shortName: "Montréal",
    icon: "🇨🇦",
    flagImage: "/grand-prix/flags/CA.svg",
    pageBackgroundColor: "#0B0202",
    panelBackgroundColor: "#310909",

    border: "border-[#EF4444]",
    accentBackground: "bg-[#EF4444]",
    accentText: "text-[#FCA5A5]",
    accentDarkText: "text-[#991B1B]",

    courtBackground: "bg-[#991B1B]",

    scoreBackground: "bg-[#F3E4E4]",
    scoreText: "text-[#991B1B]",

    buttonBackground: "bg-[#991B1B]",
    buttonHover: "hover:bg-[#EF4444]",
backgroundImage:
  "/grand-prix/backgrounds/montreal.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(239,68,68,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #290606 0%, #991B1B 55%, #EF4444 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #FFF7F7 0%, #F0DEDE 100%)",
    sheetBorder: "#EF4444",
    sheetTotalBackground: "#F3E4E4",
    sheetTotalText: "#991B1B",
    sheetFinalBackground: "#EF4444",

    leaderboardBackground: "rgba(11,2,2,.92)",
    leaderboardCardBorder: "rgba(239,68,68,.55)",
    leaderboardCardBackground: "rgba(239,68,68,.08)",
  }),

  spielberg: createGrandPrixTheme({
    id: "spielberg",
    name: "Grand Prix d’Autriche",
    shortName: "Spielberg",
    icon: "🇦🇹",
    flagImage: "/grand-prix/flags/AT.svg",
    pageBackgroundColor: "#0B0203",
    panelBackgroundColor: "#31080D",

    border: "border-[#D9273A]",
    accentBackground: "bg-[#D9273A]",
    accentText: "text-[#F47B88]",
    accentDarkText: "text-[#8F1722]",

    courtBackground: "bg-[#8F1722]",

    scoreBackground: "bg-[#F3E1E4]",
    scoreText: "text-[#8F1722]",

    buttonBackground: "bg-[#8F1722]",
    buttonHover: "hover:bg-[#D9273A]",
backgroundImage:
  "/grand-prix/backgrounds/spielberg.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(217,39,58,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #2C050A 0%, #8F1722 55%, #D9273A 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #FFF5F6 0%, #F1DCE0 100%)",
    sheetBorder: "#D9273A",
    sheetTotalBackground: "#F3E1E4",
    sheetTotalText: "#8F1722",
    sheetFinalBackground: "#D9273A",

    leaderboardBackground: "rgba(11,2,3,.92)",
    leaderboardCardBorder: "rgba(217,39,58,.55)",
    leaderboardCardBackground: "rgba(217,39,58,.08)",
  }),

  silverstone: createGrandPrixTheme({
    id: "silverstone",
    name: "Grand Prix de Grande-Bretagne",
    shortName: "Silverstone",
    icon: "🇬🇧",
    flagImage: "/grand-prix/flags/GB.svg",
    pageBackgroundColor: "#02050D",
    panelBackgroundColor: "#09132E",

    border: "border-[#315BB5]",
    accentBackground: "bg-[#315BB5]",
    accentText: "text-[#6E96F2]",
    accentDarkText: "text-[#1D3B79]",

    courtBackground: "bg-[#1D3B79]",

    scoreBackground: "bg-[#E7ECF4]",
    scoreText: "text-[#1D3B79]",

    buttonBackground: "bg-[#1D3B79]",
    buttonHover: "hover:bg-[#315BB5]",
    backgroundImage:
      "/grand-prix/backgrounds/silverstone.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(49,91,181,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #09132E 0%, #1D3B79 55%, #315BB5 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #F4F7FC 0%, #DEE6F3 100%)",
    sheetBorder: "#315BB5",
    sheetTotalBackground: "#E7ECF4",
    sheetTotalText: "#1D3B79",
    sheetFinalBackground: "#315BB5",

    leaderboardBackground: "rgba(2,5,13,.92)",
    leaderboardCardBorder: "rgba(49,91,181,.55)",
    leaderboardCardBackground: "rgba(49,91,181,.08)",
  }),

  spa: createGrandPrixTheme({
    id: "spa",
    name: "Grand Prix de Belgique",
    shortName: "Spa-Francorchamps",
    icon: "🇧🇪",
    flagImage: "/grand-prix/flags/BE.svg",
    pageBackgroundColor: "#080702",
    panelBackgroundColor: "#1F1A05",

    border: "border-[#B59B23]",
    accentBackground: "bg-[#B59B23]",
    accentText: "text-[#E3C64B]",
    accentDarkText: "text-[#665415]",

    courtBackground: "bg-[#665415]",

    scoreBackground: "bg-[#EEE9D8]",
    scoreText: "text-[#665415]",

    buttonBackground: "bg-[#665415]",
    buttonHover: "hover:bg-[#B59B23]",
    backgroundImage:
      "/grand-prix/backgrounds/spa.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(181,155,35,.20), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #1F1A05 0%, #705E13 55%, #B59B23 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #FFFBEF 0%, #EDE5C6 100%)",
    sheetBorder: "#B59B23",
    sheetTotalBackground: "#EEE9D8",
    sheetTotalText: "#665415",
    sheetFinalBackground: "#B59B23",

    leaderboardBackground: "rgba(8,7,2,.92)",
    leaderboardCardBorder: "rgba(181,155,35,.55)",
    leaderboardCardBackground: "rgba(181,155,35,.08)",
  }),

  zandvoort: createGrandPrixTheme({
    id: "zandvoort",
    name: "Grand Prix des Pays-Bas",
    shortName: "Zandvoort",
    icon: "🇳🇱",
    flagImage: "/grand-prix/flags/NL.svg",
    pageBackgroundColor: "#100703",
    panelBackgroundColor: "#422008",

    border: "border-[#E8731A]",
    accentBackground: "bg-[#E8731A]",
    accentText: "text-[#F8AD70]",
    accentDarkText: "text-[#A3470D]",

    courtBackground: "bg-[#A3470D]",

    scoreBackground: "bg-[#F1E4D8]",
    scoreText: "text-[#A3470D]",

    buttonBackground: "bg-[#A3470D]",
    buttonHover: "hover:bg-[#E8731A]",
    backgroundImage:
      "/grand-prix/backgrounds/zandvoort.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(232,115,26,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #321503 0%, #A3470D 55%, #E8731A 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #FFF7EF 0%, #F1DFD0 100%)",
    sheetBorder: "#E8731A",
    sheetTotalBackground: "#F1E4D8",
    sheetTotalText: "#A3470D",
    sheetFinalBackground: "#E8731A",

    leaderboardBackground: "rgba(16,7,3,.92)",
    leaderboardCardBorder: "rgba(232,115,26,.55)",
    leaderboardCardBackground: "rgba(232,115,26,.08)",
  }),

  monza: createGrandPrixTheme({
    id: "monza",
    name: "Grand Prix d’Italie",
    shortName: "Monza",
    icon: "🇮🇹",

    pageBackgroundColor: "#020A06",
    panelBackgroundColor: "#071F13",
    flagImage: "/grand-prix/flags/IT.svg",
    border: "border-[#22A45D]",
    accentBackground: "bg-[#22A45D]",
    accentText: "text-[#58C58C]",
    accentDarkText: "text-[#166534]",

    courtBackground: "bg-[#166534]",

    scoreBackground: "bg-[#E5EFE9]",
    scoreText: "text-[#166534]",

    buttonBackground: "bg-[#166534]",
    buttonHover: "hover:bg-[#22A45D]",
    backgroundImage:
      "/grand-prix/backgrounds/monza.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(34,164,93,.20), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #071F13 0%, #166534 55%, #22A45D 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #F3FBF6 0%, #DDEEE4 100%)",
    sheetBorder: "#22A45D",
    sheetTotalBackground: "#E5EFE9",
    sheetTotalText: "#166534",
    sheetFinalBackground: "#22A45D",

    leaderboardBackground: "rgba(2,10,6,.92)",
    leaderboardCardBorder: "rgba(34,164,93,.55)",
    leaderboardCardBackground: "rgba(34,164,93,.08)",
  }),

  singapore: createGrandPrixTheme({
    id: "singapore",
    name: "Grand Prix de Singapour",
    shortName: "Singapour",
    icon: "🇸🇬",
    flagImage: "/grand-prix/flags/SG.svg",
    pageBackgroundColor: "#07020B",
    panelBackgroundColor: "#1C0828",

    border: "border-[#9333EA]",
    accentBackground: "bg-[#9333EA]",
    accentText: "text-[#BE78EE]",
    accentDarkText: "text-[#581C87]",

    courtBackground: "bg-[#581C87]",

    scoreBackground: "bg-[#EEE5F5]",
    scoreText: "text-[#581C87]",

    buttonBackground: "bg-[#581C87]",
    buttonHover: "hover:bg-[#9333EA]",
    backgroundImage:
      "/grand-prix/backgrounds/singapore.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(147,51,234,.24), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #1C0828 0%, #581C87 55%, #9333EA 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #FAF5FF 0%, #EADCF5 100%)",
    sheetBorder: "#9333EA",
    sheetTotalBackground: "#EEE5F5",
    sheetTotalText: "#581C87",
    sheetFinalBackground: "#9333EA",

    leaderboardBackground: "rgba(7,2,11,.92)",
    leaderboardCardBorder: "rgba(147,51,234,.55)",
    leaderboardCardBackground: "rgba(147,51,234,.08)",
  }),

  austin: createGrandPrixTheme({
    id: "austin",
    name: "Grand Prix des États-Unis",
    shortName: "Austin",
    icon: "🇺🇸",
    flagImage: "/grand-prix/flags/US.svg",
    pageBackgroundColor: "#02050D",
    panelBackgroundColor: "#0A1738",

    border: "border-[#315BC7]",
    accentBackground: "bg-[#315BC7]",
    accentText: "text-[#7599F2]",
    accentDarkText: "text-[#1E3A8A]",

    courtBackground: "bg-[#1E3A8A]",

    scoreBackground: "bg-[#E5EBF6]",
    scoreText: "text-[#1E3A8A]",

    buttonBackground: "bg-[#1E3A8A]",
    buttonHover: "hover:bg-[#315BC7]",
    backgroundImage:
      "/grand-prix/backgrounds/austin.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(49,91,199,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #07112C 0%, #1E3A8A 55%, #315BC7 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #F3F6FD 0%, #DDE5F5 100%)",
    sheetBorder: "#315BC7",
    sheetTotalBackground: "#E5EBF6",
    sheetTotalText: "#1E3A8A",
    sheetFinalBackground: "#315BC7",

    leaderboardBackground: "rgba(2,5,13,.92)",
    leaderboardCardBorder: "rgba(49,91,199,.55)",
    leaderboardCardBackground: "rgba(49,91,199,.08)",
  }),

  mexico: createGrandPrixTheme({
    id: "mexico",
    name: "Grand Prix du Mexique",
    shortName: "Mexico",
    icon: "🇲🇽",
    flagImage: "/grand-prix/flags/MX.svg",
    pageBackgroundColor: "#020A06",
    panelBackgroundColor: "#08351E",

    border: "border-[#22A45D]",
    accentBackground: "bg-[#22A45D]",
    accentText: "text-[#5FC98F]",
    accentDarkText: "text-[#166534]",

    courtBackground: "bg-[#166534]",

    scoreBackground: "bg-[#E4EFE8]",
    scoreText: "text-[#166534]",

    buttonBackground: "bg-[#166534]",
    buttonHover: "hover:bg-[#22A45D]",
    backgroundImage:
      "/grand-prix/backgrounds/mexico.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(34,164,93,.20), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #071F13 0%, #166534 55%, #22A45D 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #F2FAF5 0%, #DCEDE3 100%)",
    sheetBorder: "#22A45D",
    sheetTotalBackground: "#E4EFE8",
    sheetTotalText: "#166534",
    sheetFinalBackground: "#22A45D",

    leaderboardBackground: "rgba(2,10,6,.92)",
    leaderboardCardBorder: "rgba(34,164,93,.55)",
    leaderboardCardBackground: "rgba(34,164,93,.08)",
  }),

  interlagos: createGrandPrixTheme({
    id: "interlagos",
    name: "Grand Prix de São Paulo",
    shortName: "Interlagos",
    icon: "🇧🇷",
    flagImage: "/grand-prix/flags/BR.svg",

    pageBackgroundColor: "#060A02",
    panelBackgroundColor: "#1A2B08",

    border: "border-[#7DAD21]",
    accentBackground: "bg-[#7DAD21]",
    accentText: "text-[#B0D75F]",
    accentDarkText: "text-[#3F7015]",

    courtBackground: "bg-[#3F7015]",

    scoreBackground: "bg-[#E9EDD8]",
    scoreText: "text-[#3F7015]",

    buttonBackground: "bg-[#3F7015]",
    buttonHover: "hover:bg-[#7DAD21]",
    backgroundImage:
      "/grand-prix/backgrounds/interlagos.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(125,173,33,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #162605 0%, #3F7015 55%, #7DAD21 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #F8FAEE 0%, #E5EBCF 100%)",
    sheetBorder: "#7DAD21",
    sheetTotalBackground: "#E9EDD8",
    sheetTotalText: "#3F7015",
    sheetFinalBackground: "#7DAD21",

    leaderboardBackground: "rgba(6,10,2,.92)",
    leaderboardCardBorder: "rgba(125,173,33,.55)",
    leaderboardCardBackground: "rgba(125,173,33,.08)",
  }),

  abu_dhabi: createGrandPrixTheme({
    id: "abu_dhabi",
    name: "Grand Prix d’Abou Dabi",
    shortName: "Abou Dabi",
    icon: "🇦🇪",
    flagImage: "/grand-prix/flags/ae.svg",
    pageBackgroundColor: "#020B0A",
    panelBackgroundColor: "#07312D",

    border: "border-[#13A89E]",
    accentBackground: "bg-[#13A89E]",
    accentText: "text-[#59D2CA]",
    accentDarkText: "text-[#0F6762]",

    courtBackground: "bg-[#0F6762]",

    scoreBackground: "bg-[#DDEFEA]",
    scoreText: "text-[#0F6762]",

    buttonBackground: "bg-[#0F6762]",
    buttonHover: "hover:bg-[#13A89E]",
    backgroundImage:
      "/grand-prix/backgrounds/abu-dhabi.webp",
    backgroundGlow:
      "radial-gradient(circle at 50% 28%, rgba(19,168,158,.22), transparent 50%)",

    headerGradient:
      "linear-gradient(90deg, #052D29 0%, #0F6762 55%, #13A89E 100%)",

    sheetCardBackground:
      "linear-gradient(135deg, #F1FAF9 0%, #D9EEEB 100%)",
    sheetBorder: "#13A89E",
    sheetTotalBackground: "#DDEFEA",
    sheetTotalText: "#0F6762",
    sheetFinalBackground: "#13A89E",

    leaderboardBackground: "rgba(2,11,10,.92)",
    leaderboardCardBorder: "rgba(19,168,158,.55)",
    leaderboardCardBackground: "rgba(19,168,158,.08)",
  }),
};

export function getGrandPrixCircuitTheme(
  circuitId: string | null | undefined
): TournamentThemeConfig | null {
  if (!circuitId) {
    return null;
  }

  const normalizedCircuitId =
    circuitId.trim().toLowerCase().replaceAll("-", "_");

  return (
    GRAND_PRIX_CIRCUIT_THEMES[
      normalizedCircuitId as GrandPrixCircuitId
    ] ?? null
  );
}