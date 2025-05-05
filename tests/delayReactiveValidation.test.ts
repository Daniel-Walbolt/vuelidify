import { ref } from "vue";
import { useValidation } from "../src/useValidation.ts";
import { minLength } from "../src/validators.ts";
import { pause } from "./main.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("Test delayReactiveValidation configuration", async (test: Deno.TestContext) => {
	// Almost every other test relies on delayReactiveValidation: false.
	// So, we really only need to test it being true here.
	await test.step("Test delayReactiveValidation: true", testDelayedReactiveValidation);
});

const testDelayedReactiveValidation = async (test: Deno.TestContext) => {
	const model = ref<string | number>();
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				minLength(10)
			]
		},
		delayReactiveValidation: true
	});
	
	model.value = "ThisIsLongEnough";
	await pause();
	if (v$.state.$state === undefined) {
		throw new Error("Validation state was undefined when it shouldn't have been.");
	}
	assert(v$.isValid === false, "isValid was true when it was expected to be false. Reactive validation should not have executed.");
	assert(v$.state.$state.resultsArray.length === 0, "Results array of the state was not empty. Reactive validation should not have executed.");
	await v$.validate();
	assert(v$.state.$state.resultsArray.length > 0, "Results array had zero length after calling validate. Reactive valiidation should have executed.");
	model.value = "This";
	await pause();
	assert(v$.isValid === false, "isValid was true when it was expected to be false. Reactive validation should have executed and failed.");
};