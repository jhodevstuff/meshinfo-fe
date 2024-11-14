import { defineStore } from "pinia";
import { ref } from "vue";

export const useMeshDataStore = defineStore("meshData", () => {
  const data = ref([]);
  const nodesIndex = ref([]);
  const isLoaded = ref(false);
  const timestamp = ref(Date.now());

  const fetchNodesIndex = async () => {
    try {
      const response = await fetch(`nodesindex.json?timestamp=${Date.now()}`);
      if (!response.ok) {
        throw new Error(
          `Fehler beim Abrufen des Nodes-Index: ${response.status}`
        );
      }
      const newIndex = await response.json();
      nodesIndex.value = newIndex;

      for (const nodeId of nodesIndex.value) {
        const nodeIndex = nodesIndex.value.indexOf(nodeId);
        await fetchData(nodeId, nodeIndex);
      }
    } catch (error) {
      console.error("Fehler beim Laden des Nodes-Index:", error);
    }
  };

  const fetchData = async (nodeId, index) => {
    try {
      const response = await fetch(
        `meshdata_${nodeId}.json?timestamp=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error(
          `Fehler beim Abrufen der Daten für Node ${nodeId}: ${response.status}`
        );
      }
      const nodeData = await response.json();
      data.value[nodeId] = nodeData; // Daten speichern
      timestamp.value = Date.now();
      isLoaded.value = true;
    } catch (error) {
      console.error(`Fehler beim Laden der Daten für Node ${nodeId}:`, error);
    }
  };

  fetchNodesIndex();
  setInterval(fetchNodesIndex, 20000);

  return { nodesIndex, data, isLoaded, timestamp };
});
