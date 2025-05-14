import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type Ref, ref } from "vue";
import { useValidation } from "../src/useValidation.ts";
import { pause } from "./main.ts";

type SimpleObject = {
	name: string;
	age: number;
};

Deno.test("Test named validation results", async (test: Deno.TestContext) => {
	const PassingValue = 10;
	const PromiseLengthMs1 = 100;
	const ValidationName1 = "Validation1";
	const ValidationName2 = "Validation2";
	const ErrorMessage1 = "The value was not correct.";
	const ErrorMessage2 = "The value was incorrect";
	const model: Ref<SimpleObject> = ref({
		name: "Test",
		age: PassingValue,
	});
	const v$ = useValidation({
		model: model,
		validation: {
			age: {
				$reactive: [
					(params) => {
						return {
							isValid: params.value === PassingValue,
							message: ErrorMessage1,
							name: ValidationName1,
							custom: {
								passwordStrength: PassingValue,
							},
						};
					},
					async (params) => {
						await pause(PromiseLengthMs1);
						return {
							isValid: params.value === PassingValue * 2,
							message: ErrorMessage2,
							name: ValidationName2,
						};
					},
				],
			},
		},
	});
	assert(
		v$.state.age?.$state != undefined,
		"Certain property state was not defined immediately after calling the composable.",
	);
	assert(
		v$.state.age?.$state?.results != undefined,
		"Property state's results map was not defined immediately after calling the composable.",
	);
	const promise = v$.validate();
	await pause(30); // allow some time for the sync validation to finish
	const syncResult = v$.state.age?.$state?.results[ValidationName1];
	assert(
		syncResult != undefined,
		"Synchronous named validation result did not appear in the results map.",
	);
	assert(
		syncResult?.isValid === true,
		"Synchronous named validation result was not valid even though it should have been. If the isValid test is passing, this is likely a problem with assignment to the results map internally.",
	);
	assert(
		syncResult?.custom?.passwordStrength === PassingValue,
		"Synchronous named validation result did not has password strength in its custom field.",
	);
	await promise;
	const asyncResult = v$.state.age?.$state?.results[ValidationName2];
	assert(
		asyncResult != undefined,
		"Asynchronous named validation result did not appear in the results map.",
	);
});
