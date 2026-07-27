import type {
  CompetitionTheme,
} from "./competitionTypes";

export type TournamentTheme =
CompetitionTheme;

export type TournamentThemeConfig = {
  id: TournamentTheme;
  name: string;
  shortName: string;
  icon: string;
  
  pageBackgroundColor: string;
  panelBackgroundColor: string;
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
  
  backgroundImage: string;
  backgroundGlow: string;

  headerGradient: string;
  headerLogo: string;
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
    
    pageBackgroundColor: "#071B2A",
    panelBackgroundColor: "#1779BA",
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
    
    backgroundImage: "/australian-open.webp",
    backgroundGlow:
    "radial-gradient(circle at 50% 32%, rgba(0,145,255,0.18) 0%, transparent 48%)",

    headerGradient:
  "linear-gradient(90deg, #0B3D82 0%, #176CC0 50%, #0B3D82 100%)",

headerLogo: "/australian-open-logo.png",
  },
  
  roland_garros: {
    id: "roland_garros",
    name: "Roland-Garros",
    shortName: "Roland-Garros",
    icon: "🟠",
    
    pageBackgroundColor: "#1A0D08",
    panelBackgroundColor: "#B85632",
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
    
    backgroundImage: "/roland-garros.webp",
    backgroundGlow:
    "radial-gradient(circle at 50% 32%, rgba(182,90,43,.18) 0%, transparent 48%)",

    headerGradient:
  "linear-gradient(90deg, #7A321B 0%, #C45F35 50%, #7A321B 100%)",

headerLogo: "/roland-garros-logo.png",
  },
  
  wimbledon: {
    id: "wimbledon",
    name: "Wimbledon",
    shortName: "Wimbledon",
    icon: "🌿",
    
    pageBackgroundColor: "#07130C",
    panelBackgroundColor: "#315B40",
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
    
    backgroundImage: "/wimbledon.webp",
    backgroundGlow:
    "radial-gradient(circle at 50% 32%, rgba(46,120,62,.18) 0%, transparent 48%)",

    headerGradient:
  "linear-gradient(90deg, #123B25 0%, #2F7045 50%, #123B25 100%)",

headerLogo: "/wimbledon-logo.png",
  },
  
  us_open: {
    id: "us_open",
    name: "US Open",
    shortName: "US Open",
    icon: "🇺🇸",
    
    pageBackgroundColor: "#07101F",
    panelBackgroundColor: "#183B73",
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
    
    backgroundImage: "/us-open.webp",
    backgroundGlow:
    "radial-gradient(circle at 50% 32%, rgba(33,81,170,.18) 0%, transparent 48%)",

    headerGradient:
  "linear-gradient(90deg, #0A2754 0%, #285AA6 50%, #0A2754 100%)",

headerLogo: "/us-open-logo.png",
  },
  world_cup: {
    id: "world_cup",
    name: "Coupe du Monde",
    shortName: "Coupe du Monde",
    icon: "⚽",
    
    pageBackgroundColor: "#020D08",
    panelBackgroundColor: "#03180F",
    border: "border-[#2E6F40]",
    
    accentBackground: "bg-[#D4AF37]",
    accentText: "text-[#F2D675]",
    accentDarkText: "text-[#2E6F40]",
    
    courtBackground: "bg-[#07341F]",
    courtLine: "bg-white/10",
    
    scoreBackground: "bg-[#FBF7F2]",
    scoreText: "text-[#253D2C]",
    
    buttonBackground: "bg-[#073D25]",
    buttonHover: "hover:bg-[#0A5231]",
    buttonText: "text-white",
    
    backgroundImage: "/world-cup-stadium.webp",
    backgroundGlow:
    "radial-gradient(circle at 50% 32%, rgba(34,168,102,0.14) 0%, transparent 48%)",

    headerGradient:
  "linear-gradient(90deg, #010403 0%, #030906 45%, #010403 100%)",

headerLogo: "/world-cup-trophy.png",
  },
};

export function getTournamentTheme(theme: TournamentTheme) {
  return TOURNAMENT_THEMES[theme];
}