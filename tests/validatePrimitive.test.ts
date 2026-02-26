import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { useValidation } from "../src/useValidation.ts";
import { type Ref, ref } from "vue";
import {
	exclusiveMaxNumber,
	exclusiveMinNumber,
	isEmailSync,
	maxLength,
	maxNumber,
	minLength,
	minNumber,
	notEmpty,
	required,
} from "../src/validators.ts";
import { pause } from "./main.ts";

Deno.test("Validating a primitive", async (test) => {
	await test.step("MinLength Validator", testMinLength);
	await test.step("MaxLength Validator", testMaxLength);
	await test.step("Email Validator", testEmail);
	await test.step("MinNumber Validator", testMinNumber);
	await test.step("ExclusiveMinNumber Validator", testExclusiveMinNumber);
	await test.step("MaxNumber Validator", testMaxNumber);
	await test.step("ExclusiveMaxNumber Validator", testExclusiveMaxNumber);
	await test.step("Required Validator", testRequired);
	await test.step("NotEmpty Validator", testNotEmpty);
	await test.step("Lazy Validation", testLazyValidation);
	await test.step("Lazy & Reactive Validation", testLazyAndReactiveValidation);
	await test.step("Global isValid check", testGlobalIsValid);
});

const testMinLength = async (test: Deno.TestContext) => {
	const MinLength = 5;
	const model: Ref<string | number> = ref("");
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				minLength(MinLength),
			],
		},
		delayReactiveValidation: false,
	});

	const tests = [
		{ model: -100, expected: false },
		{ model: "This is a test", expected: true },
		{ model: "This", expected: false },
		{ model: 10000, expected: true },
		{ model: "      ", expected: true },
		{ model: "     ___", expected: true },
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(
			v$.state.$state?.isValid === testCase.expected,
			`minLength did not ${testCase.expected ? "pass" : "fail"}: ${model.value}, using a minLength of ${MinLength}.`,
		);
	}
};

const testMaxLength = async (test: Deno.TestContext) => {
	const MaxLength = 5;
	const model: Ref<string> = ref("");
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				maxLength(MaxLength),
			],
		},
		delayReactiveValidation: false,
	});

	model.value = "Test";
	await pause();
	assert(
		v$.state.$state?.isValid === true,
		`Max length did not pass even though the length was ${model.value.length}.`,
	);

	model.value = "This One is Too Long";
	await pause();
	assert(
		v$.state.$state?.isValid === false,
		`Max length did not make the state invalid when length was ${model.value.length}.`,
	);
};

const testEmail = async (test: Deno.TestContext) => {
	const model: Ref<string> = ref("");
	const v$ = useValidation<string>({
		model: model,
		validation: {
			$reactive: [
				isEmailSync(),
			],
		},
		delayReactiveValidation: false,
	});

	const tests = [
		{ model: "This is not an email", expected: false },
		{ model: "plainaddress", expected: false },
		{ model: "@missingusername.com", expected: false },
		{ model: "username@.com", expected: false },
		{ model: "username@domain", expected: false },
		{ model: "username@example.com", expected: true },
		{ model: "username@test.", expected: false },
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(
			v$.state.$state?.isValid === testCase.expected,
			`"${testCase.model}" was expected to be ${testCase.expected ? "valid" : "invalid"}, but was not.`,
		);
	}
};

const testMinNumber = async (test: Deno.TestContext) => {
	const MinNumber = 5;
	const model: Ref<number> = ref(0);
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				minNumber(MinNumber),
			],
		},
		delayReactiveValidation: false,
	});
	const tests = [
		{ model: -1, expected: false },
		{ model: 0, expected: false },
		{ model: MinNumber, expected: true },
		{ model: 10, expected: true },
		{ model: Infinity, expected: false },
		{ model: -Infinity, expected: false },
		{ model: NaN, expected: false }
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(
			v$.state.$state?.isValid == testCase.expected,
			`minNumber did not ${testCase.expected ? "pass" : "fail"}: ${model.value}, with min of ${MinNumber}`,
		);
	}
};

const testExclusiveMinNumber = async (test: Deno.TestContext) => {
	const MinNumber = 5;
	const model: Ref<number> = ref(0);
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				exclusiveMinNumber(MinNumber),
			],
		},
		delayReactiveValidation: false,
	});
	const tests = [
		{ model: -1, expected: false },
		{ model: 0, expected: false },
		{ model: MinNumber, expected: false },
		{ model: MinNumber + 0.0000001, expected: true },
		{ model: 10, expected: true },
		{ model: Infinity, expected: false },
		{ model: -Infinity, expected: false },
		{ model: NaN, expected: false }
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(
			v$.state.$state?.isValid == testCase.expected,
			`exclusiveMinNumber did not ${testCase.expected ? "pass" : "fail"}: ${model.value}, with min of ${MinNumber}`,
		);
	}
};

const testMaxNumber = async (test: Deno.TestContext) => {
	const MaxNumber = 100;
	const model: Ref<number> = ref(0);
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				maxNumber(MaxNumber),
			],
		},
		delayReactiveValidation: false,
	});

	const tests = [
		{ model: 10, expected: true },
		{ model: -1000, expected: true },
		{ model: -100, expected: true },
		{ model: MaxNumber, expected: true },
		{ model: MaxNumber + 0.000001, expected: false },
		{ model: 1e6, expected: false },
		{ model: Infinity, expected: false },
		{ model: -Infinity, expected: false },
		{ model: NaN, expected: false }
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(
			v$.state.$state?.isValid === testCase.expected,
			`maxNumber did not ${testCase.expected ? "pass" : "fail"}: ${model.value} with max of ${MaxNumber}.`,
		);
	}
};

