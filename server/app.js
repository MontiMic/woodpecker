const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const evaluationsRoutes = require('./routes/evaluations');
const puzzlesRoutes = require('./routes/puzzles');
const healthRoutes = require('./routes/health');
const authenticateToken = require('./middleware/auth');

const app = express();

// Middleware
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/evaluations', evaluationsRoutes);
app.use('/api/puzzles', puzzlesRoutes);
app.use('/api/health', healthRoutes);

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    const User = require('./models/User');
    try {
        const username = req.user.username;
        
        const usersDoc = await User.findOne({});
        
        if (!usersDoc || !usersDoc.users) {
            return res.status(404).json({ error: 'Users not found' });
        }
        
        const user = usersDoc.users.find(u => u.username === username);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user.username,
                username: user.username
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;
