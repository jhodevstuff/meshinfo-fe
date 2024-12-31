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
    <p>2024-12-31</p>
    <p>developed by joshua hoffmann</p>
  </div>
  <component :is="PyroComponent" v-if="showPyro" />
</template>

<script setup>
import { ref, onMounted, defineAsyncComponent } from 'vue';
import Menu from './components/Menu.vue';
import { useMeshDataStore } from '@/stores/meshDataStore';

const PyroComponent = defineAsyncComponent(() =>
  import('./components/Pyro.vue')
);

const meshDataStore = useMeshDataStore();
const showPyro = ref(false);

onMounted(() => {
  const now = new Date()
  if (now.getMonth() === 0 && now.getDate() === 1) {
    showPyro.value = true;
    setTimeout(() => {
      showPyro.value = false;
    }, 3650)
  }
})
</script>

<style lang="scss" scoped>
.info {
  display: none;
  text-align: center;
  margin: 42px 0;
  font-size: 12px;
  font-family: monospace;
  color: rgba($color: #fff, $alpha: 0.1);
}
</style>
