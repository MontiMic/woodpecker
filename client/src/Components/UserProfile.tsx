import { useState, useEffect } from 'react';
import { logoutUser, getRecentEvaluations, getUserStats } from './utils/apiUtils';

interface UserProfileProps {
    onBack: () => void;
    onLogout: () => void;
    username: string;
    onPuzzleClick: (puzzleId: number) => void;
}

interface RecentEvaluation {
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

interface UserStats {
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

export default function UserProfile({ onBack, onLogout, username, onPuzzleClick }: UserProfileProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recentEvaluations, setRecentEvaluations] = useState<RecentEvaluation[]>([]);
    const [stats, setStats] = useState<UserStats>({
        totalPuzzles: 0,
        solvedCount: 0,
        partialCount: 0,
        failedCount: 0,
        successRate: 0,
        difficultyBreakdown: {
            easy: 0,
            medium: 0,
            hard: 0
        }
    });

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Fetch recent evaluations (last 3)
                setLoadingRecent(true);
                const recentResult = await getRecentEvaluations(3);
                if (recentResult.success && recentResult.evaluations) {
                    setRecentEvaluations(recentResult.evaluations);
                }
                setLoadingRecent(false);

                // Fetch enhanced statistics
                setLoadingStats(true);
                const statsResult = await getUserStats();
                if (statsResult.success && statsResult.stats) {
                    setStats(statsResult.stats);
                }
                setLoadingStats(false);

            } catch (error) {
                console.error('Error fetching user data:', error);
                setLoadingRecent(false);
                setLoadingStats(false);
            }
        };

        if (username) {
            fetchUserData();
        }
    }, [username]);

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            const result = await logoutUser();
            if (result.success) {
                onLogout();
                onBack();
            } else {
                setError(result.error || 'Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            setError('Logout failed');
        } finally {
            setIsLoading(false);
        }
    };

    const getEvaluationColor = (evaluation: string) => {
        switch (evaluation) {
            case 'solved': return 'text-green-500';
            case 'partial': return 'text-yellow-500';
            case 'failed': return 'text-red-500';
            default: return 'text-neutral-600';
        }
    };

    const getEvaluationText = (evaluation: string) => {
        switch (evaluation) {
            case 'solved': return 'Solved';
            case 'partial': return 'Partial';
            case 'failed': return 'Failed';
            default: return evaluation;
        }
    };

    const getDifficultyFromPuzzleId = (puzzleId: string): string => {
        const id = parseInt(puzzleId);
        if (isNaN(id)) return 'Unknown';
        
        if (id >= 1 && id <= 222) return 'Easy';
        if (id >= 223 && id <= 984) return 'Medium';
        if (id >= 985 && id <= 1128) return 'Hard';
        return 'Unknown';
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 'bg-green-500';
            case 'medium': return 'bg-yellow-500';
            case 'hard': return 'bg-red-500';
            default: return 'bg-neutral-500';
        }
    };

    const handlePuzzleClick = (puzzleId: string) => {
        const id = parseInt(puzzleId);
        if (!isNaN(id)) {
            onPuzzleClick(id);
        }
    };

    // Calculate data for evaluation pie chart
    const evaluationData = [
        { name: 'Solved', value: stats.solvedCount, color: '#10B981' },
        { name: 'Partial', value: stats.partialCount, color: '#F59E0B' },
        { name: 'Failed', value: stats.failedCount, color: '#EF4444' },
    ];

    // Calculate data for difficulty distribution
    const difficultyData = [
        { 
            name: 'Easy', 
            value: stats.difficultyBreakdown.easy, 
            color: '#10B981', 
            bgColor: 'bg-green-500'
        },
        { 
            name: 'Medium', 
            value: stats.difficultyBreakdown.medium, 
            color: '#F59E0B', 
            bgColor: 'bg-yellow-500'
        },
        { 
            name: 'Hard', 
            value: stats.difficultyBreakdown.hard, 
            color: '#EF4444', 
            bgColor: 'bg-red-500'
        },
    ];

    const totalEvaluations = stats.solvedCount + stats.partialCount + stats.failedCount;
    
    // Calculate percentages
    const evaluationPercentages = evaluationData.map(item => ({
        ...item,
        percentage: totalEvaluations > 0 ? Math.round((item.value / totalEvaluations) * 100) : 0
    }));

    const difficultyPercentages = difficultyData.map(item => ({
        ...item,
        percentage: stats.totalPuzzles > 0 ? Math.round((item.value / stats.totalPuzzles) * 100) : 0
    }));

    return (
        <div className="min-h-screen bg-black-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <button 
                    onClick={onBack}
                    className="mb-6 text-neutral-300 hover:text-white font-medium transition-colors duration-200
                              flex items-center gap-2 hover:gap-3"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Puzzle
                </button>
                
                <div className="rounded-2xl p-8 shadow-2xl border-2 border-white/10"
                     style={{ backgroundColor: 'var(--white-cell-color)' }}>
                    
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-neutral-800">{username}</h1>
                        <p className="text-neutral-600 mt-2">Chess Puzzle Enthusiast</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Left Column: Difficulty Distribution */}
                        <div className="rounded-xl p-6 shadow-lg"
                             style={{ backgroundColor: 'var(--black-cell-color)' }}>
                            <h3 className="font-bold text-xl text-black mb-6">Difficulty Distribution</h3>
                            
                            <div className="space-y-6">
                                {difficultyPercentages.map((item, index) => (
                                    <div key={index} className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-5 h-5 rounded-full" 
                                                    style={{ backgroundColor: item.color }}
                                                ></div>
                                                <span className="text-neutral-700 font-medium text-lg">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-black text-xl">{item.value}</span>
                                                <span className="text-sm text-neutral-600">({item.percentage}%)</span>
                                            </div>
                                        </div>
                                        
                                        {/* Bar chart */}
                                        <div className="h-6 bg-neutral-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ 
                                                    width: `${item.percentage}%`,
                                                    backgroundColor: item.color
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Summary */}
                            {stats.totalPuzzles > 0 && (
                                <div className="mt-8 pt-6 border-t border-neutral-800">
                                    <div className="text-center">
                                        <div className="text-neutral-700 text-sm mb-2">Most Attempted</div>
                                        {(() => {
                                            const mostAttempted = difficultyPercentages.reduce((prev, current) => 
                                                prev.value > current.value ? prev : current
                                            );
                                            
                                            return (
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="text-2xl font-bold text-black mb-1">
                                                        {mostAttempted.name}
                                                    </div>
                                                    <div className="text-neutral-600 text-sm">
                                                        {mostAttempted.value} puzzles ({mostAttempted.percentage}%)
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Evaluation Distribution Pie Chart */}
                        <div className="rounded-xl p-6 shadow-lg flex flex-col justify-center"
                             style={{ backgroundColor: 'var(--black-cell-color)' }}>
                            <h3 className="font-bold text-xl text-black mb-6 text-center">Evaluation Distribution</h3>
                            
                            <div className="flex flex-col items-center justify-center">
                                <div className="relative w-40 h-40 mb-6">
                                    {/* Pie chart using conic-gradient */}
                                    <div 
                                        className="w-full h-full rounded-full"
                                        style={{
                                            background: `conic-gradient(
                                                ${evaluationData[0].color} 0% ${evaluationPercentages[0].percentage}%,
                                                ${evaluationData[1].color} ${evaluationPercentages[0].percentage}% ${evaluationPercentages[0].percentage + evaluationPercentages[1].percentage}%,
                                                ${evaluationData[2].color} ${evaluationPercentages[0].percentage + evaluationPercentages[1].percentage}%
                                            )`
                                        }}
                                    ></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-24 h-24 rounded-full"
                                             style={{ backgroundColor: 'var(--black-cell-color)' }}></div>
                                    </div>
                                </div>
                                
                                {/* Legend */}
                                <div className="space-y-3 w-full max-w-xs">
                                    {evaluationPercentages.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-5 h-5 rounded-full" 
                                                    style={{ backgroundColor: item.color }}
                                                ></div>
                                                <span className="text-neutral-700 font-medium">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-black text-lg">{item.value}</span>
                                                <span className="text-sm text-neutral-600">({item.percentage}%)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Section */}
                    <div className="rounded-xl p-6 mb-8 shadow-lg"
                         style={{ backgroundColor: 'var(--black-cell-color)' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-xl text-black">Recent Activity</h3>
                            {recentEvaluations.length > 0 && (
                                <span className="text-sm text-neutral-600">
                                    Last {recentEvaluations.length} puzzles
                                </span>
                            )}
                        </div>
                        <div className="space-y-3">
                            {loadingRecent ? (
                                <div className="text-center py-8 text-neutral-600">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-600 mb-2"></div>
                                    <p>Loading recent activity...</p>
                                </div>
                            ) : recentEvaluations.length > 0 ? (
                                recentEvaluations.map((item, index) => {
                                    const difficulty = getDifficultyFromPuzzleId(item.puzzleId);
                                    return (
                                        <div 
                                            key={index} 
                                            className="flex items-center justify-between hover:bg-white/10 p-3 rounded-lg transition-all duration-200 cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
                                            onClick={() => handlePuzzleClick(item.puzzleId)}
                                            title={`Click to load puzzle #${item.puzzleId}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-110"
                                                     style={{ backgroundColor: 'var(--white-cell-color)' }}>
                                                    <span className="text-black font-bold text-lg">#{item.puzzleId}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-neutral-800 font-medium mb-1 group-hover:text-black transition-colors duration-200">
                                                        {item.puzzle?.descr || `Puzzle #${item.puzzleId}`}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(difficulty)} text-black`}>
                                                            {difficulty}
                                                        </span>
                                                        <span className="text-xs text-neutral-600">
                                                            {item.puzzle?.direction === 'w' ? 'White to move' : 'Black to move'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`font-semibold text-lg ${getEvaluationColor(item.evaluation)}`}>
                                                {getEvaluationText(item.evaluation)}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-neutral-600">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-lg mb-2">No recent activity</p>
                                    <p className="text-sm text-neutral-500">Solve puzzles to see them here!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                            {error}
                        </div>
                    )}

                    {/* Logout Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleLogout}
                            disabled={isLoading}
                            className="px-8 py-4 bg-red-600 text-white font-bold rounded-xl transition-all duration-200 
                                      shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                                      border-b-4 border-red-800 hover:border-red-900 hover:bg-red-700
                                      flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Logging out...
                                </span>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Logout
                                </>
                            )}
                        </button>
                    </div>

                    {/* Summary Footer */}
                    {stats.totalPuzzles > 0 && (
                        <div className="mt-6 pt-6 border-t border-white/10 text-center">
                            <p className="text-neutral-600 text-sm">
                                You've attempted <span className="font-semibold text-neutral-800">{stats.totalPuzzles}</span> puzzles
                                {stats.successRate > 0 && ` with a ${stats.successRate}% success rate`}.
                                {stats.successRate >= 80 && ' Keep up the great work!'}
                                {stats.successRate > 0 && stats.successRate < 50 && ' Keep practicing! Every puzzle makes you better.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}