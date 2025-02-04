<template>
  <div id="tiny-map" ref="mapEl" @click="handleClick"></div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from '@/assets/map/marker-icon.png'
import markerIcon2x from '@/assets/map/marker-icon-2x.png'
import markerShadow from '@/assets/map/marker-shadow.png'

const props = defineProps({
  node: { type: Object, required: true },
  zoom: { type: Number, default: 16 }
})
const emit = defineEmits(['openFullMap'])

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const mapEl = ref(null)
let map = null
let marker = null

const initMap = () => {
  if (!props.node.lat || !props.node.lon) return
  map = L.map(mapEl.value, {
    attributionControl: false,
    zoomControl: false
  }).setView([props.node.lat, props.node.lon], props.zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ''
  }).addTo(map)
  map.eachLayer(layer => {
    if (layer instanceof L.TileLayer) {
      layer.getContainer().style.filter = 'contrast(120%) brightness(85%) grayscale(70%) invert(100%) hue-rotate(180deg)'
    }
  })
  marker = L.marker([props.node.lat, props.node.lon]).addTo(map)
}

const handleClick = () => {
  emit('openFullMap', props.node)
}

onMounted(() => {
  initMap()
})

watch(() => props.node, (newVal) => {
  if (map && newVal.lat && newVal.lon) {
    map.setView([newVal.lat, newVal.lon], props.zoom)
    if (marker) marker.setLatLng([newVal.lat, newVal.lon])
  }
})
</script>

<style scoped>
#tiny-map {
  width: 100%;
  height: 400px;
  cursor: pointer;
  border-radius: 12px;
}
</style>
