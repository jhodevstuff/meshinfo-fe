<template>
  <div>
    <div class="nodes" v-if="selectedMasterNode">
      <div class="nodes__info">
        <p class="nodes__info--total">Nodes gesamt: {{ meshDataStore.data[selectedMasterNode].knownNodes.length }}</p>
        <div class="nodes__info--update">
          <p>{{ elapsedSeconds }}</p>
          <p>Sekunden seit Update {{ elapsedSeconds > 3600 ? '👀' : null }}</p>
        </div>
      </div>
      <div class="master-nodes" v-if="enableMasters">
        <div class="master-nodes__container">
          <div class="master-nodes__option" v-for="masterNode in filteredMasters" :key="masterNode"
            :class="(selectedMasterNode == masterNode && meshDataStore.nodesIndex.length > 1) && 'master-nodes__selected'"
            @click="selectMasterNode(masterNode)">
            <p class="master-nodes__option--label">
              {{ masterNode }} ({{ meshDataStore.data[masterNode]?.knownNodes?.[0]?.shortName || '----' }})
            </p>
          </div>
        </div>
      </div>
      <div class="nodes__list" v-show="settingsStore.viewMode === 'normal'">
        <div class="node" v-for="node in sortedNodes" :key="node.id"
          v-show="(node?.id === selectedNode && selectedDetails) || !selectedDetails" @click="selectNode(node.id)">
          <div v-if="node.id !== meshDataStore.data[selectedMasterNode].info.infoFrom"
            :class="['node__online', getNodeStatus(node)]"></div>
          <div class="node__icon">
            <div v-if="nodeImages.includes(node.model)" class="node__icon--img"
              :style="'background-image: url(src/assets/devices/' + node.model + '.png)'"></div>
            <div v-if="!nodeImages.includes(node.model)" class="node__icon--img"
              :style="'background-image: url(src/assets/devices/unknown.svg); background-size: 50%;'"></div>
            <p>{{ modelShortNames[node.model] || node.model }}</p>
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
              <p> 🌍 <a :href="`https://www.google.com/maps?q=${node.lat},${node.lon}`" target="_blank"> {{ node.lat }},
                  {{ node.lon }} </a> </p>
            </div>
            <p v-if="node.publicKey" class="node__info--block"> <a href="#" @click="copy(node.publicKey)"> 🔑 PublicKey
                kopieren </a> </p>
          </div>
          <div class="node__actions"
            v-if="selectedNode === node.id && nodeOptionsVisible && (node.power.batteryLevel.length > 1 || getLastTraceTimestamp(node.id) || node.online.length > 1) && selectedDetails == ''">
            <div class="close close__moremargin" @click.stop="close"></div>
            <p class="node__actions--headline">Verfügbare Details</p>
            <div class="node__actions--options">
              <div class="node__actions--options__item" v-if="node.online.length > 1"
                @click.stop="selectDetails('Online')">
                ⏳ Online</div>
              <div class="node__actions--options__item" v-if="node.power.batteryLevel.length > 1"
                @click.stop="selectDetails('Batteriestand')">{{ (node.batteryLevel < 35) ? '🪫' : '🔋' }}
                  Batteriestand</div>
                  <div class="node__actions--options__item" v-if="getLastTraceTimestamp(node.id)"
                    @click.stop="selectDetails('Traceroutes')">🔭 Traceroutes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="nodes__list nodes__list--compact" v-show="settingsStore.viewMode === 'compact'">
        <div class="node node__compact" v-for="node in sortedNodes" :key="node.id"
          v-show="(node?.id === selectedNode && selectedDetails) || !selectedDetails" @click="selectNode(node.id)"
          @click.stop="selectDetails('Wähle eine verfügbare Info')">
          <div v-if="node.id !== meshDataStore.data[selectedMasterNode].info.infoFrom"
            :class="['node__online node__online--compact', getNodeStatus(node)]">
          </div>
          <div class="node__info--block node__info--block__compact">
            <p>{{ node.longName }}</p>
            <p class="bold">{{ node.shortName }}</p>
          </div>
        </div>
      </div>
      <div class="details" v-if="selectedDetails">
        <div class="details__actions" v-for="node in meshDataStore.data[selectedMasterNode].knownNodes"
          v-show="(node?.id === selectedNode && selectedDetails) || !selectedDetails" @click="selectNode(node.id)">
          <div class="details__actions--item"
            :class="selectedDetails === 'Online' && 'details__actions--item__selected'" v-if="node.online.length > 1"
            @click.stop="selectDetails('Online')">⏳ Online</div>
          <div class="details__actions--item"
            :class="selectedDetails === 'Batteriestand' && 'details__actions--item__selected'"
            v-if="node.power.batteryLevel.length > 1" @click.stop="selectDetails('Batteriestand')">{{ (node.batteryLevel
            < 35) ? '🪫' : '🔋' }} Batteriestand</div>
              <div class="details__actions--item"
                :class="selectedDetails === 'Traceroutes' && 'details__actions--item__selected'"
                v-if="getLastTraceTimestamp(node.id)" @click.stop="selectDetails('Traceroutes')">🔭 Traceroutes</div>
          </div>
          <p class="details__headline">{{ selectedDetails }}</p>
          <div class="close" @click.stop="close"></div>
          <div class="traceroutes-container" v-if="selectedTraceRoute && selectedDetails === 'Traceroutes'">
            <div v-for="(tr, index) in selectedTraceRoute" :key="index" class="traceroutes">
              <p class="traceroutes__time">{{ getTraceTimestamp(tr.timeStamp) }} - Tracroute mit {{ tr.hops }} {{
                tr.hops
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
            <div class="graph">
              <svg v-if="processedData.length > 0" :viewBox="`0 0 ${graphWidth} ${graphHeight}`"
                preserveAspectRatio="xMidYMid meet" width="100%" height="auto">
                <g v-for="(level, index) in yAxisLabels" :key="'y-' + index">
                  <line x1="40" :y1="level.y" :x2="graphWidth - 10" :y2="level.y" stroke="rgb(40, 40, 40)"
                    stroke-width="1" />
                  <text :x="30" :y="level.y + 4" text-anchor="end" font-size="12" fill="#fff">
                    {{ level.label }}
                  </text>
                </g>
                <g v-for="(time, index) in xAxisLabels" :key="'x-' + index">
                  <line :x1="time.x" y1="10" :x2="time.x" :y2="graphHeight - 30" stroke="rgb(40, 40, 40)"
                    stroke-width="1" />
                  <text :x="time.x" :y="graphHeight - 28" text-anchor="middle" font-size="12" fill="#fff">
                    {{ time.date }}
                  </text>
                  <text :x="time.x" :y="graphHeight - 15" text-anchor="middle" font-size="14" fill="#fff">
                    {{ time.label }}
                  </text>
                </g>
                <polyline :points="generatePolylinePoints()" fill="none" stroke="#67ea94" stroke-width="2" />
                <circle v-for="(point, index) in processedData" :key="'point-' + index" :cx="point.x" :cy="point.y"
                  r="4" fill="#67ea94" />
              </svg>
            </div>
          </div>
          <div v-if="selectedDetails === 'Online'">
            <div class="online-state">
              <div class="online-state__left">
                <div class="days">
                  <p class="days__item" v-for="day in getOnlineHistory(selectedNode).days"> {{ day }}</p>
                </div>
              </div>
              <div class="online-state__right">
                <div class="hours">
                  <p class="hours__item">0</p>
                  <p class="hours__item">1</p>
                  <p class="hours__item">2</p>
                  <p class="hours__item">3</p>
                  <p class="hours__item">4</p>
                  <p class="hours__item">5</p>
                  <p class="hours__item">6</p>
                  <p class="hours__item">7</p>
                  <p class="hours__item">8</p>
                  <p class="hours__item">9</p>
                  <p class="hours__item">10</p>
                  <p class="hours__item">11</p>
                  <p class="hours__item">12</p>
                  <p class="hours__item">13</p>
                  <p class="hours__item">14</p>
                  <p class="hours__item">15</p>
                  <p class="hours__item">16</p>
                  <p class="hours__item">17</p>
                  <p class="hours__item">18</p>
                  <p class="hours__item">19</p>
                  <p class="hours__item">20</p>
                  <p class="hours__item">21</p>
                  <p class="hours__item">22</p>
                  <p class="hours__item">23</p>
                </div>
                <div class="fields">
                  <div class="fields__row" v-for="day in getOnlineHistory(selectedNode).times">
                    <div class="fields__row--item" v-for="h in day" :class="[h && 'state-online']"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
</template>

<script setup>
import { useMeshDataStore } from '@/stores/meshDataStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';

const meshDataStore = useMeshDataStore();
const settingsStore = useSettingsStore();
const onlineHistoryCache = new Map();

let intervalId;

const elapsedSeconds = ref(0);
const traceRoutesVisible = ref(false);
const selectedTraceRoute = ref([]);
const selectedMasterNode = ref(useMeshDataStore().nodesIndex[0]);
const selectedNode = ref(null);
const selectedDetails = ref('');
const nodeOptionsVisible = ref(false);
const enableMasters = ref(false);
const nodeImages = ref(['HELTEC_V3', 'TBEAM', 'T_ECHO', 'T_DECK', 'TRACKER_T1000_E', 'RAK4631', 'HELTEC_MESH_NODE_T114']);
const originalViewMode = ref(null);

const cutOffMasterNodeDays = 1;
const cutoffMasterNode = Date.now() - cutOffMasterNodeDays * 24 * 60 * 60 * 1000;

const modelShortNames = {
  TRACKER_T1000_E: 'T1000E',
  HELTEC_V3: 'Heltec V3',
  TBEAM: 'T-Beam',
  T_ECHO: 'T-Echo',
  T_DECK: 'T-Deck',
  RAK4631: 'RAK4631',
  HELTEC_MESH_NODE_T114: 'Heltec T114',
  HELTEC_WIRELESS_TRACKER: 'Heltec Wireless Tracker',
  RPI_PICO: 'RPi Pico',
  UNSET: '?'
}

const sortedNodes = computed(() => {
  const nodes = meshDataStore.data[selectedMasterNode.value]?.knownNodes || [];
  const masterNodeId = meshDataStore.data[selectedMasterNode.value]?.info?.infoFrom;
  let arr;
  if (settingsStore.sortMode === 'lastHeard') {
    arr = [...nodes].sort((a, b) => (b.lastHeard || 0) - (a.lastHeard || 0));
  } else {
    arr = [...nodes];
  }
  if (masterNodeId) {
    const index = arr.findIndex(n => n.id === masterNodeId);
    if (index > 0) {
      const [masterNode] = arr.splice(index, 1);
      arr.unshift(masterNode);
    }
  }
  return arr;
})

const graphWidth = 600;
const graphHeight = 300;
const padding = { top: 10, bottom: 30, left: 40, right: 18 };

function formatDayMonth(timestamp) {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.`;
}

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
})

const yAxisLabels = computed(() => {
  const levels = [25, 50, 75, 100];
  return levels.map((level) => ({
    label: `${level}%`,
    y:
      graphHeight -
      padding.bottom -
      (level / 100) * (graphHeight - padding.top - padding.bottom),
  }));
})

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
      date: formatDayMonth(timestamp),
      label: formatTimeOnly(timestamp),
      x:
        padding.left +
        ((timestamp - timeRange[0]) /
          (timeRange[1] - timeRange[0])) *
        (graphWidth - padding.left - padding.right),
    });
  }
  return labels;
})

const generatePolylinePoints = () => {
  return processedData.value
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

const formatTimeOnly = (timestamp) => {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const filteredMasters = computed(() => {
  return meshDataStore.nodesIndex.filter(masterNodeId => {
    const masterNode = meshDataStore.data[masterNodeId]?.knownNodes?.[0];
    if (!masterNode || !masterNode.lastHeard) return false;
    return masterNode.lastHeard >= cutoffMasterNode;
  });
})

const selectMasterNode = (nodeId) => {
  selectedMasterNode.value = nodeId;
  localStorage.setItem('masterNode', nodeId);
}

const copy = (copyValue) => {
  navigator.clipboard.writeText(copyValue);
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
}

const selectDetails = (type) => {
  selectedDetails.value = type;
  nodeOptionsVisible.value = false;
  if (originalViewMode.value === null) {
    originalViewMode.value = settingsStore.viewMode;
  }
  if (settingsStore.viewMode === 'compact') {
    settingsStore.setViewMode('normal');
  }
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
  if (originalViewMode.value !== null) {
    settingsStore.setViewMode(originalViewMode.value);
    originalViewMode.value = null;
  }
}

const getBatteryLevelHistory = (nodeId) => {
  const node = meshDataStore.data[selectedMasterNode.value].knownNodes.find(
    (node) => node.id === nodeId
  );
  return node?.power?.batteryLevel || [];
}

const getOnlineHistory = (nodeId) => {
  const cacheKey = selectedMasterNode.value + '#' + nodeId;
  if (onlineHistoryCache.has(cacheKey)) return onlineHistoryCache.get(cacheKey);
  if (onlineHistoryCache.has(nodeId)) return onlineHistoryCache.get(nodeId);

  const node = meshDataStore.data[selectedMasterNode.value].knownNodes.find(
    (node) => node.id === nodeId
  );
  if (!node) return { days: [], times: [] };

  if (!node._onlineFormatted) {
    node._onlineFormatted = node.online.map(ts => formatOnlineTimestamp(ts));
  }

  let onlineGraphNew = { days: [], times: [] };

  let daysMap = new Map();
  node._onlineFormatted.forEach((ts) => {
    const key = ts.day + '.' + ts.month + '.';
    if (!daysMap.has(key)) {
      daysMap.set(key, new Array(24).fill(false));
      onlineGraphNew.days.push(key);
    }
    const arr = daysMap.get(key);
    arr[parseInt(ts.hours, 10)] = true;
    daysMap.set(key, arr);
  });

  onlineGraphNew.times = [...daysMap.values()];
  onlineHistoryCache.set(cacheKey, onlineGraphNew);
  return onlineGraphNew;
}

const formatRoute = (nodeIds) => {
  return nodeIds
    .map(id => {
      const node = meshDataStore.data[selectedMasterNode.value].knownNodes.find(n => n.id === id);
      return node ? `${id} (${node.shortName})` : id;
    })
    .join(" → ");
}

const getLastTraceTimestampMillis = (nodeId) => {
  const traceroute = meshDataStore.data[selectedMasterNode.value].traceroutes.find(tr => tr.nodeId === nodeId);
  if (traceroute && traceroute.traces.length > 0) {
    return traceroute.traces[traceroute.traces.length - 1].timeStamp;
  }
  return null;
}

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} - ${hours}:${minutes}`;
}

const formatOnlineTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  const returnValue = {
    day: day,
    month: month,
    year: year,
    hours: hours,
    minutes: minutes
  }
  return returnValue;
}

const getNodeStatus = (node) => {
  const colorStatesHours = {
    green: 1.5,
    orange: 6
  };
  const oneHour = 60 * 60 * 1000;
  const recent = colorStatesHours.green * oneHour;
  const long = colorStatesHours.orange * oneHour;
  const currentTime = Date.now();
  const lastHeardTime = node.lastHeard ? node.lastHeard : null;
  const lastTraceTime = getLastTraceTimestampMillis(node.id);
  const latestTime = Math.max(lastHeardTime || 0, lastTraceTime || 0);
  if (latestTime > currentTime - recent) {
    return 'node__online--short';
  } else if (latestTime > currentTime - long) {
    return 'node__online--recent';
  } else {
    return 'node__online--long';
  }
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
}

onMounted(() => {
  startTimer();
  enableMasters.value = true;
})

watch(() => meshDataStore.data[selectedMasterNode.value], startTimer)

watch(
  () => selectedMasterNode.value,
  () => {
    if (selectedDetails.value === 'Traceroutes') {
      const tr = meshDataStore.data[selectedMasterNode.value]
        .traceroutes.find(x => x.nodeId === selectedNode.value);
      selectedTraceRoute.value = tr ? tr.traces : [];
      traceRoutesVisible.value = !!tr;
    }
  }
);

onUnmounted(() => clearInterval(intervalId))
</script>

<style lang="scss">
.nodes {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 12px;
  margin-top: 80px;

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

    &--compact {
      padding: 12px;
      grid-template-columns: repeat(1, 1fr) !important;
    }

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

  &__container {
    width: 100%;
    background-color: rgb(40, 40, 40);
    padding: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
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
    margin-left: 6px;
    margin-right: 6px;

    &--label {
      font-weight: normal;
      white-space: nowrap;
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

  &__compact {
    padding: 24px 12px;
    cursor: pointer;
  }

  &__online {
    position: absolute;
    top: 12px;
    left: 12px;
    height: 12px;
    width: 12px;
    border-radius: 100px;

    &--compact {
      top: 20px;
      height: 18px;
      width: 18px;
    }

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

      &__compact {
        margin-left: 32px;
        line-height: 12px;
      }
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
    
    &--compact {
      display: flex;
      flex-direction: row;
    }

    &--headline {
      padding: 16px 0;
      font-weight: bold;
      font-size: 18px;
      text-align: center;
      user-select: none;

      &__compact {
        line-height: 100%;
        font-size: 16px;
        padding: 24px 12px;
        display: flex;
        white-space: nowrap;
        flex-wrap: nowrap;
      }
    }

    &--options {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px 24px;

      &__compact {
        flex-direction: row;
        padding: 6px;
        margin-right: 56px;
      }

      &__item {
        background-color: rgb(25, 25, 25);
        padding: 12px;
        border-radius: 3px;
        user-select: none;
        cursor: pointer;
        text-align: center;

        &--compact {
          padding: 6px 12px;
          display: flex;
          vertical-align: middle;
          align-items: center;
        }
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
  margin: 0 12px;
  border-radius: 3px;
  position: relative;

  &__headline {
    font-weight: bold;
    font-size: 22px;
    margin-bottom: 18px;
  }

  &__actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin: 32px 0;
    margin-bottom: 28px;

    &--item {
      border: 1px solid rgb(40, 40, 40);
      background-color: rgb(40, 40, 40);
      padding: 10px 12px;
      font-size: 16px;
      border-radius: 3px;
      cursor: pointer;
      user-select: none;

      &__selected {
        border: 1px solid rgb(80, 80, 80);
      }
    }
  }
}

.close {
  width: 20px;
  height: 20px;
  position: absolute;
  top: 0;
  right: 0;
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

.traceroutes-container {
  display: flex;
  flex-direction: column-reverse;
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

.online-state {
  display: flex;
  flex-direction: row;
  gap: 16px;

  &__right {
    width: 100%;
    flex-shrink: 2;
  }

  .days {
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: flex-end;

    &__item {
      height: 16px;
      font-size: 14px;
      border-bottom: 1px solid rgb(40, 40, 40);
      margin-bottom: 6px;
      padding-bottom: 4px;
      padding-top: 2px;
    }
  }

  .hours {
    display: flex;
    justify-content: space-between;
    flex-direction: row;
    gap: 1px;
    margin-bottom: 12px;

    &__item {
      width: 16px;
      height: 16px;
      font-size: 14px;
      text-align: center;
    }
  }

  .fields {
    display: flex;
    flex-direction: column;

    &__row {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      gap: 1px;
      border-bottom: 1px solid rgb(40, 40, 40);
      margin-bottom: 6px;
      padding-bottom: 6px;

      &--item {
        background-color:  rgb(173, 66, 0);
        width: 16px;
        height: 16px;
        font-size: 14px;
        text-align: center;
        border-radius: 2px;
      }
    }
  }
}

.state-online {
  background-color: rgb(12, 123, 12) !important;
}

</style>
