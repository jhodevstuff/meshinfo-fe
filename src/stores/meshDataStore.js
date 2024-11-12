import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMeshDataStore = defineStore('meshData', () => {
  const data = ref([]);
  const isLoaded = ref(false);
  const timestamp = ref(Date.now());

  const fetchData = async () => {
    try {
      const response = await fetch(
        `./meshdata.json?timestamp=${new Date().getTime()}`
      );
      if (!response.ok) {
        throw new Error(`Error! ${response.status}`);
      }
      const newData = await response.json();

      data.value = newData;
      timestamp.value = Date.now();
      isLoaded.value = true;
    } catch (error) {
      console.error('Fehler beim Laden', error);
    }
  };

  fetchData();
  setInterval(fetchData, 30000);
  return { data, isLoaded, timestamp };
});
