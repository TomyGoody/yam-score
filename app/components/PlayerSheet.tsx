"use client";

import { Pencil } from "lucide-react";
import { columns, rows, YamRow } from "../lib/yamRules";
import React from "react";
type ScoreValue = number | "X" | null;

type Player = {
  id: string;
  name: string;
  playerOrder?: number;
  player_order?: number;
};

type SelectedCell = {
  playerId: string;
  columnId: string;
  rowId: YamRow;
};
const CELL_BORDER = "border-r border-b border-[#CFAF95]";
const CELL_BORDER_FIRST_ROW = "border-t";
const CELL_BORDER_FIRST_COL = "border-l";

export default function PlayerSheet({
  player,
  getScore,
  getTopTotal,
  getBonus,
  getBottomTotal,
  getGrandTotal,
  startEditingPlayer,
  getPlayerTotal,
  isCellPlayable,
  onSelectCell,
  editingPlayerId,
editingName,
setEditingName,
savePlayerName,
setEditingPlayerId,
activeColumns,
currentPlayerId,
gameFinished,
lastScoreAnimation,
color,
}: {
  player: Player;
  getScore: (playerId: string, columnId: string, rowId: YamRow) => ScoreValue;
  getTopTotal: (playerId: string, columnId: string) => number;
  getBonus: (playerId: string, columnId: string) => number;
  getBottomTotal: (playerId: string, columnId: string) => number;
  getGrandTotal: (playerId: string, columnId: string) => number;
  getPlayerTotal: (playerId: string) => number;
  currentPlayerId: string | null;
  color: {
  text: string;
  border: string;
  bg: string;
};
gameFinished: boolean;
  isCellPlayable: (playerId: string, columnId: string, rowId: YamRow) => boolean;
  onSelectCell: (cell: SelectedCell) => void;
  startEditingPlayer: (
  playerId: string,
  currentName: string
) => void;
editingPlayerId: string | null;
editingName: string;
setEditingName: (value: string) => void;
savePlayerName: (playerId: string) => void;
setEditingPlayerId: (value: string | null) => void;
activeColumns: typeof columns;
lastScoreAnimation: {
  playerId: string;
  columnId: string;
  rowId: string;
  value: number | "X";
} | null;
}) {


  const isCurrentPlayer =
  player.id === currentPlayerId;
  
 
  return (
    <div
  className="shrink-0 rounded-xl  bg-gradient-to-br from-[#F7EFE6] to-[#F1E2D4] p-4 text-[#241812] shadow-2xl"
>
     <div className="relative  text-center">
  <div className="flex items-center justify-center gap-2">
    {editingPlayerId === player.id ? (
      <input
        autoFocus
        value={editingName}
        onChange={(e) => setEditingName(e.target.value)}
        onBlur={() => savePlayerName(player.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            savePlayerName(player.id);
          }

          if (e.key === "Escape") {
            setEditingPlayerId(null);
          }
        }}
        className="
          w-40
          rounded-md
          border
          border-slate-700
          bg-slate-900
          px-2
          py-1
          text-center
          font-black
          text-white
        "
      />
    ) : (
      <>
        <h2 className="text-xl font-black text-[#241812]">
          {player.name}
        </h2>

        <button
          onClick={() =>
            startEditingPlayer(player.id, player.name)
          }
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Renommer"
        >
          <Pencil size={14} />
        </button>
      </>
    )}
  </div>

  <div className="text-3xl font-black text-[#B84332]">
    {getPlayerTotal(player.id)}
  </div>
  {lastScoreAnimation?.playerId === player.id && (
  <div className="pointer-events-none absolute left-1/2 top-12 -translate-x-1/2 text-lg font-black text-[#B84332] animate-score-pop">
    {lastScoreAnimation.value === "X"
      ? "✕"
      : `+${lastScoreAnimation.value}`}
  </div>
)}
  <div className="h-5 mt-0">
  {isCurrentPlayer && !gameFinished && (
    <div
      className={`text-xs font-black uppercase tracking-wider animate-pulse text-[#B84332]`}
    >
      ▶ Ton tour
    </div>
  )}
</div>
</div>

      <ScoreGrid
  player={player}
  activeColumns={activeColumns}
  getScore={getScore}
  getTopTotal={getTopTotal}
  getBonus={getBonus}
  getBottomTotal={getBottomTotal}
  getGrandTotal={getGrandTotal}
  isCellPlayable={isCellPlayable}
  onSelectCell={onSelectCell}
  lastScoreAnimation={lastScoreAnimation}
/>
    </div>
  );
}
function ScoreGrid({
  player,
  activeColumns,
  getScore,
  getTopTotal,
  getBonus,
  getBottomTotal,
  getGrandTotal,
  isCellPlayable,
  onSelectCell,
  lastScoreAnimation,
}: {
  player: Player;
  activeColumns: typeof columns;
  getScore: (playerId: string, columnId: string, rowId: YamRow) => ScoreValue;
  getTopTotal: (playerId: string, columnId: string) => number;
  getBonus: (playerId: string, columnId: string) => number;
  getBottomTotal: (playerId: string, columnId: string) => number;
  getGrandTotal: (playerId: string, columnId: string) => number;
  isCellPlayable: (playerId: string, columnId: string, rowId: YamRow) => boolean;
  onSelectCell: (cell: SelectedCell) => void;
  lastScoreAnimation: {
    playerId: string;
    columnId: string;
    rowId: string;
    value: number | "X";
  } | null;
}) {
  const gridColumns =
    activeColumns.length === 6
      ? "grid-cols-[56px_40px_40px_6px_40px_40px_6px_40px_40px]"
      : "grid-cols-[56px_40px_6px_40px_6px_40px]";


  function renderColumnCells(row: { id: YamRow; label: string }, rowIndex: number, section: "top" | "bottom") {
    return activeColumns.flatMap((column, index) => {
      const items: React.ReactNode[] = [];
 const isBlockStart =
    index > 0 &&
    activeColumns[index - 1].type !== column.type;
      if (index > 0 && activeColumns[index - 1].type !== column.type) {
        items.push(<div key={`gap-${row.id}-${column.id}`} />);
      }

      items.push(
        <ScoreGridCell
  key={`${column.id}-${row.id}`}
  playerId={player.id}
  isFirstRow={rowIndex === 0}
  columnId={column.id}
  rowId={row.id}
  rowIndex={rowIndex}
  isBlockStart={isBlockStart}
  section={section}
  value={getScore(player.id, column.id, row.id)}
  playable={isCellPlayable(player.id, column.id, row.id)}
  onSelectCell={onSelectCell}
  lastScoreAnimation={lastScoreAnimation}
  
/>
      );

      return items;
    });
  }

  return (
  <div className="mt-2 space-y-2">
    {/* En-têtes */}
    <div className={`grid ${gridColumns} text-center text-sm font-black`}>
      <div />

      {activeColumns.flatMap((column, index) => {
        const items: React.ReactNode[] = [];

        if (index > 0 && activeColumns[index - 1].type !== column.type) {
          items.push(<div key={`head-gap-${column.id}`} />);
        }

        items.push(
          <div key={column.id} className="h-7 text-xl text-[#241812]">
            {column.type === "down" && "↓"}
            {column.type === "free" && "L"}
            {column.type === "up" && "↑"}
          </div>
        );

        return items;
      })}
    </div>

    {/* Bloc 1 : 1 à Total */}
    <div className="bg-[#F6EDE3]">
      <div className={`grid ${gridColumns} text-center text-sm font-black`}>
        {rows.slice(0, 6).map((row, rowIndex) => (
          <React.Fragment key={row.id}>
            <GridLabel isFirstRow={rowIndex === 0}>{row.label}</GridLabel>
            {renderColumnCells(row, rowIndex, "top")}
          </React.Fragment>
        ))}

        <TotalGridRow
          label="Total"
          cells={activeColumns.map((column) => getTopTotal(player.id, column.id))}
          activeColumns={activeColumns}
          gridColumns={gridColumns}
          labelClassName="bg-[#EABF9F] text-[#241812]"
          cellClassName="bg-[#EABF9F] text-[#B84332]"
        />

        <TotalGridRow
          label="Bonus"
          cells={activeColumns.map((column) => getBonus(player.id, column.id))}
          activeColumns={activeColumns}
          gridColumns={gridColumns}
          labelClassName="bg-[#EABF9F] text-[#241812]"
          cellClassName="bg-[#EABF9F] text-[#241812]"
        />

        <TotalGridRow
          label="Total"
          cells={activeColumns.map(
            (column) => getTopTotal(player.id, column.id) + getBonus(player.id, column.id)
          )}
          activeColumns={activeColumns}
          gridColumns={gridColumns}
          labelClassName="bg-[#EABF9F] text-[#241812]"
          cellClassName="bg-[#EABF9F] text-[#B84332]"
        />
      </div>
    </div>

    {/* Bloc 2 : - et + */}
    <div className="bg-[#F6EDE3]">
      <div className={`grid ${gridColumns} text-center text-sm font-black`}>
        {rows.slice(6, 8).map((row, rowIndex) => (
          <React.Fragment key={row.id}>
            <GridLabel isFirstRow={rowIndex === 0}>{row.label}</GridLabel>
            {renderColumnCells(row, rowIndex, "bottom")}
          </React.Fragment>
        ))}
      </div>
    </div>

    {/* Bloc 3 : Brelan à Yam */}
    <div className="bg-[#F6EDE3]">
      <div className={`grid ${gridColumns} text-center text-sm font-black`}>
        {rows.slice(8).map((row, rowIndex) => (
  <React.Fragment key={row.id}>
    <GridLabel isFirstRow={rowIndex === 0}>{row.label}</GridLabel>
    {renderColumnCells(row, rowIndex, "bottom")}
  </React.Fragment>
))}
      </div>
    </div>

    {/* Bloc 4 : Total et Final */}
    <div className="bg-[#F6EDE3]">
      <div className={`grid ${gridColumns} text-center text-sm font-black`}>
        <TotalGridRow
  label="Total"
  cells={activeColumns.map((column) => getBottomTotal(player.id, column.id))}
  activeColumns={activeColumns}
  gridColumns={gridColumns}
  labelClassName="bg-[#EABF9F] text-[#241812]"
  cellClassName="bg-[#EABF9F] text-[#B84332]"
  isFirstRow
/>

        <TotalGridRow
          label="Final"
          cells={activeColumns.map((column) => getGrandTotal(player.id, column.id))}
          activeColumns={activeColumns}
          gridColumns={gridColumns}
          labelClassName="bg-[#B93A2E] text-white"
          cellClassName="bg-[#B93A2E] text-white"
        />
      </div>
    </div>
  </div>
);
}
function GridLabel({
  children,
  isFirstRow = false,
}: {
  children: React.ReactNode;
  isFirstRow?: boolean;
}) {
  const dice =
    typeof children === "string" &&
    ["1", "2", "3", "4", "5", "6"].includes(children);

  return (
    <div
      className={[
        "flex h-7 items-center justify-center bg-[#EFD7C4] text-xs font-black text-[#241812]",
        CELL_BORDER,
        CELL_BORDER_FIRST_COL,
        isFirstRow ? CELL_BORDER_FIRST_ROW : "",
      ].join(" ")}
    >
      {dice ? (
        <div className="flex items-center justify-center gap-2">
          <DiceIcon value={Number(children) as 1 | 2 | 3 | 4 | 5 | 6} />
          <span>{children}</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function ScoreGridCell({
  playerId,
  columnId,
  rowId,
  rowIndex,
  section,
  value,
  playable,
  onSelectCell,
  lastScoreAnimation,
  isFirstRow = false,
  isBlockStart = false,
}: {
  playerId: string;
  columnId: string;
  isBlockStart?: boolean;
  rowId: YamRow;
  rowIndex: number;
  section: "top" | "bottom";
  value: ScoreValue;
  playable: boolean;
  onSelectCell: (cell: SelectedCell) => void;
  lastScoreAnimation: {
    playerId: string;
    columnId: string;
    rowId: string;
    value: number | "X";
  } | null;
  isFirstRow?: boolean;
}) {
  const colorClass =
    section === "top" ? getTopColor(rowIndex) : getBottomColor(rowIndex);

  const isLastPlayed =
    lastScoreAnimation?.playerId === playerId &&
    lastScoreAnimation?.columnId === columnId &&
    lastScoreAnimation?.rowId === rowId;

  return (
    <div
      onClick={() => {
        if (!playable) return;
        onSelectCell({ playerId, columnId, rowId });
      }}
      className={[
        "flex h-7 items-center justify-center text-sm font-black transition-all duration-200",
        CELL_BORDER,
isFirstRow ? CELL_BORDER_FIRST_ROW : "",
isBlockStart ? CELL_BORDER_FIRST_COL : "",
        isLastPlayed
  ? "relative z-10 scale-110 animate-cell-score-pop ring-2 ring-[#B84332]/60 shadow-md"
  : "",
        colorClass,
        playable
          ? "cursor-pointer text-[#241812] hover:brightness-110"
          : "cursor-not-allowed text-[#241812]",
      ].join(" ")}
    >
      {value === "X" ? <span className="text-black-700">✕</span> : value ?? ""}
    </div>
  );
}

function TotalGridRow({
  label,
  cells,
  activeColumns,
  labelClassName,
  cellClassName,
  isFirstRow = false,
}: {
  label: string;
  cells: number[];
  activeColumns: typeof columns;
  gridColumns: string;
  labelClassName: string;
  cellClassName: string;
  isFirstRow?: boolean;
}) {
  return (
    <>
      <div
        className={[
  "flex h-7 items-center justify-center text-xs font-black",
  CELL_BORDER,
CELL_BORDER_FIRST_COL,
  labelClassName,
  isFirstRow ? CELL_BORDER_FIRST_ROW : "",
].join(" ")}
      >
        {label}
      </div>

      {cells.flatMap((value, index) => {
        const items: React.ReactNode[] = [];

        if (
          index > 0 &&
          activeColumns[index - 1].type !== activeColumns[index].type
        ) {
          items.push(<div key={`gap-total-${index}`} />);
        }

        items.push(
          <div
            key={`cell-${index}`}
            className={[
  "flex h-7 items-center justify-center text-sm font-black",
  CELL_BORDER,
  index === 0 ||
  activeColumns[index - 1].type !== activeColumns[index].type
    ? CELL_BORDER_FIRST_COL
    : "",
  cellClassName,
  isFirstRow ? CELL_BORDER_FIRST_ROW : "",
].join(" ")}
          >
            {value}
          </div>
        );

        return items;
      })}
    </>
  );
}


function getTopColor(index: number) {
  return [
    "bg-[#F6EDE3]",
    "bg-[#F6EDE3]",
    "bg-[#F6EDE3]",
    "bg-[#F6EDE3]",
    "bg-[#F6EDE3]",
    "bg-[#F6EDE3]",
  ][index];
}

function getBottomColor(index: number) {
  return [
    "bg-[#F6EDE3]",
    "bg-[#F6EDE3]",
    "bg-[#F6EDE3]",
    "bg-[#F6EDE3]",
    "bg-[#F6EDE3]",
    "bg-[#F6EDE3]",
    "bg-[#F6EDE3]",
  ][index];
}
function DiceIcon({ value }: { value: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const dots = {
    1: [[2, 2]],
    2: [
      [1, 3],
      [3, 1],
    ],
    3: [
      [1, 3],
      [2, 2],
      [3, 1],
    ],
    4: [
      [1, 1],
      [1, 3],
      [3, 1],
      [3, 3],
    ],
    5: [
      [1, 1],
      [1, 3],
      [2, 2],
      [3, 1],
      [3, 3],
    ],
    6: [
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 3],
      [2, 3],
      [3, 3],
    ],
  };

  return (
    <div className="grid h-5 w-5 grid-cols-3 grid-rows-3 rounded border-2 border-[#B84332] bg-[#FFF9F2] p-[2px]">
      {Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3) + 1;
        const col = (i % 3) + 1;

        const active = dots[value].some(
          ([r, c]) => r === row && c === col
        );

        return (
          <div
            key={i}
            className="flex items-center justify-center"
          >
            {active && (
              <div className="h-[3px] w-[3px] rounded-full bg-[#B84332]" />
            )}
          </div>
        );
      })}
    </div>
  );
}