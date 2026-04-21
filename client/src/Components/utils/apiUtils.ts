import { Difficulty } from "../constants";
import { fenToBoardMap, getFallbackBoard } from "./boardUtils";
import { BoardCell, PieceType } from "../../defs";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
console.log('API Base URL:', API_BASE_URL);

const TOKEN_KEY = 'woodpecker_auth_token';

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeader(): { Authorization: string } | {} {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function registerUser(username: string, password: string): Promise<{ 
    success: boolean; 
    username?: string; 
    token?: string;
    error?: string 
}> {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return { 
                success: false, 
                error: data.error || `Registration failed (${response.status})` 
            };
        }

        if (data.token) {
            setToken(data.token);
        }

        return { 
            success: true, 
            username: data.user?.username || username,
            token: data.token
        };
    } catch (error) {
        console.error('Registration error:', error);
        return { 
            success: false, 
            error: 'Network error. Please check your connection.' 
        };
    }
}

export async function loginUser(username: string, password: string): Promise<{ 
    success: boolean; 
    username?: string; 
    token?: string;
    error?: string 
}> {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return { 
                success: false, 
                error: data.error || `Login failed (${response.status})` 
            };
        }

        if (data.token) {
            setToken(data.token);
        }

        return { 
            success: true, 
            username: data.user?.username || username,
            token: data.token
        };
    } catch (error) {
        console.error('Login error:', error);
        return { 
            success: false, 
            error: 'Network error. Please check your connection.' 
        };
    }
}

export async function logoutUser(): Promise<{ success: boolean; error?: string }> {
    try {
        removeToken();
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { 
            success: false, 
            error: 'Logout failed' 
        };
    }
}

export async function checkAuth(): Promise<{ 
    authenticated: boolean; 
    username?: string;
    user?: any;
    error?: string 
}> {
    try {
        const token = getToken();
        
        if (!token) {
            return { authenticated: false };
        }

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                removeToken();
                return { authenticated: false };
            }
            return { authenticated: false };
        }

        const data = await response.json();
        return { 
            authenticated: true, 
            username: data.user?.username,
            user: data.user
        };
    } catch (error) {
        console.error('Auth check error:', error);
        return { authenticated: false };
    }
}

export async function getRandomBoardFromAPI(difficulty: Difficulty = 'easy'): Promise<{
    board: any,
    index: number,
    boardFromFen: Map<BoardCell, PieceType>,
    direction: string,
    description: string,
    solution: string
}> {
    try {
        const response = await fetch(`${API_BASE_URL}/puzzles/random/${difficulty}`);
        if (!response.ok) throw new Error(`Failed to fetch puzzle: ${response.statusText}`);
        
        const randomBoard = await response.json();
        let fen = randomBoard.fen;
        try { fen = decodeURIComponent(fen); } catch (e) {}
        
        return {
            board: randomBoard,
            index: randomBoard.puzzle_id,
            boardFromFen: fenToBoardMap(fen),
            direction: randomBoard.direction,
            description: randomBoard.descr,
            solution: randomBoard.solution || 'No solution available'
        };
    } catch (error) {
        console.error('Error fetching puzzle from API:', error);
        return getFallbackBoard(difficulty);
    }
}

