import { useState, useEffect } from 'react';
import { checkAuth } from './utils/apiUtils';
import {
    getBurnoutSession,
    startBurnoutSession,
    updateDifficulties,
    cancelSession
} from './utils/burnoutApi';
import { BurnoutSession, Difficulty } from './types';
import BurnoutTimer from './BurnoutTimer';
import BurnoutProgress from './BurnoutProgress';

interface BurnoutModeProps {
    onClose: () => void;
}

const DURATION_OPTIONS = [
    { label: '1 Day', days: 1 },
    { label: '2 Days', days: 2 },
    { label: '4 Days', days: 4 },
    { label: '1 Week', days: 7 },
    { label: '2 Weeks', days: 14 },
    { label: '1 Month', days: 30 },
    { label: '2 Months', days: 60 },
];

const DIFFICULTY_OPTIONS: Difficulty[] = ['easy', 'medium', 'hard'];

export default function BurnoutMode({ onClose }: BurnoutModeProps) {
    
    // Auth state
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    
    // Session state
    const [session, setSession] = useState<BurnoutSession | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Form state for starting a session
    const [selectedDuration, setSelectedDuration] = useState(7); // Default to 1 week
    const [selectedDifficulties, setSelectedDifficulties] = useState<Set<Difficulty>>(
        new Set(['easy', 'medium', 'hard'])
    );
    
    // State for updating difficulties
    const [isUpdatingDifficulties, setIsUpdatingDifficulties] = useState(false);

    // Check authentication on mount
    useEffect(() => {
        const verifyAuth = async () => {
            setIsCheckingAuth(true);
            const authResult = await checkAuth();
            
            if (!authResult.authenticated) {
                onClose();
                return;
            }
            
            setIsAuthorized(true);
            setIsCheckingAuth(false);
        };
        
        verifyAuth();
    }, [onClose]);

    // Fetch session when authorized
    useEffect(() => {
        if (!isAuthorized) return;
        
        const fetchSession = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const result = await getBurnoutSession();
                
                if (result.success) {
                    setSession(result.session || null);
                } else {
                    setError(result.error || 'Failed to load session');
                }
            } catch (err) {
                console.error('Error fetching session:', err);
                setError('Failed to load session');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchSession();
    }, [isAuthorized]);

    const handleStartSession = async () => {
        if (selectedDifficulties.size === 0) {
            setError('Please select at least one difficulty level');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await startBurnoutSession(
                selectedDuration,
                Array.from(selectedDifficulties)
            );

            if (result.success && result.session) {
                setSession(result.session);
            } else {
                setError(result.error || 'Failed to start session');
            }
        } catch (err) {
            console.error('Error starting session:', err);
            setError('Failed to start session');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelSession = async () => {
        if (!confirm('Are you sure you want to cancel this burnout session? Your progress will be lost.')) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await cancelSession();

            if (result.success) {
                setSession(null);
            } else {
                setError(result.error || 'Failed to cancel session');
            }
        } catch (err) {
            console.error('Error canceling session:', err);
            setError('Failed to cancel session');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleDifficulty = (difficulty: Difficulty) => {
        const newDifficulties = new Set(selectedDifficulties);
        if (newDifficulties.has(difficulty)) {
            newDifficulties.delete(difficulty);
        } else {
            newDifficulties.add(difficulty);
        }
        setSelectedDifficulties(newDifficulties);
    };

    const handleUpdateSessionDifficulties = async (difficulty: Difficulty) => {
        if (!session) return;

        const newDifficulties = new Set(session.difficulties);
        if (newDifficulties.has(difficulty)) {
            if (newDifficulties.size === 1) {
                setError('At least one difficulty must be selected');
                return;
            }
            newDifficulties.delete(difficulty);
        } else {
            newDifficulties.add(difficulty);
        }

        setIsUpdatingDifficulties(true);
        setError(null);

        try {
            const result = await updateDifficulties(Array.from(newDifficulties));

            if (result.success && result.session) {
                setSession(result.session);
            } else {
                setError(result.error || 'Failed to update difficulties');
            }
        } catch (err) {
            console.error('Error updating difficulties:', err);
            setError('Failed to update difficulties');
        } finally {
            setIsUpdatingDifficulties(false);
        }
    };

    const getCurrentPuzzleId = (activeSession: BurnoutSession | null): number | null => {
        if (!activeSession) {
            return null;
        }

        const { currentPuzzleIndex, puzzlePool } = activeSession;
        const isValidIndex =
            Number.isInteger(currentPuzzleIndex) &&
            currentPuzzleIndex >= 0 &&
            currentPuzzleIndex < puzzlePool.length;

        if (!isValidIndex) {
            return null;
        }

        const currentPuzzleId = puzzlePool[currentPuzzleIndex];
        return typeof currentPuzzleId === 'number' ? currentPuzzleId : null;
    };

    const handleContinuePuzzles = () => {
        const currentPuzzleId = getCurrentPuzzleId(session);

        if (currentPuzzleId === null) {
            setError('Unable to resume this session. Please refresh or start a new session.');
            return;
        }

        // Close burnout mode and navigate to puzzle
        onClose();
        window.history.replaceState(null, '', `/?puzzleId=${currentPuzzleId}`);
        window.location.reload(); // Reload to load the puzzle
    };

    const handleSessionExpire = () => {
        setError('Session has expired');
        // Optionally refresh the session
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    };

    if (isCheckingAuth || isLoading) {
        return (
            <div className="min-h-screen bg-black-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-400 mx-auto mb-4"></div>
                    <p className="text-neutral-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black-background py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={onClose}
                        className="text-neutral-300 hover:text-white mb-4 flex items-center gap-2 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Puzzles
                    </button>
                    <h1 className="text-3xl font-bold text-white">Burnout Mode</h1>
                    <p className="text-neutral-400 mt-2">
                        Challenge yourself with a timed puzzle marathon
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl">
                        {error}
                    </div>
                )}

                {/* Main Content */}
                {!session ? (
                    /* Start Session Form */
                    <div className="rounded-xl shadow-lg p-6" style={{ backgroundColor: 'var(--black-cell-color)' }}>
                        <h2 className="text-xl font-semibold text-white mb-6">Start a New Session</h2>
                        
                        {/* Duration Selector */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Session Duration
                            </label>
                            <select
                                value={selectedDuration}
                                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                                className="w-full px-4 py-2 bg-black-background border border-neutral-700 rounded-xl text-white focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
                            >
                                {DURATION_OPTIONS.map((option) => (
                                    <option key={option.days} value={option.days}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Difficulty Checkboxes */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Difficulty Levels
                            </label>
                            <div className="space-y-2">
                                {DIFFICULTY_OPTIONS.map((difficulty) => (
                                    <label
                                        key={difficulty}
                                        className="flex items-center gap-3 p-3 border border-neutral-700 rounded-xl hover:bg-black-background cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedDifficulties.has(difficulty)}
                                            onChange={() => handleToggleDifficulty(difficulty)}
                                            className="w-4 h-4 rounded focus:ring-2 focus:ring-neutral-500"
                                        />
                                        <span className="capitalize font-medium text-neutral-300">
                                            {difficulty}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={handleStartSession}
                            disabled={isLoading || selectedDifficulties.size === 0}
                            className="w-full text-white py-3 px-6 rounded-xl font-bold transition-all duration-200
                                     shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                                     border-b-4 border-gray-800 hover:border-gray-900
                                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            style={{ backgroundColor: 'var(--black-cell-color)' }}
                        >
                            {isLoading ? 'Starting...' : 'Start Burnout Session'}
                        </button>
                    </div>
                ) : (
                    /* Active Session Display */
                    <div className="space-y-6">
                        {/* Session Info Card */}
                        <div className="rounded-xl shadow-lg p-6" style={{ backgroundColor: 'var(--black-cell-color)' }}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white">Active Session</h2>
                                <BurnoutTimer endTime={session.endTime} onExpire={handleSessionExpire} />
                            </div>

                            {/* Progress */}
                            <BurnoutProgress session={session} />

                            {/* Difficulty Management */}
                            <div className="mt-6 pt-6 border-t border-neutral-700">
                                <h3 className="text-sm font-medium text-neutral-300 mb-3">Active Difficulties</h3>
                                <div className="flex flex-wrap gap-2">
                                    {DIFFICULTY_OPTIONS.map((difficulty) => {
                                        const isActive = session.difficulties.includes(difficulty);
                                        return (
                                            <button
                                                key={difficulty}
                                                onClick={() => handleUpdateSessionDifficulties(difficulty)}
                                                disabled={isUpdatingDifficulties}
                                                className={`px-4 py-2 rounded-xl font-bold transition-all duration-200
                                                          shadow-md hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm
                                                          border-b-4 capitalize ${
                                                    isActive
                                                        ? 'border-gray-800 text-white hover:brightness-110'
                                                        : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'
                                                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                                style={{ backgroundColor: 'var(--black-cell-color)' }}
                                            >
                                                {difficulty}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-neutral-500 mt-2">
                                    Click to add or remove difficulty levels from your session
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 pt-6 border-t border-neutral-700 flex gap-4">
                                <button
                                    onClick={handleContinuePuzzles}
                                    className="flex-1 text-white py-3 px-6 rounded-xl font-bold transition-all duration-200
                                             shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                                             border-b-4 border-green-800 hover:border-green-900 bg-green-700 hover:bg-green-600"
                                >
                                    Continue Puzzles
                                </button>
                                <button
                                    onClick={handleCancelSession}
                                    disabled={isLoading}
                                    className="px-6 py-3 border-2 border-red-500/50 text-red-400 rounded-xl font-bold
                                             hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Cancel Session
                                </button>
                            </div>
                        </div>

                        {/* Info Card */}
                        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div className="text-sm text-neutral-300">
                                    <p className="font-medium mb-1">How Burnout Mode Works</p>
                                    <ul className="list-disc list-inside space-y-1 text-neutral-400">
                                        <li>Complete puzzles from your selected difficulty pool</li>
                                        <li>Track your progress and success rate</li>
                                        <li>Add or remove difficulties as you go</li>
                                        <li>Session expires when time runs out</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Made with Bob
