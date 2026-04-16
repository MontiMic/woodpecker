import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { DeskCell, PieceType, WHITE_SIDE_CELLS, BLACK_SIDE_CELLS } from "../defs";
import { getPuzzleByIdFromAPI } from "./utils/apiUtils";
import { SIDE_CELLS_MAP, isSideCell, getDifficultyFromPuzzleId } from "./utils/boardUtils";
import { io, Socket } from "socket.io-client";
import PuzzleDescription from "./PuzzleDescription";
import ChessBoard from "./ChessBoard";
import SolutionBox from "./SolutionBox";
import BackButton from "./BackButton";
import { PuzzleData, BoardState } from "./types";

export default function SharedRoom() {
    const { roomId } = useParams<{ roomId: string }>();
    const [searchParams] = useSearchParams();
    const puzzleId = parseInt(searchParams.get('puzzleId') || '1');
    const navigate = useNavigate();
    const [isFlipped, setIsFlipped] = useState<boolean>(false);

    
    const [socket, setSocket] = useState<Socket | null>(null);
    const [board, setBoard] = useState<BoardState>(new Map([...SIDE_CELLS_MAP]));
    const [selectedCell, setSelectedCell] = useState<DeskCell | null>(null);
    const [description, setDescription] = useState<string>('');
    const [solution, setSolution] = useState<string>('');
    const [isSolutionRevealed, setIsSolutionRevealed] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [direction, setDirection] = useState<string>('w');
    const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
    
    const puzzleDataRef = useRef<PuzzleData | null>(null);
    
    useEffect(() => {
        puzzleDataRef.current = puzzleData;
    }, [puzzleData]);

    useEffect(() => {
        const loadPuzzle = async () => {
            try {
                const puzzleData = await getPuzzleByIdFromAPI(puzzleId);
                setDescription(puzzleData.description);
                const initialBoard = new Map([...puzzleData.boardFromFen, ...SIDE_CELLS_MAP]);
                setBoard(initialBoard);
                setPuzzleData(puzzleData);
                setSolution(puzzleData.solution);
                setDirection(puzzleData.direction);
            } catch (error) {
                setError('Failed to load puzzle');
                console.error('Error loading puzzle:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadPuzzle();
    }, [puzzleId]);

    // Socket.IO connection
    useEffect(() => {
        if (!roomId || !puzzleId) return;
        
        const newSocket = io('http://localhost:3001', {
            transports: ['websocket', 'polling']
        });
        
        setSocket(newSocket);
        
        // Socket event handlers
        newSocket.on('connect', () => {
            console.log('Connected to Socket.IO server');
            newSocket.emit('join-room', roomId, puzzleId);
        });
        
        newSocket.on('room-joined', (data) => {
            console.log('Joined room:', data);
        });
        
        newSocket.on('piece-moved', (moveData) => {
            console.log('Received move:', moveData);
            applyRemoteMove(moveData);
        });
        
        newSocket.on('side-piece-moved', (moveData) => {
            console.log('Received side piece move:', moveData);
            applySidePieceMove(moveData);
        });
        
        newSocket.on('board-reset', () => {
            console.log('Received board reset signal');
            const currentPuzzleData = puzzleDataRef.current;
            if (currentPuzzleData) {
                const newBoard = new Map([...currentPuzzleData.boardFromFen, ...SIDE_CELLS_MAP]);
                console.log('New board created with pieces:', newBoard.size);
                setBoard(newBoard);
                setSelectedCell(null);
            } else {
                console.error('No puzzle data available to reset');
            }
        });
        
        newSocket.on('disconnect', () => {
            console.log('Disconnected from Socket.IO server');
        });
        
        // Cleanup on unmount
        return () => {
            newSocket.disconnect();
        };
    }, [roomId, puzzleId]);

    const applyRemoteMove = (moveData: any) => {
        console.log('Applying remote move:', moveData);
        
        const { from, to, piece, isSideCellMove } = moveData;
        
        setBoard(prevBoard => {
            const newBoard = new Map(prevBoard);
            
            if (isSideCellMove) {
                if (isSideCell(to as DeskCell, WHITE_SIDE_CELLS, BLACK_SIDE_CELLS)) {
                    newBoard.delete(from as DeskCell);
                } else {
                    newBoard.set(to as DeskCell, new PieceType(piece.type, piece.color));
                }
            } else {
                newBoard.delete(from as DeskCell);
                newBoard.set(to as DeskCell, new PieceType(piece.type, piece.color));
            }
            
            return newBoard;
        });
        
        setSelectedCell(null);
    };

    const applySidePieceMove = (moveData: any) => {
        const { from, to, piece } = moveData;
        
        setBoard(prevBoard => {
            const newBoard = new Map(prevBoard);
            newBoard.delete(from as DeskCell);
            newBoard.set(to as DeskCell, new PieceType(piece.type, piece.color));
            return newBoard;
        });
    };

    const onSelectedCell = (cell: DeskCell) => {
        if (selectedCell == cell) {
            setSelectedCell(null);
        } else if (selectedCell) {
            const piece = board.get(selectedCell);
            if (!piece) return;
            
            const destPiece = board.get(cell);
            const isDestSideCell = isSideCell(cell, WHITE_SIDE_CELLS, BLACK_SIDE_CELLS);
            const isSourceSideCell = isSideCell(selectedCell, WHITE_SIDE_CELLS, BLACK_SIDE_CELLS);
            
            const newBoard = new Map(board);
            
            if (isSourceSideCell && isDestSideCell) {
                setSelectedCell(cell);
                return;
            }
            
            if (isSourceSideCell) {
                newBoard.set(cell, piece);
                setBoard(newBoard);
                setSelectedCell(null);
                
                if (socket && socket.connected && roomId) {
                    socket.emit('move-piece', roomId, {
                        from: selectedCell,
                        to: cell,
                        piece: {
                            type: piece.type,
                            color: piece.color
                        },
                        isSideCellMove: true,
                        moveType: 'from-side'
                    });
                }
            } else if (isDestSideCell) {
                newBoard.delete(selectedCell);
                setBoard(newBoard);
                setSelectedCell(null);
                
                if (socket && socket.connected && roomId) {
                    socket.emit('move-piece', roomId, {
                        from: selectedCell,
                        to: cell,
                        piece: {
                            type: piece.type,
                            color: piece.color
                        },
                        isSideCellMove: true,
                        moveType: 'to-side'
                    });
                }
            } else {
                newBoard.delete(selectedCell);
                newBoard.set(cell, piece);
                setBoard(newBoard);
                setSelectedCell(null);
                
                if (socket && socket.connected && roomId) {
                    socket.emit('move-piece', roomId, {
                        from: selectedCell,
                        to: cell,
                        piece: {
                            type: piece.type,
                            color: piece.color
                        },
                        isSideCellMove: false
                    });
                }
            }
        } else if (board.has(cell)) {
            setSelectedCell(cell);
        }
    };

    const handleShareRoom = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    const resetPuzzle = () => {
        console.log('Reset puzzle clicked');
        
        const currentPuzzleData = puzzleDataRef.current;
        if (!currentPuzzleData) {
            console.error('Cannot reset: no puzzle data');
            return;
        }
        
        const newBoard = new Map([...currentPuzzleData.boardFromFen, ...SIDE_CELLS_MAP]);
        console.log('New board created with pieces:', newBoard.size);
        setBoard(newBoard);
        setSelectedCell(null);
        
        if (socket && socket.connected && roomId) {
            console.log('Emitting reset-board event to room:', roomId);
            socket.emit('reset-board', roomId);
        } else {
            console.error('Cannot reset: socket not connected');
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black-background p-4">
                <div className="text-red-500 text-lg mb-4">{error}</div>
                <button 
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-blue-500 text-white font-bold rounded-xl"
                >
                    Back to Main
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center min-h-screen bg-black-background p-4">
            {/* Back Button */}
            <div className="w-full max-w-6xl">
                <BackButton onClick={() => navigate('/')} />
            </div>

            {/* Top Bar */}
            <div className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex-1">
                    <PuzzleDescription 
                        puzzleIndex={puzzleId}
                        difficulty={getDifficultyFromPuzzleId(puzzleId)}
                        direction={direction}
                        description={description}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 w-full max-w-6xl">
                {/* Left Control Panel */}
                <div 
                    className="order-2 xl:order-1 rounded-2xl p-6 mb-4 xl:mb-0 flex flex-col gap-4 min-w-[200px]
                               shadow-2xl border-2 border-white/10 relative"
                    style={{ backgroundColor: 'var(--white-cell-color)' }}
                >
                    {/* Connection Status with Dot */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className={`w-3 h-3 rounded-full ${socket?.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-neutral-700">
                            {socket?.connected ? 'Connected' : 'Connecting...'}
                        </span>
                    </div>

                    {/* Reset Button */}
                    <button 
                        onClick={resetPuzzle}
                        className="px-6 py-3 text-black font-bold rounded-xl transition-all duration-200 
                                  shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                                  border-b-4 border-gray-700 hover:border-gray-800 w-full
                                  hover:brightness-110 active:brightness-95 relative z-10"
                        style={{ backgroundColor: 'var(--black-cell-color)' }}
                        title="Reset puzzle to starting position for all users"
                    >
                        Reset Puzzle
                    </button>

                    {/* Share Room Button */}
                    <button 
                        onClick={handleShareRoom}
                        className="px-6 py-3 text-black font-bold rounded-xl transition-all duration-200 
                                  shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                                  border-b-4 border-gray-700 hover:border-gray-800 w-full
                                  hover:brightness-110 active:brightness-95 relative z-10"
                        style={{ backgroundColor: 'var(--black-cell-color)' }}
                        title="Copy room URL to clipboard"
                    >
                        Share Room
                    </button>
                    <button 
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="px-6 py-3 text-black font-bold rounded-xl transition-all duration-200 
                                    shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                                    border-b-4 border-gray-700 hover:border-gray-800 w-full
                                    hover:brightness-110 active:brightness-95 relative z-10"
                        style={{ backgroundColor: 'var(--black-cell-color)' }}
                        title="Flip the board orientation"
                        >
                        Flip Board
                        </button>
                </div>
                
                {/* Board */}
                <div className="order-1 xl:order-2 relative">
                    <ChessBoard
                        board={board}
                        selectedCell={selectedCell}
                        onCellClick={onSelectedCell}
                        isLoading={isLoading}
                        loadingMessage="Loading puzzle..."
                        flipped={isFlipped}
                    />
                </div>
            </div>
            
            {/* Solution Box */}
            <div className="w-full max-w-[min(100vh,100vw)] mt-6">
                <SolutionBox
                    solution={solution}
                    isSolutionRevealed={isSolutionRevealed}
                    onToggle={() => setIsSolutionRevealed(!isSolutionRevealed)}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}