import { createRouter, createWebHistory } from 'vue-router';
import VuelidateTester from '../components/VuelidateTester.vue';
import VuelidifyTests from '../components/VuelidifyTests.vue';
import PrimitiveValidation from '../components/VuelidifyTests/PrimitiveValidation.vue';
import SimpeObjectValidation from '../components/VuelidifyTests/SimpleObjectValidation.vue';
import NullableObjectPropertyValidation from '../components/VuelidifyTests/NullableObjectPropertyValidation.vue';
import ObjectArrayValidation from '../components/VuelidifyTests/ObjectArrayValidation.vue';
import ComplexObjectValidation from '../components/VuelidifyTests/ComplexObjectValidation.vue';
import AutomatedTests from '../components/VuelidifyTests/AutomatedTests.vue';

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
					component: SimpeObjectValidation
				},
				{
					path: "/vuelidify/optional-object-test",
					name: "VuelidifyOptionalObject",
					component: NullableObjectPropertyValidation
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
				},
				{
					path: "/vuelidfiy/automated-tests",
					name: "VuelidifyTests",
					component: AutomatedTests
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
