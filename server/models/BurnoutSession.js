const mongoose = require('mongoose');

const burnoutSessionSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    difficulties: {
        type: [String],
        required: true,
        enum: ['easy', 'medium', 'hard']
    },
    puzzlePool: {
        type: [Number],
        required: true
    },
    completedInSession: {
        type: [Number],
        default: []
    },
    currentPuzzleIndex: {
        type: Number,
        default: 0
    },
    stats: {
        totalAttempts: {
            type: Number,
            default: 0
        },
        successfulSolves: {
            type: Number,
            default: 0
        },
        startedAt: {
            type: Date,
            default: Date.now
        }
    }
}, {
    collection: 'burnout_sessions',
    versionKey: false
});

// Add indexes for efficient queries
burnoutSessionSchema.index({ username: 1 });
burnoutSessionSchema.index({ isActive: 1 });
burnoutSessionSchema.index({ username: 1, isActive: 1 });

module.exports = mongoose.model('BurnoutSession', burnoutSessionSchema);

// Made with Bob
