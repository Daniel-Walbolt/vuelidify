import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type Ref, ref } from "vue";
import { useValidation } from "../src/useValidation.ts";
import { minLength, must, required, validateIf } from "../src/validators.ts";
import { pause } from "./main.ts";
import type { SyncValidator, Validator } from "../src/publicTypes.ts";

Deno.test("Test Simple Object Validation", async (test: Deno.TestContext) => {
	await test.step("Test Must Validator", testMustEqualValidator);
	await test.step("Test ValidateIf Validator", testValidateIfValidator);
	await test.step(
		"Test nullable object validation",
		testNullableObjectValidation,
	);
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

const testMustEqualValidator = async (test: Deno.TestContext) => {
	const model: Ref<SimpleObject> = ref({
		password: "",
		relatedEntity: {},
	});
	const v$ = useValidation({
		model: model,
		validation: {
			password: {
				$reactive: [
					must(
						(p) => p.value === p.model.relatedEntity?.confirmPassword,
						"Passwords do not match",
					),
				],
			},
		},
		delayReactiveValidation: false,
	});
	model.value.password = "Test";
	await pause();
	assert(
		v$.isValid === false,
		"isValid was true when the passwords do not match (confirm password is undefined)",
	);
	if (model.value.relatedEntity == undefined) {
		model.value.relatedEntity = {};
	}
	model.value.relatedEntity.confirmPassword = "Test";
	await pause();
	assert(
		v$.isValid === true,
		"isValid was false when the passwords are matching",
	);
};

const testValidateIfValidator = async (test: Deno.TestContext) => {
	const model: Ref<SimpleObject> = ref({
		name: "Foo",
		age: 1000,
		isPerson: false,
	});
	let v$ = useValidation({
		model: model,
		validation: {
			name: {
				$reactive: [
					validateIf((params) => params.model.isPerson === true, [minLength(5)]),
				],
			},
		},
		delayReactiveValidation: false,
	});
	model.value.isPerson = true;
	model.value.name = "Test";
	await pause();
	assert(
		v$.isValid === false,
		"isValid was true when the name is too long (minLength validator should be activating)",
	);
	model.value.isPerson = false;
	await pause();
	assert(
		v$.isValid === true,
		"isValid was false when validateIf should now return undefined and therefore pass validation.",
	);

	let asyncPredicateRan: boolean = false;
	// Now test that we can use async predicate as well
	v$ = useValidation({
		model: model,
		validation: {
			name: {
				$reactive: [
					validateIf(async (params) => {
						await pause(50);
						asyncPredicateRan = true;
						return params.model.isPerson === true;
					}, [minLength(5)]),
				],
			},
		},
	});
	model.value.isPerson = true;
	model.value.name = "Test";
	await v$.validate();
	assert(asyncPredicateRan, "The async predicate for validateIf did not trigger.");
	assert(
		v$.isValid === false,
		"isValid was true when the name is too long--the min length validator should be activating. Is the async predicate working?",
	);
	model.value.isPerson = false;
	await v$.validate();
	await pause(100);
	assert(
		v$.isValid === true,
		"isValid was false when validateIf should now return undefined and therefore pass validation.",
	);

	// Now test to make sure that Vuelidify can handle unpredictable returns
	// Create a validator that is recursive and has randomness to what it returns.
	// Mix async and sync validators in the returned validators.
	let expectedErrorMessages: string[] = [];
	let depth = 0;

	const Error1 = "ThisIsAnError";
	const Error2 = "ThisIsAnotherError";

	const createRandomValidator = (): SyncValidator => {
		const randomValidator: SyncValidator = () => {
			depth++;

			if (Math.random() > 0.1) {
				return [
					() => {
						const message = Error1;
						const isValid = Math.random() > 0.5;
						if (!isValid) {
							expectedErrorMessages.push(message);
						}
						return {
							isValid,
							message,
						};
					},
					createRandomValidator(),
				];
			} else if (Math.random() > 0.2) {
				const randomValidators: Validator[] = [
					async () => {
						await pause(Math.random() * 50 + 30);
						const message = Error2;
						const isValid = Math.random() > 0.5;
						if (!isValid) {
							expectedErrorMessages.push(message);
						}
						return {
							isValid,
							message,
						};
					},
				];
				if (Math.random() > 0.5) {
					randomValidators.push(createRandomValidator());
				}
				return randomValidators;
			}
		};

		return randomValidator;
	};

	v$ = useValidation({
		model: model,
		validation: {
			name: {
				$lazy: [
					() => {
						depth = 0;
						expectedErrorMessages = [];
						return [createRandomValidator()];
					},
				],
			},
		},
	});

	const countOccurrences = (array: string[], match: string) => array.filter((x) => x === match).length;

	for (let i = 0; i < 10; i++) {
		await v$.validate();

		// Assert the count of each error message rather than the positional arrangement of errors
		// because we're not testing if our CPU can do concurrency in a specific order.
		// Rather, we want to make sure the expected amount of errors are returned over several iterations.
		assertEquals(
			countOccurrences(v$.state.name?.$state?.errorMessages ?? [], Error1),
			countOccurrences(expectedErrorMessages, Error1),
			"Randomized nested validators did not return the expected error messages.",
		);
	}
};

const testNullableObjectValidation = async (test: Deno.TestContext) => {
	// The nullable object we're testing is the relatedEntity.
	const model: Ref<SimpleObject> = ref({
		age: 10,
		name: "Foo",
		relatedEntity: null,
	});
	const v$ = useValidation({
		model: model,
		validation: {
			relatedEntity: {
				$reactive: [
					required(),
				],
				confirmPassword: {
					$reactive: [required()]
				}
			},
		},
		delayReactiveValidation: false,
	});

	// Make sure validation state is set even though the object being validated doesn't exist.
	assert(
		v$.state.relatedEntity?.$state != undefined,
		"$state was not defined for a nullable object that has validation rules defined for it",
	);

	// Now test null values correctly pass null into the validators and fail
	// because the validators expect non-null.
	await v$.validate();
	assert(
		v$.state.relatedEntity?.$state?.isValid === false,
		"Validation on null nested object passed when it should have failed.",
	);
	assert(
		v$.state.relatedEntity?.$state?.isValid === false,
		"Validation on null property in a null object passed when it should have failed."
	)

	// Now test undefined values behave the same way.
	model.value.relatedEntity = undefined;
	await pause();
	assert(
		v$.state.relatedEntity?.$state?.isValid === false,
		"Validation on undefined nested object passed when it should have failed.",
	);
	model.value.relatedEntity = {};
	await pause();
	assert(
		v$.state.relatedEntity?.$state?.isValid === true,
		"Validation on nested object failed when it should have passed",
	);

	assert(
		v$.state.relatedEntity?.confirmPassword?.$state?.isValid === false,
		"Validation on a newly created object passed when confirmPassword was still missing.",
	);
	model.value.relatedEntity.confirmPassword = "secret";
	await pause();

	// Test that validation correctly receives nested values that used to be null.
	assert(
		v$.state.relatedEntity?.confirmPassword?.$state?.isValid === true,
		"confirmPassword validation on originally null object did not pass when it became set.",
	);
};
