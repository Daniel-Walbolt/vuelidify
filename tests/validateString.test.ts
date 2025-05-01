import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { useValidation } from "../src/useValidation.ts";
import { ref } from "vue";
import { isEmailSync, maxLength, maxNumber, minLength, minNumber, required } from "../src/validators.ts";
import { pause } from "./main.ts";

Deno.test("Validating a primitive", async (test) => {
	await test.step("MinLength Validator", testMinLength);
	await test.step("MaxLength Validator", testMaxLength);
	await test.step("Email Validator", testEmail);
	await test.step("MinNumber Validator", testMinNumber);
	await test.step("MaxNumber Validator", testMaxNumber);
	await test.step("Required Validator", testRequired);
	await test.step("Lazy Validation", testLazyValidation);
});

const testMinLength = async (test: Deno.TestContext) => {
	const MinLength = 5;
	const model = ref<string | number>("");
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				minLength(MinLength)
			]
		},
		delayReactiveValidation: false
	});

	const tests = [
		{ model: -100, expected: false },
		{ model: "This is a test", expected: true },
		{ model: "This", expected: false },
		{ model: 10000, expected: true },
		{ model: "      ", expected: true },
		{ model: "     _____", expected: true }
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(v$.state.$state.isValid === testCase.expected, `minLength did not ${testCase.expected ? "pass" : "fail"}: ${model.value}, using a minLength of ${MinLength}.`);
	}
}; 

const testMaxLength = async (test: Deno.TestContext) => {
	const MaxLength = 5;
	const model = ref<string>("");
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				maxLength(MaxLength)
			]
		},
		delayReactiveValidation: false
	});

	model.value = "Test";
	await pause();
	assert(v$.state.$state.isValid === true, `Max length did not pass even though the length was ${model.value.length}.`);
	
	model.value = "This One is Too Long";
	await pause();
	assert(v$.state.$state.isValid === false, `Max length did not make the state invalid when length was ${model.value.length}.`);
};

const testEmail = async (test: Deno.TestContext) => {
	const model = ref<string>("");
	const v$ = useValidation<string>({
		model: model,
		validation: {
			$reactive: [
				isEmailSync()
			]
		},
		delayReactiveValidation: false
	});

	const tests = [
		{ model: "This is not an email", expected: false },
		{ model: "plainaddress", expected: false },
		{ model: "@missingusername.com", expected: false },
		{ model: "username@.com", expected: false },
		{ model: "username@domain", expected: false },
		{ model: "username@example.com", expected: true },
		{ model: "username@test.", expected: false }
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(v$.state.$state.isValid === testCase.expected, `"${testCase.model}" was expected to be ${testCase.expected ? "valid" : "invalid"}, but was not.`);
	}
};

const testMinNumber = async (test: Deno.TestContext) => {
	const MinNumber = 5;
	const model = ref<number>(0);
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				minNumber(MinNumber)
			]
		},
		delayReactiveValidation: false
	});
	const tests = [
		{ model: -1, expected: false },
		{ model: 0, expected: false },
		{ model: 10, expected: true }
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(v$.state.$state.isValid == testCase.expected, `minNumber did not ${testCase.expected ? "pass" : "fail"}: ${model.value}, with min of ${MinNumber}`);
	}
};

const testMaxNumber = async (test: Deno.TestContext) => {
	const MaxNumber = 100;
	const model = ref<number>(0);
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				maxNumber(MaxNumber)
			]
		},
		delayReactiveValidation: false
	});

	const tests = [
		{ model: 10, expected: true },
		{ model: -1000, expected: true },
		{ model: -100, expected: true },
		{ model: 100, expected: true },
		{ model: 100.0001, expected: false },
		{ model: 1e6, expected: false }
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(v$.state.$state.isValid === testCase.expected, `maxNumber did not ${testCase.expected ? "pass" : "fail"}: ${model.value} with max of ${MaxNumber}.`);
	}
};

const testRequired = async (test: Deno.TestContext) => {
	const model = ref<string | number | boolean | null | undefined>();
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				required()
			]
		},
		delayReactiveValidation: false
	});

	const tests = [
		{ model: true, expected: true },
		{ model: "Test", expected: true },
		{ model: 10, expected: true },
		{ model: null, expected: false },
		{ model: undefined, expected: false },
		{ model: " ", expected: false },
		{ model: "null", expected: true }
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(v$.state.$state.isValid === testCase.expected, `required did not ${testCase.expected ? "pass" : "fail"}: "${model.value}"`);
	}
};

const testLazyValidation = async (test: Deno.TestContext) => {
	const MinLength = 5;
	const model = ref<string | number>();
	const v$ = useValidation({
		model: model,
		validation: {
			$lazy: [
				minLength(MinLength)
			]
		}
	});

	const tests = [
		{ model: "Test", expected: false, callValidate: false, error: "Lazy validation was valid before calling validate()"},
		{ model: "Test", expected: false, callValidate: true, error: "Lazy validators were expected to fail."},
		{ model: "ThisIsGood", expected: true, callValidate: true, error: "Lazy validators were expected to pass."},
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		if (testCase.callValidate) {
			await v$.validate();
		}
		await pause();
		assert(v$.state.$state.isValid === testCase.expected, testCase.error);		
	}
};