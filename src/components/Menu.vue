<template>
  <div class="header">
    <div class="header-row">
      <div class="header__left">
        <div class="header__logo"></div>
        <div class="header__info">
          <h1 class="header__info--headline">eshinfo</h1>
          <p class="header__info--text">by Joshua Hoffmann</p>
        </div>
      </div>
      <div class="header__right">
        <div class="map" @click="openMap"></div>
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
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

const settingsVisible = ref(false)
const settingsStore = useSettingsStore()
const viewMode = ref(settingsStore.viewMode)

const toggleSettings = () => {
  settingsVisible.value = !settingsVisible.value
}

const updateViewMode = () => {
  settingsStore.setViewMode(viewMode.value)
  settingsVisible.value = false
}

const openMap = () => {
  const newWindow = window.open('', '_blank');
  if (!newWindow) return;
  fetch('maplink.json')
    .then(res => res.json())
    .then(data => {
      newWindow.location.href = data.maplink;
    })
    .catch(err => console.error(err))
}

</script>

<style lang="scss" scoped>
.menu {
  padding: 36px 12px;
  display: flex;
  justify-content: center;
  background-color: #67ea94;
  transition: all 300ms ease-in-out;

  &__item {
    padding: 12px 16px;
    font-weight: bold;
    font-size: 18px;
    text-decoration: none;
    color: #000;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 300ms ease-in-out;
  }
}

.router-link-active {
  border-bottom: 2px solid #000;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 6;
  background-color: #67ea94;
  -webkit-box-shadow: 0px 5px 10px 2px rgba(103, 234, 148, 0.4);
  box-shadow: 0px 5px 10px 2px rgba(103, 234, 148, 0.4);

  &-row {
    padding: 6px 12px;
    padding-bottom: 10px;
    display: flex;
    justify-content: space-between;
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

  &__logo {
    width: 46px;
    height: 100%;
    background-image: url('../assets/meshtastic.svg');
    background-repeat: no-repeat;
    background-size: 100%;
    background-position: center center;
  }

  &__left, &__right {
    display: flex;
  }

  &__right {
    gap: 12px
  }
}

.settings, .map {
  margin-top: 2px;
  width: 30px;
  height: 100%;
  background-repeat: no-repeat;
  background-size: 100%;
  background-position: center center;
  cursor: pointer;
}

.settings {
  background-image: url('../assets/icons/gear.svg');
}

.map {
  background-image: url('../assets/icons/map.svg');
}

.settings-panel {
  padding: 6px 12px;
  padding-bottom: 20px;
  color: #000;
  transition: all 300ms ease-in-out;

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
