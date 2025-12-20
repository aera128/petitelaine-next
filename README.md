# Petitelaine

Jeu social de déduction en ligne, **copie assumée d’Undercove/Undercover**… mais avec un **lexique fermier**.

Dans **Petitelaine**, tout le monde fait partie du troupeau… sauf qu’il y a des **Loups** (les undercover) et parfois une **Chèvre** (le “Mr White” : pas de mot, que du bluff). Le but est simple : faire une partie rapide, drôle, et pleine d’accusations, directement dans le navigateur.

> Note : projet “fan remake”/clone non affilié à un éditeur. Les noms et l’habillage ont été adaptés en version ferme.

---

## Aperçu du gameplay

### Rôles

- **Mouton** : le “civil” (a le mot civil)
- **Loup** : l’undercover (a un mot proche, différent)
- **Chèvre** : variante “Mr White” (n’a **pas** de mot, doit improviser et tenter de deviner)

### Phases d’une partie

1. **Lobby**
   - Création/rejoindre une salle via code (8 caractères)
   - L’hôte peut régler quelques paramètres
   - Minimum **3 joueurs**

2. **WRITING (Écriture)**
   - Chaque joueur vivant envoie **un mot indice** (en majuscules)
   - Les indices sont **uniques** (pas le droit de prendre un mot déjà pris ce round)
   - Un joueur ne peut pas **réutiliser un mot** déjà joué dans son historique

3. **REVEAL (Récolte)**
   - Tous les indices s’affichent
   - Chacun peut cliquer “Demander le vote”
   - Si **la majorité** des joueurs vivants le demande, on passe au vote
   - L’hôte peut aussi forcer le round suivant / le vote final selon le nombre de rounds

4. **VOTING (Vote)**
   - Vote pour éliminer un joueur
   - En cas d’égalité : personne n’est éliminé (et on passe au round suivant)

5. **ENDED (Fin)**
   - Affichage des rôles + des mots

### Conditions de victoire (logique actuelle)

- **Village (Moutons)** gagne si **tous les imposteurs** sont éliminés (Loups + Chèvre)
- **Imposteurs** gagnent si (Loups + Chèvre) **≥** Moutons vivants
- Si le **nombre maximum de rounds** est dépassé sans victoire du village : victoire imposteurs

---

## Paramètres de partie

Disponibles dans le lobby (hôte) :

- `blindMode` : masque les rôles (même le tien) — tu ne vois que ton mot
- `voteTimerSeconds` : durée du vote (30–180s)
- `maxRounds` : nombre de rounds avant vote final (3–10)

---

## Fonctionnalités

- Rooms temps réel via WebSocket (Nitro)
- Avatars générés (DiceBear)
- Historique des mots par joueur, visible pendant la récolte et le vote
- Anti-duplication des indices :
  - pas deux fois le même mot dans le même round
  - pas deux fois le même mot pour un même joueur (historique)
- Expulsion de joueurs dans le lobby (hôte)

---

## Stack technique

- **Nuxt 4** (Vue 3)
- **Pinia** (store)
- **Nitro WebSocket** (`server/routes/_ws.ts`)
- **TailwindCSS v4** + **daisyUI**

---

## Prérequis

- Node.js récent (ou **Bun**)

---

## Installation

```bash
# avec bun
bun install

# ou npm
npm install
```

## Lancer en dev

Serveur de dev sur `http://localhost:3000` :

```bash
# bun
bun run dev

# npm
npm run dev
```

## Build & preview

```bash
# build
bun run build
# ou: npm run build

# preview
bun run preview
# ou: npm run preview
```

---

## Lexique fermier (traduction Undercover)

- **Civil** → **Mouton**
- **Undercover** → **Loup**
- **Mr White** → **Chèvre**
- “Révélation des mots” → **Récolte**

---

## Structure rapide du projet

- `app/pages/index.vue` : création/rejoindre
- `app/pages/room/[code].vue` : UI de partie (phases)
- `app/stores/game.ts` : store client (messages WS)
- `server/routes/_ws.ts` : handler WebSocket
- `server/utils/gameManager.ts` : moteur de jeu (règles)
- `server/data/words.ts` : paires de mots (civil / undercover)

---

## Idées d’améliorations (si tu veux aller plus loin)

- Reconnexion en cours de partie
- Mode “votes cachés” jusqu’à la fin
- Packs de mots thématiques “ferme” uniquement (actuellement mix généraliste)
- Équilibrage configurable (nombre de loups/chèvre selon joueurs)
