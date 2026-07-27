export type CompetitionType =
  | "grand_slam_final"
  | "world_cup";

/*
  On pourra ensuite ajouter facilement :

  | "league"
  | "cup"
  | "championship"
  | "survival"
*/

export type GrandSlamTheme =
  | "australian_open"
  | "roland_garros"
  | "wimbledon"
  | "us_open";

export type CompetitionTheme =
  | GrandSlamTheme
  | "world_cup";

type CompetitionHeaderBase = {
  competitionId: string;
  competitionType: CompetitionType;

  theme: CompetitionTheme;

  tournamentName: string;
  roundNumber: number;
  roundLabel: string;
};

export type GrandSlamCompetitionHeader =
  CompetitionHeaderBase & {
    competitionType: "grand_slam_final";

    player1SetsWon: number;
    player2SetsWon: number;
  };

export type WorldCupCompetitionHeader =
  CompetitionHeaderBase & {
    competitionType: "world_cup";

    matchId: string | null;
  };

export type CompetitionHeaderData =
  | GrandSlamCompetitionHeader
  | WorldCupCompetitionHeader;