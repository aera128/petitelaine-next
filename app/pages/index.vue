<template>
  <div class="max-w-md w-full flex flex-col gap-6">

    <!-- Loading state before localStorage is read -->
    <div v-if="!isProfileLoaded" class="flex flex-col items-center gap-4 opacity-75 py-20">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <template v-else>
    <!-- Profile Section -->
    <div class="card bg-base-200/80 backdrop-blur-sm shadow-xl border-b-4 border-base-300">
      <div class="card-body items-center text-center p-6">
        <h2 class="card-title text-2xl font-black uppercase mb-4 opacity-75">Ton Personnage</h2>
        
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
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-col gap-3">
      <button 
        class="btn btn-primary btn-xl w-full text-xl font-black border-b-8 border-primary-content hover:border-primary-content/80 active:border-b-0 active:translate-y-2 transition-all"
        @click="handleCreate"
        :disabled="!isValid"
      >
        <Icon name="lucide:plus-circle" class="w-6 h-6 mr-2" /> CRÉER UNE PARTIE
      </button>

      <div class="divider font-bold opacity-50">OU</div>

      <div class="join w-full h-14 shadow-sm">
        <input 
          v-model="joinCode" 
          class="input input-lg join-item w-full text-center font-mono uppercase bg-base-100 text-xl font-bold tracking-widest placeholder:tracking-normal" 
          placeholder="CODE SALLE" 
          maxlength="8"
        />
        <button 
          class="btn btn-secondary btn-lg join-item border-b-4 border-secondary-content active:border-b-0 active:translate-y-1"
          @click="handleJoin"
          :disabled="!isValid || joinCode.length < 4"
        >
          REJOINDRE
        </button>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Nuxt auto-imports: ref, computed, watch, onMounted, useRouter, useGameStore

const router = useRouter();
const gameStore = useGameStore();

const name = ref('');
const avatarSeed = ref('');
const joinCode = ref('');
const isProfileLoaded = ref(false);

const avatarUrl = computed(() => `https://api.dicebear.com/9.x/dylan/svg?seed=${avatarSeed.value}&backgroundColor=b6e3f4,c0aede,d1d4f9`);

const isValid = computed(() => name.value.trim().length > 0);

const refreshAvatar = () => {
  avatarSeed.value = Math.random().toString(36).substring(7);
  localStorage.setItem('petitelaine-avatar', avatarSeed.value);
};

// Persist name on change
watch(name, (val) => {
  localStorage.setItem('petitelaine-name', val);
});

// Load from localStorage on mount
onMounted(() => {
  const savedName = localStorage.getItem('petitelaine-name');
  const savedAvatar = localStorage.getItem('petitelaine-avatar');
  
  if (savedName) name.value = savedName;
  if (savedAvatar) {
    avatarSeed.value = savedAvatar;
  } else {
    avatarSeed.value = Math.random().toString(36).substring(7);
    localStorage.setItem('petitelaine-avatar', avatarSeed.value);
  }
  isProfileLoaded.value = true;
});

const handleCreate = () => {
  if (!isValid.value) return;
  gameStore.createRoom(name.value, avatarUrl.value);
};

const handleJoin = () => {
  if (!isValid.value || joinCode.value.length < 4) return;
  gameStore.joinRoom(joinCode.value, name.value, avatarUrl.value);
};

// Auto-redirect when EXPLICITLY joined (myId goes from empty to set)
watch(() => gameStore.myId, (newId, oldId) => {
  if (newId && !oldId && gameStore.gameState?.roomCode) {
    router.push(`/room/${gameStore.gameState.roomCode}`);
  }
});

// Init socket
onMounted(() => {
  gameStore.init();
});
</script>
