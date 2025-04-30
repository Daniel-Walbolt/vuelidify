import { ref } from "vue";
import { useTest } from "../composables/test";
import { maxLength, minLength } from "vuelidify";
import { TestResult } from "../components/VuelidifyTests/AutomatedTest.vue";

export const StringTest = useTest<string>({
	model: ref(""),
	validation: {
		$reactive: [
			minLength(5),
			maxLength(10)
		],
		$lazy: [
			minLength(5)
		]
	},
	async test(model, v$): Promise<TestResult[]> {
		return [
			{ passed: true, message: "Built-in min length validator" },
			{ passed: true, message: "Built-in max length validator" },
			{ passed: true, message: "Reactive validators trigger as expected" },
			{ passed: true, message: "Lazy valdiators trigger only when calling validate" }
		];
	},
});