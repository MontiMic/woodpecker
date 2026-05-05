import { useEffect, useState } from "react";
import { DeskCell, WHITE_SIDE_CELLS, BLACK_SIDE_CELLS, PieceType } from "../defs";
import { Difficulty, EvaluationStatus } from "./types";
import DifficultySelector from "./DifficultySelector";
import PuzzleDescription from "./PuzzleDescription";
import ControlButton, { LoginButton } from "./ControlButton";
import { getRandomBoardFromAPI, getPuzzleByIdFromAPI, checkAuth, saveEvaluation, getEvaluation } from "./utils/apiUtils";
import { SIDE_CELLS_MAP, isSideCell, generateRoomId, getDifficultyFromPuzzleId } from "./utils/boardUtils";
import { getBurnoutSession, completePuzzle, navigatePuzzle } from "./utils/burnoutApi";
import LoginPage from "./LoginPage";
import PuzzleEvaluation from "./PuzzleEvaluation";
import UserProfile from "./UserProfile";
import { useNavigate } from 'react-router-dom';
import ChessBoard from "./ChessBoard";
import SolutionBox from "./SolutionBox";
import { PuzzleData, BoardState } from "./types";
import { DIFFICULTY_RANGES } from "./constants";

interface BoardProps {
  onBrowsePuzzles?: () => void;
  onBurnoutMode?: () => void;
}

