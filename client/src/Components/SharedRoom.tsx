import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { DeskCell, PieceType, WHITE_SIDE_CELLS, BLACK_SIDE_CELLS } from "../defs";
import { getPuzzleByIdFromAPI } from "./utils/apiUtils";
import { SIDE_CELLS_MAP, isSideCell, getDifficultyFromPuzzleId } from "./utils/boardUtils";
import PuzzleDescription from "./PuzzleDescription";
import ChessBoard from "./ChessBoard";
import SolutionBox from "./SolutionBox";
import BackButton from "./BackButton";
import { PuzzleData, BoardState } from "./types";
import { SignalingClient } from "./p2p/SignalingClient";
import { PeerConnectionManager } from "./p2p/PeerConnectionManager";

export default function SharedRoom() {
    const { roomId } = useParams<{ roomId: string }>();
    const [searchParams] = useSearchParams();
    const puzzleId = parseInt(searchParams.get('puzzleId') || '1');
    const navigate = useNavigate();
    
    // Board state (local only for this step)
    const [board, setBoard] = useState<BoardState>(new Map([...SIDE_CELLS_MAP]));
    const [selectedCell, setSelectedCell] = useState<DeskCell | null>(null);
    const [description, setDescription] = useState<string>('');
    const [solution, setSolution] = useState<string>('');
    const [isSolutionRevealed, setIsSolutionRevealed] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [direction, setDirection] = useState<string>('w');
    const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
    
    // P2P state
    const [p2pReady, setP2pReady] = useState(false);
    const [peerManager, setPeerManager] = useState<PeerConnectionManager | null>(null);
    
    // Refs to persist connections across React StrictMode remounts
    const signalingRef = useRef<SignalingClient | null>(null);
    const peerManagerRef = useRef<PeerConnectionManager | null>(null);
    const puzzleDataRef = useRef<PuzzleData | null>(null);
    
    useEffect(() => {
        puzzleDataRef.current = puzzleData;
    }, [puzzleData]);

    // Load puzzle from API
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

    // P2P connection setup – signaling server assigns initiator/responder roles
    useEffect(() => {
        if (!roomId || !puzzleDataRef.current) return;
        // Avoid reconnecting if already connected
        if (signalingRef.current) {
            console.log('P2P already initialized, skipping');
            return;
        }

        let isMounted = true;
        let signaling: SignalingClient | null = null;

        const setupP2P = async () => {
            try {
                signaling = new SignalingClient();
                signalingRef.current = signaling;
                await signaling.connect('ws://localhost:3002', roomId!);

                // Server will immediately send a 'role' message after join
                signaling.onRole(async (isInitiator) => {
                    if (!isMounted) return;
                    console.log(`🎭 Received role: ${isInitiator ? 'INITIATOR' : 'RESPONDER'}`);
                    
                    const manager = new PeerConnectionManager(signaling!);
                    peerManagerRef.current = manager;
                    await manager.init(isInitiator);
                    manager.onMessage((msg) => {
                        console.log('📨 P2P test message received:', msg);
                        // TODO step 2: handle board synchronization
                    });
                    if (isMounted) {
                        setPeerManager(manager);
                        setP2pReady(true);
                    }
                });
            } catch (err) {
                console.error('Failed to connect signaling server:', err);
            }
        };

        setupP2P();

        return () => {
            isMounted = false;
            // Do NOT close connections here – keep them alive across StrictMode remounts
            // The cleanup will happen when the component actually unmounts (e.g., navigating away)
            // For now we rely on the refs to prevent reinitialization.
        };
    }, [roomId, puzzleDataRef.current]);

    // Send a test message via P2P
    const sendTestMessage = () => {
        if (peerManager && p2pReady) {
            const testMsg = JSON.stringify({
                type: 'test',
                data: `ping from ${Date.now()}`
            });
            peerManager.sendMessage(testMsg);
            console.log('📤 Sent test message');
        } else {
            console.warn('P2P not ready');
        }
    };

    // Local board move handling (no sync yet)
    const onSelectedCell = (cell: DeskCell) => {
        if (selectedCell == cell) {
            setSelectedCell(null);
            return;
        }
        
        if (selectedCell) {
            const piece = board.get(selectedCell);
            if (!piece) {
                setSelectedCell(null);
                return;
            }
            
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
    };

    // Reset puzzle locally (no broadcast yet)
    const resetPuzzle = () => {
        const currentPuzzleData = puzzleDataRef.current;
        if (!currentPuzzleData) return;
        
        const newBoard = new Map([...currentPuzzleData.boardFromFen, ...SIDE_CELLS_MAP]);
        setBoard(newBoard);
        setSelectedCell(null);
        // TODO step 2: broadcast reset via P2P
    };

    const handleShareRoom = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            alert('Room URL copied to clipboard');
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
                    {/* Connection Status */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className={`w-3 h-3 rounded-full ${p2pReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                        <span className="text-neutral-700">
                            {p2pReady ? 'P2P Connected' : 'Connecting P2P...'}
                        </span>
                    </div>

                    {/* Test Message Button (Step 1) */}
                    <button 
                        onClick={sendTestMessage}
                        disabled={!p2pReady}
                        className="px-6 py-3 text-black font-bold rounded-xl transition-all duration-200 
                                  shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                                  border-b-4 border-gray-700 hover:border-gray-800 w-full
                                  hover:brightness-110 active:brightness-95 relative z-10
                                  disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: 'var(--black-cell-color)' }}
                        title="Send a test message via P2P"
                    >
                        Send Test Message
                    </button>

                    {/* Reset Button (local only for now) */}
                    <button 
                        onClick={resetPuzzle}
                        className="px-6 py-3 text-black font-bold rounded-xl transition-all duration-200 
                                  shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md
                                  border-b-4 border-gray-700 hover:border-gray-800 w-full
                                  hover:brightness-110 active:brightness-95 relative z-10"
                        style={{ backgroundColor: 'var(--black-cell-color)' }}
                        title="Reset puzzle locally (not synced yet)"
                    >
                        Reset Puzzle (Local)
                    </button>

                    {/* Share Room Button (copies URL) */}
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
                </div>
                
                {/* Board */}
                <div className="order-1 xl:order-2 relative">
                    <ChessBoard
                        board={board}
                        selectedCell={selectedCell}
                        onCellClick={onSelectedCell}
                        isLoading={isLoading}
                        loadingMessage="Loading puzzle..."
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