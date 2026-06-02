const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3002 });

// rooms: Map<roomId, { clients: Map<ws, boolean>, initiatorAssigned: boolean }>
const rooms = new Map();

wss.on('connection', (ws) => {
  console.log('New signaling client connected');
  ws.roomId = null;

  ws.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      console.error('Invalid JSON', err);
      return;
    }

    const { type, roomId, payload } = message;

    switch (type) {
      case 'join':
        if (!roomId) return;
        
        // Leave previous room
        if (ws.roomId && rooms.has(ws.roomId)) {
          const oldRoom = rooms.get(ws.roomId);
          oldRoom.clients.delete(ws);
          if (oldRoom.clients.size === 0) rooms.delete(ws.roomId);
        }
        ws.roomId = roomId;

        if (!rooms.has(roomId)) {
          // First client in room – becomes initiator
          const clientMap = new Map();
          clientMap.set(ws, true); // true = initiator
          rooms.set(roomId, { clients: clientMap, initiatorAssigned: true });
          ws.send(JSON.stringify({ type: 'role', payload: { isInitiator: true } }));
          console.log(`Room ${roomId} created – first client is initiator`);
        } else {
          const room = rooms.get(roomId);
          // Assign responder role to new client
          room.clients.set(ws, false);
          ws.send(JSON.stringify({ type: 'role', payload: { isInitiator: false } }));
          console.log(`Client joined room ${roomId} as responder`);
          
          // Also send any stored offer to this new client (if any)
          // We'll store the last offer separately
          if (room.lastOffer) {
            ws.send(JSON.stringify({ type: 'signal', payload: room.lastOffer }));
            console.log(`Sent stored offer to responder`);
          }
        }
        break;

      case 'signal':
        if (!roomId || !payload) return;
        const room = rooms.get(roomId);
        if (!room) return;

        console.log('Received signal:', Object.keys(payload));
        
        // Store offer if this is an SDP offer
        if (payload.sdp && payload.sdp.type === 'offer') {
            room.lastOffer = payload;
            console.log(`Stored offer for room ${roomId}`);
        }

        // Forward signal to all other clients
        room.clients.forEach((_, client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'signal', payload }));
            console.log('Forwarded signal to another client');
            }
        });
        break;

      default:
        console.log('Unknown message type', type);
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      const room = rooms.get(ws.roomId);
      room.clients.delete(ws);
      if (room.clients.size === 0) {
        rooms.delete(ws.roomId);
        console.log(`Room ${ws.roomId} destroyed (empty)`);
      } else {
        console.log(`Client left room ${ws.roomId}, ${room.clients.size} remaining`);
      }
    }
  });
});

console.log('Signaling server running on ws://localhost:3002');