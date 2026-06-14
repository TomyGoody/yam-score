"use client";

import { Pencil } from "lucide-react";
import { columns, rows, YamRow } from "../lib/yamRules";

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
  const bottomRows = rows.slice(6);

  const isCurrentPlayer =
  player.id === currentPlayerId;
  return (
    <div
  className={`shrink-0 rounded-xl border-2 ${color.border} bg-black p-4`}
>
     <div className="relative mb-1 text-center">
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
        <h2 className="text-xl font-black text-white">
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

  <div className={`text-3xl font-black ${color.text}`}>
    {getPlayerTotal(player.id)}
  </div>
  {lastScoreAnimation?.playerId === player.id && (
  <div className={`pointer-events-none absolute left-1/2 top-12 -translate-x-1/2 text-lg font-black animate-score-pop ${color.text}`}>
    {lastScoreAnimation.value === "X"
  ? "✕"
  : `+${lastScoreAnimation.value}`}
  </div>
)}
  <div className="h-5 mt-1">
  {isCurrentPlayer && !gameFinished && (
    <div
      className={`text-xs font-black uppercase tracking-wider animate-pulse ${color.text}`}
    >
      ▶ Ton tour
    </div>
  )}
</div>
</div>

      <table className="border-collapse text-center text-sm">
        <thead>
          <tr>
            <th className="w-16"></th>
            {activeColumns.map((column, columnIndex) => (
              <th
                key={column.id}
                className="h-6 w-10 text-xl font-black text-slate-100"
              >
                {column.type === "down" && "↓"}
                {column.type === "free" && "L"}
                {column.type === "up" && "↑"}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.slice(0, 6).map((row, rowIndex) => (
            <tr key={row.id}>
              <RowLabel label={row.label} />

              {activeColumns.map((column, columnIndex) => (
                <ScoreCell
                  key={`${column.id}-${row.id}`}
                  playerId={player.id}
                  columnId={column.id}
                  rowId={row.id}
                  rowIndex={rowIndex}
				  lastScoreAnimation={lastScoreAnimation}
                  section="top"
                  value={getScore(player.id, column.id, row.id)}
                  playable={isCellPlayable(player.id, column.id, row.id)}
                  onSelectCell={onSelectCell}
				  blockStart={
  columnIndex > 0 &&
  activeColumns[columnIndex - 1].type !== column.type
}
                />
              ))}
            </tr>
          ))}

          <TotalRow
            label="Total"
            cells={activeColumns.map((column, columnIndex) => getTopTotal(player.id, column.id))}
            labelClassName="bg-slate-700 text-white"
			activeColumns={activeColumns}
            cellClassName="bg-slate-200 text-rose-700"
          />

          <TotalRow
            label="Bonus"
            cells={activeColumns.map((column, columnIndex) => getBonus(player.id, column.id))}
            labelClassName="bg-cyan-700 text-white"
			activeColumns={activeColumns}
            cellClassName="bg-cyan-100 text-slate-950"
          />

          <TotalRow
            label="Total"
            cells={activeColumns.map(
              (column) =>
                getTopTotal(player.id, column.id) +
                getBonus(player.id, column.id)
            )}
            labelClassName="bg-slate-700 text-white"
            cellClassName="bg-slate-200 text-rose-700"
			activeColumns={activeColumns}
          />

          <tr>
            <td colSpan={activeColumns.length + 1} className="h-3 bg-black"></td>
          </tr>

          {bottomRows.map((row, rowIndex) => (
            <FragmentRow
              key={row.id}
              row={row}
              rowIndex={rowIndex}
              player={player}
              getScore={getScore}
              isCellPlayable={isCellPlayable}
              onSelectCell={onSelectCell}
			  activeColumns={activeColumns}
			  lastScoreAnimation={lastScoreAnimation}
            />
          ))}

          <TotalRow
            label="Total"
            cells={activeColumns.map((column, columnIndex) => getBottomTotal(player.id, column.id))}
            labelClassName="bg-slate-700 text-white"
            cellClassName="bg-slate-200 text-rose-700"
			activeColumns={activeColumns}
          />

          <TotalRow
            label="Final"
            cells={activeColumns.map((column, columnIndex) => getGrandTotal(player.id, column.id))}
            labelClassName="bg-indigo-700 text-white"
            cellClassName="bg-indigo-100 text-slate-950"
			activeColumns={activeColumns}
          />
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({
  row,
  rowIndex,
  player,
  getScore,
  isCellPlayable,
  onSelectCell,
  activeColumns,
  lastScoreAnimation,
}: {
  row: { id: YamRow; label: string };
  rowIndex: number;
  player: Player;
  getScore: (
    playerId: string,
    columnId: string,
    rowId: YamRow
  ) => ScoreValue;
  isCellPlayable: (
    playerId: string,
    columnId: string,
    rowId: YamRow
  ) => boolean;
  lastScoreAnimation: {
  playerId: string;
  columnId: string;
  rowId: string;
  value: number | "X";
} | null;
  onSelectCell: (cell: SelectedCell) => void;
  activeColumns: typeof columns;
}) {
  return (
    <>
      {row.id === "threeOfAKind" && (
        <tr>
         <td colSpan={activeColumns.length + 1} className="h-2 bg-slate-950"></td>
        </tr>
      )}

      <tr>
        <RowLabel label={row.label} />

        {activeColumns.map((column, columnIndex) => (
          <ScoreCell
            key={`${column.id}-${row.id}`}
            playerId={player.id}
            columnId={column.id}
            rowId={row.id}
            rowIndex={rowIndex}
            section="bottom"
			lastScoreAnimation={lastScoreAnimation}
            value={getScore(player.id, column.id, row.id)}
            playable={isCellPlayable(player.id, column.id, row.id)}
            onSelectCell={onSelectCell}
			blockStart={
  columnIndex > 0 &&
  activeColumns[columnIndex - 1].type !== column.type
}
          />
        ))}
      </tr>
    </>
  );
}

function RowLabel({ label }: { label: string }) {
  return (
    <th className="h-6 w-14 border border-slate-900 bg-slate-900 text-center text-xs font-black text-slate-100">
      {label}
    </th>
  );
}
function getTopColor(index: number) {
  return [
    "bg-stone-50",
    "bg-stone-100",
    "bg-amber-100",
    "bg-amber-200",
    "bg-orange-200",
    "bg-orange-300",
  ][index];
}

function getBottomColor(index: number) {
  return [
    "bg-sky-100",
    "bg-cyan-100",
    "bg-teal-100",
    "bg-emerald-200",
    "bg-emerald-300",
    "bg-lime-300",
    "bg-green-500",
  ][index];
}
function ScoreCell({
  playerId,
  columnId,
  rowId,
  rowIndex,
  section,
  value,
  playable,
  onSelectCell,
  blockStart,
  lastScoreAnimation,
}: {
  playerId: string;
  columnId: string;
  rowId: YamRow;
  rowIndex: number;
  section: "top" | "bottom";
  value: ScoreValue;
  playable: boolean;
  onSelectCell: (cell: SelectedCell) => void;
  blockStart: boolean;
  lastScoreAnimation: {
    playerId: string;
    columnId: string;
    rowId: string;
    value: number | "X";
  } | null;
}) {
  const colorClass =
    section === "top" ? getTopColor(rowIndex) : getBottomColor(rowIndex);
const isLastPlayed =
  lastScoreAnimation?.playerId === playerId &&
  lastScoreAnimation?.columnId === columnId &&
  lastScoreAnimation?.rowId === rowId;
  return (
    <td
      onClick={() => {
        if (!playable) return;
        onSelectCell({ playerId, columnId, rowId });
      }}
      className={[
        "h-6 w-10 border border-slate-950 text-sm font-black transition-all duration-200",
		blockStart ? "border-l-4 border-l-black" : "",
		isLastPlayed
  ? "relative z-10 scale-110 ring-4 ring-yellow-300 shadow-lg shadow-yellow-300/60"
  : "",
        colorClass,
        playable
          ? "cursor-pointer text-slate-950 hover:brightness-110"
          : "cursor-not-allowed text-slate-950",
      ].join(" ")}
    >
      {value === "X" ? <span className="text-rose-700">✕</span> : value ?? ""}
    </td>
  );
}

function TotalRow({
  label,
  cells,
  activeColumns,
  labelClassName,
  cellClassName,
}: {
  label: string;
  cells: number[];
  activeColumns: typeof columns;
  labelClassName: string;
  cellClassName: string;
}) {
  return (
    <tr>
      <th
        className={[
  "h-6 w-14 border border-slate-950 text-center text-xs font-black",
  labelClassName,
].join(" ")}
      >
        {label}
      </th>

      {cells.map((value, index) => {
  const blockStart =
    index > 0 &&
    activeColumns[index - 1].type !== activeColumns[index].type;

  return (
    <td
      key={index}
      className={[
        "h-6 w-10 border border-slate-950 text-sm font-black",
        blockStart ? "border-l-4 border-l-black" : "",
        cellClassName,
      ].join(" ")}
    >
      {value}
    </td>
  );
})}
    </tr>
  );
}
