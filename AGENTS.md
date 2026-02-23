# AGENTS.md — petitelaine

**Generated:** 2026-02-23 — Updated: 2026-02-23

## OVERVIEW

Nuxt 4 fullstack social deduction game (Undercover/Loup-Garou variant). Real-time multiplayer via native WebSocket (Nitro). No external game server — server is source of truth, client is read-only view.

## STRUCTURE

```
./
├── app/                  # Nuxt frontend (Vue 3, Pinia, TailwindCSS + DaisyUI)
│   ├── pages/            # File-based routing (index, room/[code])
│   ├── components/       # AlertModal, ThemeToggle
│   ├── composables/      # useGameSocket (WS connection singleton)
│   ├── stores/           # game.ts (Pinia — single store)
│   ├── layouts/          # default.vue
│   └── assets/css/       # main.css (Tailwind entry, DaisyUI themes)
├── server/
│   ├── routes/_ws.ts     # Nitro WebSocket handler (peer ↔ room mapping)
│   ├── utils/gameManager.ts  # GameEngine singleton (all game logic)
│   └── data/words.ts     # Word pairs for role assignment
├── types/game.d.ts       # Shared TypeScript types (GameState, Player, WsMessage)
├── nuxt.config.ts        # Modules: @pinia/nuxt, @nuxt/icon, tailwindcss/vite
├── package.json          # Scripts: dev, build, generate, preview
└── Dockerfile            # node:22-alpine production image
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add game message type | `types/game.d.ts` → `WsMessage` union, then `server/routes/_ws.ts` handler, then `app/stores/game.ts` receiver |
| Add game phase UI | `app/pages/room/[code].vue` — add `v-else-if="gameState.phase === 'NEW_PHASE'"` block |
| Change game rules | `server/utils/gameManager.ts` — GameEngine methods |
| Add word pairs | `server/data/words.ts` |
| Change themes | `app/assets/css/main.css` — DaisyUI theme config |
| Add store action | `app/stores/game.ts` → add `send()` call + export |
| Global UI components | `app/components/` + `app/layouts/default.vue` |

## COMMANDS

```bash
# ALWAYS use bun, never npm/npx
bun install          # install deps
bun run dev          # dev server (http://localhost:3000)
bun run build        # production build
bun run preview      # preview production build
```

## CONVENTIONS

- **Package manager: Bun** — `bun.lock` is the lock file. Never use `npm install` or `npx`.
- **Nuxt auto-imports** — `ref`, `computed`, `watch`, `onMounted`, `useRoute`, `useRouter`, `useGameStore`, `defineStore` are auto-imported. No manual imports needed in `app/`.
- **Server is source of truth** — client never mutates `gameState` directly. All mutations go through WebSocket messages → server → `broadcastState()` → client receives `GAME_STATE`.
- **TypeScript** — strict mode via Nuxt-generated tsconfig. Types shared via `types/game.d.ts`.
- **No linting** — no ESLint/Prettier configured.

## ANTI-PATTERNS

- ❌ `npm install` / `npx` → use `bun install` / `bunx`
- ❌ Mutating `gameState` directly on the client
- ❌ Adding game logic in Vue components — belongs in `gameManager.ts`
- ❌ Adding new state to the store without a corresponding server message handler
- ❌ Using `socket.value` directly outside `useGameSocket`

## DATA FLOW

```
User action (click)
  → gameStore.action() → send(WsMessage)
  → [WebSocket] → server/routes/_ws.ts
  → gameManager.method() → mutates GameState
  → broadcastState(roomCode)
  → getSanitizedState(code, playerId) per player
  → [WebSocket] → store onMessage handler
  → gameState.value = data.payload  ← only mutation point
  → Vue re-renders
```

## WEBSOCKET MESSAGE TYPES

| Client → Server | Purpose |
|----------------|---------|
| `CREATE_ROOM` | Create room, become host |
| `JOIN_ROOM` | Join existing room |
| `CHECK_ROOM` | Validate room exists (→ `ROOM_CHECK_OK` / `ROOM_CHECK_FAIL`) |
| `START_GAME` | Host only — begin game |
| `SUBMIT_CLUE` | Submit word for round |
| `VOTE_PLAYER` | Cast elimination vote |
| `PROPOSE_VOTE` | Request majority vote trigger |
| `START_VOTE` | Host force-start voting |
| `NEXT_ROUND` | Host advance to next round |
| `KICK_PLAYER` | Host remove player |
| `UPDATE_SETTINGS` | Host change game settings |
| `RESTART` | Host return to lobby |

| Server → Client | Purpose |
|----------------|---------|
| `GAME_STATE` | Full sanitized state update |
| `WELCOME` | Assigns `myId` to connecting player |
| `KICKED` | Player was removed |
| `ERROR` | Action failed (auto-clears 3s) |
| `ROOM_CHECK_OK` | Room exists and is joinable |
| `ROOM_CHECK_FAIL` | Room not found |
