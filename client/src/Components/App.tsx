import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Board from "./Board";
import SharedRoom from "./SharedRoom";
import PuzzleListPage from "./PuzzleListPage";
import BurnoutMode from "./BurnoutMode";

export default function App() {
  const [showPuzzleList, setShowPuzzleList] = useState(false);
  const [showBurnoutMode, setShowBurnoutMode] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            showBurnoutMode ? (
              <BurnoutMode onClose={() => setShowBurnoutMode(false)} />
            ) : showPuzzleList ? (
              <PuzzleListPage
                onClose={() => setShowPuzzleList(false)}
                onSelectPuzzle={(puzzleId) => {
                  setShowPuzzleList(false);
                  window.history.replaceState(null, '', `/?puzzleId=${puzzleId}`);
                }}
              />
            ) : (
              <Board
                onBrowsePuzzles={() => setShowPuzzleList(true)}
                onBurnoutMode={() => setShowBurnoutMode(true)}
              />
            )
          }
        />
        <Route path="/puzzles" element={<PuzzleListPage />} />
        <Route path="/room/:roomId" element={<SharedRoom />} />
      </Routes>
    </BrowserRouter>
  );
}