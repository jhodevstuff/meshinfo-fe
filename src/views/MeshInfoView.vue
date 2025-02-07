<template>
  <div>
    <div class="nodes" v-if="selectedMasterNode">
      <div class="nodes__info">
        <p v-if="meshDataStore.data[selectedMasterNode]">
          Nodes gesamt: {{ meshDataStore.data[selectedMasterNode].knownNodes.length }}
        </p>
        <div class="nodes__info--update">
          <p>{{ elapsedSeconds }}</p>
          <p>Sekunden seit Update {{ elapsedSeconds > 3600 ? '👀' : null }}</p>
        </div>
      </div>
      <div class="master-nodes" v-if="enableMasters">
        <div class="master-nodes__container">
          <div
            class="master-nodes__option"
            v-for="masterNode in filteredMasters"
            :key="masterNode"
            :class="(selectedMasterNode == masterNode && meshDataStore.nodesIndex.length > 1) && 'master-nodes__selected'"
            @click="selectMasterNode(masterNode)"
          >
            <p class="master-nodes__option--label">
              {{ masterNode }} ({{ meshDataStore.data[masterNode]?.knownNodes?.[0]?.shortName || '----' }})
            </p>
          </div>
        </div>
      </div>
      <div class="filter">
        <div
          class="filter__item"
          v-for="filter in userFilters"
          :key="filter.id"
          :class="{ 'filter__item--active': selectedFilterId === filter.id }"
          @mousedown="startPress(filter)"
          @touchstart="startPress(filter)"
          @mouseup="cancelPress"
          @mouseleave="cancelPress"
          @touchend="cancelPress"
          @touchcancel="cancelPress"
          @click="chooseFilter(filter)"
          @contextmenu.prevent="tryOpenFilterOverlay(filter)"
        >
          {{ filter.name }}
        </div>
        <div class="filter__item filter__item--add" @click="openFilterOverlay(null)">+</div>
      </div>
      <div class="loading" v-if="selectedMasterNode === '!ffffffff'">
        Daten werden geladen, bitte warten...
      </div>
      <div class="data-wrapper">
        <div class="details-nodelist" v-if="selectedDetails">
          <div
            class="details-nodelist__node"
            :class="{ 'details-nodelist__node--selected': node.id === selectedNode }"
            v-for="node in filteredAndSortedNodes"
            :key="node.id"
            @click="selectNode(node.id)"
            @click.stop="selectDetails('Gesehen')"
          >
            {{ node.longName }}
          </div>
        </div>
        <div class="data">
          <div class="nodes__list" v-show="settingsStore.viewMode === 'normal'">
            <div
              class="node"
              v-for="node in filteredAndSortedNodes"
              :key="node.id"
              v-show="(node?.id === selectedNode && selectedDetails) || !selectedDetails"
              @click="selectNode(node.id)"
              @click.stop="selectDetails('Gesehen')"
            >
              <div
                v-if="node.id !== meshDataStore.data[selectedMasterNode].info.infoFrom"
                :class="['node__online', getNodeStatus(node)]"
              ></div>
              <div class="node__icon">
                <div
                  v-if="nodeImages.includes(node.model)"
                  class="node__icon--img"
                  :style="'background-image: url(src/assets/devices/' + node.model + '.png)'"
                ></div>
                <div
                  v-if="!nodeImages.includes(node.model)"
                  class="node__icon--img"
                  :style="'background-image: url(src/assets/devices/unknown.svg); background-size: 50%;'"
                ></div>
                <p>{{ modelShortNames[node.model] || node.model }}</p>
              </div>
              <div class="node__info">
                <div class="node__info--block">
                  <p class="bold large">{{ node.id }}</p>
                  <p
                    v-if="node.id === meshDataStore.data[selectedMasterNode].info.infoFrom"
                    class="bold superlarge lefttop"
                  >
                    🛸
                  </p>
                </div>
                <div class="node__info--block">
                  <p>👔 {{ node.longName }}</p>
                  <p class="bold">{{ node.shortName }}</p>
                </div>
                <div class="node__info--block" v-if="node.batteryLevel || node.voltage">
                  <p v-if="node.batteryLevel">
                    {{ (node.batteryLevel < 35) ? '🪫' : '🔋' }}
                    {{ node.batteryLevel > 100 ? "100" : node.batteryLevel }} %
                  </p>
                  <p v-if="node.voltage <= 0 && node.batteryLevel >= 100">🔌</p>
                  <p v-else-if="node.voltage">⚡️ {{ node.voltage >= 0 ? node.voltage : 0 }} V</p>
                </div>
                <div class="node__info--block" v-if="node.lastHeard || getLastTraceTimestamp(node.id)">
                  <p v-if="node.lastHeard">⏳ {{ formatTimestamp(node.lastHeard) }}</p>
                  <p v-if="getLastTraceTimestamp(node.id)">🔭 {{ getLastTraceTimestamp(node.id) }}</p>
                </div>
                <div class="node__info--block" v-if="node.snr || node.hops">
                  <p v-if="node.snr">📡 {{ node.snr }} dB</p>
                  <p v-if="node.id !== meshDataStore.data[selectedMasterNode].info.infoFrom">
                    🦘 {{ node.hops }} {{ node.hops === 1 ? 'Hop' : 'Hops' }}
                  </p>
                </div>
                <div class="node__info--block" v-if="node.lat && node.lon">
                  <p>
                    🌍
                    <a
                      v-if="settingsStore.verificationMode"
                      :href="`https://www.google.com/maps?q=${node.lat},${node.lon}`"
                      target="_blank"
                    >
                      {{ node.lat }}, {{ node.lon }}
                    </a>
                    <span v-else>Bitte erst verifizieren</span>
                  </p>
                </div>
                <p v-if="node.publicKey" class="node__info--block">
                  <a href="#" @click="copy(node.publicKey)">🔑 PublicKey kopieren</a>
                </p>
              </div>
              <div
                class="node__actions"
                v-if="
                  selectedNode === node.id &&
                  nodeOptionsVisible &&
                  (node.power.batteryLevel.length > 1 || getLastTraceTimestamp(node.id) || node.online.length > 1) &&
                  selectedDetails == ''
                "
              >
                <div class="close close__moremargin" @click.stop="close"></div>
                <p class="node__actions--headline">Verfügbare Details</p>
                <div class="node__actions--options">
                  <div
                    class="node__actions--options__item"
                    v-if="node.online.length > 1"
                    @click.stop="selectDetails('Gesehen')"
                  >
                    ⏳ Gesehen
                  </div>
                  <div
                    class="node__actions--options__item"
                    v-if="node.power.batteryLevel.length > 1 || node.power.voltage.length > 1"
                    @click.stop="selectDetails('Stromversorgung')"
                  >
                    ⚡️ Stromversorgung
                  </div>
                  <div
                    class="node__actions--options__item"
                    v-if="getLastTraceTimestamp(node.id)"
                    @click.stop="selectDetails('Traceroutes')"
                  >
                    🔭 Traceroutes
                  </div>
                  <div
                    class="node__actions--options__item"
                    v-if="node.lat && node.lon"
                    @click.stop="selectDetails('Position')"
                  >
                    🌍 Position
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="nodes__list nodes__list--compact" v-show="settingsStore.viewMode === 'compact'">
            <div
              class="node node__compact"
              v-for="node in filteredAndSortedNodes"
              :key="node.id"
              v-show="(node?.id === selectedNode && selectedDetails) || !selectedDetails"
              @click="selectNode(node.id)"
              @click.stop="selectDetails('Gesehen')"
            >
              <div
                v-if="node.id !== meshDataStore.data[selectedMasterNode].info.infoFrom"
                :class="['node__online node__online--compact', getNodeStatus(node)]"
              ></div>
              <div class="node__info--block node__info--block__compact">
                <p>{{ node.longName }}</p>
                <p class="bold">{{ node.shortName }}</p>
              </div>
            </div>
          </div>
          <div class="details" v-if="selectedDetails">
            <div
              class="details__actions"
              v-for="node in meshDataStore.data[selectedMasterNode].knownNodes"
              :key="node.id"
              v-show="(node?.id === selectedNode && selectedDetails) || !selectedDetails"
              @click="selectNode(node.id)"
            >
              <div
                class="details__actions--item"
                :class="selectedDetails === 'Gesehen' && 'details__actions--item__selected'"
                v-if="node.online.length > 1"
                @click.stop="selectDetails('Gesehen')"
              >
                ⏳ Gesehen
              </div>
              <div
                class="details__actions--item"
                :class="selectedDetails === 'Stromversorgung' && 'details__actions--item__selected'"
                v-if="node.power.batteryLevel.length > 1 || node.power.voltage.length > 1"
                @click.stop="selectDetails('Stromversorgung')"
              >
                ⚡️ Stromversorgung
              </div>
              <div
                class="details__actions--item"
                :class="selectedDetails === 'Traceroutes' && 'details__actions--item__selected'"
                v-if="getLastTraceTimestamp(node.id)"
                @click.stop="selectDetails('Traceroutes')"
              >
                🔭 Traceroutes
              </div>
              <div
                class="details__actions--item"
                :class="selectedDetails === 'Position' && 'details__actions--item__selected'"
                v-if="node.lat && node.lon"
                @click.stop="selectDetails('Position')"
              >
                🌍 Position
              </div>
            </div>
            <p class="details__headline">{{ selectedDetails }}</p>
            <div class="close close__larger" @click.stop="close"></div>
            <div class="traceroutes-container" v-if="selectedTraceRoute && selectedDetails === 'Traceroutes'">
              <div v-for="(tr, index) in selectedTraceRoute" :key="index" class="traceroutes">
                <p class="traceroutes__time">
                  {{ getTraceTimestamp(tr.timeStamp) }} - Tracroute mit {{ tr.hops }}
                  {{ tr.hops === 1 ? 'Hop' : 'Hops' }}
                  {{ tr.hops === 0 ? '(direkt)' : '' }}
                </p>
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
            <div v-if="selectedDetails === 'Stromversorgung'" class="graphs">
              <div class="graph" v-if="processedData.length > 0">
                <p class="graph__headline">Akku</p>
                <svg
                  v-if="processedData.length"
                  :viewBox="`0 0 ${graphWidth} ${graphHeight}`"
                  preserveAspectRatio="xMidYMid meet"
                  width="100%"
                  height="auto"
                >
                  <g v-for="(level, index) in yAxisLabels" :key="'y-' + index">
                    <line x1="40" :y1="level.y" :x2="graphWidth - 10" :y2="level.y" stroke="rgb(40,40,40)" stroke-width="1" />
                    <text :x="30" :y="level.y + 4" text-anchor="end" font-size="12" fill="#fff">
                      {{ level.label }}
                    </text>
                  </g>
                  <g v-for="(time, index) in xAxisLabels" :key="'x-' + index">
                    <line :x1="time.x" y1="10" :x2="time.x" :y2="graphHeight - 30" stroke="rgb(40,40,40)" stroke-width="1" />
                    <text :x="time.x" :y="graphHeight - 28" text-anchor="middle" font-size="12" fill="#fff">
                      {{ time.date }}
                    </text>
                    <text :x="time.x" :y="graphHeight - 15" text-anchor="middle" font-size="14" fill="#fff">
                      {{ time.label }}
                    </text>
                  </g>
                  <template v-for="(seg, index) in batterySegments" :key="'seg-' + index">
                    <line :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2" :stroke="seg.color" stroke-width="2" />
                  </template>
                  <circle
                    v-for="(point, index) in processedData"
                    :key="'point-' + index"
                    :cx="point.x"
                    :cy="point.y"
                    r="4"
                    :fill="getBatteryColor(point.level)"
                    @mouseenter="showBatteryTooltip(point)"
                    @mouseleave="hideBatteryTooltip"
                    @touchstart="showBatteryTooltip(point)"
                    @touchend="hideBatteryTooltip"
                  />
                  <text
                    v-if="hoveredBatteryPoint"
                    :x="hoveredBatteryPoint.x + 10"
                    :y="hoveredBatteryPoint.y - 10"
                    font-size="12"
                    fill="#fff"
                    style="pointer-events: none;"
                  >
                    {{ hoveredBatteryPoint.level }}%
                  </text>
                </svg>
              </div>
              <div class="graph" v-if="processedVoltageData.length">
                <p class="graph__headline">Spannung</p>
                <svg
                  v-if="processedVoltageData.length"
                  :viewBox="`0 0 ${graphWidth} ${graphHeight}`"
                  preserveAspectRatio="xMidYMid meet"
                  width="100%"
                  height="auto"
                >
                  <g v-for="(level, index) in yAxisLabelsVoltage" :key="'vy-' + index">
                    <line x1="40" :y1="level.y" :x2="graphWidth - 10" :y2="level.y" stroke="rgb(40,40,40)" stroke-width="1" />
                    <text :x="30" :y="level.y + 4" text-anchor="end" font-size="12" fill="#fff">
                      {{ level.label }}
                    </text>
                  </g>
                  <g v-for="(time, index) in xAxisLabelsVoltage" :key="'vx-' + index">
                    <line :x1="time.x" y1="10" :x2="time.x" :y2="graphHeight - 30" stroke="rgb(40,40,40)" stroke-width="1" />
                    <text :x="time.x" :y="graphHeight - 28" text-anchor="middle" font-size="12" fill="#fff">
                      {{ time.date }}
                    </text>
                    <text :x="time.x" :y="graphHeight - 15" text-anchor="middle" font-size="14" fill="#fff">
                      {{ time.label }}
                    </text>
                  </g>
                  <template v-for="(seg, index) in voltageSegments" :key="'vseg-' + index">
                    <line :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2" stroke="#fff" stroke-width="2" />
                  </template>
                  <circle
                    v-for="(point, idx) in processedVoltageData"
                    :key="'volt-' + idx"
                    :cx="point.x"
                    :cy="point.y"
                    r="4"
                    :fill="getVoltageColor()"
                    @mouseenter="showVoltageTooltip(point)"
                    @mouseleave="hideVoltageTooltip"
                    @touchstart="showVoltageTooltip(point)"
                    @touchend="hideVoltageTooltip"
                  />
                </svg>
              </div>
            </div>
            <div v-if="selectedDetails === 'Gesehen'">
              <div class="online-state">
                <div class="online-state__left">
                  <div class="days">
                    <p class="days__item" v-for="day in getOnlineHistory(selectedNode).days">
                      {{ day }}
                    </p>
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
            <div class="tiny-map" v-if="selectedDetails === 'Position'">
              <TinyMap v-if="settingsStore.verificationMode" :node="getSelectedNode()" @openFullMap="openFullMap" />
              <p v-else>Bitte erst verifizieren</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="filter-overlay" v-if="showFilterOverlay">
      <div class="filter-overlay__head">
        <h2>{{ isEditing ? 'Filter bearbeiten' : 'Filter erstellen' }}</h2>
        <div class="close filter-overlay__close" @click.stop="closeOverlay"></div>
      </div>
      <div class="master-nodes margin-12" v-if="enableMasters">
        <div class="master-nodes__container">
          <div
            class="master-nodes__option"
            v-for="masterNode in filteredMasters"
            :key="masterNode"
            :class="(selectedMasterNode == masterNode && meshDataStore.nodesIndex.length > 1) && 'master-nodes__selected'"
            @click="selectMasterNode(masterNode)"
          >
            <p class="master-nodes__option--label">
              {{ masterNode }} ({{ meshDataStore.data[masterNode]?.knownNodes?.[0]?.shortName || '----' }})
            </p>
          </div>
        </div>
      </div>
      <div class="filter-overlay__actions">
        <div class="filter-overlay__actions--part">
          <input
            class="filter-overlay__actions--part__item"
            type="text"
            v-model="tempFilterName"
            :disabled="isDefaultFilter"
          />
        </div>
        <div class="filter-overlay__actions--part filter-overlay__actions--part__more">
          <div class="filter-overlay__actions--part__item" :class="overlaySaveClass" @click.stop="saveFilter">
            Speichern
          </div>
          <div
            class="filter-overlay__actions--part__item"
            v-if="isEditing && !isDefaultFilter"
            @click.stop="deleteFilter"
          >
            Löschen
          </div>
        </div>
      </div>
      <div class="filter-overlay__body">
        <div class="filter-overlay__body--list">
          <h3 class="filter-overlay__body--list__label">
            Angezeigte Nodes ({{ nodesInFilter.length }})
          </h3>
          <div
            class="filter-overlay__body--list__item"
            v-for="node in nodesInFilter"
            :key="node.id"
            @click="removeNodeFromFilter(node)"
          >
            {{ node.longName }}
          </div>
          <p v-if="nodesInFilter.length === 0">
            Wähle verfügbare Nodes um diese im Filter anzuzeigen.
          </p>
        </div>
        <div class="filter-overlay__body--list">
          <h3 class="filter-overlay__body--list__label">
            Verfügbar für Filter ({{ availableNodes.length }})
          </h3>
          <div
            class="filter-overlay__body--list__item"
            v-for="node in availableNodes"
            :key="node.id"
            @click="addNodeToFilter(node)"
          >
            {{ node.longName }}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div
    class="footnote"
    v-if="!selectedDetails && meshDataStore.data[selectedMasterNode] && !showFilterOverlay"
  >
    <p>meshinfo (frontend) version: 2024-02-04</p>
    <p>
      entwickelt mit ❤️ und 🍷 von
      <a href="http://github.com/jhodevstuff">joshua hoffmann</a>
    </p>
  </div>
