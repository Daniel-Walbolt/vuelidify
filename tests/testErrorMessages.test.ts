import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type Ref, ref } from "vue";
import { useValidation } from "../src/useValidation.ts";
import { pause } from "./main.ts";

type SimpleObject = {
	name: string;
	age: number;
}

Deno.test("Test errorMessages state", async (test: Deno.TestContext) => {
	const PassingValue = 10;
	const PromiseLengthMs1 = 100;
	const PromiseLengthMs2 = 1000;
	const ErrorMessage1 = "The value was not correct.";
	const ErrorMessage2 = "The value was incorrect";
	const ErrorMessage3 = "This field is invalid";
	const model: Ref<SimpleObject> = ref({
		name: "Test",
		age: PassingValue
	});
	const v$ = useValidation({
		model: model,
		validation: {
			age: {
				$reactive: [
					(params) => {
						return {
							isValid: params.value === PassingValue,
							message: ErrorMessage1
						};
					},
					async (params) => {
						await pause(PromiseLengthMs1);
						return {
							isValid: params.value === PassingValue*2,
							message: ErrorMessage2
						};
					}
				],
				$lazy: [
					async (params) => {
						await pause(PromiseLengthMs2);
						return {
							isValid: params.value === PassingValue*2,
							message: ErrorMessage3
						};
					}
				]
			},
		},
	});
	assert(v$.state.age?.$state != undefined, "Certain property state was not defined immediately after calling the composable.");
	assert(v$.state.age?.$state?.errorMessages != undefined, "Property state's errorMessages was not defined immediately after calling the composable.");
	const promise = v$.validate();
	await pause(PromiseLengthMs1+15);
	// Error messages should come in incrementally, as soon as they're returned.
	assert(v$.state.age?.$state?.errorMessages.includes(ErrorMessage2), "Error messages does not contain the expected error messages (ErrorMessage2).");
	await promise;
	assert(v$.state.age?.$state?.errorMessages.includes(ErrorMessage3), "Error messages does not contain the expected error messages (ErrorMessage3).");
	model.value.age = PassingValue*2; // Fails all validations
	await pause(30);
	assert(v$.state.age?.$state?.errorMessages.includes(ErrorMessage1), "Error messages does not contain the expected error messages (ErrorMessage1)");
	assert(v$.state.age?.$state?.errorMessages.includes(ErrorMessage3), "Error messages does not contain the expected error messages (ErrorMessage3). It should persist in the array because lazy validation was not invoked again.");
	await pause(PromiseLengthMs1);
	assert(v$.state.age?.$state?.errorMessages.includes(ErrorMessage2) === false, "Error messages contains an error message it shouldn't (ErrorMessage2).");
});