<template>
  <dialog ref="dialogRef" class="modal modal-open">
    <div class="modal-box animate-pop-in">
      <h3 class="font-bold text-lg flex items-center gap-2">
        <Icon :name="iconName" class="w-6 h-6" :class="iconClass" />
        {{ title }}
      </h3>
      <p class="py-4">{{ message }}</p>
      <div class="modal-action">
        <button class="btn" :class="buttonClass" @click="close">OK</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="close">close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string;
  message: string;
  type?: 'info' | 'error' | 'warning' | 'success';
}>(), {
  title: 'Attention',
  type: 'info'
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);

const iconName = computed(() => {
  switch (props.type) {
    case 'error': return 'lucide:alert-circle';
    case 'warning': return 'lucide:alert-triangle';
    case 'success': return 'lucide:check-circle';
    default: return 'lucide:info';
  }
});

const iconClass = computed(() => {
  switch (props.type) {
    case 'error': return 'text-error';
    case 'warning': return 'text-warning';
    case 'success': return 'text-success';
    default: return 'text-info';
  }
});

const buttonClass = computed(() => {
  switch (props.type) {
    case 'error': return 'btn-error';
    case 'warning': return 'btn-warning';
    case 'success': return 'btn-success';
    default: return 'btn-primary';
  }
});

const close = () => {
  emit('close');
};

onMounted(() => {
  dialogRef.value?.showModal();
});
</script>

<style scoped>
.animate-pop-in { animation: popIn 0.3s ease-out forwards; }
@keyframes popIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
