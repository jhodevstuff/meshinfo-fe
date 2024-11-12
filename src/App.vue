<template>
  <header>
    <Menu />
  </header>
  <div v-if="meshDataStore.isLoaded">
    <RouterView />
  </div>
  <div v-else>
    <p>Daten werden geladen...</p>
  </div>
</template>

<script setup>
import Menu from './components/Menu.vue';
import { useMeshDataStore } from '@/stores/meshDataStore';

const meshDataStore = useMeshDataStore();
</script>

<style lang="scss" scoped></style>
