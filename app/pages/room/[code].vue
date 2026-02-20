<template>
  <!-- Global Alert Modal (outside gameState to handle kicks) -->
  <AlertModal 
    v-if="alertModal" 
    :title="alertModal.title" 
    :message="alertModal.message" 
    :type="alertModal.type" 
    @close="closeAlert" 
  />

  <div v-if="gameState" class="w-full max-w-4xl flex flex-col items-center gap-4 h-full">
    
    <!-- Error Toast -->
    <div v-if="gameStore.lastError" class="toast toast-top toast-center z-50">
      <div class="alert alert-error shadow-lg animate-pop-in">
        <Icon name="lucide:alert-triangle" class="w-6 h-6" />
        <span>{{ gameStore.lastError }}</span>
      </div>
    </div>
    
    <!-- Bottom Bar: Info (fixed at bottom) -->
    <div class="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-base-300/80 p-2 rounded-full backdrop-blur-md z-50 shadow-lg">
      <div 
        class="badge badge-lg badge-primary font-mono text-xl p-4 shadow-sm border-2 border-primary-content/20 cursor-pointer transition-all blur-sm hover:blur-none"
        @click="copyRoomCode"
        title="Cliquer pour copier"
      >{{ gameState.roomCode }}</div>
      <div v-if="gameState.timerEndTime && gameState.phase === 'VOTING'" class="badge badge-lg badge-secondary font-mono animate-pulse shadow-sm border-2 border-secondary-content/20 gap-2">
        <Icon name="lucide:timer" class="w-5 h-5" />
        {{ timeLeft }}s
      </div>
      <div class="badge badge-lg badge-outline bg-base-100 font-bold uppercase tracking-widest text-sm p-4 whitespace-nowrap">{{ gameState.phase }} - Round {{ gameState.round }}</div>
      <button v-if="gameState.phase === 'LOBBY'" class="btn btn-ghost btn-circle" onclick="settings_modal.showModal()">
        <Icon :name="isHost ? 'lucide:settings' : 'lucide:info'" class="w-7 h-7" />
      </button>
    </div>

    <!-- SETTINGS MODAL (Host) -->
    <dialog id="settings_modal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Paramètres de la Partie</h3>
        
        <div class="form-control">
          <label class="label cursor-pointer">
            <span class="label-text font-bold flex items-center gap-2"><Icon name="lucide:eye-off" class="w-5 h-5" /> Blind Mode</span> 
            <input type="checkbox" class="toggle toggle-primary" :checked="gameState.settings.blindMode" @change="updateSetting('blindMode', ($event.target as HTMLInputElement).checked)" :disabled="!isHost" />
          </label>
          <div class="label-text-alt opacity-70 mb-4 px-1">
            Masque les rôles (Loup/Mouton) même pour soi-même. Vous ne voyez que votre mot !
          </div>
        </div>

        <div class="form-control mb-4">
           <label class="label">
             <span class="label-text font-bold flex items-center gap-2"><Icon name="lucide:timer" class="w-5 h-5" /> Temps de Vote ({{ gameState.settings.voteTimerSeconds }}s)</span>
           </label>
           <input type="range" min="30" max="180" step="10" :value="gameState.settings.voteTimerSeconds" class="range range-primary range-xs" @change="updateSetting('voteTimerSeconds', parseInt(($event.target as HTMLInputElement).value))" :disabled="!isHost" />
        </div>

        <div class="form-control mb-4">
           <label class="label">
             <span class="label-text font-bold flex items-center gap-2"><Icon name="lucide:rotate-cw" class="w-5 h-5" /> Max Rounds ({{ gameState.settings.maxRounds }})</span>
           </label>
           <input type="range" min="3" max="10" step="1" :value="gameState.settings.maxRounds" class="range range-secondary range-xs" @change="updateSetting('maxRounds', parseInt(($event.target as HTMLInputElement).value))" :disabled="!isHost" />
        </div>

        <div class="modal-action">
          <form method="dialog">
            <button class="btn">Fermer</button>
          </form>
        </div>
      </div>
    </dialog>

    <!-- PHASE: LOBBY -->
    <div v-if="gameState.phase === 'LOBBY'" class="flex-1 w-full flex flex-col items-center justify-center p-4">
      <h2 class="text-3xl font-black text-center mb-2 drop-shadow-md">
        En attente du troupeau...
      </h2>
      <div v-if="gameState.settings.blindMode" class="badge badge-error gap-2 mb-8 animate-pulse text-lg py-4">
        <Icon name="lucide:eye-off" class="w-6 h-6" /> BLIND MODE ACTIF
      </div>
      <div v-else class="mb-8 h-6"></div>
      
      <!-- Player Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full justify-items-center">
        <div 
          v-for="player in gameState.players" 
          :key="player.id" 
          class="flex flex-col items-center animate-pop-in group relative"
        >
          <!-- Kick Button (Host Only) -->
          <button 
             v-if="isHost && player.id !== gameStore.me?.id" 
             class="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error z-20 opacity-0 group-hover:opacity-100 transition-opacity"
             @click="kickPlayer(player.id)"
          ><Icon name="lucide:x" class="w-4 h-4" /></button>

          <div class="avatar relative">
            <div class="w-20 rounded-xl bg-base-200 border-2 border-base-300 transition-transform hover:scale-105">
              <img :src="player.avatar" />
            </div>
            <div v-if="player.isHost" class="absolute -top-4 -right-2 text-2xl drop-shadow-md filter cursor-help" title="Hôte de la partie">
                <Icon name="lucide:crown" class="w-8 h-8 text-warning" />
            </div>
          </div>
          <span class="font-bold mt-1 text-sm bg-base-100 px-3 py-1 rounded-full shadow-sm border border-base-200">{{ player.name }}</span>
        </div>
      </div>

      <!-- Host Controls -->
      <div v-if="isHost" class="mt-12 text-center">
        <button 
          class="btn btn-primary btn-lg px-12 text-xl font-black border-b-8 border-primary-content hover:border-primary-content/80 active:translate-y-2 active:border-b-0 transition-all"
          @click="startGame"
          :disabled="gameState.players.length < 3"
        >
          LANCER LA PARTIE
        </button>
        <div v-if="gameState.players.length < 3" class="text-error font-bold mt-2 text-center text-sm bg-base-100/50 px-2 rounded">
          Il faut au moins 3 joueurs
        </div>
      </div>
      <div v-else class="mt-12 text-center animate-pulse opacity-75">
        Le Berger prépare la tonte...
      </div>
    </div>

    <!-- PHASE: WRITING -->
    <div v-else-if="gameState.phase === 'WRITING'" class="flex-1 flex flex-col items-center justify-center w-full gap-8">
      <!-- Role Info -->
      <div class="card bg-base-100 shadow-xl border-4 border-base-300 w-full max-w-sm animate-pop-in">
        <div class="card-body items-center text-center">
          <h2 class="card-title text-sm uppercase opacity-50">Votre Rôle</h2>
          
          <div v-if="!gameState.settings.blindMode">
             <!-- STANDARD MODE -->
             <div class="text-xl font-bold uppercase tracking-widest opacity-80 mb-1" 
                  :class="gameStore.me?.role === 'LOUP' ? 'text-error' : (gameStore.me?.role === 'CHEVRE' ? 'text-warning' : 'text-success')">
                {{ gameStore.me?.role }}
             </div>
             
             <div class="text-3xl font-black my-2">
                <span v-if="mySecretWord" class="text-secondary">{{ mySecretWord }}</span>
                <span v-else class="text-error italic">VOUS ÊTES LA CHÈVRE !</span>
             </div>
             <p class="text-xs opacity-75">
               {{ mySecretWord ? 'Trouvez les intrus sans vous faire repérer.' : 'Devinez le mot des autres !' }}
             </p>
          </div>
          <div v-else>
             <!-- BLIND MODE -->
             <div class="text-3xl font-black my-2">
                <span v-if="mySecretWord" class="text-accent">{{ mySecretWord }}</span>
                <span v-else class="text-lg italic opacity-50">??? (Pas de mot)</span>
             </div>
             <p class="text-xs opacity-75 text-error font-bold">
               MODE AVEUGLE : Votre rôle est caché ! Déduisez-le !
             </p>
          </div>

        </div>
      </div>

      <div class="divider font-black opacity-20">ACTION</div>
      
      <div v-if="!hasSubmitted" class="w-full max-w-xs flex flex-col gap-4 animate-fade-in-up">
        <input 
          v-model="wordInput"
          class="input input-lg text-center text-2xl font-bold uppercase placeholder:normal-case w-full border-4 focus:border-primary" 
          placeholder="Votre mot..."
          @keyup.enter="handleSubmitClue"
          maxlength="20"
        />
        <button class="btn btn-primary btn-lg w-full font-black border-b-8 border-primary-content active:border-b-0 active:translate-y-1" @click="handleSubmitClue" :disabled="!wordInput.trim()">
          ENVOYER
        </button>
      </div>
      <div v-else class="text-2xl font-bold opacity-75 animate-bounce text-center">
        Mot envoyé !<br/><span class="text-sm font-normal flex items-center justify-center gap-2">Chut... gardez la poker face <Icon name="lucide:meh" class="w-5 h-5" /></span>
      </div>
    </div>

    <!-- PHASE: REVEAL -->
    <div v-else-if="gameState.phase === 'REVEAL'" class="flex-1 flex flex-col items-center w-full p-4">
      <h2 class="text-3xl font-black mb-8 text-center bg-base-100 px-4 py-2 rounded-xl shadow-sm border-2 border-base-200 flex items-center gap-3">
        La Récolte <Icon name="mdi:barley" class="w-8 h-8" />
      </h2>
      
      <div class="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl">
         <div v-for="player in processedPlayers" :key="player.id" class="relative group">
            <div class="chat chat-start w-full flex flex-col items-center">
               <div class="chat-image avatar">
                 <div class="w-16 rounded-full border-4 border-base-300 bg-base-200">
                   <img :src="player.avatar" />
                 </div>
               </div>
               <div class="chat-header text-center w-full mb-1 font-bold opacity-75">
                 {{ player.name }}
               </div>
               <div class="chat-bubble chat-bubble-secondary text-xl font-black shadow-lg w-full text-center py-4">
                 {{ player.clue || '???' }}
               </div>
               <div v-if="player.history && player.history.length > 0" class="flex flex-wrap gap-1 justify-center mt-2 max-w-[150px]">
                   <span v-for="word in player.history" :key="word" class="badge badge-xs badge-ghost opacity-50">{{ word }}</span>
               </div>
            </div>
         </div>
      </div>

      <div class="fixed bottom-8 flex flex-col items-center gap-2 w-full px-4">
         <!-- Propose Vote (Everyone) -->
         <button 
            v-if="gameStore.me?.isAlive"
            class="btn btn-neutral btn-sm opacity-90" 
            :class="gameStore.me?.votedFor === 'PROPOSE_VOTE' ? 'btn-success' : ''"
            @click="gameStore.proposeVote()"
         >
            {{ gameStore.me?.votedFor === 'PROPOSE_VOTE' ? 'Vote demandé' : 'Demander le Vote' }} 
            ({{ gameState.requestVoteCount || 0 }}/{{ Math.floor(alivePlayers.length / 2) + 1 }})
         </button>

         <!-- Host Controls -->
         <div v-if="isHost">
            <button 
                v-if="(gameState.round || 0) < gameState.settings.maxRounds"
                class="btn btn-primary btn-lg font-black shadow-xl border-4 border-base-100 animate-pulse" 
                @click="gameStore.nextRound()"
            >
                ROUND SUIVANT <Icon name="lucide:arrow-right" class="w-6 h-6 ml-2" />
            </button>
            <button 
                v-else
                class="btn btn-warning btn-lg font-black shadow-xl border-4 border-base-100 animate-pulse" 
                @click="gameStore.nextRound()"
            >
                PASSER AU VOTE FINAL <Icon name="lucide:vote" class="w-6 h-6 ml-2" />
            </button>
         </div>
      </div>
    </div>

    <!-- PHASE: VOTING -->
    <div v-else-if="gameState.phase === 'VOTING'" class="flex-1 flex flex-col items-center w-full p-4">
      <h2 class="text-3xl font-black mb-2 text-error drop-shadow-sm">VOTEZ !</h2>
      <p class="mb-8 font-bold opacity-60">Qui est l'intrus ? Tap pour voter.</p>
      
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
         <button 
           v-for="player in alivePlayers" 
           :key="player.id"
           class="btn h-auto py-4 flex flex-col gap-2 relative border-b-8 active:border-b-0 active:translate-y-1 transition-all"
           :class="[
              myVoteId === player.id ? 'btn-error border-error-content' : 'btn-neutral border-base-300 bg-base-200 hover:bg-base-300',
              player.id === gameStore.myId ? 'opacity-50 cursor-not-allowed' : ''
           ]"
           @click="handleVote(player.id)"
           :disabled="player.id === gameStore.myId || !gameStore.me?.isAlive"
         >
           <div class="avatar">
             <div class="w-16 rounded-xl">
               <img :src="player.avatar" />
             </div>
           </div>
           <div class="font-bold text-lg">{{ player.name }}</div>
           <div v-if="player.history && player.history.length > 0" class="flex flex-wrap gap-1 justify-center mt-1 max-w-[120px]">
               <span v-for="word in player.history" :key="word" class="badge badge-xs badge-ghost opacity-50">{{ word }}</span>
           </div>
           
           <!-- Vote Count (Visible in MVP) -->
           <div v-if="player.votesReceived > 0" class="badge badge-error badge-lg absolute -top-2 -right-2 font-mono border-2 border-base-100 shadow-sm animate-pop-in">
              {{ player.votesReceived }}
           </div>
         </button>
      </div>
       <div v-if="!gameStore.me?.isAlive" class="alert alert-warning mt-8 shadow-lg font-bold">
          <Icon name="lucide:ghost" class="w-6 h-6" /> Vous êtes mort. Observez en silence.
       </div>
    </div>

    <!-- PHASE: ENDED -->
    <div v-else-if="gameState.phase === 'ENDED'" class="flex-1 flex flex-col items-center justify-center text-center p-4">
       <div class="text-5xl font-black mb-4 animate-bounce flex items-center justify-center gap-4">
         <div v-if="gameState.winnerTeam === 'VILLAGE'" class="flex items-center gap-2">
           <Icon name="lucide:trophy" class="text-warning" /> LES MOUTONS
         </div>
         <div v-else class="flex flex-col items-center gap-2">
           <div class="flex items-center gap-2">
             <Icon name="mdi:wolf" class="text-error" /> LE{{ wolves.length > 1 ? 'S' : '' }} LOUP{{ wolves.length > 1 ? 'S' : '' }}
           </div>
           <div v-if="goats.length > 0" class="text-2xl text-warning flex items-center gap-2">
             <Icon name="mdi:goat" /> ET LA CHÈVRE
           </div>
         </div>
       </div>
       <div class="text-2xl font-bold opacity-75 mb-12">
         {{ gameState.winnerTeam === 'VILLAGE' ? 'ONT GAGNÉ !' : (wolves.length > 1 || goats.length > 0) ? 'ONT GAGNÉ !' : 'A GAGNÉ !' }}
       </div>
       
       <div class="grid grid-cols-2 gap-4 w-full max-w-2xl">
         <div v-for="player in gameState.players" :key="player.id" class="card bg-base-100 shadow-md border-2" :class="player.role === 'LOUP' ? 'border-error' : (player.role === 'CHEVRE' ? 'border-warning' : 'border-success')">
            <div class="card-body p-4 flex-row items-center gap-4">
               <div class="avatar">
                 <div class="w-12 rounded-full">
                   <img :src="player.avatar" />
                 </div>
               </div>
               <div class="text-left">
                  <div class="font-bold">{{ player.name }}</div>
                  <div class="text-xs font-black uppercase" :class="player.role === 'LOUP' ? 'text-error' : (player.role === 'CHEVRE' ? 'text-warning' : 'text-success')">
                    {{ player.role }}
                  </div>
                  <div class="text-xs opacity-50">{{ player.secretWord || 'Pas de mot' }}</div>
               </div>
            </div>
         </div>
       </div>

       <div class="mt-12 flex gap-4">
          <button v-if="isHost" class="btn btn-primary btn-lg" @click="gameStore.restartGame()">RETOUR AU LOBBY <Icon name="lucide:rotate-cw" class="ml-2 w-6 h-6" /></button>
          <button class="btn btn-error btn-lg" @click="leaveToHome">QUITTER LA PARTIE</button>
       </div>
    </div>

  </div>
  
  <div v-else class="flex flex-col items-center justify-center p-4 w-full h-full max-w-md">
     <!-- JOIN FORM for Direct Access -->
     <div class="card bg-base-200/80 backdrop-blur-sm shadow-xl border-b-4 border-base-300 w-full animate-pop-in">
       <div class="card-body items-center text-center p-6">
         <h2 class="card-title text-2xl font-black uppercase mb-4 opacity-75">Qui êtes-vous ?</h2>
         
         <div class="relative group cursor-pointer" @click="refreshAvatar">
           <div class="avatar transition-transform active:scale-95 duration-200">
             <div class="w-32 rounded-xl border-4 border-base-content/10 shadow-inner bg-base-100">
               <img :src="avatarUrl" alt="Avatar" class="bg-base-100" />
             </div>
           </div>
           <div class="absolute -bottom-2 -right-2 btn btn-circle btn-sm btn-primary shadow-lg border-2 border-base-100">
             <Icon name="lucide:refresh-cw" class="w-4 h-4" />
           </div>
         </div>

         <div class="form-control w-full max-w-xs mt-4">
           <input 
             v-model="name" 
             type="text" 
             placeholder="PSEUDO" 
             class="input input-lg input-bordered text-center font-black text-xl placeholder:text-base-content/20 bg-base-100 focus:outline-none" 
             maxlength="12"
           />
         </div>

         <button 
           class="btn btn-primary btn-xl w-full mt-6 text-xl font-black border-b-8 border-primary-content active:border-b-0 active:translate-y-2 transition-all"
           @click="handleDirectJoin"
           :disabled="!name.trim()"
         >
           REJOINDRE LA PARTIE 🐑
         </button>
       </div>
     </div>
  </div>
