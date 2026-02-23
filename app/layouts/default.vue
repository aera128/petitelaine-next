<template>
  <div class="h-[100dvh] w-screen overflow-hidden flex flex-col bg-base-100 relative transition-colors duration-300">

    <!-- Single animated logo (fixed, transitions from center to corner) -->
    <h1
      class="logo fixed z-[100] font-black tracking-tighter uppercase select-none text-base-content pointer-events-none"
      :class="isSplashDone ? 'logo-final' : 'logo-splash'"
    >
      Petite<span class="text-primary">Laine</span>
    </h1>

    <!-- Header (ThemeToggle only, logo is handled above) -->
    <header class="absolute top-0 right-0 left-0 w-full p-4 flex justify-end items-center z-50 pointer-events-none">
      <div
        class="pointer-events-auto transition-opacity duration-300"
        :class="showContent ? 'opacity-100' : 'opacity-0'"
      >
        <ThemeToggle />
      </div>
    </header>

    <!-- Main Content -->
    <main
      class="flex-1 flex flex-col items-center justify-center p-4 w-full h-full transition-opacity duration-500"
      :class="showContent ? 'opacity-100' : 'opacity-0'"
    >
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import ThemeToggle from '~/components/ThemeToggle.vue';

const isSplashDone = ref(false)
const showContent = ref(false)

onMounted(() => {
  setTimeout(() => {
    isSplashDone.value = true
    setTimeout(() => {
      showContent.value = true
    }, 400)
  }, 1200)
})
</script>

<style scoped>
.logo {
  transition: top 0.7s cubic-bezier(0.4, 0, 0.2, 1),
              left 0.7s cubic-bezier(0.4, 0, 0.2, 1),
              font-size 0.7s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.logo-splash {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: clamp(3rem, 8vw, 5rem);
  animation: breathe 2s ease-in-out infinite;
}

.logo-final {
  top: 1rem;
  left: 1rem;
  transform: translate(0, 0);
  font-size: 1.5rem;
  animation: none;
}

@keyframes breathe {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.65; }
}
</style>
