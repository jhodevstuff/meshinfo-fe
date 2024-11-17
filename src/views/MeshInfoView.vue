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
            <p class="master-nodes__option--label"> {{ masterNode }} ({{
              meshDataStore.data[masterNode]?.knownNodes?.[0]?.shortName || '----' }}) </p>
          </div>
        </div>
      </div>
      <div class="nodes__list">
        <div class="node" v-for="node in meshDataStore.data[selectedMasterNode].knownNodes" :key="node.id"
          v-show="(node?.id === selectedNode && selectedDetails) || !selectedDetails" @click="selectNode(node.id)">
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
              <p v-if="node.batteryLevel">{{ (node.batteryLevel < 35) ? '🪫' : '🔋' }} {{ node.batteryLevel > 100 ? "100"
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
              <p> 🌍 <a :href="`https://www.google.com/maps?q=${node.lat},${node.lon}`" target="_blank"> {{ node.lat }},
                  {{ node.lon }} </a> </p>
            </div>
            <p v-if="node.publicKey" class="node__info--block"> <a href="#" @click="copy(node.publicKey)"> 🔑 PublicKey
                kopieren </a> </p>
          </div>
          <div class="node__actions"
            v-if="selectedNode === node.id && nodeOptionsVisible && (node.power.batteryLevel.length > 1 || getLastTraceTimestamp(node.id))">
            <div class="close close__moremargin" @click.stop="close"></div>
            <p class="node__actions--headline">Verfügbare Details</p>
            <div class="node__actions--options">
              <div class="node__actions--options__item" v-if="getLastTraceTimestamp(node.id)"
                @click.stop="selectDetails('Traceroutes')">🔭 Traceroutes</div>
              <div class="node__actions--options__item" v-if="node.power.batteryLevel.length > 1"
                @click.stop="selectDetails('Batteriestand')">{{ (node.batteryLevel < 35) ? '🪫' : '🔋' }}
                  Batteriestand</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="details" v-if="selectedDetails">
        <p class="details__headline">{{ selectedDetails }}</p>
        <div class="close" @click.stop="close"></div>
        <div v-if="selectedTraceRoute && selectedDetails === 'Traceroutes'">
          <div v-for="(tr, index) in selectedTraceRoute" :key="index" class="traceroutes">
            <p class="traceroutes__time">{{ getTraceTimestamp(tr.timeStamp) }} - Tracroute mit {{ tr.hops }} {{ tr.hops
              === 1 ? 'Hop' : 'Hops' }} {{ tr.hops === 0 ? '(direkt)' : '' }}</p>
            <div class="traceroutes__row">
              <p class="traceroutes__row--key">Route Hinweg:</p>
              <p class="traceroutes__row--value">{{ formatRoute(tr.nodeTraceTo) }}</p>
            </div>
            <div class="traceroutes__row">
              <p class="traceroutes__row--key">Route Rückweg:</p>
              <p class="traceroutes__row--value">{{ formatRoute(tr.nodeTraceFrom) }}</p>
            </div>
          </div>
        </div>
        <div v-if="selectedDetails === 'Batteriestand'">
          <div class="graph"> <svg v-if="processedData.length > 0" class="graph-svg"
              :viewBox="`0 0 ${graphWidth} ${graphHeight}`" preserveAspectRatio="xMidYMid meet" width="100%"
              height="auto">
              <g v-for="(level, index) in yAxisLabels" :key="'y-' + index">
                <line x1="40" :y1="level.y" :x2="graphWidth - 10" :y2="level.y" stroke="rgb(40, 40, 40)"
                  stroke-width="1" /> <text :x="30" :y="level.y + 4" text-anchor="end" font-size="12" fill="#fff"> {{
                  level.label }} </text>
              </g>
              <g v-for="(time, index) in xAxisLabels" :key="'x-' + index">
                <line :x1="time.x" y1="10" :x2="time.x" :y2="graphHeight - 30" stroke="rgb(40, 40, 40)"
                  stroke-width="1" /> <text :x="time.x" :y="graphHeight - 15" text-anchor="middle" font-size="14"
                  fill="#fff"> {{ time.label }} </text>
              </g>
              <polyline :points="generatePolylinePoints()" fill="none" stroke="#67ea94" stroke-width="2" />
              <circle v-for="(point, index) in processedData" :key="'point-' + index" :cx="point.x" :cy="point.y" r="4"
                fill="#67ea94" />
            </svg> </div>
        </div>
      </div>
    </div>
</template>

<script setup>
import { useMeshDataStore } from '@/stores/meshDataStore';
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';

let intervalId;
const meshDataStore = useMeshDataStore();
const elapsedSeconds = ref(0);
const traceRoutesVisible = ref(false);
const selectedTraceRoute = ref([]);
const selectedMasterNode = ref(useMeshDataStore().nodesIndex[0]);
const selectedNode = ref(null);
const selectedDetails = ref(null);
const nodeOptionsVisible = ref(false);
const enableMasters = ref(false);
const nodeImages = ref(['HELTEC_V3', 'TBEAM', 'T_ECHO', 'T_DECK', 'TRACKER_T1000_E']);
const graphWidth = 600;
const graphHeight = 300;
const padding = { top: 10, bottom: 30, left: 40, right: 18 };

const processedData = computed(() => {
  const data = getBatteryLevelHistory(selectedNode.value);
  if (!data.length) return [];
  const minValue = 0;
  const maxValue = 100;
  const timeRange = [
    Math.min(...data.map((entry) => entry.timestamp)),
    Math.max(...data.map((entry) => entry.timestamp)),
  ];
  return data.map((entry) => {
    const x =
      padding.left +
      ((entry.timestamp - timeRange[0]) /
        (timeRange[1] - timeRange[0])) *
      (graphWidth - padding.left - padding.right);
    const y =
      graphHeight -
      padding.bottom -
      ((entry.state - minValue) / (maxValue - minValue)) *
      (graphHeight - padding.top - padding.bottom);
    return { x, y };
  });
});

const yAxisLabels = computed(() => {
  const levels = [25, 50, 75, 100];
  return levels.map((level) => ({
    label: `${level}%`,
    y:
      graphHeight -
      padding.bottom -
      (level / 100) * (graphHeight - padding.top - padding.bottom),
  }));
});

const xAxisLabels = computed(() => {
  const data = getBatteryLevelHistory(selectedNode.value);
  if (!data.length) return [];
  const timeRange = [
    Math.min(...data.map((entry) => entry.timestamp)),
    Math.max(...data.map((entry) => entry.timestamp)),
  ];
  const step = (timeRange[1] - timeRange[0]) / 4;
  const labels = [];
  for (let i = 0; i <= 4; i++) {
    const timestamp = timeRange[0] + i * step;
    labels.push({
      label: formatTimeOnly(timestamp),
      x:
        padding.left +
        ((timestamp - timeRange[0]) /
          (timeRange[1] - timeRange[0])) *
        (graphWidth - padding.left - padding.right),
    });
  }
  return labels;
});

const generatePolylinePoints = () => {
  return processedData.value
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
};

const formatTimeOnly = (timestamp) => {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const selectMasterNode = (nodeId) => {
  selectedMasterNode.value = nodeId;
  localStorage.setItem('masterNode', nodeId);
}

const copy = (copyValue) => {
  navigator.clipboard.writeText(copyValue)
}

const selectNode = (nodeId) => {
  if (nodeId === selectedNode.nodeId) {
    selectedNode.value = null;
    nodeOptionsVisible.value = false;
    selectedDetails.value = false;
  } else {
    selectedNode.value = nodeId;
    nodeOptionsVisible.value = true;
  }
};

const selectDetails = (type) => {
  selectedDetails.value = type;
  nodeOptionsVisible.value = false;

  if (type === 'Traceroutes') {
    meshDataStore.data[selectedMasterNode.value].traceroutes.forEach((tr) => {
      if (tr.nodeId === selectedNode.value) {
        selectedTraceRoute.value = tr.traces;
        traceRoutesVisible.value = true;
        window.scrollTo(0, 0);
      }
    });
  }
}

const close = () => {
  selectedNode.value = null;
  nodeOptionsVisible.value = false;
  selectedDetails.value = false;
}

const getBatteryLevelHistory = (nodeId) => {
  const node = meshDataStore.data[selectedMasterNode.value].knownNodes.find(
    (node) => node.id === nodeId
  );
  return node?.power?.batteryLevel || [];
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
  position: relative;
  overflow: hidden;

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

  &__actions {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background-color: rgba(40, 40, 40, 0.5);
    backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    
    &--headline {
      padding: 24px;
      font-weight: bold;
      font-size: 18px;
      text-align: center;
      user-select: none;
    }

    &--options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px 24px;

      &__item {
        background-color: rgb(25, 25, 25);
        padding: 12px;
        border-radius: 3px;
        user-select: none;
        cursor: pointer;
        text-align: center;
      }
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

.details {
  margin: 12px;
  padding: 12px 0;
  border-radius: 3px;
  position: relative;

  &__headline {
    font-weight: bold;
    font-size: 22px;
    margin-bottom: 24px;
  }
}

.close {
  width: 20px;
  height: 20px;
  position: absolute;
  top: 12px;
  right: 12px;
  background-image: url('/src/assets/icons/x.svg');
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center center;
  cursor: pointer;

  &__moremargin {
    top: 24px;
    right: 24px;
  }
}

.traceroutes {
  margin-bottom: 28px;

  &__time {
    font-weight: bold;
    margin-bottom: 6px;
  }

  &__row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px dotted #fff;
    padding: 6px 0;

    &--key {
      font-weight: bold;
      width: 20%;
      min-width: 132px;
      white-space: nowrap;
    }

    &--value {
      width: 80%;
    }
  }
}

.graph {
  max-width: 820px;
}

</style>
