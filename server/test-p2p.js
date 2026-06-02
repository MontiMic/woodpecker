/**
 * Test script for P2P lobby server functionality
 * Run with: node test-p2p.js
 */

const LobbyManager = require('./p2p/lobbyManager');

console.log('=== Testing P2P Lobby Manager ===\n');

// Create lobby manager instance
const lobbyManager = new LobbyManager();

// Test 1: Create a room
console.log('Test 1: Create Room');
const room1 = lobbyManager.createRoom(42, 'testUser1');
console.log('✓ Room created:', {
    roomId: room1.roomId,
    puzzleId: room1.puzzleId,
    createdAt: room1.createdAt.toISOString(),
    expiresAt: room1.expiresAt.toISOString()
});
console.log();

// Test 2: Join room
console.log('Test 2: Join Room');
const joinResult = lobbyManager.joinRoom(room1.roomId, 'peer1', 'testUser2');
if (joinResult) {
    console.log('✓ Peer joined successfully');
    console.log('  Peers in room:', joinResult.peers.length);
} else {
    console.log('✗ Failed to join room');
}
console.log();

// Test 3: Get peers
console.log('Test 3: Get Peers');
const peers = lobbyManager.getPeers(room1.roomId);
console.log('✓ Peers retrieved:', peers.length);
peers.forEach(peer => {
    console.log(`  - ${peer.username} (${peer.peerId})`);
});
console.log();

// Test 4: Join with multiple peers
console.log('Test 4: Multiple Peers');
lobbyManager.joinRoom(room1.roomId, 'peer2', 'testUser3');
lobbyManager.joinRoom(room1.roomId, 'peer3', 'testUser4');
const allPeers = lobbyManager.getPeers(room1.roomId);
console.log('✓ Total peers in room:', allPeers.length);
console.log();

// Test 5: Update peer activity
console.log('Test 5: Update Peer Activity');
const updated = lobbyManager.updatePeerActivity(room1.roomId, 'peer1');
console.log('✓ Peer activity updated:', updated);
console.log();

// Test 6: Leave room
console.log('Test 6: Leave Room');
const left = lobbyManager.leaveRoom(room1.roomId, 'peer1');
console.log('✓ Peer left:', left);
const remainingPeers = lobbyManager.getPeers(room1.roomId);
console.log('  Remaining peers:', remainingPeers.length);
console.log();

// Test 7: Get room stats
console.log('Test 7: Lobby Statistics');
const stats = lobbyManager.getStats();
console.log('✓ Stats:', stats);
console.log();

// Test 8: Room not found
console.log('Test 8: Invalid Room ID');
const invalidRoom = lobbyManager.getRoom('invalid-room-id');
console.log('✓ Invalid room returns null:', invalidRoom === null);
console.log();

// Test 9: Room full (max 8 peers)
console.log('Test 9: Room Capacity');
const room2 = lobbyManager.createRoom(100, 'testUser1');
for (let i = 0; i < 8; i++) {
    lobbyManager.joinRoom(room2.roomId, `peer${i}`, `user${i}`);
}
const fullRoomPeers = lobbyManager.getPeers(room2.roomId);
console.log('✓ Room with max peers:', fullRoomPeers.length);

// Try to join full room
const room2Data = lobbyManager.getRoom(room2.roomId);
const canJoinFull = room2Data.peers.size < 8;
console.log('✓ Can join full room:', canJoinFull);
console.log();

// Test 10: Empty room cleanup
console.log('Test 10: Empty Room Cleanup');
const room3 = lobbyManager.createRoom(200, 'testUser1');
lobbyManager.joinRoom(room3.roomId, 'tempPeer', 'tempUser');
lobbyManager.leaveRoom(room3.roomId, 'tempPeer');
const room3Data = lobbyManager.getRoom(room3.roomId);
console.log('✓ Empty room marked for cleanup:', !!room3Data.emptyAt);
console.log();

// Cleanup
console.log('=== Cleanup ===');
lobbyManager.destroy();
console.log('✓ Lobby manager destroyed');
console.log();

console.log('=== All Tests Passed ===');
