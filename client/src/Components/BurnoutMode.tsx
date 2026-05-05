import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function BurnoutMode() {
    const navigate = useNavigate();
    
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
                navigate('/login');
                return;
            }
            
            setIsAuthorized(true);
            setIsCheckingAuth(false);
        };
        
        verifyAuth();
    }, [navigate]);

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

        navigate(`/?puzzleId=${currentPuzzleId}`);
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Puzzles
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Burnout Mode</h1>
                    <p className="text-gray-600 mt-2">
                        Challenge yourself with a timed puzzle marathon
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Main Content */}
                {!session ? (
                    /* Start Session Form */
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Start a New Session</h2>
                        
                        {/* Duration Selector */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Session Duration
                            </label>
                            <select
                                value={selectedDuration}
                                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Difficulty Levels
                            </label>
                            <div className="space-y-2">
                                {DIFFICULTY_OPTIONS.map((difficulty) => (
                                    <label
                                        key={difficulty}
                                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedDifficulties.has(difficulty)}
                                            onChange={() => handleToggleDifficulty(difficulty)}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="capitalize font-medium text-gray-700">
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
                            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Starting...' : 'Start Burnout Session'}
                        </button>
                    </div>
                ) : (
                    /* Active Session Display */
                    <div className="space-y-6">
                        {/* Session Info Card */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Active Session</h2>
                                <BurnoutTimer endTime={session.endTime} onExpire={handleSessionExpire} />
                            </div>

                            {/* Progress */}
                            <BurnoutProgress session={session} />

                            {/* Difficulty Management */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Active Difficulties</h3>
                                <div className="flex flex-wrap gap-2">
                                    {DIFFICULTY_OPTIONS.map((difficulty) => {
                                        const isActive = session.difficulties.includes(difficulty);
                                        return (
                                            <button
                                                key={difficulty}
                                                onClick={() => handleUpdateSessionDifficulties(difficulty)}
                                                disabled={isUpdatingDifficulties}
                                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                                    isActive
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                } disabled:opacity-50 disabled:cursor-not-allowed capitalize`}
                                            >
                                                {difficulty}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Click to add or remove difficulty levels from your session
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 pt-6 border-t border-gray-200 flex gap-4">
                                <button
                                    onClick={handleContinuePuzzles}
                                    className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
                                >
                                    Continue Puzzles
                                </button>
                                <button
                                    onClick={handleCancelSession}
                                    disabled={isLoading}
                                    className="px-6 py-3 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Cancel Session
                                </button>
                            </div>
                        </div>

                        {/* Info Card */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium mb-1">How Burnout Mode Works</p>
                                    <ul className="list-disc list-inside space-y-1 text-blue-700">
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
