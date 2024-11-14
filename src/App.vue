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
  <div class="info">
    <p>2024-11-14_19-15</p>
    <p>developed by joshua hoffmann</p>
  </div>
</template>

<script setup>
import Menu from './components/Menu.vue';
import { useMeshDataStore } from '@/stores/meshDataStore';

const meshDataStore = useMeshDataStore();
</script>

<style lang="scss" scoped>
.info {
  text-align: center;
  margin: 42px 0;
  font-size: 12px;
  font-family: monospace;
  color: rgba($color: #fff, $alpha: 0.1);
}
</style>
