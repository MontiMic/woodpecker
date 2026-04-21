import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Board from "./Board";
import SharedRoom from "./SharedRoom";
import PuzzleListPage from "./PuzzleListPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/puzzles" element={<PuzzleListPage />} />
        <Route path="/room/:roomId" element={<SharedRoom />} />
      </Routes>
    </BrowserRouter>
  );
}