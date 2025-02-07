import { createRouter, createWebHistory } from 'vue-router';
import VuelidateTester from '../components/VuelidateTester.vue';
import VuelidifyTests from '../components/VuelidifyTests.vue';
import PrimitiveValidation from '../components/VuelidifyTests/PrimitiveValidation.vue';

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/vuelidify',
			alias: '/',
			component: VuelidifyTests,
			children: [
				{
					path: "/vuelidify/primitive-test",
					name: "VuelidifyPrimitive",
					component: PrimitiveValidation
				}
			]
		},
		{
			path: '/vuelidate',
			component: VuelidateTester
		}
	]
});

export default router;
