import { computed, ref, Ref } from "vue";
import { useValidation, Validation } from "vuelidify";
import { TestResult } from "../components/VuelidifyTests/AutomatedTest.vue";

export function useTest<T, Args = undefined>(params: {
	model: Ref<T>,
	validation: Validation<T, Args>,
	test: (model: Ref<T>, v$: ReturnType<typeof useValidation<T, Args>>) => Promise<TestResult[]>,
}) {
	// Create an instance of validation
	const v$ = useValidation<T, Args>({
		model: params.model,
		validation: params.validation
	});
	
	const isTesting = ref(false);
	const testResults = ref<TestResult[]>([]);
	const passed = computed(() => testResults.value.every(x => x.passed));

	async function runTest() {
		isTesting.value = true;
		testResults.value = await params.test(params.model, v$);
		isTesting.value = false;
	}

	return {
		runTest,
		v$,
		isTesting,
		testResults,
		passed,
	};
}