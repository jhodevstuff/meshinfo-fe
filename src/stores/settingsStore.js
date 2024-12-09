import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    viewMode: localStorage.getItem('meshinfo-config__view') || 'normal',
  }),
  actions: {
    setViewMode(mode) {
      this.viewMode = mode;
      localStorage.setItem('meshinfo-config__view', mode);
    },
    loadViewMode() {
      const storedMode = localStorage.getItem('meshinfo-config__view');
      if (storedMode) {
        this.viewMode = storedMode;
      }
    },
  },
})
