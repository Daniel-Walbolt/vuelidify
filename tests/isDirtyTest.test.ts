import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { useValidation } from "../src/useValidation.ts";
import { ref } from "vue";
import { isEmailSync, maxLength, maxNumber, minLength, minNumber, required } from "../src/validators.ts";
import { pause, Person, randomPerson } from "./main.ts";

Deno.test("Test isDirty", async (test: Deno.TestContext) => {
	await test.step("Dirty Primitives", testIsDirtyOnPrimitive);
	await test.step("Dirty Random Object", testIsDirtyOnObject);
	await test.step("Test Set Reference", testSetReference);
});

const testIsDirtyOnPrimitive = async (test: Deno.TestContext) => {
	const StartState: number = 0;
	const model = ref<string | number>(StartState);
	const v$ = useValidation<string | number>({
		model: model,
		validation: {
			$reactive: [
				maxLength(10)
			]
		},
		delayReactiveValidation: false
	});

	const tests = [
		{ model: "10", expected: true, error: "isDirty was false after it was just changed" },
		{ model: String(StartState), expected: true, error: "isDirty was false after it was changed to the string version of the starting state."},
		{ model: StartState, expected: false, error: "isDirty was true after it was changed back to the starting state."}
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		assert(v$.isDirty === testCase.expected, testCase.error);
	}
};

const testIsDirtyOnObject = async (test: Deno.TestContext) => {
	const model = ref<Person>(randomPerson());
	const v$ = useValidation({
		model: model,
		validation: {}
	});
	// model is a JSON serializable object here.
	assert(v$.isDirty === false, "isDirty was true when the object was not changed.");
	const originalAge = model.value.age;
	model.value.age = 10;
	assert(v$.isDirty === true, "isDirty was false when the object after it was modified.");
	model.value.age = originalAge;
	assert(v$.isDirty === false, "isDirty was true when the object was returned to its starting state.");
};

const testSetReference = async (test: Deno.TestContext) => {
	const model = ref<Person | undefined>();
	const v$ = useValidation({
		model: model,
		validation: {}
	});
	assert(v$.isDirty === false, "isDirty was true when the model does not exist.");
	model.value = randomPerson();
	assert(v$.isDirty === true, "isDirty was false when the model was set to something other than its initial state.");
	v$.setReference(model.value);
	assert(v$.isDirty === false, "isDirty was true when the reference was set to the random model.");
};