const express = require('express');
const Puzzle = require('../models/Puzzle');
const { extractPuzzlesFromDocument, getDifficultyFromPuzzleId } = require('../utils/puzzles');
const authenticateToken = require('../middleware/auth');
const { getUserEvaluations } = require('../utils/evaluations');
const router = express.Router();

// Get all puzzles with user evaluation status (authenticated)
router.get('/list', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        
        // Parse and validate query parameters
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize) || 50));
        const difficultyFilter = req.query.difficulty || 'all';
        const evaluationFilter = req.query.evaluation || 'all';
        const sortBy = req.query.sortBy || 'puzzleId';
        const sortOrder = req.query.sortOrder || 'asc';
        
        // Parse comma-separated filters
        const difficultyFilters = difficultyFilter === 'all'
            ? ['easy', 'medium', 'hard']
            : difficultyFilter.split(',').map(d => d.trim());
        const evaluationFilters = evaluationFilter === 'all'
            ? ['solved', 'partial', 'failed', 'unattempted']
            : evaluationFilter.split(',').map(e => e.trim());
        
        // Validate filter parameters
        const validDifficulties = ['easy', 'medium', 'hard'];
        const validEvaluations = ['solved', 'partial', 'failed', 'unattempted'];
        const validSortBy = ['puzzleId', 'difficulty', 'evaluation'];
        const validSortOrder = ['asc', 'desc'];
        
        // Validate each difficulty filter
        for (const diff of difficultyFilters) {
            if (!validDifficulties.includes(diff)) {
                return res.status(400).json({ error: `Invalid difficulty filter: ${diff}` });
            }
        }
        
        // Validate each evaluation filter
        for (const evalFilter of evaluationFilters) {
            if (!validEvaluations.includes(evalFilter)) {
                return res.status(400).json({ error: `Invalid evaluation filter: ${evalFilter}` });
            }
        }
        if (!validSortBy.includes(sortBy)) {
            return res.status(400).json({ error: 'Invalid sortBy parameter' });
        }
        if (!validSortOrder.includes(sortOrder)) {
            return res.status(400).json({ error: 'Invalid sortOrder parameter' });
        }
        
        // Fetch puzzle document
        const doc = await Puzzle.findOne();
        if (!doc) {
            return res.status(404).json({ error: 'Puzzle data not found' });
        }
        
        // Fetch user evaluations
        const userEvaluations = await getUserEvaluations(username);

        const evaluationMap = new Map();
        userEvaluations.forEach(evalItem => {
            const puzzleIdStr = String(evalItem.puzzle_id);
            evaluationMap.set(puzzleIdStr, evalItem.evaluation);
        });
        
        // Build puzzle summary items
        const allItems = [];
        for (let puzzleId = 1; puzzleId <= 1128; puzzleId++) {
            const puzzleKey = puzzleId.toString();
            const puzzle = doc[puzzleKey];
            
            if (puzzle) {
                const difficulty = getDifficultyFromPuzzleId(puzzleId);
                const evaluation = evaluationMap.get(puzzleKey) || null;
                
                allItems.push({
                    puzzleId: puzzleId,
                    description: puzzle.descr,
                    difficulty: difficulty,
                    evaluation: evaluation
                });
            }
        }
        
        // Apply filters
        let filteredItems = allItems;
        
        filteredItems = filteredItems.filter(item => difficultyFilters.includes(item.difficulty));
        
        filteredItems = filteredItems.filter(item => {
            if (evaluationFilters.includes('unattempted') && item.evaluation === null) {
                return true;
            }
            return item.evaluation && evaluationFilters.includes(item.evaluation);
        });
        
        filteredItems.sort((a, b) => {
            let comparison = 0;
            
            if (sortBy === 'puzzleId') {
                comparison = a.puzzleId - b.puzzleId;
            } else if (sortBy === 'difficulty') {
                const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
                comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
            } else if (sortBy === 'evaluation') {
                const evaluationOrder = { solved: 1, partial: 2, failed: 3, null: 4 };
                const aOrder = evaluationOrder[a.evaluation] || evaluationOrder.null;
                const bOrder = evaluationOrder[b.evaluation] || evaluationOrder.null;
                comparison = aOrder - bOrder;
            }
            
            return sortOrder === 'asc' ? comparison : -comparison;
        });
        
        const totalItems = filteredItems.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedItems = filteredItems.slice(startIndex, endIndex);
        
        const response = {
            items: paginatedItems,
            pagination: {
                page: page,
                pageSize: pageSize,
                totalItems: totalItems,
                totalPages: totalPages
            },
            filters: {
                difficulty: difficultyFilter === 'all' ? null : difficultyFilters,
                evaluation: evaluationFilter === 'all' ? null : evaluationFilters
            },
            sorting: {
                sortBy: sortBy,
                sortOrder: sortOrder
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error getting puzzle list:', error);
        res.status(500).json({ error: 'Failed to get puzzle list' });
    }
});

