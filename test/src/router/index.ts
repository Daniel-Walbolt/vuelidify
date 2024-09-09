import { createRouter, createWebHistory } from 'vue-router'
import FinalFormTester from '../components/FinalFormTester.vue'
import VuelidateTester from '../components/VuelidateTester.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/final-form",
      alias: "/",
      component: FinalFormTester
    },
    {
      path: "/vuelidate",
      component: VuelidateTester
    }
  ]
})

export default router
