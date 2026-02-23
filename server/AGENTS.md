# AGENTS.md — server/

Nitro server (Nuxt's built-in). Handles WebSocket connections and all game logic.

## STRUCTURE

```
server/
├── routes/
│   └── _ws.ts         # Nitro WebSocket handler — peer lifecycle + message routing
├── utils/
│   └── gameManager.ts # GameEngine singleton — all game rules and state
└── data/
    └── words.ts       # Word pairs [{civil, undercover}] for role assignment
```

## GAMEENGINE (`gameManager.ts`)

Singleton via `GameEngine.getInstance()`. Exported as `gameEngine`.

```ts
import { gameEngine as gameManager } from '../utils/gameManager';
```

### Peer Mapping (_ws.ts)
Two maps maintained in `_ws.ts` module scope:
```ts
const clients = new WeakMap<any, { code: string; playerId: string }>();
const playerPeers = new Map<string, any>();
```
- `clients`: peer object → `{code, playerId}` (used on `close()`)
- `playerPeers`: playerId → peer (used for targeted sends)

### Game Phases (state machine)
```
LOBBY → WRITING → REVEAL → VOTING → ENDED
                    ↑_________________________|  (next round, if not ENDED)
```
Transitions are **automatic** (triggered inside GameEngine, not from _ws.ts):
- All players submit clue → `startRevealPhase()`
- Majority vote `PROPOSE_VOTE` OR host `START_VOTE` → `startVotingPhase()`
- All alive players vote → `resolveVoting()` → next WRITING or ENDED

### Role Assignment
```ts
// Count rules (players → wolves, goat)
3 players:   1 wolf, 0 goat
4-5 players: 1 wolf, 1 goat
6+ players:  2 wolves, 1 goat

// Words
wolf → undercoverWord
goat → null (no word)
sheep → civilWord
```

### State Sanitization
`getSanitizedState(code, playerId)` called per-player before broadcast:
- **Role**: hidden for others (blind mode: hidden for everyone)
- **secretWord**: hidden for others
- **clue**: hidden during WRITING phase (own clue visible)
- **All revealed** when `revealedRoles === true` (ENDED phase)

### Adding a New Game Action
1. Add message type to `types/game.d.ts` → `WsMessage` union
2. Handle in `_ws.ts` → `message()` handler:
   ```ts
   else if (type === 'MY_ACTION') {
     const result = gameManager.myMethod(payload);
     if (result) broadcastState(result.roomCode);
   }
   ```
3. Add method to `GameEngine` class in `gameManager.ts`
4. Add `send()` call + store action in `app/stores/game.ts`

### broadcastState
Always call after any mutation:
```ts
const broadcastState = (roomCode: string) => {
  // sends getSanitizedState per player via playerPeers map
};
```

### Player Disconnection
`close(peer)` handler:
- LOBBY: removes player, deletes empty rooms, transfers host
- In-game: removes player, immediately checks win condition

## ADDING WORD PAIRS

```ts
// server/data/words.ts
export const WORDS = [
  { civil: 'Chat', undercover: 'Chien' },
  // add here...
];
```

## ANTI-PATTERNS

- ❌ Calling `broadcastState` without checking if room exists
- ❌ Mutating `room` outside GameEngine methods
- ❌ Trusting client-provided `peer.id` as playerId without mapping — `peer.id` IS the playerId for JOIN, but host uses `host.id` from GameEngine
- ❌ Adding game rules in `_ws.ts` — belongs in `gameManager.ts`
- ❌ `npm`/`npx` — use `bun`/`bunx`
