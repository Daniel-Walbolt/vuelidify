# Vuelidify
Powerful and typed model-based validation for Vue 3

[Installation](#installation)

[Types](#types)

[Examples](#examples)

[Provided Validators](#provided-validators)

[Custom Validators](#custom-validators)

[Technical Details](#technical-details)

---

This library was inspired by Vuelidate and sought to solve some of its biggest problems. This library does NOT support Vue2, and does NOT support commonJS. Technology must move forward.

**✨ Powerful** because it handles complex validation scenarios easily and efficiently.

**🪶 Lightweight** because the .mjs is <9KB (uncompressed), and ~3KB gzipped; no bloat or useless dependencies.

**📝 Model-based** refers to validation being done in your script alongside your data instead of in your templates.

**💪 Strong types** makes setup intuitive for developers. No more, "wait, how do I do that again?"

Too many validation libraries for Vue lack good type support, which makes maintaining codebases harder over time. When your data models change, there's often no clear signal that your validation needs updated as well. Vuelidify was built to solve this problem.

---

## Installation

```sh
npm i vuelidify
```

```sh
yarn add vuelidify
```

```sh
pnpm add vuelidify
```

## Types

This was created for use in ```<script setup lang="ts">```. You need TypeScript in order to get the full benefits of this library.

**useValidation()** is the starting point for validating your models.

```ts
<script setup lang="ts">
	import { useValidation } from "vuelidify";

	// The starting point for validation
	const v$ = useValidation({});
</script>
```
Here is a breakdown of the configuration object the composable expects.
```ts
{
  model: T, // The ref, computed, or reactive object you want to validate.
  validation: Validation<T>, // Describes how to validate your object.
  args: A = undefined, // Can be anything and will be passed into every validator.
  delayReactiveValidation: boolean, // Should reactive validation be active immediately or only after calling validate()?
}
```
That's it, super simple!

Just kidding, ```validation: Validation<T>``` isn't the full picture. The type here is quite complicated, but easy to use. Here's what you need to know:

1. ```Validation<T>``` will copy the layout of T's properties. Nested objects will also be copied. This type is recursive!
2. Types which can be validated will have some unique properties available:
```ts

// foo is a string
foo: {
	$reactive?: [],
	$lazy?: []
}
// bar is an array
bar: {
	$reactive?: [],
	$lazy?: []
	$each?: {},
}
// zaa is an object containing { foo: string, bar: array }
{
	$reactive?: [],
	$lazy?: [],
	bar: {
		$reactive?: [],
		$lazy?: []
		$each?: {},
	},
	foo: {
		$reactive?: [],
		$lazy?: []
	}
}

```
3. ```$each``` is the same type as ```Validation<U>``` where ```U``` is the type of each object in the array you are validating.
4. ```$reactive``` is an array of validators that should be performed reactively on that property. [See technical details](#technical-details) for more information.
5. ```$lazy``` is an array of validators that should be performed on that property whenever ```validate()``` is called. [See technical details](#technical-details) for more information.

Here is the breakdown of the composable's return type
```ts
{
	// true after validate() is invoked once
	hasValidated: boolean,
	// invokes every validator defined in the validation rules.
	// returns whether or not they all passed
	validate: () => Promise<boolean>
	isValidating: boolean,
	// Access the results of validation.
	// This type is explained below.
	state: ValidationState<T>,
	// true only if every validator passed
	isValid: boolean,
	// true if any validator failed
	isErrored: boolean,
	// Set the comparison object for determining dirty state.
	// If your object must load in asynchronously,
	// use this function to set the reference once it has loaded.
	setReference: (reference: T) => void,
	// True if your object has changed from the reference.
	// Useful for enabling save buttons after changes have been made
	isDirty: boolean,
}
```
Validation state also copies the layout of the model you provide. However, instead of providing validators, you now get access to `$state` and `$arrayState`. `$arrayState` is just an array of state objects created by validating an array object.

Here is the breakdown of `$state`
```ts
{
	// The collected error messages returned from all the validators
	errorMessages: string[],
	// True if any validators failed.
	// Not equivalent to !isValid, because !isValid is true even
	// when validation has not been ran yet.
	// Can be false when there are lazy validators that still need executed.
	isErrored: boolean,
	// True if the last run of lazy and reactive validators all passed.
	isValid: boolean,
	isValidating: boolean,
	// A map for easily accessing named validation results.
	// This is the one spot without good type support.
	results: { [key: string]: BaseValidationReturn<F> }
	// A collection of validator responses.
	resultsArray: Array<BaseValidationReturn<F>>
}
```
Validators must return one of the following:
```ts
BaseValidationReturn<F> | Validator[] | undefined
```
Here is the breakdown of the `BaseValidationReturn<F>`
```ts
type BaseValidationReturn<F> = {
	// Name the result of this validator. This will put the validation result
	// into the results map in the validation state of this property.
	// Make sure your names are unique between your validators.
	name?: string,
	// the unique identifier for this validation result. Assigned internally.
	// you can use this ID to identify your DOM elements that display error messages.
	id? string,
	// required for determining whether or not this validator passed
	isValid: boolean,
	message?: string,
	// Sometimes a true or false is not enough information for end users.
	// Use this to return any object to give additional information about the validation.
	// In order to access this custom data easily, make sure you give the result a name
	custom?: F,
}
```
Here is the breakdown of the parameters that are passed into validators
```ts
type ValidatorParams<T,P,V,A> = {
	// The value of the property being validated
	value: T,
	// The top-most ancestor being validated. The object that was passed to the composable.
	parent: P,
	// The args that were specified in the composable configuration.
	args: V,
	// The type will be an ordered array of strongly typed objects.
	// Each index is an ancestor to what you're validating.
	// Index 0 will appear when you're 1 array deep, and index 1 will appear 2 arrays deep, etc.
	// Extremely useful for complex validation.
	arrayAncestors: A
}
```

## Examples
### Validation Rules
#### Validating Primitives
```ts
<script setup lang="ts">
	import { ref } from 'vue';
	import { minLength, useValidation } from "vuelidify";
	
	const string = ref("");
	const v$ = useValidation({
		model: string,
		validation: {
			$reactive: [minLength(10)] // Put as many validators as you want here
		}
	});
</script>
```
#### Validating Simple Objects
```ts
<script setup lang="ts">
	import { ref, type Ref } from 'vue';
	import { minLength, useValidation, minNumber } from "vuelidify";

	// Note this format may not have correctly typed validation when using strict TypeScript.
	// const obj = ref({
	// 	foo: "string",
	// 	bar: true,
	// 	zaa: 1
	// });

	type SimpleObject = {
		foo: name;
		bar: boolean;
		zaa: number;
	}
	const obj: Ref<SimpleObject> = ref({
		foo: "string",
		bar: true,
		zaa: 1
	})

	const v$ = useValidation({
		model: obj,
		validation: {
			foo: {
				// Validate foo when v$.validate() is invoked.
				$lazy: [minLength(10)]
			},
			bar: {
				// Validate bar reactively
				$reactive: [(params) => {
					return {
						isValid: params.value
					}
				}]
			},
			zaa: {
				// Validate zaa reactively and when v$.validate() is invoked.
				// Notice how you can validate using other properties in the model.
				$reactive: [minNumber(10)],
				$lazy: [
					(params) => {
						const isBar = params.model.bar;
						return {
							isValid: isBar ? params.value > 100 : true,
							message: "Must be greater than 100 when bar is true"
						}
					}
				]
			}
		}
	});
</script>
```
#### Validating Arrays
```ts
<script setup lang="ts">
	import { ref } from 'vue';
	import { minLength, useValidation } from "vuelidify";

	type FooBar = {
		name: string;
		isActive: boolean;
	}

	const array: Ref<FooBar[]> = ref([]);
	const v$ = useValidation({
		model: array,
		validation: {
			// Validate each object in the array.
			$each: {
				name: {
					// Reactively validate every name
					$reactive: [
						// Validate the length of the name only if the object's isActive property is true.
						(params) => {
							// arrayAncestors[0] is an object with ancestor, index, and the array it is in.
							if (params.arrayAncestors[0].ancestor.isActive === false) {
								// Return undefined to ignore this validator
								return;
							}
							// Return an array of validators which are immediately invoked. Useful for conditional validation.
							return [minLength(10)]
						}
					]
				}
			}
		}
	});
</script>
```
#### Validating Complex Objects
Sometimes your objects will contain objects and arrays.
```ts
<script setup lang="ts">
	import { ref } from 'vue';
	import { minLength, minNumber, useValidation } from "vuelidify";

	type Example = {
		a: Person,
		b: Person[]
	}

	type Person = {
		name: string;
		age: number;
	}

	const complexObj: Ref<Example | undefined> = ref();
	const v$ = useValidation({
		model: complexObj,
		validation: {
			a: {
				// Validate person a's age reactively
				age: {
					$reactive: [minNumber(16)]
				}
			},
			b: {
				// Validate each person in b
				$each: {
					// Validate age reactively and lazily
					age: {
						$reactive: [
							// Make sure each person in the array is younger than person a
							(params) => {
								return {
									isValid: params.model?.a.age != undefined
										&& params.value < params.model.a.age,
									message: "Must be younger than person a."
								}
							}
						],
						$lazy: [minNumber(15)]
					},
					name: {
						$reactive: [minLength(10)]
					}
				}
			}
		}
	});
</script>
```
### Validation State
All of the validation types present their results similarly. Just access `state` to get started! As long as you have TypeScript enabled in your workspace, you should have no problem understanding its layout. Here's a short example on what you can do with the state object.
```ts
const v$ = useValidation({ 
	// ... complex object validation provided earlier ...
})
// The error messages present on person a's age
const aAgeErrors: string[] | undefined = v$.state.a?.age?.$state?.errorMessages;
// An array of validation state objects on each person of property b.
const bErrors = v$.state.b?.$arrayState;
```
Note, properties may show up in the intellisense, but they are undefinable *on purpose*. If validation rules are not provided for a property, its state object will not exist.

# Provided Validators
Here are the validators that Vuelidify provides by default:

- 	```ts
	required()
	```
- 	```ts
	minLength(min: number)
	```
- 	```ts
	maxLength(max: number)
	```
-	```ts
	minNumber(min: number)
	```
-	```ts
	maxNumber(max: number)
	```
-	```ts
	must(fn: (params) => boolean, errorMessage: string)
	```
-	```ts
	isEmailSync()
	```

There aren't many validators provided by this library on purpose. If you feel a validator would be useful for everyone to have, give us feedback on our GitHub repository. However, we highly encourage you to understand how to make your own!

# Custom Validators
This section guides you to create your own generic validators. Validators were designed to be easy to create and easier to use.

Here is a breakdown of one of the built-in validators (expanded to make comments more readable):

```ts
// always provide a header comment to explain what the validator does!
/**
 * Checks if the string value is a valid looking email using RegEx.
 */
export function isEmailSync<
	// The type of the property you want to support validation for.
	// adding | undefined | null is good practice for writing more robust code
	// Furthermore, if you just did string here, it wouldn't work with string | undefined
	T extends string | undefined | null,
	// The type for the model parameter.
	// Generally you don't put constraints on this.
	P,
	// The type for the args
	// You may want to put a constraint on this if you need access to a store, or some other external data.
	V,
	// The type for the custom return from the validator
	R,
	// The type for the arrayAncestors parameter.
	// Generally you don't put constraints on this.
	A
>(
// Specify any parameters you need here. This can be configuration (like a max length) or reactive variables.
): SyncValidator<T, P, V, R, A> // Explicitly type the validator you'll be returning
{
	// Return a validator function
	return (
		// Strongly type the expected params object to have intellisense
		params: ValidatorParams<T, P, V, A>
	) => {
		// you can do whatever you want a normal validator can in here.
		// Return undefined, an array of validators, or a validation result.
		// In this case, we're checking the value of the property against an email regex.
		return {
			isValid: params.value ? RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(params.value) : false,
			message: "Invalid email format"
		}
	};
}
```

Because every generic has a default value in `SyncValidator`, we can greatly simplify this validator definition to only what is required for constraints:

```ts
/**
 * Validates a string is a valid looking email using RegEx.
 */
export function isEmailSync<T extends string | undefined | null>(): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value ? RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(params.value) : false,
		message: "Invalid email format"
	});
}
```

This validator is effectively: `SyncValidator<string | undefined | null, unknown, unknown, unknown, unknown>`

## Technical Details
For those interested in the inner workings of the library without looking at the code:

- Reactive validation is performed by a deep watcher on the provided model. This was done because of inter-property dependence. When a validator for one property relies on another property in the object, it needs to be reevaluated. This does come with the technical debt of running *every* reactive validator *every* time the model is changed. However, the problem is mediated by validator optimizations which is discussed later.

- Lazy validation is only performed only when the `validate()` function is called. However, `validate()` will also invoke all reactive validators to guarantee all validation results are up-to-date with the model. Properties or the model itself may be valid before ever calling `validate()` if there were no lazy validators provided, and all reactive validators were true (or again none specified).

- Validation results are ideally visible as soon as possible. Synchronous validation should not wait for async validation to finish before displaying errors. Vuelidify implements this by running all validators concurrently, and assimilating the validation results as they finish. This is fairly intuitive. However, what happens when you have lazy validation and reactive validation? You can't replace the array every time a new validation cycle happens, because that could lose the results from lazy validation! Each validator is assigned an ID internally. This ID is used for identifying the results from validators. When a result is returned, Vuelidify determines if it already exists in the results array. If it does, then Vuelidify updates all the data in that result to the data from the new result. This feature is particularly useful if you want to do animations on validation errors, because the error won't be leaving and re-entering the array every time validation is done.

- Async validators can be mixed with sync validators, so there is no way to distinguish them upon initialization. However, once they are invoked for the first time, it is possible to distinguish them. Optimizations can then be made on the sync and async validators to improve validation behavior and performance. Sync validators will be wrapped in a computed function which has the benefit of determining reactive dependencies and caching the result. This counteracts the downside of using a deep watcher discussed previously. Synchronous validators will not be needlessly reevaluated every time a character changes in an unrelated property because the computed determines it doesn't rely on it. Async validators will be optimized based on how long they take to return. If they return faster than 250ms, they will not be given any optimization; if they return in less than 500ms, they will be given a throttle of 250ms; if they return longer than that they will be given a buffer. Details of the throttles are below.

- `throttleAsync` is an async throttler that preserves your function’s signature and always returns a Promise of its result. It executes immediately when idle; if called during the throttle interval, it buffers only the latest call and runs it once the interval elapses—earlier buffered calls resolve to `undefined`. This lets you schedule non-blocking, promise-based throttling without overlapping executions and guarantees you always call your function with the latest arguments. Note, you are unable to distinguish if your function returned `undefined` or `throttleAsync` returned `undefined`.

- `bufferAsync` is another custom function exported by this library that provides a more aggressive throttling behavior than `throttleAsync`. `bufferAsync` preserves the original function’s signature and returns a promise resolving to its result. It only remembers the latest invocation while the provided function is still executing. Once the current execution completes, only the remembered call will be invoked — all intermediate calls will return `undefined`. This mechanism prevents overlapping executions and reduces redundant work, making it ideal for expensive async operations where only the most recent intent should be executed. Note, you are unable to distinguish if your function returned `undefined` or `bufferAsync` returned `undefined`.

- Returning arrays of validators from within other validators is powerful but complex. Initially, we aimed to optimize these nested validators, but their dynamic nature--varying instances, order, and presence between iterations--made this unreliable. Since their results merge with all other validators, Vuelidify tracks and removes outdated results when the "parent" validator is invoked again and the same results are not returned.

- This library uses `unknown` instead of `any` to align with Deno and strict TypeScript standards. While `Args` and `Ancestors` are logically `undefined` by default, using `undefined` as a type causes issues—`unknown` can't be assigned to `undefined`. This distinction is why some of Vuelidify’s types may seem unusual, especially when creating generic validators meant to work universally. Additionally, the default type of `Return` is `any` because it truly *can be* anything; if it was unknown, you would be unable to access it. `Return` is the only part of Vuelidify that is not strongly-typed. Be sure to cast it to what you expect before using it.

Feel free to post issues you may have with the package on the git repo! Happy validating!