</template>

<script setup>
import { useMeshDataStore } from '@/stores/meshDataStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'

import TinyMap from '@/components/TinyMap.vue'

let pressTimer = null
const pressDuration = 200

const startPress = (filter) => {
  pressTimer = setTimeout(() => {
    tryOpenFilterOverlay(filter)
  }, pressDuration)
}

const cancelPress = () => {
  if (pressTimer !== null) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

let intervalId

const meshDataStore = useMeshDataStore()
const settingsStore = useSettingsStore()
const onlineHistoryCache = new Map()
const router = useRouter()

const elapsedSeconds = ref(0)
const traceRoutesVisible = ref(false)
const selectedTraceRoute = ref([])
const selectedMasterNode = ref(useMeshDataStore().nodesIndex[0])
const selectedNode = ref(null)
const selectedDetails = ref('')
const nodeOptionsVisible = ref(false)
const enableMasters = ref(false)
const nodeImages = ref([
  'HELTEC_V3', 'TBEAM', 'T_ECHO',
  'T_DECK', 'TRACKER_T1000_E',
  'RAK4631', 'HELTEC_MESH_NODE_T114',
  'HELTEC_V2_1', 'SEEED_XIAO_S3',
  'NRF52_PROMICRO_DIY', 'HELTEC_WIRELESS_TRACKER',
  'RPI_PICO', 'RAK11310'
])
const originalViewMode = ref(null)
const userFilters = ref([])
const selectedFilter = ref(null)
const selectedFilterId = ref('')
const showFilterOverlay = ref(false)
const isEditing = ref(false)
const tempFilterIndex = ref(-1)
const tempFilterName = ref('')
const tempFilterNodeIds = ref([])
const isDefaultFilterFn = (filter) => {
  const idx = userFilters.value.findIndex(f => f.id === filter.id)
  return idx === 0
}
const cutOffMasterNodeHours = 1;
const cutoffMasterNode = Date.now() - cutOffMasterNodeHours * 60 * 60 * 1000;

const hoveredBatteryPoint = ref(null);
const hoveredVoltagePoint = ref(null);
let hideBatteryTimer = null;
let hideVoltageTimer = null;

const modelShortNames = {
  TRACKER_T1000_E: 'T1000E',
  HELTEC_V2_1: 'Heltec V2.1',
  HELTEC_V3: 'Heltec V3',
  TBEAM: 'T-Beam',
  T_ECHO: 'T-Echo',
  T_DECK: 'T-Deck',
  RAK4631: 'RAK4631',
  RAK11310: 'RAK11310',
  HELTEC_MESH_NODE_T114: 'Heltec T114',
  HELTEC_WIRELESS_TRACKER: 'Heltec Wireless Tracker',
  RPI_PICO: 'RPi Pico',
  NRF52_PROMICRO_DIY: 'NRF52 DIY',
  SEEED_XIAO_S3: 'XIAO S3',
  STATION_G2: 'Station G2',
  UNSET: '?',
  '69': 'UPDATE CLI!'
}

const getSelectedNode = () => {
  return meshDataStore.data[selectedMasterNode.value].knownNodes.find(n => n.id === selectedNode.value)
}

const openFullMap = (node) => {
  if (!node || !node.lat || !node.lon) return
  router.push({
    name: 'map',
    query: {
      focusNodeId: node.id,
      lat: node.lat,
      lon: node.lon,
      zoom: 16
    }
  })
}

const tryOpenFilterOverlay = (filter) => {
  if (isDefaultFilterFn(filter)) return
  openFilterOverlay(filter)
}

const availableNodes = computed(() => {
  const nodes = meshDataStore.data[selectedMasterNode.value]?.knownNodes || []
  return nodes.filter(n => !tempFilterNodeIds.value.includes(n.id))
})

const nodesInFilter = computed(() => {
  const nodes = meshDataStore.data[selectedMasterNode.value]?.knownNodes || []
  return nodes.filter(n => tempFilterNodeIds.value.includes(n.id))
})

const isDefaultFilter = computed(() => {
  if (tempFilterIndex.value === 0) return true
  return false
})

const overlaySaveClass = computed(() => {
  return isDefaultFilter.value ? 'details__actions--item__selected' : null
})

const loadLastFilterUsed = () => {
  const lastUsedId = localStorage.getItem('lastUsedFilter') || ''
  if (!lastUsedId) return
  const found = userFilters.value.find(f => f.id === lastUsedId)
  if (found) {
    selectedFilter.value = found
    selectedFilterId.value = found.id
  }
}

const openFilterOverlay = (filter) => {
  if (!filter) {
    isEditing.value = false
    tempFilterIndex.value = -1
    tempFilterName.value = 'Neuer Filter'
    tempFilterNodeIds.value = []
  } else {
    isEditing.value = true
    const idx = userFilters.value.findIndex(f => f.id === filter.id)
    tempFilterIndex.value = idx
    tempFilterName.value = filter.name
    tempFilterNodeIds.value = [...(filter.nodeIds || [])]
  }
  showFilterOverlay.value = true
}

const addNodeToFilter = (node) => {
  if (!tempFilterNodeIds.value.includes(node.id)) {
    tempFilterNodeIds.value.push(node.id)
  }
}

const removeNodeFromFilter = (node) => {
  tempFilterNodeIds.value = tempFilterNodeIds.value.filter(id => id !== node.id)
}

const saveFilter = () => {
  if (isDefaultFilter.value) return
  const name = tempFilterName.value.trim()
  if (!name) return
  let thisFilterId
  if (isEditing.value && tempFilterIndex.value >= 0) {
    thisFilterId = userFilters.value[tempFilterIndex.value].id
  } else {
    thisFilterId = `filter_${Date.now()}`
  }
  const newFilter = {
    id: thisFilterId,
    name: name,
    nodeIds: [...tempFilterNodeIds.value]
  }
  if (isEditing.value && tempFilterIndex.value >= 0) {
    userFilters.value[tempFilterIndex.value] = newFilter
  } else {
    userFilters.value.push(newFilter)
  }
  selectedFilter.value = newFilter
  selectedFilterId.value = newFilter.id
  localStorage.setItem('lastUsedFilter', newFilter.id)
  saveFiltersToStorage()
  closeOverlay()
}

const deleteFilter = () => {
  if (!isEditing.value) return
  if (tempFilterIndex.value < 0) return
  if (isDefaultFilter.value) return
  userFilters.value.splice(tempFilterIndex.value, 1)
  saveFiltersToStorage()
  closeOverlay()
}

const closeOverlay = () => {
  showFilterOverlay.value = false
}

const filteredAndSortedNodes = computed(() => {
  let arr = sortedNodes.value
  if (!selectedFilter.value) return arr
  if (!selectedFilter.value.nodeIds || !selectedFilter.value.nodeIds.length) {
    return arr
  }
  return arr.filter(node => selectedFilter.value.nodeIds.includes(node.id))
})

const loadFiltersFromStorage = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('myNodeFilters') || '[]')
    userFilters.value = Array.isArray(saved)
      ? saved.map((f, idx) => {
          if (!f.id) {
            f.id = `filter_${idx + 1}`
          }
          return f
        })
      : []
  } catch (err) {
    userFilters.value = []
  }
}

