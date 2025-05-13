import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type Ref, ref } from "vue";
import { useValidation } from "../src/useValidation.ts";
import { minLength, must, validateIf } from "../src/validators.ts";
import { pause } from "./main.ts";
import { SyncValidator, Validator } from "../src/publicTypes.ts";

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
	const model: Ref<SimpleObject> = ref({
		age: 10,
		name: "Foo",
	});
	const v$ = useValidation({
		model: model,
		validation: {
			relatedEntity: {
				$reactive: [
					must((p) => p.value != undefined, "Related entity must be defined"),
				],
			},
		},
		delayReactiveValidation: false,
	});
	await v$.validate();
	assert(
		v$.state.relatedEntity?.$state != undefined,
		"$state was not defined for a nested object that has validation rules defined for it",
	);
	assert(
		v$.state.relatedEntity?.$state?.isValid === false,
		"Validation on undefined nested object passed when it should have failed.",
	);
	model.value.relatedEntity = null;
	await pause();
	assert(
		v$.state.relatedEntity?.$state?.isValid === false,
		"Validation on null nested object passed when it should have failed.",
	);
	model.value.relatedEntity = {};
	await pause();
	assert(
		v$.state.relatedEntity?.$state?.isValid === true,
		"Validation on nested object failed when it should have passed",
	);
};
