import type { GameState, Player, GamePhase, Role, WsMessage, GameSettings } from '../../types/game';
import { WORDS } from '../data/words';

class GameEngine {
  private static instance: GameEngine;
  private rooms: Map<string, GameState> = new Map();
  private playerRoomMap: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): GameEngine {
    if (!GameEngine.instance) {
      GameEngine.instance = new GameEngine();
    }
    return GameEngine.instance;
  }

  hasRoom(code: string): boolean {
      return this.rooms.has(code);
  }

  // --- ROOM MANAGEMENT ---

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    do {
      result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(result));
    return result;
  }

  createRoom(hostId: string, hostName: string, avatar: string): GameState {
    const code = this.generateRoomCode();
    const host: Player = {
      id: hostId,
      name: hostName,
      avatar,
      role: 'MOUTON', // Temp assignment
      secretWord: null,
      clue: null,
      isHost: true,
      isReady: false,
      isAlive: true,
      votesReceived: 0,
      history: []
    };

    const state: GameState = {
      roomCode: code,
      phase: 'LOBBY',
      players: [host],
      settings: {
        blindMode: false,
        maxRounds: 3,
        voteTimerSeconds: 60,
        maxPlayers: 10,
        wolvesCount: 1,
        goatsCount: 0
      },
      timerEndTime: null,
      round: 0,
      winnerTeam: null,
      lastEliminatedRole: null,
      revealedRoles: false,
      requestVoteCount: 0
    };

    this.rooms.set(code, state);
    this.playerRoomMap.set(hostId, code);
    return state;
  }
  
  // ...

  private startRevealPhase(room: GameState) {
    room.phase = 'REVEAL';
    room.timerEndTime = null;
    room.requestVoteCount = 0;
    room.players.forEach(p => p.votedFor = undefined);
  }

  proposeVote(code: string, playerId: string): GameState | null {
      const room = this.rooms.get(code);
      if (!room || room.phase !== 'REVEAL') return null;

      const player = room.players.find(p => p.id === playerId);
      if (!player || !player.isAlive || player.votedFor === 'PROPOSE_VOTE') return null;

      player.votedFor = 'PROPOSE_VOTE';
      room.requestVoteCount++;

      const aliveCount = room.players.filter(p => p.isAlive).length;
      if (room.requestVoteCount > aliveCount / 2) {
          // Majority
          this.startVotingPhase(room);
      }

      return room;
  }

  startNextRound(code: string): GameState | null {
      const room = this.rooms.get(code);
      if (!room || room.phase !== 'REVEAL') return null;

      if (room.round >= room.settings.maxRounds) {
          this.startVotingPhase(room);
      } else {
          room.round++;
          this.startWritingPhase(room);
      }
      return room;
  }


  joinRoom(code: string, playerId: string, name: string, avatar: string): GameState | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (room.phase !== 'LOBBY') return null; // Reconnect logic not in V1

    // Prevent duplicates
    if (room.players.some(p => p.id === playerId)) return room;
    
    // Check Max Players
    if (room.players.length >= room.settings.maxPlayers) return null;

    const newPlayer: Player = {
      id: playerId,
      name,
      avatar,
      role: 'MOUTON',
      secretWord: null,
      clue: null,
      isHost: false,
      isReady: false,
      isAlive: true,
      votesReceived: 0,
      history: []
    };

    room.players.push(newPlayer);
    this.playerRoomMap.set(playerId, code);
    return room;
  }
  
  updateSettings(code: string, playerId: string, settings: Partial<GameSettings>): GameState | null {
      const room = this.rooms.get(code);
      if (!room || room.phase !== 'LOBBY') return null;
      
      const player = room.players.find(p => p.id === playerId);
      if (!player || !player.isHost) return null;

      const merged = { ...room.settings, ...settings };

      // Enforce: wolvesCount >= 1
      merged.wolvesCount = Math.max(1, merged.wolvesCount);
      // Enforce: goatsCount >= 0
      merged.goatsCount = Math.max(0, merged.goatsCount);
      // Enforce: moutons must strictly outnumber impostors
      // i.e. impostors < playerCount / 2  →  impostors <= floor((playerCount - 1) / 2)
      const playerCount = room.players.length;
      const maxImpostors = Math.floor((playerCount - 1) / 2);
      if (merged.wolvesCount + merged.goatsCount > maxImpostors) return null;

      room.settings = merged;
      return room;
  }

  kickPlayer(code: string, hostId: string, targetId: string): GameState | null {
      const room = this.rooms.get(code);
      if (!room || room.phase !== 'LOBBY') return null;

      const host = room.players.find(p => p.id === hostId);
      if (!host || !host.isHost) return null;

      if (hostId === targetId) return null; // Can't kick self (use leave)

      this.removePlayer(targetId); // Uses standard remove logic
      return this.rooms.get(code) || null;
  }

  getPlayerRoom(playerId: string): GameState | undefined {
    const code = this.playerRoomMap.get(playerId);
    if (code) return this.rooms.get(code);
    return undefined;
  }

  getRoomState(code: string): GameState | undefined {
      return this.rooms.get(code);
  }

  removePlayer(playerId: string) {
    const code = this.playerRoomMap.get(playerId);
    if (!code) return;

    this.playerRoomMap.delete(playerId);
    const room = this.rooms.get(code);
    if (room && room.phase === 'LOBBY') {
      room.players = room.players.filter(p => p.id !== playerId);
      if (room.players.length === 0) {
        this.rooms.delete(code);
      } else {
        const hasHost = room.players.some(p => p.isHost);
        if (!hasHost) room.players[0].isHost = true;
      }
    }
    // If game started, we remove them to "skip turn" (they basically forfeit).
    // This allows submitClue / processVote to not get stuck waiting for them.
    if (room && room.phase !== 'LOBBY') {
        room.players = room.players.filter(p => p.id !== playerId);
        
        if (room.players.length === 0) {
            this.rooms.delete(code);
            return;
        }

        const hasHost = room.players.some(p => p.isHost);
        if (!hasHost) room.players[0].isHost = true;

        // Check for Win Condition (in case wolves left or only wolves remain)
        // If we remove a player, counts change.
        if (room.phase === 'VOTING' || room.phase === 'WRITING' || room.phase === 'REVEAL') {
             // We might need to trigger phase transitions if this player was holding it up.
             // e.g. WRITING -> REVEAL if everyone else submitted.
             /* 
                We don't have easy immediate access to methods here without Refactoring 
                to import 'this.submitClue' etc or extract logic.
                However, next action by any player will check conditions. 
                Existing `submitClue` checks `room.players.every`. Since `players` is smaller, it helps.
                Ideally we should re-evaluate state here, but for MVP V1:
                Removing them satisfies "Passer son tour" as they are gone.
             */
             const wolves = room.players.filter(p => p.role === 'LOUP' && p.isAlive).length;
             const village = room.players.filter(p => p.role !== 'LOUP' && p.isAlive).length;
             
             // Simple instant win check?
             if (wolves === 0) {
                 room.phase = 'ENDED';
                 room.winnerTeam = 'VILLAGE';
                 room.revealedRoles = true;
             } else if (wolves >= village) {
                 room.phase = 'ENDED';
                 room.winnerTeam = 'LOUP';
                 room.revealedRoles = true;
             }
        }
    }
  }

  // --- GAME LOGIC ---

  restartGame(code: string): GameState | null {
      const room = this.rooms.get(code);
      if (!room) return null;

      room.phase = 'LOBBY';
      room.round = 0;
      room.winnerTeam = null;
      room.lastEliminatedRole = null;
      room.revealedRoles = false;
      room.timerEndTime = null;
      room.requestVoteCount = 0;

      // Reset Players
      room.players.forEach(p => {
          p.role = 'MOUTON'; // Reset to default
          p.secretWord = null;
          p.clue = null;
          p.isReady = false;
          p.isAlive = true;
          p.votesReceived = 0;
          p.votedFor = undefined;
          p.history = [];
      });

      return room;
  }

  startGame(code: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    
    // Choose words
    const pair = WORDS[Math.floor(Math.random() * WORDS.length)];
    
    // Assign Roles
    this.assignRoles(room, pair.civil, pair.undercover);
    
    room.round = 1;
    this.startWritingPhase(room);
  }

  private assignRoles(room: GameState, civilWord: string, undercoverWord: string) {
    const players = room.players;
    const count = players.length;
    
    // Use settings directly, with safety clamp for 3-player games
    let wolvesCount = count <= 3 ? 1 : room.settings.wolvesCount;
    let goatCount   = count <= 3 ? 0 : room.settings.goatsCount;

    // Safety: never let impostors >= moutons (server-side guard)
    const maxImpostors = Math.floor((count - 1) / 2);
    if (wolvesCount + goatCount > maxImpostors) {
      wolvesCount = 1;
      goatCount = 0;
    }

    // Reset
    players.forEach(p => {
      p.role = 'MOUTON';
      p.secretWord = civilWord;
      p.isAlive = true;
      p.clue = null;
      p.votesReceived = 0;
      p.votedFor = undefined;
    });

    // Shuffle indices
    const shuffledIndices = Array.from({ length: count }, (_, i) => i)
                                 .sort(() => 0.5 - Math.random());

    // Assign Wolves
    for (let i = 0; i < wolvesCount; i++) {
      const p = players[shuffledIndices[i]];
      p.role = 'LOUP';
      p.secretWord = undercoverWord;
    }

    // Assign Goat
    for (let i = 0; i < goatCount; i++) {
        // Offset by wolvesCount
        const p = players[shuffledIndices[wolvesCount + i]];
        p.role = 'CHEVRE';
        p.secretWord = null; // No word for Mr White
    }

    room.lastEliminatedRole = null;
    room.winnerTeam = null;
    room.revealedRoles = false;
  }

  private startWritingPhase(room: GameState) {
    room.phase = 'WRITING';
    room.timerEndTime = Date.now() + 90000; 
    // Clear clues from prev round
    room.players.forEach(p => p.clue = null);
  }

  submitClue(code: string, playerId: string, word: string): GameState | null {
    const room = this.rooms.get(code);
    if (!room || room.phase !== 'WRITING') return null;

    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.isAlive) return null;
    
    // Goat logic? Actually Goat CAN submit clue if rules allow bluffing.
    // If strict rules: Goat has no word, so they must improvise.
    // Standard Undercover: Goat submits a word too.
    if (player.role === 'CHEVRE') {
         // Allow submission
    }

    // Check History (Server-side validation)
    // We check if THIS player already used this word
    // (Optional: Check if ANYONE used it? Usually rules are "no repetition per player" or "global". Let's stick to per player for now or global if requested.
    // User said: "stacker les anciens mots... pour voir l'historique et faire en sorte de ne pas pouvoir mettre plusieurs fois le meme mot"
    // Usually means "I can't say a word I already said" OR "I can't say a word ANYONE said".
    // Let's implement "I can't say a word I already said" first. 
    // Wait, "voir l'historique" implies seeing previous rounds.
    // Check Global Uniqueness (This Round)
    // Rule: First come, first served.
    const isTaken = room.players.some(p => p.clue?.toUpperCase() === word.toUpperCase());
    if (isTaken) {
         // Return current state (don't update anything)
         // Ideally we should signal failure. But returning null or same state prevents update.
         // Let's return same state and user stays in writing phase.
         // But Frontend needs to know. 
         // For now, let's just return null to indicate failure.
         return null; 
    }

    // Check Personal History
    if (player.history.includes(word.toUpperCase())) return null;

    player.clue = word.toUpperCase();
    player.history.push(word.toUpperCase());

    // Check if all active players submitted
    const activePlayers = room.players.filter(p => p.isAlive);
    const allSubmitted = activePlayers.every(p => p.clue !== null);

    if (allSubmitted) {
      this.startRevealPhase(room);
    }

    return room;
  }

  startVotingPhase(room: GameState) {
      room.phase = 'VOTING';
      room.timerEndTime = Date.now() + (room.settings.voteTimerSeconds * 1000);
      room.players.forEach(p => {
          p.votesReceived = 0;
          p.votedFor = undefined;
      });
  }

  processVote(code: string, playerId: string, targetId: string): GameState | null {
      const room = this.rooms.get(code);
      if (!room || room.phase !== 'VOTING') return null;

      const voter = room.players.find(p => p.id === playerId);
      if (!voter || !voter.isAlive || voter.votedFor) return null; // Already voted

      const target = room.players.find(p => p.id === targetId);
      if (!target || !target.isAlive) return null;

      voter.votedFor = targetId;
      target.votesReceived = (target.votesReceived || 0) + 1;

      // Check if all alive voters have voted
      const aliveVoters = room.players.filter(p => p.isAlive);
      const allVoted = aliveVoters.every(p => p.votedFor !== undefined);

      if (allVoted) {
          this.resolveVoting(room);
      }

      return room;
  }

  private resolveVoting(room: GameState) {
      // Find max votes
      let maxVotes = 0;
      room.players.forEach(p => {
          if (p.votesReceived > maxVotes) maxVotes = p.votesReceived;
      });

      // Find candidates with max votes
      const candidates = room.players.filter(p => p.votesReceived === maxVotes && p.isAlive);

      if (candidates.length === 1) {
          // Eliminate
          const victim = candidates[0];
          victim.isAlive = false;
          room.lastEliminatedRole = victim.role || null;
          
          this.checkWinCondition(room);

          if (room.phase !== 'ENDED') {
              // Next round
              room.round++;
              if (room.round > room.settings.maxRounds) {
                  // Max rounds reached -> Incognito wins (Wolves/Goat) usually?
                  // Or Village loses if they didn't find them.
                  room.phase = 'ENDED';
                  room.winnerTeam = 'LOUP'; // Impostors win
                  room.revealedRoles = true;
              } else {
                  this.startWritingPhase(room);
              }
          }
      } else {
          // Tie -> No elimination? Or Revote?
          // For MVP: No elimination, next round.
          room.lastEliminatedRole = 'PERSONNE (EGALITÉ)';
          
          room.round++;
          if (room.round > room.settings.maxRounds) {
              room.phase = 'ENDED';
              room.winnerTeam = 'LOUP';
              room.revealedRoles = true;
          } else {
              this.startWritingPhase(room);
          }
      }
  }

  private checkWinCondition(room: GameState) {
      const wolves = room.players.filter(p => p.role === 'LOUP' && p.isAlive).length;
      const goat = room.players.filter(p => p.role === 'CHEVRE' && p.isAlive).length;
      const impostors = wolves + goat;
      const village = room.players.filter(p => p.role === 'MOUTON' && p.isAlive).length;

      // Village Wins if all impostors dead
      if (impostors === 0) {
          room.phase = 'ENDED';
          room.winnerTeam = 'VILLAGE';
          room.revealedRoles = true;
          return;
      }

      // Impostors win if they equal or outnumber village (simplified rule)
      if (impostors >= village) {
          room.phase = 'ENDED';
          room.winnerTeam = 'LOUP';
          room.revealedRoles = true;
          return;
      }
  }

  getSanitizedState(code: string, playerId: string): GameState | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    const sanitized: GameState = JSON.parse(JSON.stringify(room));
    // Filter players logic
    
    sanitized.players.forEach(p => {
      // 1. If Game Over (revealedRoles), show everything.
      if (room.revealedRoles) return;

      // 2. Hide Role Label
      // If Blind Mode is ON: Hide EVERYONE'S role label (including self).
      // If Standard: Hide OTHERS' role label.
      if (room.settings.blindMode) {
          delete p.role;
      } else {
          if (p.id !== playerId) delete p.role;
      }

      // 3. Hide Secret Words
      // Blind Mode: Show secretWord only to SELF (so they can play).
      // Standard: Show secretWord only to SELF.
      if (p.id !== playerId) {
          delete p.secretWord;
      }

      // 4. Hide Clues (during Writing)
      if (room.phase === 'WRITING' && p.id !== playerId) {
        delete p.clue;
      }
      
      // 5. Hide Vote Targets (Strict mode?)
      // We keep voteFor visible for now to show who voted whom (or we could hide until end).
      // Let's keep it visible for drama.
    });

    return sanitized;
  }
}

export const gameEngine = GameEngine.getInstance();