export async function saveEvaluation(
    puzzleId: number, 
    evaluation: string
): Promise<{ 
    success: boolean; 
    error?: string;
    message?: string;
}> {
    try {
        const token = getToken();
        
        if (!token) {
            return { success: false, error: 'Not authenticated' };
        }

        const response = await fetch(`${API_BASE_URL}/evaluations/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ puzzleId, evaluation }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return { 
                success: false, 
                error: data.error || `Failed to save evaluation (${response.status})` 
            };
        }

        return { 
            success: true,
            message: data.message
        };
    } catch (error) {
        console.error('Error saving evaluation:', error);
        return { success: false, error: 'Failed to save evaluation' };
    }
}

export async function getEvaluation(
    puzzleId: number
): Promise<{ 
    success: boolean; 
    evaluation?: string | null;
    error?: string;
}> {
    try {
        const token = getToken();
        
        if (!token) {
            return { success: false, error: 'Not authenticated' };
        }

        const response = await fetch(`${API_BASE_URL}/evaluations/${puzzleId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.ok && response.status !== 404) {
            return { 
                success: false, 
                error: `Failed to get evaluation (${response.status})` 
            };
        }

        if (response.status === 404) {
            return { success: true, evaluation: null };
        }

        const data = await response.json();
        return { 
            success: true, 
            evaluation: data.evaluation
        };
    } catch (error) {
        console.error('Error getting evaluation:', error);
        return { success: false, error: 'Failed to get evaluation' };
    }
}

export async function getPuzzleByIdFromAPI(puzzleId: number): Promise<{
    board: any,
    index: number,
    boardFromFen: Map<BoardCell, PieceType>,
    direction: string,
    description: string,
    solution: string
}> {
    try {
        const response = await fetch(`${API_BASE_URL}/puzzles/${puzzleId}`);
        if (!response.ok) throw new Error(`Failed to fetch puzzle: ${response.statusText}`);
        
        const puzzleData = await response.json();
        let fen = puzzleData.fen;
        try { fen = decodeURIComponent(fen); } catch (e) {}
        
        return {
            board: puzzleData,
            index: puzzleData.puzzle_id,
            boardFromFen: fenToBoardMap(fen),
            direction: puzzleData.direction,
            description: puzzleData.descr,
            solution: puzzleData.solution || 'No solution available'
        };
    } catch (error) {
        console.error('Error fetching puzzle by ID:', error);
        return getFallbackBoard('easy');
    }
}

export async function getRecentEvaluations(
    limit: number = 3
): Promise<{ 
    success: boolean; 
    evaluations?: Array<{
        puzzleId: string;
        evaluation: string;
        puzzle: {
            descr: string;
            fen: string;
            direction: string;
            solution: string;
        } | null;
        timestamp?: string;
    }>;
    error?: string;
}> {
    try {
        const token = getToken();
        
        if (!token) {
            return { success: false, error: 'Not authenticated' };
        }

        const response = await fetch(`${API_BASE_URL}/evaluations/user/recent?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.ok) {
            return { 
                success: false, 
                error: `Failed to get recent evaluations (${response.status})` 
            };
        }

        const data = await response.json();
        return { 
            success: true, 
            evaluations: data.evaluations
        };
    } catch (error) {
        console.error('Error getting recent evaluations:', error);
        return { success: false, error: 'Failed to get recent evaluations' };
    }
}

export async function getUserStats(): Promise<{ 
    success: boolean; 
    stats?: {
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
    };
    error?: string;
}> {
    try {
        const token = getToken();
        
        if (!token) {
            return { success: false, error: 'Not authenticated' };
        }

        const response = await fetch(`${API_BASE_URL}/evaluations/user/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.ok) {
            return { 
                success: false, 
                error: `Failed to get user stats (${response.status})` 
            };
        }

        const data = await response.json();
        return { 
            success: true, 
            stats: data.stats
        };
    } catch (error) {
        console.error('Error getting user stats:', error);
        return { success: false, error: 'Failed to get user stats' };
    }
}

export async function getPuzzleList(params: {
    page?: number;
    pageSize?: number;
    difficulty?: string;
    evaluation?: string;
    sortBy?: string;
    sortOrder?: string;
} = {}): Promise<{
    items: Array<{
        puzzleId: number;
        description: string;
        difficulty: string;
        evaluation: string | null;
    }>;
    pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
    filters: {
        difficulty: string | null;
        evaluation: string | null;
    };
    sorting: {
        sortBy: string;
        sortOrder: string;
    };
}> {
    try {
        const token = getToken();
        
        if (!token) {
            throw new Error('Not authenticated');
        }

        // Build query string from params
        const queryParams = new URLSearchParams();
        if (params.page !== undefined) queryParams.append('page', params.page.toString());
        if (params.pageSize !== undefined) queryParams.append('pageSize', params.pageSize.toString());
        if (params.difficulty && params.difficulty !== 'all') queryParams.append('difficulty', params.difficulty);
        if (params.evaluation && params.evaluation !== 'all') queryParams.append('evaluation', params.evaluation);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

        const queryString = queryParams.toString();
        const url = `${API_BASE_URL}/puzzles/list${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to get puzzle list (${response.status})`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting puzzle list:', error);
        throw error;
    }
}
