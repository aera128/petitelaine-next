# AGENTS.md — app/

Nuxt 4 frontend. Vue 3 + Pinia + TailwindCSS v4 + DaisyUI v5.

## STRUCTURE

```
app/
├── pages/
│   ├── index.vue          # Home: create room / join by code
│   └── room/[code].vue    # Main game UI (all phases in one component)
├── components/
│   ├── AlertModal.vue     # Global modal (kicks, errors, confirmations)
│   └── ThemeToggle.vue    # Light/dark toggle (caramellatte/halloween)
├── composables/
│   └── useGameSocket.ts   # Module-level WS singleton with auto-reconnect
├── stores/
│   └── game.ts            # Single Pinia store — all game state
├── layouts/
│   └── default.vue        # Shell: ThemeToggle, page slot
└── assets/css/
    └── main.css           # Tailwind entry + DaisyUI theme definitions
```

## KEY PATTERNS

### Auto-imports
All Nuxt/Vue composables are auto-imported. Never write:
```ts
import { ref, computed } from 'vue'          // ❌
import { useGameStore } from '~/stores/game' // ❌
```

### WebSocket Singleton
`useGameSocket` holds a **module-level** socket (shared across all component instances). Always call `gameStore.init()` in `onMounted` to (re)attach the `onMessage` handler — even if already connected.

```ts
onMounted(() => {
  gameStore.init() // always — re-attaches handler
  // ...
})
```

### Room Join Flow (Direct Link)
`room/[code].vue` handles direct URL access (`/room/XXXX`) without prior home page visit:
1. `onMounted` → `gameStore.init()` + `gameStore.checkRoom(code)`
2. Watch `gameStore.roomReady` (flips `true` on `ROOM_CHECK_OK`) → show join form
3. `handleDirectJoin` → `gameStore.joinRoom()` → wait for `GAME_STATE`

`isCheckingRoom` and `isJoining` are local loading states controlling UI.

### Pinia Store Shape
```ts
// State (read-only on client)
gameState: GameState | null   // null = not in a room
myId: string                  // own player ID (set on WELCOME)
roomReady: boolean            // ROOM_CHECK_OK received
roomError: string | null      // 'NOT_FOUND' or null
lastError: string | null      // 3s auto-clear
wasKicked: boolean            // triggers redirect

// Computed
me: Player | undefined        // own Player object from gameState.players
isHost: boolean               // me.isHost
```

### localStorage Keys
| Key | Value |
|-----|-------|
| `petitelaine-name` | Player display name |
| `petitelaine-avatar` | DiceBear seed string |

Load in `onMounted` only (not in setup body — SSR safety).

### Phase Rendering (room/[code].vue)
All game phases rendered in a single component with `v-if/v-else-if`:
```
gameState !== null
  └── phase === 'LOBBY'    → player grid + start button
  └── phase === 'WRITING'  → clue input
  └── phase === 'REVEAL'   → clue display grid
  └── phase === 'VOTING'   → vote buttons
  └── phase === 'ENDED'    → results + restart
gameState === null
  └── isCheckingRoom       → spinner
  └── else                 → join form
```

### Avatar URLs
```ts
`https://api.dicebear.com/9.x/dylan/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`
```

## ANTI-PATTERNS

- ❌ Mutating `gameStore.gameState` directly — server only
- ❌ Loading localStorage in setup body (use `onMounted`)
- ❌ Calling `gameStore.init()` conditionally — always call it
- ❌ Adding game logic in components — belongs in `gameManager.ts` (server)
- ❌ `npm`/`npx` — use `bun`/`bunx`

## COMMANDS

```bash
bun run dev      # start dev server
bun run build    # production build
```
