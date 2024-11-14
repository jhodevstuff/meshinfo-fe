<template>
  <div>
    <div class="nodes" v-if="selectedMasterNode">
      <div class="nodes__info">
        <p class="nodes__info--total">Nodes gesamt: {{ meshDataStore.data[selectedMasterNode].knownNodes.length }}</p>
        <div class="nodes__info--update">
          <p>{{ elapsedSeconds }}</p>
          <p>Sekunden seit Update {{ elapsedSeconds > 3600 ? '🧐' : null }}</p>
        </div>
      </div>
      <div class="master-nodes" v-if="enableMasters">
        <div class="master-nodes__container">
          <div class="master-nodes__option"
            :class="(selectedMasterNode == masterNode && meshDataStore.nodesIndex.length > 1) && 'master-nodes__selected'"
            v-for="masterNode in meshDataStore.nodesIndex" :key="masterNode" @click="selectMasterNode(masterNode)">
            <p class="master-nodes__option--label">
              {{ masterNode }}
              ({{ meshDataStore.data[masterNode]?.knownNodes?.[0]?.shortName || '---' }})
            </p>
          </div>
        </div>
      </div>
      <div class="nodes__list">
        <div class="node" v-for="node in meshDataStore.data[selectedMasterNode].knownNodes" :key="node.id"
          @click="selectNode(node.id)">
          <div v-if="node.id !== meshDataStore.data[selectedMasterNode].info.infoFrom"
            :class="['node__online', getNodeStatus(node)]"></div>
          <div class="node__icon">
            <div v-if="nodeImages.includes(node.model)" class="node__icon--img"
              :style="'background-image: url(src/assets/devices/' + node.model + '.png)'"></div>
            <div v-if="!nodeImages.includes(node.model)" class="node__icon--img"
              :style="'background-image: url(src/assets/devices/unknown.svg); background-size: 50%;'"></div>
            <p>{{ node.model === 'TRACKER_T1000_E' ? 'T1000E' : node.model }}</p>
          </div>
          <div class="node__info">
            <div class="node__info--block">
              <p class="bold large">{{ node.id }}</p>
              <p v-if="node.id === meshDataStore.data[selectedMasterNode].info.infoFrom"
                class="bold superlarge lefttop">🛸</p>
            </div>
            <div class="node__info--block">
              <p>👔 {{ node.longName }}</p>
              <p class="bold">{{ node.shortName }}</p>
            </div>
            <div class="node__info--block" v-if="node.batteryLevel || node.voltage">
              <p v-if="node.batteryLevel">{{ (node.batteryLevel < 35) ? '🪫' : '🔋' }} {{ node.batteryLevel> 100 ? "100"
                  : node.batteryLevel }} %</p>
              <p v-if="node.voltage <= 0 && node.batteryLevel >= 100">🔌</p>
              <p v-else-if="node.voltage">⚡️ {{ node.voltage >= 0 ? node.voltage : 0 }} V</p>
            </div>
            <div class="node__info--block" v-if="node.lastHeard || getLastTraceTimestamp(node.id)">
              <p v-if="node.lastHeard">⏳ {{ formatTimestamp(node.lastHeard) }}</p>
              <p v-if="getLastTraceTimestamp(node.id)">🔭 {{ getLastTraceTimestamp(node.id) }}</p>
            </div>
            <div class="node__info--block" v-if="node.snr || node.hops">
              <p v-if="node.snr">📡 {{ node.snr }} dB</p>
              <p v-if="node.id !== meshDataStore.data[selectedMasterNode].info.infoFrom">🦘 {{ node.hops }} {{ node.hops
                === 1 ? 'Hop' : 'Hops' }}</p>
            </div>
            <div class="node__info--block" v-if="node.lat && node.lon">
              <p>
                🌍
                <a :href="`https://www.google.com/maps?q=${node.lat},${node.lon}`" target="_blank">
                  {{ node.lat }}, {{ node.lon }}
                </a>
              </p>
            </div>
            <p v-if="node.publicKey" class="node__info--block">
              <a href="#" @click="copy(node.publicKey)">
                🔑 PublicKey kopieren
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-show="traceRoutesVisible" class="traceroutes" @click="toggleTraceRoutes()">
      <div class="traceroutes__info" v-if="selectedTraceRoute">
        <div v-for="(tr, index) in selectedTraceRoute" :key="index" class="tr">
          <p class="tr__headline">{{ getTraceTimestamp(tr.timeStamp) }} - Tracroute mit {{ tr.hops }} {{ tr.hops === 1 ?
            'Hop' : 'Hops' }} {{ tr.hops === 0 ?
            '(direkt)' : '' }}</p>
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
const selectedMasterNode = ref(useMeshDataStore().nodesIndex[0]);
const enableMasters = ref(false);
const nodeImages = ref(['HELTEC_V3', 'TBEAM', 'T_ECHO', 'T_DECK', 'TRACKER_T1000_E']);

const selectMasterNode = (nodeId) => {
  selectedMasterNode.value = nodeId;
  localStorage.setItem('masterNode', nodeId);
}

const copy = (copyValue) => {
  navigator.clipboard.writeText(copyValue)
}

const toggleTraceRoutes = () => {
  traceRoutesVisible.value = false;
};

