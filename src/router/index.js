import { createRouter, createWebHistory } from "vue-router";
import MeshInfoView from "../views/MeshInfoView.vue";
import MapView from "../views/MapView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "meshinfo",
      component: MeshInfoView,
    },
    {
      path: "/map",
      name: "map",
      component: MapView,
    }
  ],
});

export default router;
