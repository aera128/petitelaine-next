<template>
  <div class="h-[100dvh] w-screen overflow-hidden flex flex-col bg-base-100 relative transition-colors duration-300">
    <!-- Header -->
    <header class="absolute top-0 right-0 left-0 w-full p-4 flex flex-wrap justify-between items-center gap-2 z-50 pointer-events-none">
      <h1 class="pointer-events-auto text-2xl sm:text-3xl font-black tracking-tighter uppercase drop-shadow-sm select-none text-base-content">
        Petite<span class="text-primary">Laine</span>
      </h1>
      <div class="pointer-events-auto">
        <ThemeToggle />
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col items-center justify-center p-4 w-full h-full">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import ThemeToggle from '~/components/ThemeToggle.vue';
</script>