const saveFiltersToStorage = () => {
  localStorage.setItem('myNodeFilters', JSON.stringify(userFilters.value))
}

const chooseFilter = (filter) => {
  selectedFilter.value = filter
  selectedFilterId.value = filter.id
  localStorage.setItem('lastUsedFilter', filter.id)
}

const sortedNodes = computed(() => {
  const nodes = meshDataStore.data[selectedMasterNode.value]?.knownNodes || []
  const masterNodeId = meshDataStore.data[selectedMasterNode.value]?.info?.infoFrom
  let arr
  if (settingsStore.sortMode === 'lastHeard') {
    arr = [...nodes].sort((a, b) => (b.lastHeard || 0) - (a.lastHeard || 0))
  } else {
    arr = [...nodes]
  }
  if (masterNodeId) {
    const index = arr.findIndex(n => n.id === masterNodeId)
    if (index > 0) {
      const [masterNode] = arr.splice(index, 1)
      arr.unshift(masterNode)
    }
  }
  return arr
})

const showVoltageTooltip = (point) => {
  hoveredVoltagePoint.value = point
  clearTimeout(hideVoltageTimer)
  hideVoltageTimer = setTimeout(() => {
    hoveredVoltagePoint.value = null
  }, 3000)
}

const hideVoltageTooltip = () => {
  hoveredVoltagePoint.value = null
  clearTimeout(hideVoltageTimer)
}

