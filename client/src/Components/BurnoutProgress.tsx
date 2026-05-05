import { BurnoutSession } from './types';

interface BurnoutProgressProps {
    session: BurnoutSession;
}

export default function BurnoutProgress({ session }: BurnoutProgressProps) {
    const totalPuzzles = session.puzzlePool.length;
    const completedPuzzles = session.completedInSession.length;
    const currentPosition = session.currentPuzzleIndex + 1;
    const progressPercentage = totalPuzzles > 0 ? (completedPuzzles / totalPuzzles) * 100 : 0;
    
    // Calculate success rate
    const successRate = session.stats.totalAttempts > 0 
        ? Math.round((session.stats.successfulSolves / session.stats.totalAttempts) * 100)
        : 0;

    return (
        <div className="space-y-4">
            {/* Progress Bar */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-neutral-700">
                        Progress
                    </span>
                    <span className="text-sm text-neutral-600">
                        {completedPuzzles} of {totalPuzzles} puzzles completed
                    </span>
                </div>
                <div className="w-full rounded-full h-3 overflow-hidden" style={{ backgroundColor: 'var(--black-cell-color)' }}>
                    <div
                        className="bg-green-600 h-3 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <div className="mt-1 text-xs text-neutral-600 text-right">
                    {progressPercentage.toFixed(1)}% complete
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Current Position */}
                <div className="rounded-lg p-3 border border-neutral-800" style={{ backgroundColor: 'var(--black-cell-color)' }}>
                    <div className="text-xs text-neutral-600 mb-1">Current Position</div>
                    <div className="text-2xl font-bold text-black">
                        {currentPosition}
                        <span className="text-sm text-neutral-600 font-normal ml-1">
                            / {totalPuzzles}
                        </span>
                    </div>
                </div>

                {/* Success Rate */}
                <div className="rounded-lg p-3 border border-neutral-800" style={{ backgroundColor: 'var(--black-cell-color)' }}>
                    <div className="text-xs text-neutral-600 mb-1">Success Rate</div>
                    <div className={`text-2xl font-bold ${
                        successRate >= 70 ? 'text-green-500' :
                        successRate >= 50 ? 'text-yellow-500' :
                        'text-red-500'
                    }`}>
                        {successRate}%
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">
                        {session.stats.successfulSolves} / {session.stats.totalAttempts} attempts
                    </div>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="flex items-center justify-between text-sm text-neutral-700 pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{session.stats.successfulSolves} solved</span>
                </div>
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{session.stats.totalAttempts - session.stats.successfulSolves} failed</span>
                </div>
            </div>
        </div>
    );
}

// Made with Bob