</template>

<script setup lang="ts">
// Nuxt auto-imports: ref, computed, watch, onMounted, onUnmounted, useRoute, useRouter, useGameStore

const router = useRouter();
const route = useRoute();
const gameStore = useGameStore();

const gameState = computed(() => gameStore.gameState);
const isHost = computed(() => gameStore.isHost);
const processedPlayers = computed(() => gameState.value?.players || []);
const alivePlayers = computed(() => processedPlayers.value.filter(p => p.isAlive));

// Role-based player lists (for ENDED phase display)
const wolves = computed(() => processedPlayers.value.filter(p => p.role === 'LOUP'));
const goats = computed(() => processedPlayers.value.filter(p => p.role === 'CHEVRE'));

const timeLeft = ref(0);
const wordInput = ref('');

// Alert Modal State
const alertModal = ref<{ title: string; message: string; type: 'info' | 'error' | 'warning' | 'success'; onClose?: () => void } | null>(null);

const showAlert = (message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info', title: string = 'Attention', onClose?: () => void) => {
  alertModal.value = { title, message, type, onClose };
};

const closeAlert = () => {
  const callback = alertModal.value?.onClose;
  alertModal.value = null;
  callback?.();
};

const copyRoomCode = () => {
  if (gameState.value?.roomCode) {
    navigator.clipboard.writeText(gameState.value.roomCode);
    showAlert('Code copié dans le presse-papier !', 'success', 'Copié !');
  }
};

