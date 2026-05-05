import { 
    BurnoutSessionResponse, 
    StartBurnoutSessionParams, 
    CompletePuzzleParams,
    UpdateDifficultiesParams,
    NavigatePuzzleParams,
    Difficulty 
} from '../types';
import { getAuthHeader } from './apiUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

/**
 * Start a new burnout session
 */
export async function startBurnoutSession(
    durationDays: number,
    difficulties: Difficulty[]
): Promise<BurnoutSessionResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/burnout/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ durationDays, difficulties }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return { 
                success: false, 
                error: data.error || `Failed to start session (${response.status})` 
            };
        }

        return { 
            success: true, 
            session: data.session,
            message: data.message
        };
    } catch (error) {
        console.error('Error starting burnout session:', error);
        return { 
            success: false, 
            error: 'Network error. Please check your connection.' 
        };
    }
}

/**
 * Get the current active burnout session
 */
export async function getBurnoutSession(): Promise<BurnoutSessionResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/burnout/session`, {
            headers: {
                ...getAuthHeader()
            },
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 404) {
                return { success: true, session: undefined };
            }
            return { 
                success: false, 
                error: data.error || `Failed to get session (${response.status})` 
            };
        }

        return { 
            success: true, 
            session: data.session
        };
    } catch (error) {
        console.error('Error getting burnout session:', error);
        return { 
            success: false, 
            error: 'Network error. Please check your connection.' 
        };
    }
}

/**
 * Update the difficulties for the current session
 */
export async function updateDifficulties(
    difficulties: Difficulty[]
): Promise<BurnoutSessionResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/burnout/difficulties`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ difficulties }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return { 
                success: false, 
                error: data.error || `Failed to update difficulties (${response.status})` 
            };
        }

        return { 
            success: true, 
            session: data.session,
            message: data.message
        };
    } catch (error) {
        console.error('Error updating difficulties:', error);
        return { 
            success: false, 
            error: 'Network error. Please check your connection.' 
        };
    }
}

/**
 * Complete a puzzle in the burnout session.
 * Any evaluation counts as completion; only "solved" counts as a success.
 * Accepts legacy boolean success values for backward compatibility.
 */
export async function completePuzzle(
    puzzleId: number,
    evaluation: 'solved' | 'partial' | 'failed' | boolean
): Promise<BurnoutSessionResponse> {
    try {
        const normalizedEvaluation = typeof evaluation === 'boolean'
            ? (evaluation ? 'solved' : 'failed')
            : evaluation;

        const response = await fetch(`${API_BASE_URL}/burnout/complete-puzzle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ puzzleId, evaluation: normalizedEvaluation }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return {
                success: false,
                error: data.error || `Failed to complete puzzle (${response.status})`
            };
        }

        return {
            success: true,
            session: data.session,
            message: data.message
        };
    } catch (error) {
        console.error('Error completing puzzle:', error);
        return {
            success: false,
            error: 'Network error. Please check your connection.'
        };
    }
}

/**
 * Navigate to a specific puzzle in the session
 */
export async function navigatePuzzle(
    puzzleIndex: number
): Promise<BurnoutSessionResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/burnout/navigate`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ puzzleIndex }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return { 
                success: false, 
                error: data.error || `Failed to navigate puzzle (${response.status})` 
            };
        }

        return { 
            success: true, 
            session: data.session,
            message: data.message
        };
    } catch (error) {
        console.error('Error navigating puzzle:', error);
        return { 
            success: false, 
            error: 'Network error. Please check your connection.' 
        };
    }
}

/**
 * Cancel the current burnout session
 */
export async function cancelSession(): Promise<BurnoutSessionResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/burnout/cancel`, {
            method: 'DELETE',
            headers: {
                ...getAuthHeader()
            },
        });

        const data = await response.json();
        
        if (!response.ok) {
            return { 
                success: false, 
                error: data.error || `Failed to cancel session (${response.status})` 
            };
        }

        return { 
            success: true,
            message: data.message
        };
    } catch (error) {
        console.error('Error canceling session:', error);
        return { 
            success: false, 
            error: 'Network error. Please check your connection.' 
        };
    }
}

// Made with Bob