const selectNode = (nodeId) => {
  meshDataStore.data[selectedMasterNode.value].traceroutes.forEach((tr) => {
    if (tr.nodeId === nodeId) {
      selectedTraceRoute.value = tr.traces;
      traceRoutesVisible.value = true;
      window.scrollTo(0, 0);
    }
  });
};

const formatRoute = (nodeIds) => {
  return nodeIds
    .map(id => {
      const node = meshDataStore.data[selectedMasterNode.value].knownNodes.find(n => n.id === id);
      return node ? `${id} (${node.shortName})` : id;
    })
    .join(" → ");
}

const getNodeStatus = (node) => {
  const colorStatesHours = {
    green: 1.5,
    orange: 6
  }
  const oneHour = 60 * 60 * 1000;
  const recent = colorStatesHours.green * oneHour;
  const long = colorStatesHours.orange * oneHour;
  const currentTime = Date.now();
  const lastHeardTime = node.lastHeard ? node.lastHeard * 1000 : null;
  const lastTraceTime = getLastTraceTimestampMillis(node.id);
  const latestTime = Math.max(lastHeardTime || 0, lastTraceTime || 0);
  if (latestTime > currentTime - recent) {
    return 'node__online--short';
  } else if (latestTime > currentTime - long) {
    return 'node__online--recent';
  } else {
    return 'node__online--long';
  }
};

const getLastTraceTimestampMillis = (nodeId) => {
  const traceroute = meshDataStore.data[selectedMasterNode.value].traceroutes.find(tr => tr.nodeId === nodeId);
  if (traceroute && traceroute.traces.length > 0) {
    return traceroute.traces[traceroute.traces.length - 1].timeStamp;
  }
  return null;
};

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
  const traceroute = meshDataStore.data[selectedMasterNode.value].traceroutes.find(tr => tr.nodeId === nodeId);
  if (traceroute && traceroute.traces.length > 0) {
    const lastTimestamp = traceroute.traces[traceroute.traces.length - 1].timeStamp;
    return getTraceTimestamp(lastTimestamp);
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
  elapsedSeconds.value = Math.floor((Date.now() - meshDataStore.data[selectedMasterNode.value].info.lastUpdated) / 1000);
  clearInterval(intervalId);
  intervalId = setInterval(() => {
    elapsedSeconds.value++;
  }, 1000);
};

onMounted(() => {
  startTimer();
  enableMasters.value = true;
});

watch(() => meshDataStore.data[selectedMasterNode.value], startTimer);
onUnmounted(() => clearInterval(intervalId));
</script>

<style lang="scss">
.nodes {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 12px;

  &__info {
    margin: 12px 0;
    margin-bottom: 0;
    display: flex;
    justify-content: space-between;
    
    &--total {
      font-weight: bold;
    }

    &--update {
      display: flex;
      gap: 4px;
    }
  }

  &__list {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(1, 1fr);

    @media (min-width: 968px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: 1424px) {
      grid-template-columns: repeat(3, 1fr);
    }

    @media (min-width: 2000px) {
      grid-template-columns: repeat(4, 1fr);
    }
  }
}

.master-nodes {
  display: flex;
  justify-content: center;
  text-align: center;
  flex-direction: column;

  &__container {
    background-color: rgb(40, 40, 40);
    padding: 6px 22px;
    display: flex;
    justify-content: center;
    gap: 22px;
    border-radius: 3px;
    overflow: hidden;
  }

  &__option {
    padding: 12px 0;
    padding-bottom: 6px;
    margin-bottom: 3px;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 300ms ease-in-out;

    &--label {
      font-weight: normal;
    }
  }

  &__selected {
    border-bottom: 2px solid #fff;
  }
}

.node {
  width: calc(100% - 2 * 12px);
  background-color: rgb(40, 40, 40);
  display: flex;
  gap: 8px;
  padding: 12px;
  font-size: 16px;
  border-radius: 3px;
  cursor: pointer;
  position: relative;

  &__online {
    position: absolute;
    top: 12px;
    left: 12px;
    height: 12px;
    width: 12px;
    border-radius: 100px;

    &--short {
      background-color: rgb(12, 123, 12);
    }

    &--recent {
      background-color: rgb(173, 66, 0);
    }

    &--long {
      background-color: rgb(100, 100, 100);
    }
  }

  &__icon {
    margin-left: -6px;
    width: 15%;
    text-align: center;
    display: flex;
    justify-content: center;
    flex-direction: column;
    font-size: 10px;
    border-right: 1px solid #fff;
    overflow: hidden;

    &--img {
      margin-bottom: 6px;
      width: 100%;
      height: 50%;
      background-repeat: no-repeat;
      background-size: 70%;
      filter: grayscale(1) contrast(1.1) brightness(1.1);
      background-position: center center;
    }
  }

  &__info {
    width: 85%;
    display: flex;
    flex-direction: column;
    gap: 12px;

    &--block {
      display: flex;
      width: 100%;
      justify-content: space-between;
      gap: 12px;
    }
  }
}

.bold {
  font-weight: bold;
}

.normal {
  font-size: 16px;
}

.large {
  font-size: 18px;
}

.superlarge {
  font-size: 32px;
}

.small {
  font-size: 10px
}

.lefttop {
  position: absolute;
  top: 6px;
  left: 12px;
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
    padding: 48px;
    margin: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    min-height: fit-content;
  }
}

.tr {
  width: 100%;
  min-height: fit-content;

  &__headline {
    font-weight: bold;
    font-size: 20px;
    margin-bottom: 12px;
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
