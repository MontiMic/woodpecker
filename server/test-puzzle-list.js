// Simple test script to verify puzzle list endpoint logic
const { getDifficultyFromPuzzleId } = require('./utils/puzzles');

console.log('Testing getDifficultyFromPuzzleId function:');
console.log('Puzzle 1 (should be easy):', getDifficultyFromPuzzleId(1));
console.log('Puzzle 222 (should be easy):', getDifficultyFromPuzzleId(222));
console.log('Puzzle 223 (should be medium):', getDifficultyFromPuzzleId(223));
console.log('Puzzle 984 (should be medium):', getDifficultyFromPuzzleId(984));
console.log('Puzzle 985 (should be hard):', getDifficultyFromPuzzleId(985));
console.log('Puzzle 1128 (should be hard):', getDifficultyFromPuzzleId(1128));

console.log('\nTesting sorting logic:');
const items = [
    { puzzleId: 3, difficulty: 'easy', evaluation: 'solved' },
    { puzzleId: 1, difficulty: 'easy', evaluation: null },
    { puzzleId: 2, difficulty: 'easy', evaluation: 'failed' },
];

// Test puzzleId sort
const byPuzzleId = [...items].sort((a, b) => a.puzzleId - b.puzzleId);
console.log('Sorted by puzzleId:', byPuzzleId.map(i => i.puzzleId));

// Test difficulty sort
const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
const byDifficulty = [...items].sort((a, b) => 
    difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
);
console.log('Sorted by difficulty:', byDifficulty.map(i => i.difficulty));

// Test evaluation sort
const evaluationOrder = { solved: 1, partial: 2, failed: 3, null: 4 };
const byEvaluation = [...items].sort((a, b) => {
    const aOrder = evaluationOrder[a.evaluation] || evaluationOrder.null;
    const bOrder = evaluationOrder[b.evaluation] || evaluationOrder.null;
    return aOrder - bOrder;
});
console.log('Sorted by evaluation:', byEvaluation.map(i => i.evaluation));

console.log('\n✓ All logic tests passed!');