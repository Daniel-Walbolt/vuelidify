import { createRouter, createWebHistory } from 'vue-router';
import VuelidateTester from '../components/VuelidateTester.vue';
import VuelidifyTests from '../components/VuelidifyTests.vue';
import PrimitiveValidation from '../components/VuelidifyTests/PrimitiveValidation.vue';
import SimpleObjectValidation from '../components/VuelidifyTests/SimpleObjectValidation.vue';
import OptionalObjectValidation from '../components/VuelidifyTests/OptionalObjectValidation.vue';
import ObjectArrayValidation from '../components/VuelidifyTests/ObjectArrayValidation.vue';
import ComplexObjectValidation from '../components/VuelidifyTests/ComplexObjectValidation.vue';

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
				},
				{
					path: "/vuelidify/simple-object-test",
					name: "VuelidifySimpleObject",
					component: SimpleObjectValidation
				},
				{
					path: "/vuelidify/optional-object-test",
					name: "VuelidifyOptionalObject",
					component: OptionalObjectValidation
				},
				{
					path: "/vuelidify/object-array-test",
					name: "VuelidifyObjectArray",
					component: ObjectArrayValidation
				},
				{
					path: "/vuelidify/complex-object-test",
					name: "VuelidifyComplexObject",
					component: ComplexObjectValidation
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