const testExclusiveMaxNumber = async (test: Deno.TestContext) => {
	const MaxNumber = 100;
	const model: Ref<number> = ref(0);
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				exclusiveMaxNumber(MaxNumber),
			],
		},
		delayReactiveValidation: false,
	});

	const tests = [
		{ model: 10, expected: true },
		{ model: -1000, expected: true },
		{ model: -100, expected: true },
		{ model: MaxNumber, expected: false },
		{ model: MaxNumber - 0.000001, expected: true },
		{ model: 1e6, expected: false },
		{ model: Infinity, expected: false },
		{ model: -Infinity, expected: false },
		{ model: NaN, expected: false }
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(
			v$.state.$state?.isValid === testCase.expected,
			`exclusiveMaxNumber did not ${testCase.expected ? "pass" : "fail"}: ${model.value} with max of ${MaxNumber}.`,
		);
	}
};

const testRequired = async (test: Deno.TestContext) => {
	const model: Ref<string | number | boolean | null | undefined> = ref();
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				required(),
			],
		},
		delayReactiveValidation: false,
	});

	const tests = [
		{ model: true, expected: true },
		{ model: "Test", expected: true },
		{ model: 10, expected: true },
		{ model: null, expected: false },
		{ model: undefined, expected: false },
		{ model: " ", expected: true },
		{ model: "null", expected: true },
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(
			v$.state.$state?.isValid === testCase.expected,
			`required did not ${testCase.expected ? "pass" : "fail"}: "${model.value}"`,
		);
	}
};

const testNotEmpty = async (test: Deno.TestContext) => {
	const model: Ref<any> = ref();
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				notEmpty(),
			],
		},
		delayReactiveValidation: false,
	});

	const tests = [
		{ model: true, expected: true },
		{ model: "Test", expected: true },
		{ model: 10, expected: true },
		{ model: null, expected: false },
		{ model: undefined, expected: false },
		{ model: " ", expected: false },
		{ model: "null", expected: true },
		{ model: "   ", expected: false },
		{ model: {}, expected: true },
		{ model: new Map(), expected: true },
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(
			v$.state.$state?.isValid === testCase.expected,
			`notEmpty did not ${testCase.expected ? "pass" : "fail"}: "${model.value}"`,
		);
	}
};

const testLazyValidation = async (test: Deno.TestContext) => {
	const MinLength = 5;
	const model: Ref<string | number | undefined> = ref();
	const v$ = useValidation({
		model: model,
		validation: {
			$lazy: [
				minLength(MinLength),
			],
		},
	});

	const tests = [
		{
			model: "Test",
			expected: false,
			callValidate: false,
			error: "Lazy validation was valid before calling validate()",
		},
		{ model: "Test", expected: false, callValidate: true, error: "Lazy validators were expected to fail." },
		{ model: "ThisIsGood", expected: true, callValidate: true, error: "Lazy validators were expected to pass." },
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		if (testCase.callValidate) {
			await v$.validate();
		}
		await pause();
		assert(v$.state.$state?.isValid === testCase.expected, testCase.error);
	}
};

const testLazyAndReactiveValidation = async (test: Deno.TestContext) => {
	const MinLength = 5;
	const model: Ref<string | number | null | undefined> = ref();
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				maxLength(MinLength * 3),
			],
			$lazy: [
				minLength(MinLength),
			],
		},
		delayReactiveValidation: false,
	});

	const tests = [
		{ model: undefined, expected: false, callValidate: true, error: "Validation passed when it should have failed." },
		{ model: "ThisIsGood", expected: true, callValidate: true, error: "Validation did not pass when it should have." },
		{
			model: "This",
			expected: true,
			callValidate: false,
			error: "Validation did not pass when it should have because lazy validation was not invoked.",
		},
		{
			model: "This",
			expected: false,
			callValidate: true,
			error: "Validation passed when it should have failed after invoking lazy validation.",
		},
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		if (testCase.callValidate) {
			await v$.validate();
		}
		await pause();
		assert(v$.state.$state?.isValid === testCase.expected, testCase.error);
	}
};

const testGlobalIsValid = async (test: Deno.TestContext) => {
	const MinLength = 5;
	const model: Ref<string | number | null | undefined> = ref();
	const v$ = useValidation({
		model: model,
		validation: {
			$reactive: [
				maxLength(MinLength * 3),
				minLength(MinLength),
			],
		},
		delayReactiveValidation: false,
	});

	const tests = [
		{
			model: undefined,
			expected: false,
			error: "isValid was true when it was expected to be false (the model was not changed)",
		},
		{
			model: "This",
			expected: false,
			error: "isValid was true when it was expected to be false (the model should have failed validation)",
		},
		{
			model: "ThisIsGood",
			expected: true,
			error: "isValid was false when it was expected to be true (the model should have passed validation)",
		},
	];

	for (const testCase of tests) {
		model.value = testCase.model;
		await pause();
		assert(v$.state.$state?.isValid === testCase.expected, testCase.error);
	}
};
