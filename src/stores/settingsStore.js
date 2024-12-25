import { defineStore } from "pinia";

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    viewMode: localStorage.getItem("meshinfo-config__view") || "normal",
    sortMode: localStorage.getItem("meshinfo-config__sort") || "lastHeard",
    verificationMode: localStorage.getItem("meshinfo-config__verified" || false),
  }),
  actions: {
    setViewMode(mode) {
      this.viewMode = mode;
      localStorage.setItem("meshinfo-config__view", mode);
    },
    loadViewMode() {
      const storedMode = localStorage.getItem("meshinfo-config__view");
      if (storedMode) {
        this.viewMode = storedMode;
      }
    },
    setSortMode(mode) {
      this.sortMode = mode;
      localStorage.setItem("meshinfo-config__sort", mode);
    },
    setVerification(mode) {
      this.verificationMode = mode;
      localStorage.setItem("meshinfo-config__verified", mode);
    },
  },
});
