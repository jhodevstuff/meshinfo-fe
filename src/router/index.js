import { createRouter, createWebHistory } from "vue-router";
import MeshInfoView from "../views/MeshInfoView.vue";
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "meshinfo",
      component: MeshInfoView,
    }
  ],
});

export default router;
