import { createRouter, createWebHistory } from 'vue-router'
import VuelidifyTester from '../components/VuelidifyTester.vue'
import VuelidateTester from '../components/VuelidateTester.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/final-form",
      alias: "/",
      component: VuelidifyTester
    },
    {
      path: "/vuelidate",
      component: VuelidateTester
    }
  ]
})

export default router
