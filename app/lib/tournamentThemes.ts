export type TournamentTheme =
  | "australian_open"
  | "roland_garros"
  | "wimbledon"
  | "us_open";

export type TournamentThemeConfig = {
  id: TournamentTheme;
  name: string;
  shortName: string;
  icon: string;

  pageBackground: string;
  panelBackground: string;
  border: string;

  accentBackground: string;
  accentText: string;
accentDarkText: string; 
  courtBackground: string;
  courtLine: string;

  scoreBackground: string;
  scoreText: string;

  buttonBackground: string;
  buttonHover: string;
  buttonText: string;
};

export const TOURNAMENT_THEMES: Record<
  TournamentTheme,
  TournamentThemeConfig
> = {
  australian_open: {
    id: "australian_open",
    name: "Open d’Australie",
    shortName: "Australian Open",
    icon: "🇦🇺",

    pageBackground: "bg-[#071B2A]",
    panelBackground: "bg-[#1779BA]",
    border: "border-[#65BFEA]",

    accentBackground: "bg-[#65BFEA]",
    accentText: "text-[#65BFEA]",
     accentDarkText: "text-[#1779BA]", 

    courtBackground: "bg-[#1779BA]",
    courtLine: "bg-white/25",

    scoreBackground: "bg-[#F4E9DC]",
    scoreText: "text-[#1779BA]",

    buttonBackground: "bg-[#1779BA]",
    buttonHover: "hover:bg-[#228ED4]",
    buttonText: "text-white",
  },

  roland_garros: {
    id: "roland_garros",
    name: "Roland-Garros",
    shortName: "Roland-Garros",
    icon: "🟠",

    pageBackground: "bg-[#1A0D08]",
    panelBackground: "bg-[#B85632]",
    border: "border-[#E49369]",

    accentBackground: "bg-[#E49369]",
    accentText: "text-[#E49369]",
    accentDarkText: "text-[#B85632]",

    courtBackground: "bg-[#B85632]",
    courtLine: "bg-white/20",

    scoreBackground: "bg-[#F4E9DC]",
    scoreText: "text-[#B85632]",

    buttonBackground: "bg-[#B85632]",
    buttonHover: "hover:bg-[#C96841]",
    buttonText: "text-white",
  },

  wimbledon: {
    id: "wimbledon",
    name: "Wimbledon",
    shortName: "Wimbledon",
    icon: "🌿",

    pageBackground: "bg-[#07130C]",
    panelBackground: "bg-[#315B40]",
    border: "border-[#7AA987]",

    accentBackground: "bg-[#7AA987]",
    accentText: "text-[#A5D3B1]",
    accentDarkText: "text-[#315B40]",

    courtBackground: "bg-[#315B40]",
    courtLine: "bg-white/20",

    scoreBackground: "bg-[#F4E9DC]",
    scoreText: "text-[#315B40]",

    buttonBackground: "bg-[#315B40]",
    buttonHover: "hover:bg-[#417653]",
    buttonText: "text-white",
  },

  us_open: {
    id: "us_open",
    name: "US Open",
    shortName: "US Open",
    icon: "🇺🇸",

    pageBackground: "bg-[#07101F]",
    panelBackground: "bg-[#183B73]",
    border: "border-[#668AC5]",

    accentBackground: "bg-[#668AC5]",
    accentText: "text-[#8EB4F0]",
    accentDarkText: "text-[#183B73]",

    courtBackground: "bg-[#183B73]",
    courtLine: "bg-white/20",

    scoreBackground: "bg-[#F4E9DC]",
    scoreText: "text-[#183B73]",

    buttonBackground: "bg-[#183B73]",
    buttonHover: "hover:bg-[#24539A]",
    buttonText: "text-white",
  },
};

export function getTournamentTheme(theme: TournamentTheme) {
  return TOURNAMENT_THEMES[theme];
}