import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computed, type Ref, ref } from "vue";
import { useValidation } from "../src/useValidation.ts";
import { pause } from "./main.ts";
import { exclusiveMinNumber } from "../src/validators.ts";

Deno.test("Test Reset", async (test: Deno.TestContext) => {
	await test.step("Test validation reset() maintains reactivity", testValidationStateResets);
});

type SimpleObject = {
	age?: number;
	name?: string;
	password?: string;
	isPerson?: boolean;
	relatedEntity?: {
		confirmPassword?: string;
	} | null;
};

async function testValidationStateResets(test: Deno.TestContext) {
	const model: Ref<SimpleObject> = ref({});
	const v$ = useValidation<SimpleObject>({
		model: model,
		validation: {
			age: {
				$reactive: [exclusiveMinNumber(10)]
			}
		},
		delayReactiveValidation: false
	});
	const errors = computed(() => v$.state.age?.$state?.errorMessages);
	await v$.validate();
	await pause();
	assert(
		v$.isValid === false,
		"isValid was true when the age should be failing validation."
	);
	assert(
		errors.value != undefined && errors.value.length > 0,
		"There were no validation errors when there should have been."
	);
	v$.reset();
	assert(
		errors.value == undefined || errors.value.length == 0,
		"There were errors after calling reset(), and there shouldn't be."
	);
}
