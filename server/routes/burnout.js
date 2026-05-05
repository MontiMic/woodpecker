const express = require('express');
const BurnoutSession = require('../models/BurnoutSession');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const VALID_DURATIONS = {
    '1day': 1,
    '2days': 2,
    '4days': 4,
    '1week': 7,
    '2weeks': 14,
    '1month': 30,
    '2months': 60
};

const DIFFICULTY_RANGES = {
    easy: { min: 1, max: 222 },
    medium: { min: 223, max: 984 },
    hard: { min: 985, max: 1128 }
};

const VALID_DIFFICULTIES = Object.keys(DIFFICULTY_RANGES);

const isValidDifficulties = (difficulties) => {
    return Array.isArray(difficulties)
        && difficulties.length > 0
        && difficulties.every((difficulty) => VALID_DIFFICULTIES.includes(difficulty));
};

const normalizeDifficulties = (difficulties) => {
    return [...new Set(difficulties)];
};

const buildPuzzlePool = (difficulties) => {
    const puzzlePool = [];

    difficulties.forEach((difficulty) => {
        const range = DIFFICULTY_RANGES[difficulty];

        for (let puzzleId = range.min; puzzleId <= range.max; puzzleId++) {
            puzzlePool.push(puzzleId);
        }
    });

    return puzzlePool;
};

const markExpiredIfNeeded = async (session) => {
    if (!session) {
        return null;
    }

    if (new Date() > session.endTime && session.isActive) {
        session.isActive = false;
        await session.save();
    }

    return session;
};

// Start a new burnout session
router.post('/start', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const { duration, difficulties } = req.body;

        if (!VALID_DURATIONS[duration]) {
            return res.status(400).json({ error: 'Invalid duration' });
        }

        if (!isValidDifficulties(difficulties)) {
            return res.status(400).json({ error: 'Invalid difficulties' });
        }

        const activeSession = await BurnoutSession.findOne({ username, isActive: true });
        const sessionAfterExpiryCheck = await markExpiredIfNeeded(activeSession);

        if (sessionAfterExpiryCheck && sessionAfterExpiryCheck.isActive) {
            return res.status(400).json({ error: 'User already has an active burnout session' });
        }

        const startTime = new Date();
        const endTime = new Date(startTime);
        endTime.setDate(endTime.getDate() + VALID_DURATIONS[duration]);

        const normalizedDifficulties = normalizeDifficulties(difficulties);
        const puzzlePool = buildPuzzlePool(normalizedDifficulties);

        const session = await BurnoutSession.create({
            username,
            startTime,
            endTime,
            difficulties: normalizedDifficulties,
            puzzlePool,
            completedInSession: [],
            currentPuzzleIndex: 0,
            stats: {
                totalAttempts: 0,
                successfulSolves: 0,
                startedAt: startTime
            }
        });

        res.status(201).json(session);

    } catch (error) {
        console.error('Error starting burnout session:', error);
        res.status(500).json({ error: 'Failed to start burnout session' });
    }
});

// Get current active session
router.get('/session', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const session = await BurnoutSession.findOne({ username, isActive: true });

        const updatedSession = await markExpiredIfNeeded(session);

        if (!updatedSession || !updatedSession.isActive) {
            return res.json(null);
        }

        res.json(updatedSession);

    } catch (error) {
        console.error('Error getting burnout session:', error);
        res.status(500).json({ error: 'Failed to get burnout session' });
    }
});

// Update difficulties mid-session
router.patch('/difficulties', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const { difficulties } = req.body;

        if (!isValidDifficulties(difficulties)) {
            return res.status(400).json({ error: 'Invalid difficulties' });
        }

        const session = await BurnoutSession.findOne({ username, isActive: true });
        const updatedSession = await markExpiredIfNeeded(session);

        if (!updatedSession || !updatedSession.isActive) {
            return res.status(404).json({ error: 'Active burnout session not found' });
        }

        const normalizedDifficulties = normalizeDifficulties(difficulties);
        const newPuzzlePool = buildPuzzlePool(normalizedDifficulties);
        const completedSet = new Set(updatedSession.completedInSession);
        const filteredPuzzlePool = newPuzzlePool.filter((puzzleId) => !completedSet.has(puzzleId));

        updatedSession.difficulties = normalizedDifficulties;
        updatedSession.puzzlePool = filteredPuzzlePool;
        updatedSession.currentPuzzleIndex = Math.min(
            updatedSession.currentPuzzleIndex,
            Math.max(filteredPuzzlePool.length - 1, 0)
        );

        if (filteredPuzzlePool.length === 0) {
            updatedSession.currentPuzzleIndex = 0;
            updatedSession.isActive = false;
        }

        await updatedSession.save();

        res.json(updatedSession);

    } catch (error) {
        console.error('Error updating burnout difficulties:', error);
        res.status(500).json({ error: 'Failed to update burnout difficulties' });
    }
});

