import { useRef, useEffect } from "react";
import { DeskCell, BOARD_CELLS, COLUMNS, ROWS, WHITE_SIDE_CELLS, BLACK_SIDE_CELLS, PieceType } from "../defs";
import Piece from "./Piece";
import Square from "./Square";
import LoadingOverlay from "./LoadingOverlay";
import { BoardState } from "./types";

interface ChessBoardProps {
  board: BoardState;
  selectedCell: DeskCell | null;
  onCellClick: (cell: DeskCell) => void;
  isLoading?: boolean;
  loadingMessage?: string;
  flipped?: boolean;
  className?: string;
}

export default function ChessBoard({
  board,
  selectedCell,
  onCellClick,
  isLoading = false,
  loadingMessage = "Loading puzzle...",
  flipped = false,
  className = "w-[min(100vh,100vw)]"
}: ChessBoardProps) {
  const gridElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function callback(mutations: MutationRecord[]) {
      let from = null, to = null, piece = null;
      for (const m of mutations) {
        if (m.addedNodes.length) { 
          to = m.target as Element; 
          piece = m.addedNodes[0] as Element; 
        } else if (m.removedNodes.length) { 
          from = m.target as Element; 
        }
      }
      if (from && to && piece) {
        const rFrom = from.getBoundingClientRect(), rTo = to.getBoundingClientRect();
        const dx = rFrom.x - rTo.x, dy = rFrom.y - rTo.y;
        piece.animate([
          { translate: `${dx}px ${dy}px` },
          { translate: "0px 0px" },
        ], { duration: 200, easing: "cubic-bezier(0.65, 0, 0.35, 1)" });
      }
    }
    
    if (gridElement.current) {
      const observer = new MutationObserver(callback);
      observer.observe(gridElement.current, { subtree: true, childList: true });
      return () => observer.disconnect();
    }
  }, []);

  // Helper to get the visual grid cell when flipped
  const getVisualCell = (cell: DeskCell): DeskCell => {
    if (!flipped) return cell;
    
    // Only flip main board cells (A1-H8)
    if (cell.match(/^[A-H][1-8]$/)) {
      const col = cell.charCodeAt(0) - 64; // A=1, B=2, ...
      const row = parseInt(cell[1]);
      const newCol = String.fromCharCode(65 + (8 - col)); // 9 - col
      const newRow = 9 - row;
      return `${newCol}${newRow}` as DeskCell;
    }
    
    // Side cells remain unchanged
    return cell;
  };

  // Reversed column labels when flipped
  const getColumnLabel = (col: string): string => {
    if (!flipped) return col.toLowerCase();
    const idx = COLUMNS.indexOf(col as any);
    return COLUMNS[7 - idx].toLowerCase();
  };

  // Reversed row labels when flipped
  const getRowLabel = (row: string): string => {
    if (!flipped) return row;
    return (9 - parseInt(row)).toString();
  };

  return (
    <div className={`relative transition-opacity duration-300 ${isLoading ? 'opacity-70' : 'opacity-100'}`}>
      <div ref={gridElement} className={`desk-grid-area ${className} p-3`}>
        <div className="board-subgrid checkered-background rounded-lg shadow-2xl">
          {BOARD_CELLS.map(cell => {
            const visualCell = getVisualCell(cell);
            return (
              <Square 
                key={cell} 
                name={visualCell} 
                onClick={() => onCellClick(cell)} 
                isSelected={selectedCell == cell}
              >
                <Piece piece={board.get(cell)} />
              </Square>
            );
          })}
        </div>
        <div className="white-side-subgrid bg-black-cell rounded-lg shadow-lg">
          {WHITE_SIDE_CELLS.map(cell => (
            <Square 
              key={cell} 
              name={cell} 
              onClick={() => onCellClick(cell)} 
              isSelected={selectedCell == cell}
            >
              <Piece piece={board.get(cell)} />
            </Square>
          ))}
        </div>
        <div className="black-side-subgrid bg-white-cell rounded-lg shadow-lg">
          {BLACK_SIDE_CELLS.map(cell => (
            <Square 
              key={cell} 
              name={cell} 
              onClick={() => onCellClick(cell)} 
              isSelected={selectedCell == cell}
            >
              <Piece piece={board.get(cell)} />
            </Square>
          ))}
        </div>
        <div className="contents">
          {COLUMNS.map(c => (
            <div key={c} style={{ gridArea: `r${c}` }} className="text-neutral-400 place-self-center">
              {getColumnLabel(c)}
            </div>
          ))}
          {ROWS.map(r => (
            <div key={r} style={{ gridArea: `r${r}` }} className="text-neutral-400 place-self-center">
              {getRowLabel(r)}
            </div>
          ))}
        </div>
      </div>
      <LoadingOverlay isLoading={isLoading} message={loadingMessage} />
    </div>
  );
}