const getVoltageColor = () => '#fff'

const voltageSegments = computed(() => {
  const data = processedVoltageData.value
  const segs = []
  for (let i = 0; i < data.length - 1; i++) {
    const p1 = data[i]
    const p2 = data[i + 1]
    segs.push({
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y
    })
  }
  return segs
})

const getVoltageHistory = (nodeId) => {
  const node = meshDataStore.data[selectedMasterNode.value].knownNodes.find(n => n.id === nodeId)
  return node?.power?.voltage || []
}

const processedVoltageData = computed(() => {
  const data = getVoltageHistory(selectedNode.value)
  if (!data.length) return []
  const minValue = 0
  const maxValue = 5
  const timeRange = [
    Math.min(...data.map(e => e.timestamp)),
    Math.max(...data.map(e => e.timestamp))
  ]
  return data.map(entry => {
    const x = padding.left
      + ((entry.timestamp - timeRange[0]) / (timeRange[1] - timeRange[0]))
      * (graphWidth - padding.left - padding.right)
    const y = graphHeight - padding.bottom
      - ((entry.state - minValue) / (maxValue - minValue))
      * (graphHeight - padding.top - padding.bottom)
    return { x, y }
  })
})

const yAxisLabelsVoltage = computed(() => {
  const steps = [0, 1, 2, 3, 4, 5]
  return steps.map(step => ({
    label: `${step}V`,
    y: graphHeight - padding.bottom
      - ((step - 0) / (5 - 0))
      * (graphHeight - padding.top - padding.bottom)
  }))
})