// Join Form Refs (shared with index.vue via localStorage)
const name = ref('');
const avatarSeed = ref('');
const avatarUrl = computed(() => `https://api.dicebear.com/9.x/dylan/svg?seed=${avatarSeed.value}&backgroundColor=b6e3f4,c0aede,d1d4f9`);

const refreshAvatar = () => {
  avatarSeed.value = Math.random().toString(36).substring(7);
  localStorage.setItem('petitelaine-avatar', avatarSeed.value);
};

// Load saved profile on client
if (import.meta.client) {
  const savedName = localStorage.getItem('petitelaine-name');
  const savedAvatar = localStorage.getItem('petitelaine-avatar');
  if (savedName) name.value = savedName;
  if (savedAvatar) avatarSeed.value = savedAvatar;
  else {
    avatarSeed.value = Math.random().toString(36).substring(7);
    localStorage.setItem('petitelaine-avatar', avatarSeed.value);
  }
}

// Persist name on change
watch(name, (val) => {
  if (import.meta.client) localStorage.setItem('petitelaine-name', val);
});

const handleDirectJoin = () => {
    if (name.value.trim()) {
        const code = route.params.code as string;
        gameStore.joinRoom(code, name.value.trim(), avatarUrl.value);
    }
}

// Kick Detection
watch(() => gameStore.gameState, (newVal, oldVal) => {
  if (newVal && oldVal && gameStore.myId) {
      const amIInList = newVal.players.find(p => p.id === gameStore.myId);
      if (!amIInList) {
          gameStore.leaveRoom();
          router.push('/?error=kicked');
      }
  }
}, { deep: true });

