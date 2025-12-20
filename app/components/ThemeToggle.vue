<template>
  <label class="swap swap-rotate text-base-content">
    <!-- this hidden checkbox controls the state -->
    <input type="checkbox" v-model="isDark" />

    <!-- sun icon -->
    <Icon name="lucide:sun" class="swap-on h-8 w-8" />

    <!-- moon icon -->
    <Icon name="lucide:moon" class="swap-off h-8 w-8" />
  </label>
</template>

<script setup lang="ts">
// Nuxt auto-imports: ref, watch, onMounted

const isDark = ref(false);

const toggleTheme = (val: boolean) => {
  const theme = val ? 'halloween' : 'caramellatte';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

watch(isDark, (val) => {
  toggleTheme(val);
});

onMounted(() => {
  // Check local storage or preference
  const saved = localStorage.getItem('theme');
  if (saved === 'halloween') {
    isDark.value = true;
  } else if (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Default to dark if preferred? Rules said "retro" (light) default, "halloween" (dark)
    // CSS config has retro --default.
    // Let's stick to retro default unless user explicitly chose.
    // But if they have system dark, maybe? 
    // Let's just respect saved or default to retro (false).
    isDark.value = false;
  }
  
  // Apply initial
  toggleTheme(isDark.value);
});
</script>
