const http = require('http');
const { Server } = require('socket.io');
const RoomManager = require('./sockets/roomManager');

function setupServer(app) {
    const server = http.createServer(app);
    const roomManager = new RoomManager();

    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            credentials: true,
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`New socket connection: ${socket.id}`);
        
        socket.on('join-room', (roomId, puzzleId) => {
            roomManager.joinRoom(socket, roomId, puzzleId);
        });

        socket.on('reset-board', (roomId) => {
            console.log(`Reset board requested in room ${roomId} by ${socket.id}`);
            io.to(roomId).emit('board-reset');
        });
        
        socket.on('move-piece', (roomId, moveData) => {
            console.log(`Move in room ${roomId} from ${socket.id}:`, moveData);
            socket.to(roomId).emit('piece-moved', moveData);
        });
        
        socket.on('side-piece-moved', (roomId, moveData) => {
            console.log(`Side piece move in room ${roomId} from ${socket.id}:`, moveData);
            socket.to(roomId).emit('side-piece-moved', moveData);
        });
        
        socket.on('disconnect', () => {
            roomManager.disconnectUser(socket);
        });
        
        socket.on('leave-room', (roomId) => {
            roomManager.leaveRoom(socket, roomId);
        });
    });

    return server;
}

module.exports = setupServer;
