// Nuxt auto-imports: defineStore, ref, computed, useGameSocket
import type { GameState, WsMessage } from '../../types/game';

export const useGameStore = defineStore('game', () => {
  const { connect, send, isConnected, close } = useGameSocket();
  const gameState = ref<GameState | null>(null);
  const myId = ref<string>('');
  const roomError = ref<string | null>(null);
  const lastError = ref<string | null>(null);
  const wasKicked = ref<boolean>(false);

  const init = () => {
    connect((data: any) => {
      if (data.type === 'GAME_STATE') {
        gameState.value = data.payload;
      }
      if (data.type === 'WELCOME') {
        myId.value = data.payload.id;
      }
      if (data.type === 'ERROR') {
        lastError.value = data.payload;
        // Auto-clear after display
        setTimeout(() => { lastError.value = null; }, 3000);
      }
      if (data.type === 'KICKED') {
        // Set kicked flag (component watches this)
        wasKicked.value = true;
        gameState.value = null;
        myId.value = '';
      }
      if (data.type === 'ROOM_CHECK_FAIL') {
          roomError.value = 'NOT_FOUND';
      }
      if (data.type === 'ROOM_CHECK_OK') {
          roomError.value = null;
      }
    });
  };

  const createRoom = (name: string, avatar: string) => {
    send({
      type: 'CREATE_ROOM',
      payload: { name, avatar }
    } as WsMessage);
  };

  const joinRoom = (code: string, name: string, avatar: string) => {
    send({
      type: 'JOIN_ROOM',
      payload: { code, name, avatar }
    } as WsMessage);
  };
  
  const leaveRoom = () => {
      if (close) close();
      gameState.value = null;
      myId.value = '';
  }

  const startGame = () => {
    send({ type: 'START_GAME' } as WsMessage);
  };

  const submitClue = (code: string, word: string) => {
    send({
      type: 'SUBMIT_CLUE',
      payload: { code, word }
    } as WsMessage);
  };

  const voteFor = (code: string, targetId: string) => {
    send({
      type: 'VOTE_PLAYER',
      payload: { code, targetId }
    } as WsMessage);
  };
    
  const startVote = () => {
     send({ type: 'START_VOTE' } as WsMessage)
  }
  
  const updateSettings = (code: string, settings: any) => {
      send({
          type: 'UPDATE_SETTINGS',
          payload: { code, settings }
      } as WsMessage);
  }
  
  const kickPlayer = (code: string, targetId: string) => {
      send({
          type: 'KICK_PLAYER',
          payload: { code, targetId }
      } as WsMessage);
  }

  const nextRound = () => {
      send({ type: 'NEXT_ROUND' } as WsMessage);
  }

  const proposeVote = () => {
      send({ type: 'PROPOSE_VOTE' } as WsMessage);
  }

  const restartGame = () => {
      send({ type: 'RESTART' } as WsMessage);
  }

  const checkRoom = (code: string) => {
      send({
          type: 'CHECK_ROOM',
          payload: { code }
      } as WsMessage);
  }

  // Getters
  const me = computed(() => gameState.value?.players.find(p => p.id === myId.value));
  const isHost = computed(() => me.value?.isHost ?? false);

  return {
    gameState,
    isConnected,
    myId,
    init,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitClue,
    voteFor,
    startVote,
    updateSettings,
    kickPlayer,
    checkRoom,
    // getters
    me,
    isHost,
    roomError,
    lastError,
    wasKicked,
    nextRound,
    proposeVote,
    restartGame
  };
});
