import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuth, getPuzzleList } from './utils/apiUtils';
import { PuzzleListItem, Difficulty, EvaluationStatus, PuzzleListSortBy, SortOrder } from './types';
import PuzzleStatusBadge from './PuzzleStatusBadge';
import PuzzleDifficultyBadge from './PuzzleDifficultyBadge';

export default function PuzzleListPage() {
    const navigate = useNavigate();
    
    // Auth state
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    
    // Data state
    const [items, setItems] = useState<PuzzleListItem[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    
    // Filter and pagination state
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);
    const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
    const [evaluationFilter, setEvaluationFilter] = useState<EvaluationStatus | 'unattempted' | 'all'>('all');
    const [sortBy, setSortBy] = useState<PuzzleListSortBy>('puzzleId');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // Fetch puzzle list when filters/pagination change
    useEffect(() => {
        if (!isAuthorized) return;
        
        const fetchPuzzles = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const response = await getPuzzleList({
                    page,
                    pageSize,
                    difficulty: difficultyFilter,
                    evaluation: evaluationFilter,
                    sortBy,
                    sortOrder
                });
                
                setItems(response.items);
                setTotalItems(response.pagination.totalItems);
                setTotalPages(response.pagination.totalPages);
            } catch (err) {
                console.error('Error fetching puzzle list:', err);
                setError('Failed to load puzzles. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchPuzzles();
    }, [isAuthorized, page, pageSize, difficultyFilter, evaluationFilter, sortBy, sortOrder]);

    const handlePuzzleClick = (puzzleId: number) => {
        navigate(`/?puzzleId=${puzzleId}`);
    };

    const handleSortChange = (newSortBy: PuzzleListSortBy) => {
        if (sortBy === newSortBy) {
            // Toggle sort order if clicking the same column
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortOrder('asc');
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-black-background flex items-center justify-center">
                <div className="text-white text-xl">Checking authentication...</div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button 
                        onClick={() => navigate('/')}
                        className="mb-4 text-neutral-300 hover:text-white font-medium transition-colors duration-200
                                  flex items-center gap-2 hover:gap-3"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to Puzzle
                    </button>
                    
                    <h1 className="text-4xl font-bold text-white mb-2">Puzzle Library</h1>
                    <p className="text-neutral-400">Browse and filter all available puzzles</p>
                </div>

                {/* Filters */}
                <div 
                    className="rounded-xl p-6 mb-6 border-2 border-white/10"
                    style={{ backgroundColor: 'var(--white-cell-color)' }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Difficulty Filter */}
                        <div>
                            <label htmlFor="difficulty" className="block text-sm font-medium text-neutral-700 mb-2">
                                Difficulty
                            </label>
                            <select
                                id="difficulty"
                                value={difficultyFilter}
                                onChange={(e) => {
                                    setDifficultyFilter(e.target.value as Difficulty | 'all');
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-800 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Difficulties</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>

                        {/* Evaluation Filter */}
                        <div>
                            <label htmlFor="evaluation" className="block text-sm font-medium text-neutral-700 mb-2">
                                Status
                            </label>
                            <select
                                id="evaluation"
                                value={evaluationFilter}
                                onChange={(e) => {
                                    setEvaluationFilter(e.target.value as EvaluationStatus | 'unattempted' | 'all');
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-800 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Statuses</option>
                                <option value="unattempted">Unattempted</option>
                                <option value="solved">Solved</option>
                                <option value="partial">Partial</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>

                        {/* Results Summary */}
                        <div className="flex items-end">
                            <div className="text-sm text-neutral-600">
                                <span className="font-semibold text-neutral-800">{totalItems}</span> puzzles found
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex justify-center items-center py-12">
                        <div className="text-white text-xl flex items-center gap-3">
                            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading puzzles...
                        </div>
                    </div>
                )}

                {/* Puzzle Table - Desktop */}
                {!isLoading && items.length > 0 && (
                    <div className="hidden md:block overflow-x-auto rounded-xl border-2 border-white/10"
                         style={{ backgroundColor: 'var(--white-cell-color)' }}>
                        <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-neutral-50">
                                <tr>
                                    <th 
                                        scope="col" 
                                        className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                                        onClick={() => handleSortChange('puzzleId')}
                                    >
                                        <div className="flex items-center gap-2">
                                            ID
                                            {sortBy === 'puzzleId' && (
                                                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                                        onClick={() => handleSortChange('difficulty')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Difficulty
                                            {sortBy === 'difficulty' && (
                                                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                                        onClick={() => handleSortChange('evaluation')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Status
                                            {sortBy === 'evaluation' && (
                                                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-700 uppercase tracking-wider">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-neutral-200">
                                {items.map((puzzle) => (
                                    <tr 
                                        key={puzzle.puzzleId}
                                        className="hover:bg-neutral-50 cursor-pointer transition-colors"
                                        onClick={() => handlePuzzleClick(puzzle.puzzleId)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                                            #{puzzle.puzzleId}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-neutral-700 max-w-md truncate">
                                            {puzzle.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <PuzzleDifficultyBadge difficulty={puzzle.difficulty as Difficulty} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <PuzzleStatusBadge status={puzzle.evaluation as EvaluationStatus | null} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePuzzleClick(puzzle.puzzleId);
                                                }}
                                                className="text-blue-600 hover:text-blue-900 font-medium"
                                            >
                                                Solve →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Puzzle Cards - Mobile */}
                {!isLoading && items.length > 0 && (
                    <div className="md:hidden space-y-4">
                        {items.map((puzzle) => (
                            <div
                                key={puzzle.puzzleId}
                                onClick={() => handlePuzzleClick(puzzle.puzzleId)}
                                className="rounded-xl p-4 border-2 border-white/10 cursor-pointer hover:border-white/20 transition-all"
                                style={{ backgroundColor: 'var(--white-cell-color)' }}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-sm font-bold text-neutral-900">#{puzzle.puzzleId}</span>
                                    <PuzzleStatusBadge status={puzzle.evaluation as EvaluationStatus | null} />
                                </div>
                                <p className="text-sm text-neutral-700 mb-3">{puzzle.description}</p>
                                <div className="flex justify-between items-center">
                                    <PuzzleDifficultyBadge difficulty={puzzle.difficulty as Difficulty} />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePuzzleClick(puzzle.puzzleId);
                                        }}
                                        className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                                    >
                                        Solve →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && items.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-neutral-400 text-lg">No puzzles found matching your filters.</p>
                        <button
                            onClick={() => {
                                setDifficultyFilter('all');
                                setEvaluationFilter('all');
                                setPage(1);
                            }}
                            className="mt-4 text-blue-400 hover:text-blue-300 font-medium"
                        >
                            Clear filters
                        </button>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="mt-8 flex justify-center items-center gap-2">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className="px-4 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-700 
                                     hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed
                                     transition-colors font-medium"
                        >
                            Previous
                        </button>
                        
                        <div className="flex items-center gap-2">
                            {/* Show first page */}
                            {page > 3 && (
                                <>
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        className="px-4 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-700 
                                                 hover:bg-neutral-50 transition-colors"
                                    >
                                        1
                                    </button>
                                    {page > 4 && <span className="text-neutral-400">...</span>}
                                </>
                            )}
                            
                            {/* Show pages around current */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p >= page - 2 && p <= page + 2)
                                .map(p => (
                                    <button
                                        key={p}
                                        onClick={() => handlePageChange(p)}
                                        className={`px-4 py-2 rounded-lg border transition-colors font-medium
                                                  ${p === page 
                                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                                    : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            
                            {/* Show last page */}
                            {page < totalPages - 2 && (
                                <>
                                    {page < totalPages - 3 && <span className="text-neutral-400">...</span>}
                                    <button
                                        onClick={() => handlePageChange(totalPages)}
                                        className="px-4 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-700 
                                                 hover:bg-neutral-50 transition-colors"
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                        </div>
                        
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages}
                            className="px-4 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-700 
                                     hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed
                                     transition-colors font-medium"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}