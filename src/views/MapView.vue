<template>
  <div class="mapview">
    <iframe v-if="mapUrl" :src="mapUrl" class="mapview__iframe"></iframe>
    <p v-else>Map wird geladen...</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const mapUrl = ref('');

const closeMap = () => {
  router.push('/');
}

onMounted(() => {
  fetch('maplink.json')
    .then(res => res.json())
    .then(data => {
      mapUrl.value = data.maplink;
    })
    .catch(err => console.error(err));
});
</script>

<style scoped lang="scss">
.mapview {
  position: relative;
  width: 100%;
  height: calc(100vh - 60px);
  margin-top: 60px;

  &__iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
}
</style>
