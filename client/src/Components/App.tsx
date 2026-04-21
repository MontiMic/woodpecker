import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Board from "./Board";
import SharedRoom from "./SharedRoom";
import PuzzleListPage from "./PuzzleListPage";

export default function App() {
  const [showPuzzleList, setShowPuzzleList] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            showPuzzleList ? (
              <PuzzleListPage
                onClose={() => setShowPuzzleList(false)}
                onSelectPuzzle={(puzzleId) => {
                  setShowPuzzleList(false);
                  window.history.replaceState(null, '', `/?puzzleId=${puzzleId}`);
                }}
              />
            ) : (
              <Board onBrowsePuzzles={() => setShowPuzzleList(true)} />
            )
          }
        />
        <Route path="/puzzles" element={<PuzzleListPage />} />
        <Route path="/room/:roomId" element={<SharedRoom />} />
      </Routes>
    </BrowserRouter>
  );
}