// Logic Helpers
const mySecretWord = computed(() => gameStore.me?.secretWord);
const hasSubmitted = computed(() => !!gameStore.me?.clue);
const myVoteId = computed(() => gameStore.me?.votedFor);

// Timer Logic (SSR Safe)
let timerInterval: any = null;

// Room Validation Logic
watch(() => gameStore.roomError, (err) => {
    if (err === 'NOT_FOUND') {
        showAlert("Cette salle n'existe pas !", 'error', 'Erreur', () => {
            router.replace('/');
        });
        gameStore.roomError = null;
    }
});

// Kick Redirect Logic
watch(() => gameStore.wasKicked, (kicked) => {
    if (kicked) {
        showAlert("Vous avez été expulsé de la partie !", 'warning', 'Expulsion', () => {
            router.replace('/');
        });
        gameStore.wasKicked = false;
    }
});

onMounted(() => {
  const code = route.params.code as string;
  
  // Init socket if not connected (Direct Access)
  if (!gameStore.isConnected) {
      gameStore.init();
      // Wait for connection to verify room? 
      // checkRoom sends message. If not connected, it queues.
      // But we need to wait for open. useGameSocket handles caching?
      // Yes, sends when open.
      gameStore.checkRoom(code);
  } else if (!gameStore.gameState) {
      // Connected but no state (maybe came from home without joining?)
      gameStore.checkRoom(code);
  }

  // Timer
  timerInterval = setInterval(() => {
      if (gameState.value?.timerEndTime) {
        const diff = Math.ceil((gameState.value.timerEndTime - Date.now()) / 1000);
        timeLeft.value = diff > 0 ? diff : 0;
      }
  }, 1000);
});

onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval);
});

const startGame = () => gameStore.startGame();

const handleSubmitClue = () => {
  const w = wordInput.value.trim().toUpperCase();
  if (w && gameState.value) {
    if (gameStore.me?.history?.includes(w)) {
        showAlert("Vous avez déjà utilisé ce mot ! Essaye autre chose.", 'warning', 'Mot déjà utilisé');
        return;
    }
    gameStore.submitClue(gameState.value.roomCode, w);
  }
}

const startVote = () => {
   if (isHost.value) gameStore.startVote();
}

const handleVote = (targetId: string) => {
   if (gameState.value) {
     gameStore.voteFor(gameState.value.roomCode, targetId);
   }
}

const kickPlayer = (targetId: string) => {
    if (gameState.value && isHost.value) {
        if(confirm('Voulez-vous vraiment expulser ce joueur ?')) {
             gameStore.kickPlayer(gameState.value.roomCode, targetId);
        }
    }
}

const updateSetting = (key: string, value: any) => {
    if (gameState.value && isHost.value) {
        // Create partial settings object
        const settings: any = {};
        settings[key] = value;
        gameStore.updateSettings(gameState.value.roomCode, settings);
    }
}

const leaveToHome = () => {
    gameStore.leaveRoom();
    router.push('/');
}

</script>

<style scoped>
.animate-pop-in { animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
.animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }

@keyframes popIn {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
