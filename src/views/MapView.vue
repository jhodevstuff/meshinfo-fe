<template>
  <div id="map" ref="mapEl"></div>
  <div class="map-options">
    <div class="map-select">
      <div class="map-select__option map-select__option--left" :class="settingsStore.mapMode === 'defaultMap' && 'map-select__option--selected'" @click="selectSatMap(false)">Standart</div>
      <div class="map-select__option map-select__option--right" :class="settingsStore.mapMode === 'satMap' && 'map-select__option--selected'" @click="selectSatMap(true)">Satellit</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, nextTick, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from '@/assets/map/marker-icon.png'
import markerIcon2x from '@/assets/map/marker-icon-2x.png'
import markerShadow from '@/assets/map/marker-shadow.png'
import { useMeshDataStore } from '@/stores/meshDataStore'

const settingsStore = useSettingsStore()

const selectSatMap = (wantsSatMap) => {
  settingsStore.setMapMode(wantsSatMap ? 'satMap' : 'defaultMap')
}

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const MAX_AGE_HOURS = 36
const MIN_OPACITY = 0
const mapEl = ref(null)
let map = null
const meshDataStore = useMeshDataStore()

const formatTimestamp = (ts) => {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '-'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${hh}:${mm} - ${day}.${month}.`
}

const formatNodePopup = (node) => `
  <div>
    ${node.id}<br/>
    <strong>👔</strong> ${node.longName || '-'}<br/>
    <strong>⏳</strong> ${node.lastHeard ? formatTimestamp(node.lastHeard) : '-'}<br/>
    <strong>🔋</strong> ${node.batteryLevel ? node.batteryLevel + '%' : '-'}
  </div>
`

const getLineStyle = (deltaHours) => {
  if (deltaHours > MAX_AGE_HOURS) return null
  let opacity = 1 - deltaHours / MAX_AGE_HOURS
  if (opacity < MIN_OPACITY) opacity = MIN_OPACITY
  return { 
    color: '#fff', 
    opacity,
    weight: 5
  }
}

const createPairs = (arr) => {
  const pairs = []
  for (let i = 0; i < arr.length - 1; i++) {
    pairs.push([arr[i], arr[i + 1]])
  }
  return pairs
}

const median = (values) => {
  if (!values.length) return 0
  const arr = [...values].sort((a, b) => a - b)
  const mid = Math.floor(arr.length / 2)
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
}

const computeCenterIgnoringOutliers = (nodes) => {
  if (!nodes.length) return [48.132689, 11.549763]
  const latArr = nodes.map(n => n.lat)
  const lonArr = nodes.map(n => n.lon)
  return [median(latArr), median(lonArr)]
}

const mergedNodes = computed(() => {
  let dict = {}
  meshDataStore.nodesIndex.forEach(m => {
    const data = meshDataStore.data[m]?.knownNodes || []
    data.forEach(n => {
      if (n.lat && n.lon && !(n.lat === 0 && n.lon === 0)) {
        if (!dict[n.id] || n.lastHeard > (dict[n.id].lastHeard || 0)) {
          dict[n.id] = n
        }
      }
    })
  })
  return Object.values(dict)
})

const traceroutes = computed(() => {
  let allTr = []
  meshDataStore.nodesIndex.forEach(m => {
    const trs = meshDataStore.data[m]?.traceroutes || []
    trs.forEach(t => {
      if (!allTr.some(x => x.nodeId === t.nodeId && x.timeStamp === t.timeStamp)) {
        t.master = m
        allTr.push(t)
      }
    })
  })
  return allTr
})

onMounted(async () => {
  await nextTick()
  const [initialLat, initialLon] = computeCenterIgnoringOutliers(mergedNodes.value)
  map = L.map(mapEl.value).setView([initialLat, initialLon], 13)
  let currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map)
  const updateMapLayer = () => {
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer)
      }
    })
    if (settingsStore.mapMode === 'satMap') {
      currentTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://www.esri.com/de-DE/arcgis/products/arcgis-online">ESRI</a>'
      })
    } else {
      currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      })
    }
    currentTileLayer.addTo(map)
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        if (settingsStore.mapMode === 'satMap') {
          layer.getContainer().style.filter = 'contrast(95%) brightness(95%) grayscale(25%)';
        } else {
          layer.getContainer().style.filter = 'contrast(120%) brightness(85%) grayscale(70%) invert(100%) hue-rotate(180deg)';
        }
      }
    })
  }
  updateMapLayer()
  watch(() => settingsStore.mapMode, updateMapLayer)
  map.invalidateSize()
  mergedNodes.value.forEach(node => {
    L.marker([node.lat, node.lon])
      .addTo(map)
      .bindTooltip(node.shortName || node.id, {
        permanent: true,
        direction: 'bottom',
        offset: L.point(0, 6)
      })
      .openTooltip()
      .bindPopup(formatNodePopup(node))
  })
  traceroutes.value.forEach(tr => {
    tr.traces?.forEach(route => {
      const rawTs = route.timeStamp || tr.timeStamp
      if (!rawTs) return
      const routeTimeVal = parseInt(rawTs, 10)
      if (isNaN(routeTimeVal)) return
      const deltaHours = (Date.now() - routeTimeVal) / 3600000
      if (deltaHours < 0) return
      const style = getLineStyle(deltaHours)
      if (!style) return
      const masterToId = route.nodeTraceTo?.[0] || '-'
      const masterFromArr = route.nodeTraceFrom || []
      const masterFromId = masterFromArr.length ? masterFromArr[masterFromArr.length - 1] : '-'
      const masterToNode = mergedNodes.value.find(n => n.id === masterToId)
      const masterFromNode = mergedNodes.value.find(n => n.id === masterFromId)
      const masterToLabel = masterToNode ? `${masterToId} (${masterToNode.shortName || '—'})` : masterToId
      const masterFromLabel = masterFromNode ? `${masterFromId} (${masterFromNode.shortName || '—'})` : masterFromId
      const toPairs = createPairs(route.nodeTraceTo || [])
      toPairs.forEach(pair => {
        const nodeObjs = pair.map(id => mergedNodes.value.find(n => n.id === id)).filter(Boolean)
        if (nodeObjs.length === 2) {
          const [nodeA, nodeB] = nodeObjs
          const labelA = nodeA.id + ' (' + nodeA.shortName + ')' || nodeA.id
          const labelB = nodeB.id + ' (' + nodeB.shortName + ')' || nodeB.id
          const coords = [
            [nodeA.lat, nodeA.lon],
            [nodeB.lat, nodeB.lon]
          ]
          const popupText = `
            <div>
              <strong>${formatTimestamp(routeTimeVal)}</strong><br><br>
              ${labelA} → ${labelB}<br><br>
              <strong>Quelle:</strong> ${masterToLabel}
            </div>
          `
          L.polyline(coords, style).addTo(map).bindPopup(popupText)
        }
      })
      const fromPairs = createPairs(route.nodeTraceFrom || [])
      fromPairs.forEach(pair => {
        const nodeObjs = pair.map(id => mergedNodes.value.find(n => n.id === id)).filter(Boolean)
        if (nodeObjs.length === 2) {
          const [nodeA, nodeB] = nodeObjs
          const labelA = nodeA.id + ' (' + nodeA.shortName + ')' || nodeA.id
          const labelB = nodeB.id + ' (' + nodeB.shortName + ')' || nodeB.id
          const coords = [
            [nodeA.lat, nodeA.lon],
            [nodeB.lat, nodeB.lon]
          ]
          const popupText = `
            <div>
              <strong>${formatTimestamp(routeTimeVal)}</strong><br><br>
              ${labelA} → ${labelB}<br><br>
              <strong>Quelle:</strong> ${masterFromLabel}
            </div>
          `
          L.polyline(coords, style).addTo(map).bindPopup(popupText)
        }
      })
    })
  })
})
</script>

<style lang="scss" scoped>
#map {
  position: relative;
  width: 100%;
  height: calc(100vh - 60px);
  margin-top: 60px;
  background: #181818;
  z-index: 0;
}

.map-options {
  position: fixed;
  top: 60px;
  width: 100%;
  padding: 12px;
  z-index: 1;
  // background: rgba($color: #000000, $alpha: 0.8);
  // backdrop-filter: blur(4px);
  //   -webkit-backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
}

.map-select {
  display: flex;
  justify-content: center;
  border-radius: 100px;
  overflow: hidden;
  background-color: #181818;
  padding: 2px;
  -webkit-box-shadow: 0px 0px 10px 0px rgba(103,234,148,1);
  -moz-box-shadow: 0px 0px 10px 0px rgba(103,234,148,1);
  box-shadow: 0px 0px 10px 0px rgba(103,234,148,1);

  &__option {
    background: #67ea94;
    color: #000;
    padding: 6px 14px;
    cursor: pointer;
    user-select: none;
    border-radius: 100px;
    font-size: 14px;
    line-height: 18px;
    transition: all 300ms ease-in-out;

    &--left {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    &--right {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    &--selected {
      background: #181818;
      color: #67ea94;
      font-weight: bold;
    }
  }
}

</style>