// Get all puzzles
router.get('/', async (req, res) => {
    try {
        const doc = await Puzzle.findOne();
        if (!doc) {
            return res.status(404).json({ error: 'Puzzle data not found' });
        }
        
        const puzzles = extractPuzzlesFromDocument(doc);
        res.json(puzzles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get puzzle by ID
router.get('/:id', async (req, res) => {
    try {
        const puzzleId = parseInt(req.params.id);
        if (isNaN(puzzleId) || puzzleId < 1 || puzzleId > 1128) {
            return res.status(400).json({ error: 'Invalid puzzle ID' });
        }
        
        const doc = await Puzzle.findOne();
        if (!doc) {
            return res.status(404).json({ error: 'Puzzle data not found' });
        }
        
        const puzzle = doc[puzzleId.toString()];
        if (!puzzle) {
            return res.status(404).json({ error: 'Puzzle not found' });
        }
        
        res.json({
            puzzle_id: puzzleId,
            descr: puzzle.descr,
            direction: puzzle.direction,
            fen: puzzle.fen,
            solution: puzzle.solution || 'No solution available',
            unicode: puzzle.unicode,
            lichess: puzzle.lichess
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get random puzzle by difficulty
router.get('/random/:difficulty', async (req, res) => {
    try {
        const { difficulty } = req.params;
        
        const ranges = {
            easy: { min: 1, max: 222 },
            medium: { min: 223, max: 984 },
            hard: { min: 985, max: 1128 }
        };
        
        const range = ranges[difficulty];
        if (!range) {
            return res.status(400).json({ error: 'Invalid difficulty level' });
        }
        
        const doc = await Puzzle.findOne();
        if (!doc) {
            return res.status(404).json({ error: 'Puzzle data not found' });
        }
        
        const puzzlesInRange = [];
        
        for (let i = range.min; i <= range.max; i++) {
            const puzzleKey = i.toString();
            const puzzle = doc[puzzleKey];
            if (puzzle) {
                puzzlesInRange.push({
                    puzzle_id: i,
                    ...puzzle
                });
            }
        }
        
        if (puzzlesInRange.length === 0) {
            return res.status(404).json({ error: `No ${difficulty} puzzles found` });
        }
        
        const randomIndex = Math.floor(Math.random() * puzzlesInRange.length);
        const randomPuzzle = puzzlesInRange[randomIndex];
        
        const response = {
            puzzle_id: randomPuzzle.puzzle_id,
            descr: randomPuzzle.descr,
            direction: randomPuzzle.direction,
            fen: randomPuzzle.fen,
            solution: randomPuzzle.solution || 'No solution available',
            unicode: randomPuzzle.unicode,
            lichess: randomPuzzle.lichess
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get puzzles by range
router.get('/range/:min/:max', async (req, res) => {
    try {
        const min = parseInt(req.params.min);
        const max = parseInt(req.params.max);
        
        if (isNaN(min) || isNaN(max) || min < 1 || max > 1128 || min > max) {
            return res.status(400).json({ error: 'Invalid range' });
        }
        
        const doc = await Puzzle.findOne();
        if (!doc) {
            return res.status(404).json({ error: 'Puzzle data not found' });
        }
        
        const puzzles = [];
        for (let i = min; i <= max; i++) {
            const puzzleKey = i.toString();
            const puzzle = doc[puzzleKey];
            if (puzzle) {
                puzzles.push({
                    puzzle_id: i,
                    descr: puzzle.descr,
                    direction: puzzle.direction,
                    fen: puzzle.fen,
                    solution: puzzle.solution || 'No solution available',
                    unicode: puzzle.unicode,
                    lichess: puzzle.lichess
                });
            }
        }
        
        res.json(puzzles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;