import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type Ref, ref } from "vue";
import { useValidation } from "../src/useValidation.ts";
import { pause } from "./main.ts";

type SimpleObject = {
	name: string;
	age: number;
}

Deno.test("Test isValidating state", async (test: Deno.TestContext) => {
	const PromiseTimeMs = 1000;
	const model: Ref<SimpleObject> = ref({
		name: "Test",
		age: 10
	});
	const v$ = useValidation({
		model: model,
		validation: {
			age: {
				$reactive: [
					async (params) => {
						await pause(PromiseTimeMs);
						return {
							isValid: true
						};
					}
				]
			}
		}
	});
	assert(v$.isValidating === false, "Global isValidating was true before validation even started.");
	let promise = v$.validate();
	await pause(15);
	assert(v$.isValidating === true, "Global isValidating was false when it should have been true.");
	assert(v$.state.age?.$state?.isValidating === true, "Property state's isValidating was false when it should have been true.");
	await promise;
	assert(v$.isValidating === false, "Global isValidating was true when it should have been updated to false (validation finished).");
	assert(v$.state.age?.$state?.isValidating === false, "Property state's isValidating was true when it should have been false (validation finished).");

	// Now lets test a more complicated scenario where validation is happening, but reactive validation happens right before it finishes.
	// isValidating should not become false, and the property state's isValidating should not become false.
	promise = v$.validate();
	await pause(PromiseTimeMs/3);
	model.value.age *= 2;
	await promise;
	assert(v$.hasValidated === true, "Global hasValidated was false after full validation happened once.");
	// the first validation is finished, but the reactive validation we triggered should still be active
	assert(v$.isValidating === true, "Global isValidating was false when reactive validation should still be happening. Validation is modifying state even though it's not the latest iteration.");
	assert(v$.state.age?.$state?.isValidating === true, "Property state's isValidating was false when reactive validation should still be happening. Validation is modifying state even though it's not the latest iteration.");

	// Currently no way to wait for reactive validation to finish...
	await pause(PromiseTimeMs);
});