const xAxisLabelsVoltage = computed(() => {
  const data = getVoltageHistory(selectedNode.value)
  if (!data.length) return []
  const timeRange = [
    Math.min(...data.map(e => e.timestamp)),
    Math.max(...data.map(e => e.timestamp))
  ]
  const step = (timeRange[1] - timeRange[0]) / 4
  const labels = []
  for (let i = 0; i <= 4; i++) {
    const timestamp = timeRange[0] + i * step
    labels.push({
      date: formatDayMonth(timestamp),
      label: formatTimeOnly(timestamp),
      x: padding.left
        + ((timestamp - timeRange[0]) / (timeRange[1] - timeRange[0]))
        * (graphWidth - padding.left - padding.right)
    })
  }
  return labels
})

const graphWidth = 600
const graphHeight = 300
const padding = { top: 10, bottom: 30, left: 40, right: 18 }

const formatDayMonth = (timestamp) => {
  const d = new Date(timestamp)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}.`
}

const processedData = computed(() => {
  const data = getBatteryLevelHistory(selectedNode.value)
  if (!data.length) return []
  const minValue = 0
  const maxValue = 100
  const timeRange = [
    Math.min(...data.map(e => e.timestamp)),
    Math.max(...data.map(e => e.timestamp))
  ]
  return data.map(entry => {
    const x = padding.left
      + ((entry.timestamp - timeRange[0]) / (timeRange[1] - timeRange[0]))
      * (graphWidth - padding.left - padding.right)
    const y = graphHeight - padding.bottom
      - ((entry.state - minValue) / (maxValue - minValue))
      * (graphHeight - padding.top - padding.bottom)
    return {
      x,
      y,
      level: entry.state
    }
  })
})

const showBatteryTooltip = (point) => {
  hoveredBatteryPoint.value = point
  clearTimeout(hideBatteryTimer)
  hideBatteryTimer = setTimeout(() => {
    hoveredBatteryPoint.value = null
  }, 3000)
}

const hideBatteryTooltip = () => {
  hoveredBatteryPoint.value = null
  clearTimeout(hideBatteryTimer)
}

const getBatteryColor = (level) => {
  const hue = 120 * (level / 100)
  return `hsl(${hue}, 100%, 50%)`
}

const batterySegments = computed(() => {
  const data = processedData.value
  const segs = []
  for (let i = 0; i < data.length - 1; i++) {
    const p1 = data[i]
    const p2 = data[i + 1]
    const avgLevel = (p1.level + p2.level) / 2
    segs.push({
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      color: getBatteryColor(avgLevel)
    })
  }
  return segs
})

const yAxisLabels = computed(() => {
  const levels = [25, 50, 75, 100]
  return levels.map(level => ({
    label: `${level}%`,
    y: graphHeight - padding.bottom
      - (level / 100) * (graphHeight - padding.top - padding.bottom)
  }))
})

const xAxisLabels = computed(() => {
  const data = getBatteryLevelHistory(selectedNode.value)
  if (!data.length) return []
  const timeRange = [
    Math.min(...data.map(e => e.timestamp)),
    Math.max(...data.map(e => e.timestamp))
  ]
  const step = (timeRange[1] - timeRange[0]) / 4
  const labels = []
  for (let i = 0; i <= 4; i++) {
    const timestamp = timeRange[0] + i * step
    labels.push({
      date: formatDayMonth(timestamp),
      label: formatTimeOnly(timestamp),
      x: padding.left
        + ((timestamp - timeRange[0]) / (timeRange[1] - timeRange[0]))
        * (graphWidth - padding.left - padding.right)
    })
  }
  return labels
})

const formatTimeOnly = (timestamp) => {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const filteredMasters = computed(() => {
  return meshDataStore.nodesIndex.filter(masterNodeId => {
    let masterNode = null;
    meshDataStore.data[masterNodeId]?.knownNodes?.forEach((knownNode) => {
      if (knownNode?.id === meshDataStore.data[masterNodeId]?.info.infoFrom) {
        masterNode = knownNode;
      }
    })
    if (!masterNode || masterNode.lastHeard === undefined) return false;
    return masterNode.lastHeard >= cutoffMasterNode;
  })
})

const selectMasterNode = (nodeId) => {
  selectedMasterNode.value = nodeId
  localStorage.setItem('masterNode', nodeId)
}

const copy = (copyValue) => {
  navigator.clipboard.writeText(copyValue)
}

const selectNode = (nodeId) => {
  if (nodeId === selectedNode.nodeId) {
    selectedNode.value = null
    nodeOptionsVisible.value = false
    selectedDetails.value = false
  } else {
    selectedNode.value = nodeId
    nodeOptionsVisible.value = true
  }
}

const selectDetails = (type) => {
  selectedDetails.value = type
  nodeOptionsVisible.value = false
  if (originalViewMode.value === null) {
    originalViewMode.value = settingsStore.viewMode
  }
  if (settingsStore.viewMode === 'compact') {
    settingsStore.setViewMode('normal')
  }
  if (type === 'Traceroutes') {
    meshDataStore.data[selectedMasterNode.value].traceroutes.forEach((tr) => {
      if (tr.nodeId === selectedNode.value) {
        selectedTraceRoute.value = tr.traces
        traceRoutesVisible.value = true
        window.scrollTo(0, 0)
      }
    })
  }
}

const close = () => {
  selectedNode.value = null
  nodeOptionsVisible.value = false
  selectedDetails.value = false
  if (originalViewMode.value !== null) {
    settingsStore.setViewMode(originalViewMode.value)
    originalViewMode.value = null
  }
}

const getBatteryLevelHistory = (nodeId) => {
  const node = meshDataStore.data[selectedMasterNode.value].knownNodes.find(
    n => n.id === nodeId
  )
  return node?.power?.batteryLevel || []
}

const getOnlineHistory = (nodeId) => {
  const cacheKey = selectedMasterNode.value + '#' + nodeId
  if (onlineHistoryCache.has(cacheKey)) return onlineHistoryCache.get(cacheKey)
  if (onlineHistoryCache.has(nodeId)) return onlineHistoryCache.get(nodeId)

  const node = meshDataStore.data[selectedMasterNode.value].knownNodes.find(
    n => n.id === nodeId
  )
  if (!node) return { days: [], times: [] }

  if (!node._onlineFormatted) {
    node._onlineFormatted = node.online.map(ts => formatOnlineTimestamp(ts))
  }

  let onlineGraphNew = { days: [], times: [] }
  let daysMap = new Map()
  node._onlineFormatted.forEach((ts) => {
    const key = ts.day + '.' + ts.month + '.'
    if (!daysMap.has(key)) {
      daysMap.set(key, new Array(24).fill(false))
      onlineGraphNew.days.push(key)
    }
    const arr = daysMap.get(key)
    arr[parseInt(ts.hours, 10)] = true
    daysMap.set(key, arr)
  })

  onlineGraphNew.times = [...daysMap.values()]
  onlineHistoryCache.set(cacheKey, onlineGraphNew)
  return onlineGraphNew
}

const formatRoute = (nodeIds) => {
  return nodeIds
    .map(id => {
      const node = meshDataStore.data[selectedMasterNode.value].knownNodes.find(n => n.id === id)
      return node ? `${id} (${node.shortName})` : id
    })
    .join(' → ')
}

const getLastTraceTimestampMillis = (nodeId) => {
  const traceroute = meshDataStore.data[selectedMasterNode.value].traceroutes.find(tr => tr.nodeId === nodeId)
  if (traceroute && traceroute.traces.length > 0) {
    return traceroute.traces[traceroute.traces.length - 1].timeStamp
  }
  return null
}

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} - ${hours}:${minutes}`
}

const formatOnlineTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return { day, month, year, hours, minutes }
}

const getNodeStatus = (node) => {
  const colorStatesHours = { green: 1.5, orange: 6 }
  const oneHour = 60 * 60 * 1000
  const recent = colorStatesHours.green * oneHour
  const long = colorStatesHours.orange * oneHour
  const currentTime = Date.now()
  const lastHeardTime = node.lastHeard ? node.lastHeard : null
  const lastTraceTime = getLastTraceTimestampMillis(node.id)
  const latestTime = Math.max(lastHeardTime || 0, lastTraceTime || 0)
  if (latestTime > currentTime - recent) {
    return 'node__online--short'
  } else if (latestTime > currentTime - long) {
    return 'node__online--recent'
  } else {
    return 'node__online--long'
  }
}

const getLastTraceTimestamp = (nodeId) => {
  const traceroute = meshDataStore.data[selectedMasterNode.value].traceroutes.find(tr => tr.nodeId === nodeId)
  if (traceroute && traceroute.traces.length > 0) {
    const lastTimestamp = traceroute.traces[traceroute.traces.length - 1].timeStamp
    return getTraceTimestamp(lastTimestamp)
  }
  return null
}

const getTraceTimestamp = (timeStamp) => {
  const date = new Date(timeStamp)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} - ${hours}:${minutes}`
}

const startTimer = () => {
  const nodeData = meshDataStore.data[selectedMasterNode.value]
  if (!nodeData?.info?.lastUpdated) {
    return
  }
  elapsedSeconds.value = Math.floor(
    (Date.now() - nodeData.info.lastUpdated) / 1000
  )
  clearInterval(intervalId)
  intervalId = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)
}

watch(() => meshDataStore.data[selectedMasterNode.value], startTimer)

watch(() => selectedMasterNode.value, () => {
  if (selectedDetails.value === 'Traceroutes') {
    const tr = meshDataStore.data[selectedMasterNode.value].traceroutes.find(
      x => x.nodeId === selectedNode.value
    )
    selectedTraceRoute.value = tr ? tr.traces : []
    traceRoutesVisible.value = !!tr
  }
})

onMounted(async () => {
  enableMasters.value = true
  loadFiltersFromStorage()
  if (!userFilters.value.length) {
    userFilters.value.push({
      id: 'filter_default',
      name: 'Alle Nodes',
      nodeIds: []
    })
    saveFiltersToStorage()
  }
  loadLastFilterUsed()
  if (!selectedFilter.value) {
    selectedFilter.value = userFilters.value[0]
    selectedFilterId.value = userFilters.value[0].id
  }
  while (!meshDataStore.isLoaded) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  const lastSelected = localStorage.getItem('masterNode')
  // funktioniert noch nicht so richtig
  if (
    lastSelected &&
    meshDataStore.nodesIndex.includes(lastSelected) &&
    filteredMasters.value.includes(lastSelected) &&
    lastSelected !== '!ffffffff'
  ) {
    selectedMasterNode.value = lastSelected
  } else {
    const validMasters = filteredMasters.value.filter(m => m !== '!ffffffff')
    if (validMasters.length) {
      selectedMasterNode.value = validMasters[0]
    }
  }
  if (
    meshDataStore.nodesIndex.includes('!ffffffff') &&
    selectedMasterNode.value === '!ffffffff'
  ) {
    const idx = meshDataStore.nodesIndex.indexOf('!ffffffff')
    if (idx < meshDataStore.nodesIndex.length - 1) {
      selectedMasterNode.value = meshDataStore.nodesIndex[idx + 1]
    }
  }
  startTimer()
})

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

  &__larger {
    padding-top: 12px; // just don't ask why
    width: 28px;
    height: 28px;
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

.graphs {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.graph {
  max-width: 820px;

  &__headline {
    font-size: 22px;
    margin-bottom: 10px;
  }
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
        background-color:  rgb(40, 40, 40);
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

.filter {
  display: flex;
  gap: 6px;
  font-size: 16px;

  &__item {
    background-color: rgb(40, 40, 40);
    padding: 12px 16px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 16px;
    transition: border 0.2s, background-color 0.2s;
    border: 1px solid rgb(40, 40, 40);
    user-select: none;
  }

  &__item--active {
    border: 1px solid rgb(80, 80, 80);
  }

  &__item--add {
    font-size: 22px;
    line-height: 16px;
  }
}

.filter-overlay {
  position: fixed;
  top: 60px;
  left: 0;
  width: 100%;
  height: calc(100% - 60px);
  background: #181818;
  display: flex;
  flex-direction: column;

  &__head {
    padding: 20px 12px;
    font-size: 20px;
    font-weight: bold;
    position: relative;

    .close {
      position: absolute;
      top: 20px;
      right: 12px;
      width: 24px;
      height: 24px;
      background: url('/src/assets/icons/x.svg') center/contain no-repeat;
      cursor: pointer;
    }
  }

  &__actions {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    &--part {
      display: flex;
      flex-direction: column;
      gap: 6px;

      &__more {
        flex-direction: row;
      }

      &__item {
        background-color: rgb(40, 40, 40);
        padding: 12px 16px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 16px;
      }

      input[type='text'] {
        padding: 12px 16px;
        color: #fff;
        border-radius: 3px;
        border: none;
        cursor: text;
      }
    }
  }

  &__body {
    flex: 1;
    display: flex;
    justify-content: space-between;
    padding: 24px 12px;
    gap: 12px;
    overflow: hidden;

    &--list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      max-height: 100%;
      overflow-y: scroll;

      &::-webkit-scrollbar {
        width: 8px;
      }

      &::-webkit-scrollbar-thumb {
        background-color: #888;
      }

      &::-webkit-scrollbar-track {
        background-color: #444;
      }

      &__label {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 12px;
      }

      &__item {
        background-color: rgb(40, 40, 40);
        padding: 8px;
        border-radius: 3px;
        cursor: pointer;
        margin-right: 6px;
      }
    }
  }
}

.margin-12 {
  margin: 0 12px;
}

.footnote {
  margin: 36px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
  opacity: 0.6;
  font-size: 12px !important;
  font-family: monospace;

  a {
    text-decoration: underline;
  }
}

.data-wrapper {
  display: flex;
  width: 100%;

  @media screen and (min-width: 1280px) {
    flex-direction: row;
    gap: 18px;
  }
}

.data {
  width: 100%;
}

.details-nodelist {
  width: 20%;
  display: none;

  @media screen and (min-width: 1280px) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    height: fit-content;
    max-height: 70vh;
    overflow-y: auto;
    border-radius: 3px;
    // background-color: rgb(40, 40, 40);
    padding: 4px 0;
  }

  &__node {
    font-size: 14px;
    padding: 8px 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: all 200ms ease-in-out;
    color: rgba($color: #ffffff, $alpha: 0.8);
    
    &--selected {
      margin: 0 0px;
      padding: 8px 8px;
      border-left: 2px solid rgb(255, 255, 255);
      font-weight: bold;
      color: rgba($color: #ffffff, $alpha: 1);
      background-color: rgba($color: #181818, $alpha: 0.5);
    }
  }
}

</style>
