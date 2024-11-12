<template>
  <div>
    <div class="nodes">
      <div class="nodes__info">
        <p class="nodes__info--total">Nodes gesamt: {{ meshDataStore.data.knownNodes.length }}</p>
        <p class="nodes__info--update">Zuletzt aktualisiert: vor {{ elapsedSeconds }} Sekunden</p>
      </div>
      <div class="nodes__list">
        <div class="node" v-for="node in meshDataStore.data.knownNodes" :key="node.id" @click="selectNode(node.id)">
          <div class="node__icon">
            <div class="node__icon--img"></div>
            <p>{{ node.model === 'TRACKER_T1000_E' ? 'T1000E' : node.model }}</p>
          </div>
          <div class="node__info">
            <div class="node__info--block">
              <p class="bold large">{{ node.id }}</p>
              <p v-if="node.id === meshDataStore.data.info.infoFrom" class="bold superlarge">🛸</p>
            </div>
            <div class="node__info--block">
              <p>👔 {{ node.longName }}</p>
              <p>{{ node.shortName }}</p>
            </div>
            <div class="node__info--block">
              <p v-if="node.batteryLevel">{{ (node.batteryLevel < 35) ? '🪫' : '🔋' }} {{ node.batteryLevel> 100 ? "100"
                  : node.batteryLevel }} %</p>
              <p v-if="node.voltage">⚡️ {{ node.voltage }} V</p>
            </div>
            <div class="node__info--block">
              <p v-if="node.lastHeard">⏳ {{ formatTimestamp(node.lastHeard) }}</p>
              <p v-if="getLastTraceTimestamp(node.id)">🔭 {{ getLastTraceTimestamp(node.id) }}</p>
            </div>
            <div class="node__info--block">
              <p v-if="node.lat && node.lon">
                🌍
                <a :href="`https://www.google.com/maps?q=${node.lat},${node.lon}`" target="_blank">
                  {{ node.lat }}, {{ node.lon }}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-show="traceRoutesVisible" class="traceroutes" @click="toggleTraceRoutes()">
      <div class="traceroutes__info" v-if="selectedTraceRoute">
        <div v-for="(tr, index) in selectedTraceRoute" :key="index" class="tr">
          <p class="tr__headline">Tracroute mit {{ tr.hops }} {{ tr.hops === 1 ? 'Hop' : 'Hops' }} {{ tr.hops === 0 ?
            '(direkt)' : '' }} | {{ getTraceTimestamp(tr.timeStamp) }}</p>
          <div class="tr__hops">
            <p class="tr__hops--key bold">Route Hinweg:</p>
            <p class="tr__hops--value">{{ formatRoute(tr.nodeTraceTo) }}</p>
          </div>
          <div class="tr__hops">
            <p class="tr__hops--key bold">Route Rückweg:</p>
            <p class="tr__hops--value">{{ formatRoute(tr.nodeTraceFrom) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMeshDataStore } from '@/stores/meshDataStore';
import { ref, watch, onMounted, onUnmounted } from 'vue';

const meshDataStore = useMeshDataStore();
const elapsedSeconds = ref(0);
const traceRoutesVisible = ref(false);
let intervalId;
const selectedTraceRoute = ref([]);

const toggleTraceRoutes = () => {
  traceRoutesVisible.value = false;
};

const selectNode = (nodeId) => {
  meshDataStore.data.traceroutes.forEach((tr) => {
    if (tr.nodeId === nodeId) {
      selectedTraceRoute.value = tr.traces;
      traceRoutesVisible.value = true;
    }
  });
};

const formatRoute = (nodeIds) => {
  return nodeIds
    .map(id => {
      const node = meshDataStore.data.knownNodes.find(n => n.id === id);
      return node ? `${id} (${node.shortName})` : id;
    })
    .join(" → ");
}

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp * 1000);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} - ${hours}:${minutes}`;
}

const getLastTraceTimestamp = (nodeId) => {
  const traceroute = meshDataStore.data.traceroutes.find(tr => tr.nodeId === nodeId);
  if (traceroute && traceroute.traces.length > 0) {
    const lastTimestamp = traceroute.traces[traceroute.traces.length - 1].timeStamp;
    return formatTimestamp(lastTimestamp);
  }
  return null;
}

const getTraceTimestamp = (timeStamp) => {
  const date = new Date(timeStamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} - ${hours}:${minutes}`;
}

const startTimer = () => {
  elapsedSeconds.value = Math.floor((Date.now() - meshDataStore.data.info.lastUpdated) / 1000);
  clearInterval(intervalId);
  intervalId = setInterval(() => {
    elapsedSeconds.value++;
  }, 1000);
};

onMounted(() => {
  startTimer();
});

watch(() => meshDataStore.data.info.lastUpdated, startTimer);
onUnmounted(() => clearInterval(intervalId));
</script>

<style lang="scss">
.nodes {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 12px;

  &__info {
    display: flex;
    justify-content: space-between;
    
    &--total {
      font-weight: bold;
    }
  }

  &__list {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(1, 1fr);

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: 1024px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }
}

.node {
  width: calc(100% - 2 * 12px);
  background-color: rgb(50, 50, 50);
  display: flex;
  gap: 8px;
  padding: 12px;
  font-size: 16px;
  border-radius: 3px;
  cursor: pointer;

  &__icon {
    margin-left: -6px;
    width: 15%;
    text-align: center;
    display: flex;
    justify-content: center;
    flex-direction: column;
    font-size: 8px;
    border-right: 1px solid #fff;
    overflow: hidden;

    &--img {
      margin-bottom: 6px;
      width: 100%;
      height: 50%;
      background-image: url('../assets/icons/chip.svg');
      background-repeat: no-repeat;
      background-size: 50%;
      background-position: center center;
    }
  }

  &__info {
    width: 85%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;

    &--block {
      display: flex;
      width: 100%;
      justify-content: space-between;
    }
  }
}

.bold {
  font-weight: bold;
}

.large {
  font-size: 18px;
}

.superlarge {
  font-size: 32px;
}

.traceroutes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  min-height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  justify-content: center;
  align-items: center;

  &__info {
    padding: 60px 48px;
    margin: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%
  }
}

.tr {
  width: 100%;

  &__headline {
    font-weight: bold;
    font-size: 20px;
    margin-bottom: 20px;
  }
  
  &__hops {
    display: flex;
    gap: 14px;

    &--key {
      width: 20%;
      margin-bottom: 6px;
      font-size: 14px;
    }

    &--value {
      width: 100%;
    }
  }
}

</style>
