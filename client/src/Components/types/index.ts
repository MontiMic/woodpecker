import { PieceType, DeskCell, BoardCell, SideCell, PieceKind, PieceColor } from '../../defs';

export type { 
  PieceType, 
  DeskCell, 
  BoardCell, 
  SideCell, 
  PieceKind, 
  PieceColor 
};

import { Difficulty } from '../constants';

export type { Difficulty };

export interface PuzzleData {
  board: any;
  index: number;
  boardFromFen: Map<DeskCell, PieceType>;
  direction: string;
  description: string;
  solution: string;
}

export interface UserEvaluation {
  puzzleId: number;
  evaluation: string;
}

export interface UserStats {
  totalPuzzles: number;
  solvedCount: number;
  partialCount: number;
  failedCount: number;
  successRate: number;
  difficultyBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface RecentEvaluation {
  puzzleId: string;
  evaluation: string;
  puzzle: {
    descr: string;
    fen: string;
    direction: string;
    solution: string;
  } | null;
  timestamp?: string;
}

export type BoardState = Map<DeskCell, PieceType>;

export type EvaluationStatus = 'solved' | 'partial' | 'failed';

export interface PuzzleListItem {
  puzzleId: number;
  description: string;
  difficulty: Difficulty;
  evaluation: EvaluationStatus | null;
}

export interface PuzzleListFilters {
  difficulty: Difficulty | 'all';
  evaluation: EvaluationStatus | 'unattempted' | 'all';
}

export type PuzzleListSortBy = 'puzzleId' | 'difficulty' | 'evaluation';
export type SortOrder = 'asc' | 'desc';

export interface GetPuzzleListParams {
  page?: number;
  pageSize?: number;
  difficulty?: Difficulty | 'all';
  evaluation?: EvaluationStatus | 'unattempted' | 'all';
  sortBy?: PuzzleListSortBy;
  sortOrder?: SortOrder;
}

export interface PuzzleListResponse {
  items: PuzzleListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  filters: {
    difficulty: Difficulty | null;
    evaluation: EvaluationStatus | 'unattempted' | null;
  };
  sorting: {
    sortBy: PuzzleListSortBy;
    sortOrder: SortOrder;
  };
}