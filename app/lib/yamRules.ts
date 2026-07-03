export type ColumnType = "down" | "free" | "up";

export type YamColumn = {
  id: string;
  label: string;
  type: ColumnType;
};

export type YamRow =
  | "aces"
  | "twos"
  | "threes"
  | "fours"
  | "fives"
  | "sixes"
  | "minus"
  | "plus"
  | "threeOfAKind"
  | "fullHouse"
  | "straight"
  | "fourOfAKind"
  | "yam";

export const columns: YamColumn[] = [
  { id: "down1", label: "⬇", type: "down" },
  { id: "down2", label: "⬇", type: "down" },
  { id: "free1", label: "L", type: "free" },
  { id: "free2", label: "L", type: "free" },
  { id: "up1", label: "⬆", type: "up" },
  { id: "up2", label: "⬆", type: "up" },
];

export const rows: { id: YamRow; label: string }[] = [
  { id: "aces", label: "1" },
  { id: "twos", label: "2" },
  { id: "threes", label: "3" },
  { id: "fours", label: "4" },
  { id: "fives", label: "5" },
  { id: "sixes", label: "6" },
  { id: "minus", label: "-" },
  { id: "plus", label: "+" },
  { id: "threeOfAKind", label: "Brelan" },
  { id: "fullHouse", label: "Full" },
  { id: "straight", label: "Quinte" },
  { id: "fourOfAKind", label: "Carré" },
  { id: "yam", label: "Yam" },
];

export const fixedScores: Partial<Record<YamRow, number>> = {
  threeOfAKind: 20,
  fullHouse: 30,
  straight: 50,
  fourOfAKind: 40,
  yam: 60,
};
export type ScoreOption = number | "X";

export function getPossibleValues(rowId: YamRow): ScoreOption[] {
  if (rowId === "minus" || rowId === "plus") {
    return ["X", ...Array.from({ length: 26 }, (_, index) => index + 5)];
  }

  const optionsByRow: Partial<Record<YamRow, number[]>> = {
    aces: [1, 2, 3, 4, 5],
    twos: [2, 4, 6, 8, 10],
    threes: [3, 6, 9, 12, 15],
    fours: [4, 8, 12, 16, 20],
    fives: [5, 10, 15, 20, 25],
    sixes: [6, 12, 18, 24, 30],
    threeOfAKind: [20],
    fullHouse: [30],
    straight: [50],
    fourOfAKind: [40],
    yam: [60],
  };

  return ["X", ...(optionsByRow[rowId] ?? [])];
}