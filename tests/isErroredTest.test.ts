import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type Ref, ref } from "vue";
import { useValidation } from "../src/useValidation.ts";
import { pause } from "./main.ts";

type SimpleObject = {
	name: string;
	age: number;
};

Deno.test("Test isErrored state", async (test: Deno.TestContext) => {
	const PassingValue = 10;
	const ErrorMessage = "The value was not correct.";
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
							message: ErrorMessage,
						};
					},
				],
			},
		},
	});
	assert(
		v$.isErrored === false,
		"Global isErrored was true before validation even started.",
	);
	await v$.validate();
	assert(
		v$.isErrored === false,
		"Global isErrored was true when it should have been false.",
	);
	assert(
		v$.state.age?.$state?.isErrored != undefined,
		"Property state's isErrored was undefined or null when it should be defined.",
	);
	assert(
		v$.state.age?.$state?.isErrored === false,
		"Property state's isErrored was true when it should have been false.",
	);
	model.value.age = PassingValue * 2;
	await pause();
	assert(
		v$.state.age?.$state?.isErrored === true,
		"Property state's isErrored was false when it should have been true.",
	);
	assert(
		v$.isErrored === true,
		"Global isErrored was false when it should have been true.",
	);
});