export default function Board({ onBrowsePuzzles, onBurnoutMode }: BoardProps) {
  const navigate = useNavigate();
  const [showLoginPage, setShowLoginPage] = useState<boolean>(false);
  const [showProfilePage, setShowProfilePage] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isInBurnoutMode, setIsInBurnoutMode] = useState<boolean>(false);
  
  const sharePuzzle = () => {
    const roomId = generateRoomId();
    navigate(`/room/${roomId}`);
  };

  const [board, setBoard] = useState<BoardState>(new Map([...SIDE_CELLS_MAP]));
  const [selectedCell, setSelectedCell] = useState<DeskCell | null>(null);
  const [direction, setDirection] = useState<string>('w');
  const [description, setDescription] = useState<string>('');
  const [solution, setSolution] = useState<string>('');
  const [isSolutionRevealed, setIsSolutionRevealed] = useState<boolean>(false);
  const [puzzleIndex, setPuzzleIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingNewPuzzle, setIsLoadingNewPuzzle] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationStatus | null>(null);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthentication = async () => {
      setIsCheckingAuth(true);
      try {
        const authStatus = await checkAuth();
        if (authStatus.authenticated) {
          setIsLoggedIn(true);
          setUsername(authStatus.username || '');
          console.log('User authenticated:', authStatus.username);
          
          // Check if user has an active burnout session
          const sessionResult = await getBurnoutSession();
          if (sessionResult.success && sessionResult.session) {
            setIsInBurnoutMode(true);
            console.log('Active burnout session detected');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthentication();
  }, []);

  // Function to load evaluation for current puzzle
  const loadCurrentEvaluation = async () => {
    if (isLoggedIn && puzzleIndex > 0) {
      try {
        const result = await getEvaluation(puzzleIndex);
        if (result.success) {
          const evaluation = result.evaluation;
          // Type guard to ensure the evaluation is a valid EvaluationStatus
          const validEvaluation = (evaluation === 'solved' || evaluation === 'partial' || evaluation === 'failed')
            ? evaluation as EvaluationStatus
            : null;
          setEvaluation(validEvaluation);
          console.log(`Loaded evaluation for puzzle ${puzzleIndex}: ${result.evaluation}`);
        }
      } catch (error) {
        console.error('Error loading evaluation:', error);
      }
    }
  };

  function onSelectedCell(cell: DeskCell) {
    if (selectedCell == cell) {
      setSelectedCell(null);
    } else if (selectedCell) {
      const piece = board.get(selectedCell);
      if (!piece) return;
      
      const destPiece = board.get(cell);
      const isDestSideCell = isSideCell(cell, WHITE_SIDE_CELLS, BLACK_SIDE_CELLS);
      const isSourceSideCell = isSideCell(selectedCell, WHITE_SIDE_CELLS, BLACK_SIDE_CELLS);
      
      const newBoard = new Map(board);
      newBoard.delete(selectedCell);
      
      if (!isDestSideCell) newBoard.set(cell, piece);
      if (isSourceSideCell) newBoard.set(selectedCell, new PieceType(piece.type, piece.color));
      if ((isSourceSideCell && isDestSideCell) || (!isDestSideCell && destPiece && destPiece.color === piece.color)) {
        setSelectedCell(cell);
        return;
      }
      
      setBoard(newBoard);
      setSelectedCell(null);
    } else if (board.has(cell)) {
      setSelectedCell(cell);
    }
  }
  
  //wrapper for getting adjacent puzzles
  const getAdjacentPuzzleId = (direction: 'prev' | 'next'): number => {
    const range = DIFFICULTY_RANGES[difficulty];
    const min = range.min;
    const max = range.max;
    
    let newId = direction === 'prev' ? puzzleIndex - 1 : puzzleIndex + 1;
    if (newId < min) newId = min;
    if (newId > max) newId = max;
    return newId;
  };

  const syncBurnoutNavigation = async (targetPuzzleId: number) => {
    const sessionResult = await getBurnoutSession();

    if (!sessionResult.success || !sessionResult.session) {
      setIsInBurnoutMode(false);
      return false;
    }

    const targetPuzzleIndex = sessionResult.session.puzzlePool.indexOf(targetPuzzleId);

    if (targetPuzzleIndex === -1) {
      setIsInBurnoutMode(false);
      return false;
    }

    setIsInBurnoutMode(true);

    const navigationResult = await navigatePuzzle(targetPuzzleIndex);

    if (!navigationResult.success) {
      console.error('Failed to sync burnout navigation:', navigationResult.error);
      return false;
    }

    return true;
  };

  const loadPuzzleById = async (puzzleId: number, options?: { syncBurnout?: boolean }) => {
    setError(null);
    setIsLoadingNewPuzzle(true);
    
    try {
      if (options?.syncBurnout) {
        const burnoutNavigationSynced = await syncBurnoutNavigation(puzzleId);

        if (!burnoutNavigationSynced) {
          return;
        }
      }
      
      const newPuzzleData = await getPuzzleByIdFromAPI(puzzleId);
      setPuzzleData(newPuzzleData);
      setDescription(newPuzzleData.description);
      setBoard(new Map([...newPuzzleData.boardFromFen, ...SIDE_CELLS_MAP]));
      setDirection(newPuzzleData.direction);
      setIsFlipped(newPuzzleData.direction === 'b');
      setSolution(newPuzzleData.solution);
      setSelectedCell(null);
      setIsSolutionRevealed(false);
      setPuzzleIndex(newPuzzleData.index);
    } catch (error) {
      setError('Failed to load puzzle. Please try again.');
      console.error('Error loading puzzle:', error);
    } finally {
      setIsLoadingNewPuzzle(false);
    }
  };

  const loadPreviousPuzzle = () => {
    const newId = getAdjacentPuzzleId('prev');
    loadPuzzleById(newId, { syncBurnout: true });
  };

  const loadNextPuzzle = () => {
    const newId = getAdjacentPuzzleId('next');
    loadPuzzleById(newId, { syncBurnout: true });
  };

  const loadRandomPuzzle = async () => {
    setError(null);
    setIsLoadingNewPuzzle(true);
    
    try {
      const newPuzzleData = await getRandomBoardFromAPI(difficulty);
      setPuzzleData(newPuzzleData);
      setDescription(newPuzzleData.description);
      setBoard(new Map([...newPuzzleData.boardFromFen, ...SIDE_CELLS_MAP]));
      setDirection(newPuzzleData.direction);
      setIsFlipped(newPuzzleData.direction === 'b');
      setSolution(newPuzzleData.solution);
      setSelectedCell(null);
      setIsSolutionRevealed(false);
      setPuzzleIndex(newPuzzleData.index);
      const burnoutNavigationSynced = await syncBurnoutNavigation(newPuzzleData.index);

      if (!burnoutNavigationSynced) {
        return;
      }
    } catch (error) {
      setError('Failed to load puzzle. Please try again.');
      console.error('Error loading puzzle:', error);
    } finally {
      setIsLoadingNewPuzzle(false);
    }
  };

  async function loadSpecificPuzzle(puzzleId: number) {
    setError(null);
    setIsLoadingNewPuzzle(true);
    setShowProfilePage(false);
    
    try {
      const newPuzzleData = await getPuzzleByIdFromAPI(puzzleId);
      setPuzzleData(newPuzzleData);
      setDescription(newPuzzleData.description);
      setBoard(new Map([...newPuzzleData.boardFromFen, ...SIDE_CELLS_MAP]));
      setDirection(newPuzzleData.direction);
      setIsFlipped(newPuzzleData.direction === 'b');
      setSolution(newPuzzleData.solution);
      setSelectedCell(null);
      setIsSolutionRevealed(false);
      setPuzzleIndex(newPuzzleData.index);
      
    } catch (error) {
      setError('Failed to load puzzle. Please try again.');
      console.error('Error loading puzzle:', error);
    } finally {
      setIsLoadingNewPuzzle(false);
    }
  }

  function restartPuzzle() {
    if (puzzleData) {
      setBoard(new Map([...puzzleData.boardFromFen, ...SIDE_CELLS_MAP]));
      setSelectedCell(null);
      setIsSolutionRevealed(false);
    }
  }
  
  // Load random puzzle on mount
  useEffect(() => {
    loadRandomPuzzle();
  }, []);
  
  useEffect(() => {
    // Don't load evaluations when in burnout mode
    if (isLoggedIn && puzzleIndex > 0 && !isInBurnoutMode) {
      loadCurrentEvaluation();
    } else {
      setEvaluation(null);
    }
  }, [puzzleIndex, isLoggedIn, isInBurnoutMode]);
  
  const handleLoginSuccess = (
    loggedInUsername: string,
    options?: { redirectToPuzzleId?: number }
  ) => {
    setIsLoggedIn(true);
    setUsername(loggedInUsername);
    setShowLoginPage(false);

    if (typeof options?.redirectToPuzzleId === 'number') {
      // Load the puzzle directly without URL parameters
      loadPuzzleById(options.redirectToPuzzleId);
    }
  };
  
  const handleEvaluationChange = async (newEvaluation: EvaluationStatus | null) => {
    if (!isLoggedIn) {
      return;
    }
    
    const finalEvaluation: EvaluationStatus | null = evaluation === newEvaluation ? null : newEvaluation;
    
    setEvaluation(finalEvaluation);
    
    if (finalEvaluation) {
      // Save evaluation immediately to the server
      try {
        const result = await saveEvaluation(puzzleIndex, finalEvaluation);
        if (result.success) {
          console.log(`Evaluation saved immediately for puzzle ${puzzleIndex}: ${finalEvaluation}`);
        } else {
          console.error('Failed to save evaluation:', result.error);
        }
      } catch (error) {
        console.error('Error saving evaluation:', error);
      }
      
      // Track puzzle completion in burnout session for any evaluation
      if (['solved', 'partial', 'failed'].includes(finalEvaluation)) {
        try {
          const sessionResult = await getBurnoutSession();
          if (sessionResult.success && sessionResult.session) {
            // There's an active burnout session, track the evaluation/completion
            setIsInBurnoutMode(true);
            const nextPuzzleId = sessionResult.session.puzzlePool.length > 1
              ? getAdjacentPuzzleId('next')
              : undefined;
            const completionResult = await completePuzzle(puzzleIndex, finalEvaluation, nextPuzzleId);
            if (completionResult.success) {
              console.log(`Puzzle completion tracked in burnout session with evaluation: ${finalEvaluation}`);
            } else {
              console.error('Failed to track puzzle in burnout session:', completionResult.error);
            }
          } else {
            setIsInBurnoutMode(false);
          }
        } catch (error) {
          console.error('Error checking burnout session:', error);
        }
      }
    } else {
      // If deselecting (setting to null), save that too
      try {
        // We need to delete the evaluation - but the API doesn't support deletion
        // So we'll just skip saving null values
        console.log(`Evaluation deselected for puzzle ${puzzleIndex}`);
      } catch (error) {
        console.error('Error handling evaluation deselection:', error);
      }
    }
  };

  const handleLogoutComplete = () => {
    setIsLoggedIn(false);
    setUsername('');
    setEvaluation(null);
    setShowProfilePage(false);
  };
  
  if (showLoginPage) {
    return <LoginPage onBack={() => setShowLoginPage(false)} onLoginSuccess={handleLoginSuccess} />;
  }
  
  if (showProfilePage) {
    return <UserProfile 
      onBack={() => setShowProfilePage(false)} 
      onLogout={handleLogoutComplete}
      username={username}
      onPuzzleClick={loadSpecificPuzzle}
    />;
  }
  
  if (error && !puzzleData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black-background p-4">
        <div className="text-red-500 text-lg mb-4">{error}</div>
        <button 
          onClick={loadRandomPuzzle}
          className="px-6 py-3 bg-blue-500 text-white font-bold rounded-xl transition-all duration-200 
                    shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                    border-b-4 border-blue-700 hover:border-blue-800"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center min-h-screen bg-black-background p-4">
      <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex-1">
          <PuzzleDescription 
            puzzleIndex={puzzleIndex}
            difficulty={getDifficultyFromPuzzleId(puzzleIndex)}
            direction={direction}
            description={description}
          />
        </div>
        <div className="md:ml-4 flex-shrink-0">
          {isCheckingAuth ? (
            <div className="text-neutral-400 text-sm animate-pulse">
              Checking auth...
            </div>
          ) : isLoggedIn ? (
            <button 
              onClick={() => setShowProfilePage(true)}
              className="px-6 py-3 text-black font-bold rounded-xl transition-all duration-200 
                        shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                        border-b-4 border-gray-700 hover:border-gray-800
                        hover:brightness-110 active:brightness-95 relative z-10"
              style={{ backgroundColor: 'var(--black-cell-color)' }}
              title="View your profile"
            >
              {username}
            </button>
          ) : (
            <LoginButton 
              onClick={() => setShowLoginPage(true)}
              title="Login to save your progress"
            />
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-4 w-full">
        <div 
          className="order-2 xl:order-1 rounded-2xl p-6 mb-4 xl:mb-0 flex flex-col gap-4 min-w-[200px]
                     shadow-2xl border-2 border-white/10 relative"
          style={{ backgroundColor: 'var(--white-cell-color)' }}
        >
          <div className="relative">
            <DifficultySelector difficulty={difficulty} setDifficulty={setDifficulty} />
          </div>
          <PuzzleEvaluation 
            isLoggedIn={isLoggedIn}
            selectedEvaluation={evaluation}
            onEvaluationChange={handleEvaluationChange}
          />
          <ControlButton onClick={restartPuzzle} title="Reset current puzzle to starting position">
            Restart Puzzle
          </ControlButton>
          
          {/* Three navigation buttons */}
          <div className="flex gap-1">
            <button
              onClick={loadPreviousPuzzle}
              className="flex-1 px-3 py-3 text-black font-bold rounded-xl transition-all duration-200 
                        shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                        border-b-4 border-gray-700 hover:border-gray-800
                        hover:brightness-110 active:brightness-95 relative z-10 text-xl"
              style={{ backgroundColor: 'var(--black-cell-color)' }}
              title="Previous puzzle"
              disabled={isLoadingNewPuzzle}
            >
              ←
            </button>
            <button
              onClick={loadRandomPuzzle}
              className="flex-1 px-3 py-3 text-black font-bold rounded-xl transition-all duration-200 
                        shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                        border-b-4 border-gray-700 hover:border-gray-800
                        hover:brightness-110 active:brightness-95 relative z-10
                        flex items-center justify-center"
              style={{ backgroundColor: 'var(--black-cell-color)' }}
              title="Random puzzle"
              disabled={isLoadingNewPuzzle}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 256 256"
                width="24"
                height="24"
                style={{ display: 'block' }}
              >
                <g fill-rule="evenodd">
                  <path d="M24.898 100.907a7.97 7.97 0 0 1 8.035-7.935l80.011.623c4.419.034 8.209 3.635 8.466 8.042l.517 8.868 26.68-42.392a7.776 7.776 0 0 1 10.94-2.349l66.996 44.369a8.03 8.03 0 0 1 2.275 11.113l-43.766 66.506c-2.432 3.695-7.447 4.8-11.197 2.47l-51.928-32.265v26.49c0 4.419-3.583 8-7.993 8H32.498a7.949 7.949 0 0 1-7.959-7.998l.36-83.542zm11.828 6.694l-.189 71.811 74.127.073-.035-29.78-5.954-4.119c-1.809-1.25-2.375-3.81-1.257-5.71L111 127l-.466-19.749-73.808.35zM156.483 79L118 138.79l60.965 38.32 37.612-58.539L156.483 79z"/>
                  <circle cx="138" cy="135" r="8"/>
                  <circle cx="165" cy="130" r="8"/>
                  <circle cx="193" cy="125" r="8"/>
                  <circle cx="50" cy="124" r="8"/>
                  <circle cx="73" cy="145" r="8"/>
                  <circle cx="95" cy="123" r="8"/>
                  <circle cx="51" cy="165" r="8"/>
                  <circle cx="95" cy="165" r="8"/>
                </g>
              </svg>
            </button>
            <button
              onClick={loadNextPuzzle}
              className="flex-1 px-3 py-3 text-black font-bold rounded-xl transition-all duration-200 
                        shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                        border-b-4 border-gray-700 hover:border-gray-800
                        hover:brightness-110 active:brightness-95 relative z-10 text-xl"
              style={{ backgroundColor: 'var(--black-cell-color)' }}
              title="Next puzzle"
              disabled={isLoadingNewPuzzle}
            >
              →
            </button>
          </div>
          
          {isLoggedIn && (
            <>
              <ControlButton onClick={() => onBrowsePuzzles?.()} title="Browse all puzzles">
                Browse Puzzles
              </ControlButton>
              <ControlButton onClick={() => onBurnoutMode?.()} title="Start or continue a burnout session">
                Burnout Mode
              </ControlButton>
            </>
          )}
          <ControlButton onClick={sharePuzzle} title="Create a shared room for this puzzle">
            Share Puzzle
          </ControlButton>
          <ControlButton onClick={() => setIsFlipped(!isFlipped)} title="Flip the board orientation">
            Flip Board
          </ControlButton>
        </div>
        
        <div className="order-1 xl:order-2 relative">
          <ChessBoard
            board={board}
            selectedCell={selectedCell}
            onCellClick={onSelectedCell}
            isLoading={isLoadingNewPuzzle}
            loadingMessage="Loading puzzle..."
            flipped={isFlipped}
          />
        </div>
      </div>
      
      <div className="w-full max-w-[min(100vh,100vw)] mt-6">
        <SolutionBox
          solution={solution}
          isSolutionRevealed={isSolutionRevealed}
          onToggle={() => setIsSolutionRevealed(!isSolutionRevealed)}
          isLoading={isLoadingNewPuzzle}
        />
      </div>
    </div>
  );
}