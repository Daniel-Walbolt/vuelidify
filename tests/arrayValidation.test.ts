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
	const PassingValue = "Test";
	const model: Ref<string[]> = ref([]);
	const reactiveValidationCount = ref(0);
	const isReactiveElementValidationPerformed = ref(false);
	const isLazyElementValidationPerformed = ref(false);
	const arrayValidationCount = ref(0);
	let v$ = useValidation({
		model: model,
		validation: {
			$each: {
				$reactive: [
					(params) => {
						isReactiveElementValidationPerformed.value = true;
						arrayValidationCount.value++;
						return {
							isValid: params.value === PassingValue,
						};
					},
				],
				$lazy: [
					() => {
						isLazyElementValidationPerformed.value = true;
						return {
							isValid: true
						};
					}
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
		delayReactiveValidation: true,
		args: ""
	});
	model.value = [
		PassingValue,
		PassingValue + "1",
		PassingValue + "2"
	];
	await pause();
	// Perform the same tests that are done on object arrays, to make sure primitive arrays are not handled differently
	assert(isReactiveElementValidationPerformed.value === false, "Reactive array validation happened even though it was delayed and validate() was not invoked.");
	assert(isLazyElementValidationPerformed.value === false, "Lazy validation happened even though validate() was not invoked.");
	await v$.validate();
	assert(isReactiveElementValidationPerformed.value === true, "Reactive element validation was not performed even though validate() was invoked.");
	assert(isLazyElementValidationPerformed.value === true, "Lazy element validation was not performed even though validate() was invoked.");
	assert(reactiveValidationCount.value === 1, `Reactive Array validation happened ${reactiveValidationCount.value} times, but should have happened once.`);
	assert(arrayValidationCount.value != 0, "Array element validation was not performed when it should have been. This is likely because the $arrayState computed function is not executed.");
	assert(arrayValidationCount.value === model.value.length, `Validation of array elements happened ${arrayValidationCount.value} times, but should have happened ${model.value.length} times`);

	// now that reactive validation is no longer delayed...
	// test that reactive validation happens.
	reactiveValidationCount.value = 0; // reset the count
	model.value = [
		PassingValue, // should pass
		PassingValue + "1" // should error
	];
	await pause();
	assert(reactiveValidationCount.value > 0, `Array validation did not happen reactively after assignment.`);
	assert(v$.isValid === false, `Array validation passed when it should have failed because the element validator only passes "${PassingValue}".`);
	// Make sure array state matches the length of the array and correctly validates each element.
	assert(v$.state.$arrayState.length === model.value.length, `Array state was not the same length of the model (${v$.state.$arrayState.length} instead of ${model.value.length}).`);
	assert(v$.state.$arrayState[0].$state?.isValid == true, `Array state 0 was not valid even though it should have been.`);
	assert(v$.state.$arrayState[1].$state?.isValid === false, `Array state 1 was valid even though it should NOT have been.`);

	v$ = useValidation({
		model: model,
		validation: {
			$each: {
				$lazy: [
					(params) => {
						return {
							isValid: params.value === PassingValue
						};
					}
				]
			}
		}
	});
	await v$.validate();
	// Tests to make sure the behavior of primitive arrays is as expected:
	// Validation state does not accurately move with the elements of the array.
	assert(v$.state.$arrayState[0].$state?.isValid === true, `Array state 0 was invalid when it should have been valid (lazy validation).`);
	assert(v$.state.$arrayState[1].$state?.isValid === false, `Array state 1 was valid when it should have bee invalid (lazy validation).`);
	model.value.reverse();
	assert(v$.state.$arrayState[0].$state?.isValid === true, `Array state 0 was invalid when it should have stayed true. Shuffling an array of primitives does not reliably move validation state.`);
	assert(v$.state.$arrayState[1].$state?.isValid === false, `Array state 1 was valid when it should have stayed false. Shuffling an array of primitives does not reliably move validation state.`);
};

/** For testing if basic object array validation works */
const testObjectArrayValidation = async (test: Deno.TestContext) => {
	type TestObject = {
		name: string;
		age: number;
		isEmployed: boolean;
	}
	const PassingValue = "Test";
	const model: Ref<TestObject[]> = ref([]);
	const isElementReactiveValidationPerformed = ref(false);
	const isElementLazyValidationPerformed = ref(false);
	const arrayValidationCount = ref(0);
	const v$ = useValidation({
		model: model,
		validation: {
			$each: {
				$lazy: [
					(params) => {
						isElementLazyValidationPerformed.value = true;
						return {
							isValid: params.value.name === PassingValue
						};
					},
					(params) => {
						assert(model.value.includes(params.value), "The value provided to a lazy object validator was not in the model array.");
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
			name: PassingValue,
			age: 5,
			isEmployed: true
		},
		{
			name: PassingValue + "2",
			age: 10,
			isEmployed: false
		}
	];
	await pause();
	// Perform the same tests that are done on primitive arrays, to make sure object arrays are not handled differently
	assert(isElementReactiveValidationPerformed.value === false, "Reactive array validation happened even though it was delayed and validate() was not invoked.");
	assert(isElementLazyValidationPerformed.value === false, "Lazy validation happened even though validate() was not invoked.");
	await v$.validate();
	assert(isElementLazyValidationPerformed.value === true, "Lazy element validation was not performed even though validate() was invoked.");
	assert(isElementReactiveValidationPerformed.value === true, "Reactive element validation was not performed even though validate() was invoked.");
	assert(arrayValidationCount.value === model.value.length, `Element validation happened ${arrayValidationCount.value} times when it should have happened ${model.value} times.`);
	// Make sure array state matches the length of the array and correctly validates each element.
	assert(v$.state.$arrayState.length === model.value.length, `Array state was not the same length of the model (${v$.state.$arrayState.length} instead of ${model.value.length}).`);
	assert(v$.state.$arrayState[0].$state?.isValid == true, `Array state 0 was not valid even though it should have been.`);
	assert(v$.state.$arrayState[1].$state?.isValid === false, `Array state 1 was valid even though it should NOT have been.`);
	model.value.reverse();
	assert(v$.state.$arrayState[0].$state?.isValid === false, `Array state 0 was valid after a reversal when it should have been invalid (lazy validation state did not follow array elements)`);
	assert(v$.state.$arrayState[1].$state?.isValid === true, `Array state 1 was invalid after a reversal when it should have been valid (lazy validation state did not follow array elements)`);
	model.value[1].name = PassingValue + "3";
	assert(v$.state.$arrayState[1].$state?.isValid === true, `Array state 1 was invalid after changing it to a non-valid value. The validation should be lazy, and not update reactively.`);
};

const testArrayParentParameter = async (test: Deno.TestContext) => {
	
};

const testArrayIndexParameter = async (test: Deno.TestContext) => {
	
};

const testDeeplyNestedArrayValidation = async (test: Deno.TestContext) => {

};