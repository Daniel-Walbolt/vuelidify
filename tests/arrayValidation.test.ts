import { Ref, ref } from "vue";
import { useValidation } from "../src/useValidation.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { pause } from "./main.ts";

Deno.test("Test Array Validation", async (test: Deno.TestContext) => {
	await test.step("Primitive Array Validation", testPrimitiveArrayValidation);
	await test.step("Basic Object Array Validation", testObjectArrayValidation);
	await test.step("Array parent parameter", testArrayParentParameter);
	await test.step("Array parent index parameter", testArrayIndexParameter);
	await test.step("Deeply nested arrays", testDeeplyNestedArrayValidation);
});

const testPrimitiveArrayValidation = async (test: Deno.TestContext) => {
	const model: Ref<string[]> = ref([]);
	const reactiveValidationCount = ref(0);
	const arrayValidationCount = ref(0);
	const v$ = useValidation({
		model: model,
		validation: {
			$each: {
				$reactive: [
					(params) => {
						arrayValidationCount.value++;
						return {
							isValid: params.value === "Test",
						};
					},
				]
			},
			$reactive: [
				() => {
					reactiveValidationCount.value++;
					return {
						isValid: false,
						message: "This is an error message"
					};
				}
			]
		},
		delayReactiveValidation: false,
		args: ""
	});
	model.value = [
		"Test",
		"Test2",
		"Test3"
	];
	await pause();
	assert(reactiveValidationCount.value > 0, `Array validation did not happen reactively after assignment.`);
	assert(reactiveValidationCount.value === 1, `Reactive Array validation happened ${reactiveValidationCount.value} times, but should have happened once.`);
	assert(arrayValidationCount.value != 0, "Array element validation was not performed when it should have been. This is likely because the $arrayState computed function is not executed.");
	assert(arrayValidationCount.value === model.value.length, `Validation of array elements happened ${arrayValidationCount.value} times, but should have happened ${model.value.length} times`);
};

/** For testing if basic object array validation works */
const testObjectArrayValidation = async (test: Deno.TestContext) => {
	type TestObject = {
		name: string;
		age: number;
		isEmployed: boolean;
	}
	const model: Ref<TestObject[]> = ref([]);
	const isElementReactiveValidationPerformed = ref(false);
	const isElementLazyValidationPerformed = ref(false);
	const arrayValidationCount = ref(0);
	const v$ = useValidation({
		model: model,
		validation: {
			$each: {
				$lazy: [
					() => {
						isElementLazyValidationPerformed.value = true;
						return {
							isValid: true
						};
					}
				],
				$reactive: [
					() => {
						arrayValidationCount.value++;
						isElementReactiveValidationPerformed.value = true;
						return {
							isValid: true
						};
					}
				]
			}
		},
		delayReactiveValidation: true
	});
	model.value = [
		{
			name: "Test",
			age: 5,
			isEmployed: true
		},
		{
			name: "Test2",
			age: 10,
			isEmployed: false
		}
	];
	await pause();
	assert(isElementReactiveValidationPerformed.value === false, "Reactive array validation happened even though it was delayed and validate() was not invoked.");
	assert(isElementLazyValidationPerformed.value === false, "Lazy validation happened even though validate() was not invoked.");
	await v$.validate();
	assert(isElementLazyValidationPerformed.value === true, "Lazy element validation was not performed even though validate() was invoked.");
	assert(isElementReactiveValidationPerformed.value === true, "Reactive element validation was not performed even though validate() was invoked.");
	assert(arrayValidationCount.value === model.value.length, `Element validation happened ${arrayValidationCount.value} times when it should have happened ${model.value} times.`);
};

const testArrayParentParameter = async (test: Deno.TestContext) => {
	
};

const testArrayIndexParameter = async (test: Deno.TestContext) => {
	
};

const testDeeplyNestedArrayValidation = async (test: Deno.TestContext) => {

};