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
    const [difficultyFilters, setDifficultyFilters] = useState<Set<Difficulty>>(new Set(['easy', 'medium', 'hard']));
    const [evaluationFilters, setEvaluationFilters] = useState<Set<EvaluationStatus | 'unattempted'>>(new Set(['unattempted', 'solved', 'partial', 'failed']));
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
                // Convert Sets to comma-separated strings for API
                const difficultyParam = difficultyFilters.size === 3 ? 'all' : Array.from(difficultyFilters).join(',');
                const evaluationParam = evaluationFilters.size === 4 ? 'all' : Array.from(evaluationFilters).join(',');
                
                const response = await getPuzzleList({
                    page,
                    pageSize,
                    difficulty: difficultyParam,
                    evaluation: evaluationParam,
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
    }, [isAuthorized, page, pageSize, difficultyFilters, evaluationFilters, sortBy, sortOrder]);

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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Header */}
                <div className="mb-10">
                    <button
                        onClick={() => navigate('/')}
                        className="group text-neutral-400 hover:text-white font-medium transition-all duration-200
                                  flex items-center gap-2 mb-6"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:-translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to Puzzle
                    </button>
                    <h1 className="text-4xl font-bold text-white mb-2">Puzzle Library</h1>
                    <p className="text-neutral-400 text-lg">Browse and solve chess puzzles</p>
                </div>

                {/* Filters */}
                <div
                    className="rounded-2xl p-8 mb-8 border border-white/20 shadow-xl"
                    style={{ backgroundColor: 'var(--white-cell-color)' }}
                >
                    <h2 className="text-xl font-bold text-neutral-800 mb-6 flex items-center gap-2">
                        <svg className="h-5 w-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filter Puzzles
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Difficulty Filter */}
                        <div>
                            <label className="block text-sm font-bold text-neutral-700 mb-4 uppercase tracking-wide">
                                Difficulty Level
                            </label>
                            <div className="space-y-3">
                                {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                                    <label key={diff} className="flex items-center cursor-pointer hover:bg-neutral-50 p-3 rounded-lg transition-colors group">
                                        <input
                                            type="checkbox"
                                            checked={difficultyFilters.has(diff)}
                                            onChange={(e) => {
                                                const newFilters = new Set(difficultyFilters);
                                                if (e.target.checked) {
                                                    newFilters.add(diff);
                                                } else {
                                                    newFilters.delete(diff);
                                                }
                                                setDifficultyFilters(newFilters);
                                                setPage(1);
                                            }}
                                            className="w-5 h-5 text-blue-600 border-neutral-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        />
                                        <span className="ml-3 text-sm font-medium text-neutral-700 capitalize group-hover:text-neutral-900">{diff}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-bold text-neutral-700 mb-4 uppercase tracking-wide">
                                Completion Status
                            </label>
                            <div className="space-y-3">
                                {[
                                    { value: 'unattempted', label: 'Not Started' },
                                    { value: 'solved', label: 'Completed' },
                                    { value: 'failed', label: 'Failed' }
                                ].map((status) => (
                                    <label key={status.value} className="flex items-center cursor-pointer hover:bg-neutral-50 p-3 rounded-lg transition-colors group">
                                        <input
                                            type="checkbox"
                                            checked={evaluationFilters.has(status.value as EvaluationStatus | 'unattempted')}
                                            onChange={(e) => {
                                                const newFilters = new Set(evaluationFilters);
                                                if (e.target.checked) {
                                                    newFilters.add(status.value as EvaluationStatus | 'unattempted');
                                                } else {
                                                    newFilters.delete(status.value as EvaluationStatus | 'unattempted');
                                                }
                                                setEvaluationFilters(newFilters);
                                                setPage(1);
                                            }}
                                            className="w-5 h-5 text-blue-600 border-neutral-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        />
                                        <span className="ml-3 text-sm font-medium text-neutral-700 group-hover:text-neutral-900">{status.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* Results Summary */}
                    <div className="mt-6 pt-6 border-t border-neutral-200">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-neutral-600">
                                Showing <span className="font-bold text-neutral-900 text-base">{totalItems}</span> {totalItems === 1 ? 'puzzle' : 'puzzles'}
                            </div>
                            {(difficultyFilters.size < 3 || evaluationFilters.size < 3) && (
                                <button
                                    onClick={() => {
                                        setDifficultyFilters(new Set(['easy', 'medium', 'hard']));
                                        setEvaluationFilters(new Set(['unattempted', 'solved', 'partial', 'failed']));
                                        setPage(1);
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                                >
                                    Clear all filters
                                </button>
                            )}
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
                    <div className="hidden md:block overflow-hidden rounded-2xl border border-white/20 shadow-xl"
                         style={{ backgroundColor: 'var(--white-cell-color)' }}>
                        <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-gradient-to-r from-neutral-50 to-neutral-100">
                                <tr>
                                    <th
                                        scope="col"
                                        className="px-6 py-4 text-left text-xs font-bold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors"
                                        onClick={() => handleSortChange('puzzleId')}
                                    >
                                        <div className="flex items-center gap-2">
                                            ID
                                            {sortBy === 'puzzleId' && (
                                                <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-neutral-700 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-4 text-left text-xs font-bold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors"
                                        onClick={() => handleSortChange('difficulty')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Difficulty
                                            {sortBy === 'difficulty' && (
                                                <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-4 text-left text-xs font-bold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors"
                                        onClick={() => handleSortChange('evaluation')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Status
                                            {sortBy === 'evaluation' && (
                                                <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-neutral-700 uppercase tracking-wider">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-neutral-100">
                                {items.map((puzzle) => (
                                    <tr
                                        key={puzzle.puzzleId}
                                        className="hover:bg-blue-50 cursor-pointer transition-all duration-150 group"
                                        onClick={() => handlePuzzleClick(puzzle.puzzleId)}
                                    >
                                        <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-neutral-900">
                                            #{puzzle.puzzleId}
                                        </td>
                                        <td className="px-6 py-5 text-sm text-neutral-700 max-w-md">
                                            <div className="line-clamp-2">{puzzle.description}</div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <PuzzleDifficultyBadge difficulty={puzzle.difficulty as Difficulty} />
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <PuzzleStatusBadge status={puzzle.evaluation as EvaluationStatus | null} />
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePuzzleClick(puzzle.puzzleId);
                                                }}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-xs uppercase tracking-wide shadow-sm hover:shadow-md"
                                            >
                                                Solve
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
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
                                className="rounded-2xl p-5 border border-white/20 cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-200 group"
                                style={{ backgroundColor: 'var(--white-cell-color)' }}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-base font-bold text-neutral-900">#{puzzle.puzzleId}</span>
                                    <PuzzleStatusBadge status={puzzle.evaluation as EvaluationStatus | null} />
                                </div>
                                <p className="text-sm text-neutral-700 mb-4 leading-relaxed">{puzzle.description}</p>
                                <div className="flex justify-between items-center pt-3 border-t border-neutral-100">
                                    <PuzzleDifficultyBadge difficulty={puzzle.difficulty as Difficulty} />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePuzzleClick(puzzle.puzzleId);
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-xs uppercase tracking-wide shadow-sm"
                                    >
                                        Solve
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && items.length === 0 && (
                    <div className="text-center py-16 px-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-700 mb-4">
                            <svg className="h-8 w-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No puzzles found</h3>
                        <p className="text-neutral-400 text-base mb-6">Try adjusting your filters to see more results</p>
                        <button
                            onClick={() => {
                                setDifficultyFilters(new Set(['easy', 'medium', 'hard']));
                                setEvaluationFilters(new Set(['unattempted', 'solved', 'partial', 'failed']));
                                setPage(1);
                            }}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Clear all filters
                        </button>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className="px-5 py-2.5 rounded-lg bg-white border-2 border-neutral-300 text-neutral-700
                                     hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed
                                     transition-all font-semibold shadow-sm hover:shadow flex items-center gap-2"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Previous
                        </button>
                        
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            {/* Show first page */}
                            {page > 3 && (
                                <>
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        className="px-4 py-2.5 rounded-lg bg-white border-2 border-neutral-300 text-neutral-700
                                                 hover:bg-neutral-50 hover:border-neutral-400 transition-all font-semibold shadow-sm hover:shadow"
                                    >
                                        1
                                    </button>
                                    {page > 4 && <span className="text-neutral-500 font-bold">...</span>}
                                </>
                            )}
                            
                            {/* Show pages around current */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p >= page - 2 && p <= page + 2)
                                .map(p => (
                                    <button
                                        key={p}
                                        onClick={() => handlePageChange(p)}
                                        className={`px-4 py-2.5 rounded-lg border-2 transition-all font-semibold shadow-sm hover:shadow
                                                  ${p === page
                                                    ? 'bg-blue-600 border-blue-600 text-white scale-110'
                                                    : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            
                            {/* Show last page */}
                            {page < totalPages - 2 && (
                                <>
                                    {page < totalPages - 3 && <span className="text-neutral-500 font-bold">...</span>}
                                    <button
                                        onClick={() => handlePageChange(totalPages)}
                                        className="px-4 py-2.5 rounded-lg bg-white border-2 border-neutral-300 text-neutral-700
                                                 hover:bg-neutral-50 hover:border-neutral-400 transition-all font-semibold shadow-sm hover:shadow"
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                        </div>
                        
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages}
                            className="px-5 py-2.5 rounded-lg bg-white border-2 border-neutral-300 text-neutral-700
                                     hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed
                                     transition-all font-semibold shadow-sm hover:shadow flex items-center gap-2"
                        >
                            Next
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}