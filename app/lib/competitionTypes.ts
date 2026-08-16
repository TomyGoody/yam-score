export type CompetitionType =
| "grand_slam_final"
| "world_cup"
| "grand_prix"
| "basket";

export type GrandSlamTheme =
| "australian_open"
| "roland_garros"
| "wimbledon"
| "us_open";

export type CompetitionTheme =
| GrandSlamTheme
| "basket"
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

export type GrandPrixCompetitionHeader =
CompetitionHeaderBase & {
  competitionType: "grand_prix";
  
  circuitId: string | null;
};

export type BasketCompetitionHeader =
  CompetitionHeaderBase & {
    competitionType: "basket";

    currentQuarter: 1 | 2 | 3 | 4 | null;

    teamAPoints: number;
    teamBPoints: number;

    currentQuarterTeamAScore: number;
    currentQuarterTeamBScore: number;
  };

export type CompetitionHeaderData =
| GrandSlamCompetitionHeader
| WorldCupCompetitionHeader
| GrandPrixCompetitionHeader
| BasketCompetitionHeader;