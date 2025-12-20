import { gameEngine as gameManager } from '../utils/gameManager';
// import type { Peer } from 'nitro/types';


// Map Peer Object (reference) -> Player Info
const clients = new WeakMap<any, { code: string; playerId: string }>();
// Map Player ID -> Peer (For targeted updates)
const playerPeers = new Map<string, any>();

// Helper to broadcast personalized state to all players in a room
const broadcastState = (roomCode: string) => {
    const room = gameManager.getRoomState(roomCode);
    if (!room) return;

    room.players.forEach(p => {
        const peer = playerPeers.get(p.id);
        if (peer) {
            // We can check if peer is still open/valid if needed
            // But Map should be kept in sync.
            try {
                peer.send(JSON.stringify({
                    type: 'GAME_STATE',
                    payload: gameManager.getSanitizedState(roomCode, p.id)
                }));
            } catch (e) {
                console.warn(`[WS] Failed to send state to ${p.id}`, e);
            }
        }
    });
};

export default defineWebSocketHandler({
  open(peer) {
    console.log('[WS] Connected', peer.id);
    // map peer.id as distinct connection ID, but we map playerID later.
  },

  async message(peer, message) {
    const text = message.text();
    if (!text) return;

    try {
      const data = JSON.parse(text);
      const { type, payload } = data;

      if (type === 'CREATE_ROOM') {
        const { name, avatar } = payload;
        const state = gameManager.createRoom(peer.id, name, avatar);
        
        const host = state.players.find(p => p.isHost);
        if (host) {
             clients.set(peer, { code: state.roomCode, playerId: host.id });
             playerPeers.set(host.id, peer);
        }

        peer.subscribe(state.roomCode);
        broadcastState(state.roomCode);
        peer.send(JSON.stringify({
           type: 'WELCOME',
           payload: { id: host?.id }
        }));
      }

      else if (type === 'JOIN_ROOM') {
        const { code, name, avatar } = payload;
        const normalizedCode = code.toUpperCase();
        
        const state = gameManager.joinRoom(normalizedCode, peer.id, name, avatar);
        
        if (state) {
          clients.set(peer, { code: normalizedCode, playerId: peer.id });
          playerPeers.set(peer.id, peer);
          peer.subscribe(normalizedCode);
          
          broadcastState(normalizedCode);
          
          peer.send(JSON.stringify({
             type: 'WELCOME',
             payload: { id: peer.id }
          }));
        } else {
          peer.send(JSON.stringify({ type: 'ERROR', payload: 'Room not found or full' }));
        }
      }
      
      else if (type === 'UPDATE_SETTINGS') {
        const { code, settings } = payload;
        const roomState = gameManager.updateSettings(code, peer.id, settings);
        if (roomState) broadcastState(code);
      }

      else if (type === 'KICK_PLAYER') {
        const { code, targetId } = payload;
        
        // Get target's peer BEFORE removing them
        const targetPeer = playerPeers.get(targetId);
        
        const roomState = gameManager.kickPlayer(code, peer.id, targetId);
        if (roomState) {
            // Notify the kicked player FIRST
            if (targetPeer) {
                targetPeer.send(JSON.stringify({ type: 'KICKED' }));
                // Clean up their maps
                playerPeers.delete(targetId);
                // clients cleanup happens on their close event
            }
            broadcastState(code);
        }
      }

      else if (type === 'START_GAME') {
        const room = gameManager.getPlayerRoom(peer.id);
        if (room && room.players.find(p => p.id === peer.id)?.isHost) {
          gameManager.startGame(room.roomCode);
          broadcastState(room.roomCode);
        }
      }

      else if (type === 'SUBMIT_CLUE') {
        const { code, word } = payload;
        const roomState = gameManager.submitClue(code, peer.id, word);
        if (roomState) {
            broadcastState(code);
        } else {
            // Signal error (Duplicate word or invalid)
            peer.send(JSON.stringify({ type: 'ERROR', payload: 'Mot invalide ou déjà utilisé !' }));
        }
      }

      else if (type === 'VOTE_PLAYER') {
        const { code, targetId } = payload;
        const roomState = gameManager.processVote(code, peer.id, targetId);
        if (roomState) broadcastState(code);
      }
      
      else if (type === 'NEXT_ROUND') {
         const room = gameManager.getPlayerRoom(peer.id);
         if (room && room.players.find(p => p.id === peer.id)?.isHost && room.phase === 'REVEAL') {
            gameManager.startNextRound(room.roomCode);
            broadcastState(room.roomCode);
         }
      }

      else if (type === 'PROPOSE_VOTE') {
         const room = gameManager.getPlayerRoom(peer.id);
         if (room && room.phase === 'REVEAL') {
             gameManager.proposeVote(room.roomCode, peer.id);
             broadcastState(room.roomCode);
         }
      }

      else if (type === 'START_VOTE') {
         const room = gameManager.getPlayerRoom(peer.id);
         if (room && room.players.find(p => p.id === peer.id)?.isHost) {
            gameManager.startVotingPhase(room);
            broadcastState(room.roomCode);
         }
      }

      else if (type === 'RESTART') {
         const room = gameManager.getPlayerRoom(peer.id);
         if (room && room.players.find(p => p.id === peer.id)?.isHost) {
            const newState = gameManager.restartGame(room.roomCode);
            if (newState) broadcastState(room.roomCode);
         }
      }

      else if (type === 'CHECK_ROOM') {
         const { code } = payload;
         if (!gameManager.hasRoom(code)) {
             peer.send(JSON.stringify({ type: 'ROOM_CHECK_FAIL' }));
         } else {
             peer.send(JSON.stringify({ type: 'ROOM_CHECK_OK' }));
         }
      }

    } catch (e) {
      console.error('[WS] Error processing message', e);
    }
  },

  close(peer) {
    console.log('[WS] Closed', peer.id);
    const info = clients.get(peer);
    if (info) {
        console.log('[WS] Removing player', info.playerId, 'from room', info.code);
        
        // Remove from Maps
        clients.delete(peer);
        playerPeers.delete(info.playerId);

        gameManager.removePlayer(info.playerId);
        
        const room = gameManager.getRoomState(info.code);
        if (room) {
             broadcastState(info.code);
        }
    }
  },
});
