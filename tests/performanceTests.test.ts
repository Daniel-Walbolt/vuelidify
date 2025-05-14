import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type Ref, ref } from "vue";
import { useValidation } from "../src/useValidation.ts";
import { pause } from "./main.ts";

Deno.test("Test Validation Performance", async (test: Deno.TestContext) => {
	await test.step("Test validation skips intermediate iterations", testValidationIsAtomic);
});

const testValidationIsAtomic = async (test: Deno.TestContext) => {
	const PASSING_VALUE = "Test";
	const ASYNC_VALIDATOR_DURATION_MS = 100;
	const model: Ref<{ name?: string }> = ref({
		name: "",
	});
	let ranValidator = 0;
	const v$ = useValidation({
		model: model,
		validation: {
			name: {
				$lazy: [
					async (params) => {
						ranValidator++;
						await pause(ASYNC_VALIDATOR_DURATION_MS);
						return {
							isValid: params.value === PASSING_VALUE,
							message: "Name must be correct",
						};
					},
				],
			},
		},
		delayReactiveValidation: true,
	});
	model.value.name = "Test";
	const ITERATIONS = 10;
	const promises: Promise<any>[] = [];
	for (let i = 0; i < ITERATIONS; i++) {
		promises.push(v$.validate());
	}
	await Promise.all(promises);
	assertEquals(
		ranValidator,
		1,
		`The validator was ran ${ranValidator} times, when only ${1} was expected. Validation must not be skipping intermediate validation.`,
	);

	ranValidator = 0;
	promises.push(v$.validate());
	await pause(50); // because of the pause, the validation should start before the current iteration increments
	for (let i = 0; i < ITERATIONS; i++) {
		promises.push(v$.validate());
	}
	await Promise.all(promises);
	assertEquals(
		ranValidator,
		2,
		`The validator was ran ${ranValidator} times, when only ${2} was expected. Validation must not be skipping intermediate validation.`,
	);
};
