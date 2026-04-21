function extractPuzzlesFromDocument(doc) {
    const puzzles = [];
    
    for (const key in doc) {
        if (key !== '_id' && key !== '__v') {
            const puzzleData = doc[key];
            if (puzzleData && typeof puzzleData === 'object') {
                puzzles.push({
                    puzzle_id: parseInt(key),
                    descr: puzzleData.descr,
                    direction: puzzleData.direction,
                    fen: puzzleData.fen,
                    solution: puzzleData.solution || 'No solution available',
                    unicode: puzzleData.unicode,
                    lichess: puzzleData.lichess
                });
            }
        }
    }
    
    return puzzles.sort((a, b) => a.puzzle_id - b.puzzle_id);
}

function getDifficultyFromPuzzleId(puzzleId) {
    const id = parseInt(puzzleId);
    if (id >= 1 && id <= 222) {
        return 'easy';
    } else if (id >= 223 && id <= 984) {
        return 'medium';
    } else if (id >= 985 && id <= 1128) {
        return 'hard';
    }
    return null;
}

module.exports = {
    extractPuzzlesFromDocument,
    getDifficultyFromPuzzleId
};