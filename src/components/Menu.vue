<template>
  <div class="header">
    <div class="header-row">
      <div class="header__left">
        <div class="header__logo" @click="clickLogo"></div>
        <div class="header__info">
          <h1 class="header__info--headline">eshinfo</h1>
          <p class="header__info--text">by Joshua Hoffmann</p>
        </div>
      </div>
      <div class="header__right">
        <div class="map" :class="{ closemap: isMapRoute }" @click="isMapRoute ? closeMap() : goMap()" v-show="settingsStore.verificationMode"></div>
        <div class="settings" @click="toggleSettings"></div>
      </div>
    </div>
    <div class="settings-panel" v-show="settingsVisible">
      <div class="settings-panel__option">
        <h1 class="settings-panel__option--title">Ansicht</h1>
        <label class="settings-panel__option--label">
          <input type="radio" value="normal" v-model="viewMode" @change="updateViewMode" />
          Normal
        </label>
        <label class="settings-panel__option--label">
          <input type="radio" value="compact" v-model="viewMode" @change="updateViewMode" />
          Kompakt
        </label>
      </div>
      <div class="settings-panel__option">
        <h1 class="settings-panel__option--title">Sortierung</h1>
        <label class="settings-panel__option--label">
          <input type="radio" value="lastHeard" v-model="sortMode" @change="updateSortMode" />
          Zuletzt online
        </label>
        <label class="settings-panel__option--label">
          <input type="radio" value="original" v-model="sortMode" @change="updateSortMode" />
          Zuerst gesehen
        </label>
      </div>
      <!-- <div class="settings-panel__option">
        <h1 class="settings-panel__option--title">Map</h1>
        <label class="settings-panel__option--label">
          <input type="radio" value="defaultMap" v-model="mapMode" @change="changeMapView" />
          Standart
        </label>
        <label class="settings-panel__option--label">
          <input type="radio" value="satMap" v-model="mapMode" @change="changeMapView" />
          Satellitenbild
        </label>
      </div> -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'

const router = useRouter()
const route = useRoute()

const settingsVisible = ref(false)
const settingsStore = useSettingsStore()
const viewMode = ref(settingsStore.viewMode)
const sortMode = ref(settingsStore.sortMode)
const mapMode = ref(settingsStore.mapMode)
const verificationMode = ref(settingsStore.verificationMode)
const clicksToVerify = 5;

const isMapRoute = computed(() => route.path === '/map')

let actionClick = 0;

const goMap = () => {
  router.push('/map')
}

const closeMap = () => {
  router.push('/')
}

const toggleSettings = () => {
  settingsVisible.value = !settingsVisible.value
}

const updateViewMode = () => {
  settingsStore.setViewMode(viewMode.value)
  settingsVisible.value = false
}

const changeMapView = () => {
  settingsStore.setMapMode(mapMode.value)
  settingsVisible.value = false
}

const updateSortMode = () => {
  settingsStore.setSortMode(sortMode.value)
  settingsVisible.value = false
}

const clickLogo = () => {
  actionClick += 1;
  if (actionClick >= clicksToVerify) {
    settingsStore.setVerification(true)
  }
}

</script>

<style scoped lang="scss">
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 6;
  background-color: #67ea94;
  box-shadow: 0px 5px 10px 2px rgba(103, 234, 148, 0.4);
  -webkit-box-shadow: 0px 5px 10px 2px rgba(103, 234, 148, 0.4);

  &-row {
    padding: 6px 12px 10px 12px;
    display: flex;
    justify-content: space-between;
  }

  &__left, &__right {
    display: flex;
  }

  &__right {
    gap: 12px;
  }

  &__logo {
    width: 46px;
    height: 100%;
    background-image: url('../assets/meshtastic.svg');
    background-repeat: no-repeat;
    background-size: 100%;
    background-position: center center;
  }

  &__info {
    color: #000;
    user-select: none;

    &--headline {
      font-size: 32px;
      margin: 6px 0;
    }

    &--text {
      font-size: 14px;
      display: none;
    }
  }
}

.map {
  margin-top: 2px;
  width: 30px;
  height: 100%;
  cursor: pointer;
  background-repeat: no-repeat;
  background-size: 100%;
  background-position: center center;
  background-image: url('../assets/icons/map.svg');

  &.closemap {
    background-image: url('../assets/icons/x-black.svg');
  }
}

.settings {
  margin-top: 2px;
  width: 30px;
  height: 100%;
  background-image: url('../assets/icons/gear.svg');
  background-repeat: no-repeat;
  background-size: 100%;
  background-position: center center;
  cursor: pointer;
}

.settings-panel {
  padding: 6px 12px 20px 12px;
  color: #000;
  transition: all 300ms ease-in-out;
  display: flex;
  flex-direction: column;
  gap: 22px;

  &__option {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &--title {
      font-weight: bold;
      font-size: 18px;
    }

    &--label {
      font-size: 18px;
      display: flex;
      line-height: 28px;
      height: 22px;

      input[type='radio'] {
        appearance: none;
        width: 22px;
        height: 22px;
        border: 2px solid #000;
        border-radius: 50%;
        background-color: #67ea94;
        transition: all 300ms ease-in-out;
        position: relative;
        margin-right: 12px;
        cursor: pointer;

        &:checked {
          background-color: #000;
          border: 2px solid #000;
        }
      }
    }
  }
}
</style>
