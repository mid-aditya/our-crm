<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-slate-900/50" @click="$emit('close')" />
    <div class="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
      <div class="flex items-center justify-between px-5 py-4 border-b">
        <h2 class="font-semibold text-slate-900">{{ title }}</h2>
        <button @click="$emit('close')" class="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
      </div>
      <div class="p-5">
        <slot />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ open: boolean; title: string }>();
defineEmits(["close"]);
</script>