// Mark puzzle as completed in session
router.post('/complete-puzzle', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const { puzzleId, evaluation, success } = req.body;

        if (!Number.isInteger(puzzleId) || puzzleId < 1 || puzzleId > 1128) {
            return res.status(400).json({ error: 'Invalid puzzleId' });
        }

        const normalizedEvaluation = typeof evaluation === 'string'
            ? evaluation.toLowerCase()
            : (typeof success === 'boolean' ? (success ? 'solved' : 'failed') : null);

        if (!['solved', 'partial', 'failed'].includes(normalizedEvaluation)) {
            return res.status(400).json({ error: 'Invalid evaluation value' });
        }

        const session = await BurnoutSession.findOne({ username, isActive: true });
        const updatedSession = await markExpiredIfNeeded(session);

        if (!updatedSession || !updatedSession.isActive) {
            return res.status(404).json({ error: 'Active burnout session not found' });
        }

        const isInPuzzlePool = updatedSession.puzzlePool.includes(puzzleId);
        const alreadyCompleted = updatedSession.completedInSession.includes(puzzleId);

        if (!isInPuzzlePool && !alreadyCompleted) {
            return res.status(400).json({ error: 'Puzzle is not part of the current burnout session' });
        }

        if (!alreadyCompleted) {
            updatedSession.completedInSession.push(puzzleId);
            updatedSession.puzzlePool = updatedSession.puzzlePool.filter((id) => id !== puzzleId);
            updatedSession.stats.totalAttempts += 1;

            if (normalizedEvaluation === 'solved') {
                updatedSession.stats.successfulSolves += 1;
            }
        }

        const allPuzzlesCompleted = updatedSession.puzzlePool.every(
            (id) => updatedSession.completedInSession.includes(id)
        );

        if (updatedSession.puzzlePool.length === 0 || allPuzzlesCompleted) {
            updatedSession.currentPuzzleIndex = 0;
            updatedSession.isActive = false;
        } else if (updatedSession.currentPuzzleIndex >= updatedSession.puzzlePool.length) {
            updatedSession.currentPuzzleIndex = updatedSession.puzzlePool.length - 1;
        }

        await updatedSession.save();

        res.json(updatedSession);

    } catch (error) {
        console.error('Error completing burnout puzzle:', error);
        res.status(500).json({ error: 'Failed to complete burnout puzzle' });
    }
});

// Update current puzzle index
router.patch('/navigate', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const { puzzleIndex } = req.body;

        if (!Number.isInteger(puzzleIndex) || puzzleIndex < 0) {
            return res.status(400).json({ error: 'Invalid puzzleIndex' });
        }

        const session = await BurnoutSession.findOne({ username, isActive: true });
        const updatedSession = await markExpiredIfNeeded(session);

        if (!updatedSession || !updatedSession.isActive) {
            return res.status(404).json({ error: 'Active burnout session not found' });
        }

        if (puzzleIndex >= updatedSession.puzzlePool.length) {
            return res.status(400).json({ error: 'Puzzle index out of bounds' });
        }

        updatedSession.currentPuzzleIndex = puzzleIndex;
        await updatedSession.save();

        res.json(updatedSession);

    } catch (error) {
        console.error('Error navigating burnout session:', error);
        res.status(500).json({ error: 'Failed to update burnout navigation' });
    }
});

// Cancel active session
router.delete('/cancel', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const session = await BurnoutSession.findOne({ username, isActive: true });

        const updatedSession = await markExpiredIfNeeded(session);

        if (!updatedSession || !updatedSession.isActive) {
            return res.status(404).json({ error: 'Active burnout session not found' });
        }

        updatedSession.isActive = false;
        await updatedSession.save();

        res.json({ message: 'Burnout session cancelled successfully' });

    } catch (error) {
        console.error('Error cancelling burnout session:', error);
        res.status(500).json({ error: 'Failed to cancel burnout session' });
    }
});

module.exports = router;

// Made with Bob
