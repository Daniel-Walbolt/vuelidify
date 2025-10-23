# Vuelidify
Powerful and typed model-based validation for Vue 3

[Installation](#installation)

[Types](#types)

[Examples](#examples)

[Provided Validators](#provided-validators)

[Custom Validators](#custom-validators)

[Utility Functions](#utility-functions)

[Throttle Functions](#throttle-functions)

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
	// you can use this to identify your DOM elements that display error messages.
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
type ValidatorParams<T,KModel,Args,Ancestors> = {
	// The value of the property being validated
	value: T,
	// The top-most ancestor being validated. The object that was passed to the composable.
	model: KModel,
	// The args that were specified in the composable configuration.
	args: Args,
	// The type will be an ordered array of strongly typed objects.
	// Each index is an ancestor to what you're validating.
	// Index 0 will appear when you're 1 array deep, and index 1 will appear 2 arrays deep, etc.
	// Extremely useful for complex validation.
	arrayAncestors: Ancestors
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
In order to access the results of validation, access the `state` property returned from the composable. As long as you have TypeScript enabled in your workspace, you should have no problem understanding its layout. Validation state copies the layout of your model and puts state objects where values should be instead. Here's a short example on what you can do with the state object.
```ts
const v$ = useValidation({ 
	// ... complex object validation provided earlier ...
})
// The error messages present on person a's age
const aAgeErrors: string[] | undefined = v$.state.a?.age?.$state?.errorMessages;
// An array of validation state objects on each person of property b.
const bErrors = v$.state.b?.$arrayState;
```
Note, your properties may show up in the intellisense for `state`, but they are undefinable *on purpose*. If validation rules are not provided for a property, its state object will not exist.

# Provided Validators
Here are the validators that Vuelidify provides by default:

- 	```ts
	required(message?: string)
	```
-	```ts
	notEmpty(message?: string)
	```
- 	```ts
	minLength(min: number, message?: string)
	```
- 	```ts
	maxLength(max: number, message?: string)
	```
-	```ts
	minNumber(min: number, message?: string)
	```
-	```ts
	exclusiveMinNumber(min: number, message?: string)
	```
-	```ts
	maxNumber(max: number, message?: string)
	```
-	```ts
	exclusiveMaxNumber(max: number, message?: string)
	```
-	```ts
	must(fn: (params) => boolean, message: string)
	```
-	```ts
	validateIf(predicate: (params) => boolean | Promise<boolean>, validators: Validator[])
	```
-	```ts
	isEmailSync(message?: string)
	```

There aren't many validators provided by this library on purpose. If you feel a validator would be useful for everyone to have, give us feedback on our GitHub repository. However, we highly encourage you to understand how to make your own!

# Custom Validators
This section guides you to create your own generic validators. Validators were designed to be easy to create and easier to use.

Here is a breakdown of one of the provided validators (expanded to make comments more readable):

```ts
// always provide a header comment to explain what the validator does!
/**
 * Checks if the string value is a valid looking email using RegEx.
 * @param message sets the error message returned.
 */
export function isEmailSync<
	// The type of the property you want to support validation for.
	// adding | undefined | null is good practice for writing more robust code
	// Furthermore, if you just did string here, it wouldn't work with string | undefined
	T extends string | undefined | null,
	// The type for the model parameter.
	// Generally you don't put constraints on this.
	K,
	// The type for the args
	// You may want to put a constraint on this if you need access to a store, or some other external data.
	V,
	// The type for the custom return from the validator
	R,
	// The type for the arrayAncestors parameter.
	// Generally you don't put constraints on this.
	A
>(
	// Specify any parameters here.
	message?: string
): SyncValidator<T, K, V, R, A> // Explicitly type the validator you'll be returning
{
	// Return a validator function
	return (
		// Strongly type the expected params object to have intellisense
		params: ValidatorParams<T, K, V, A>
	) => {
		/**
		 * You can do whatever here, but you must return undefined,
		 * an array of validators, or a validation result.
		 * In this case, we're checking the value against an email regex.
		 */
		return {
			isValid: params.value ? RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(params.value) : false,
			message: message ?? "Invalid email format"
		}
	};
}
```

Because every generic has a default value in `SyncValidator`, we can greatly simplify this validator definition to only what is required for constraints:

```ts
/**
 * Validates a string is a valid looking email using RegEx.
 * @param message sets the error message returned.
 */
export function isEmailSync<T extends string | undefined | null>(
	message?: string
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value ? RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(params.value) : false,
		message: message ?? "Invalid email format"
	});
}
```

This validator is effectively: `SyncValidator<string | undefined | null, unknown, unknown, unknown, unknown>`

## Throttle Functions
Vuelidify provides several throttling functions for limiting how often a function can be invoked. We figured these would be useful outside of just validation. Functions like `debounce` and `throttle` are common examples exported by lodash. However, lodash's implementations are often hard to use because they don't return control back to the caller (i.e. they don't return a promise). The functions Vuelidify provides strongly type themselves to the function you provide, and always return a promise when it makes sense to. Here is a list of the available throttling functions:

- 	```ts
	bufferAsync<F extends (...args: any[]) => any>(
		func: F,
	): (...params: Parameters<F>) => Promise<Awaited<ReturnType<F>> | typeof V$_IGNORE>
	```
	`bufferAsync` ensures that the provided function has only one instance executing at a time. Calls to the buffered function will return a promise to execute when the current instance returns. Only the latest promise will execute the function next, all other promises will resolve to `V$_IGNORE` once the current instance returns. This function is very useful for only invoking resource-heavy functions while guaranteeing each execution uses the most up-to-date parameters.

-	```ts
	throttleBufferAsync<F extends (...args: any[]) => any>(
		func: F,
		delayMs: number,
	): (...params: Parameters<F>) => Promise<Awaited<ReturnType<F>> | typeof V$_IGNORE>
	```
	`throttleBufferAsync` behaves very similarly to `bufferAsync`, but instead of waiting for the current instance to return, it waits for a throttle duration to expire. Once the throttle expires the latest buffered promise will execute the function and all others will resolve to `V$_IGNORE`. This means multiple instances of the function could be running at the same time, depending on the throttle and how long the function takes to return.

- 	```ts
	throttleAsync<F extends (...args: any) => any>(
		func: F,
		delayMs: number,
	): {
		isThrottled: Ref<boolean>;
		throttledFunc: (...params: Parameters<F>) => ReturnType<F> | typeof V$_IGNORE;
	}
	```
	`throttleAsync` ensures a function can only be invoked once every throttle period. Does not use buffering. Returns two objects, a ref indicating if the function is in its throttle period and the throttled function. Useful for hard limiting invocation of a function (e.g. forgot password form submission). Calls during the throttle period return `V$_IGNORE`.

- 	```ts
	trailingDebounceAsync<F extends (...args: any) => any>(
		func: F,
		delayMs: number,
	): (...params: Parameters<F>) => Promise<Awaited<ReturnType<F>> | typeof V$_IGNORE>
	```
	`trailingDebounceAsync` ensures a function will only be invoked after a delay has passed since the last call. Guarantees the latest parameters will be executed. All calls prior to the latest will return `V$_IGNORE`.

`V$_IGNORE` is a constant unique symbol exported by Vuelidify that helps you to identify when invocations are ignored by a throttle function. This was done to make sure this unique state doesn't conflict with possible returns from your own functions.

## Utility Functions
Vuelidify provides a utility function you are free to use as well. 

- 	```ts
	reduceUndefined<T, K = NonNullable<T>>(
		array: T[],
		getter: (value: T) => K | undefined | null,
	): K[]
	```
	Used internally when collecting error messages from validator results. Removes undefined or null values from a mapped array. The getter defaults to selecting every element in the array, but you can provide your own to perform your own mapping.

## Technical Details
For those interested in the inner workings of the library without looking at the code:

- Reactive validation is performed by a deep watcher on the provided model. This was done because of inter-property dependence. When a validator for one property relies on another property in the object, it needs to be reevaluated. This does come with the technical debt of running *every* reactive validator *every* time the model is changed. However, the problem is mediated by validator optimizations which is discussed later.

- Lazy validation is only performed only when the `validate()` function is called. However, `validate()` will also invoke all reactive validators to guarantee all validation results are up-to-date with the model. Properties or the model itself may be valid before ever calling `validate()` if there were no lazy validators provided, and all reactive validators were true (or again none specified).

- Validation results should appear as soon as possible. Synchronous validators shouldn’t wait for asynchronous ones to finish before showing errors. But things get complex when mixing lazy and reactive validators that run at different times or modify the same data. It’s even trickier when validators return other validators—sometimes inconsistently across runs. Vuelidify solves these problems with a robust validation system:
	- Each validator gets a unique ID.

	- All validators are run concurrently and their results are processed as they come back.

	- Any child validators returned inherit the parent's ID with a unique suffix.

	- All child validators are evaluated immediately and tracked within the origin validator.

	- If a parent validator returns a different set of children in a future run, the ones that are no longer present are removed.

- Validation configs are objects which are created to store any necessary data to validate a value. The validation configs that are created are entirely dependent on the validation rules provided. These validation configs make heavy use of Vue's reactivity system to ensure references to your object and its nested properties stays up-to-date. These configs are not exposed to developers directly, but `state` and values like `isValidating` are determined using these configs. The use of these configs greatly improve readability and maintainability of Vuelidify.

- Validation configs are usually created as soon as the composable is invoked, but in the case of arrays, they must be created dynamically with the content of the array. There's some nuance to using the `$each` validation rule to validate arrays. Validation of arrays works by creating a matching array of validation configs for each element of the array. In the case of arrays of primitives, it is impossible to assign IDs to each element such that they can map to a validation config which was created. On the other hand, each object in an array can be modified with an ID mapping an object to a validation config. This is an important feature, because the validation state for an array is meant to match 1:1 with the array validated. However, what happens when the elements shift around? <br/>
When the indexes of objects are modified, Vuelidify reactively maps the objects to their validation config and returns the correctly ordered state. This is important specifically for *lazy* validators--which likely won't validate every time an index changes. So if error messages from lazy validation are on an object whose index moves, they need to follow that object around. This does not behave correctly with primitives; basically, only the index is used to map validation configs to values. **Make sure to NOT use lazy validation on primitives in arrays which can change indexes.**

- Both lazy and reactive validations track their own iteration ID. Before updating anything, iterations check if they're still the most recent. This prevents outdated runs from making state changes like setting the `isValidating` ref to false when the latest validation is actually still validating.

- When results are returned from validation, Vuelidify updates existing entries instead of replacing them. This avoids flickering or reordering in the results array—especially useful if you want to animate error messages smoothly.

- Async validators can be mixed with sync validators, so there is no way to distinguish them upon initialization. However, once they are invoked for the first time, it is possible to distinguish them. Optimizations can then be made on the synchronous validators to improve validation behavior and performance. Sync validators will be wrapped in a computed function which has the benefit of determining reactive dependencies and caching the result. This counteracts the downside of using a deep watcher discussed previously. Synchronous validators will not be needlessly reevaluated every time a character changes in an unrelated property because the computed determines its own reactive dependencies.

- **As of v2.1, all validators are guaranteed to run exclusively.** No validator will execute concurrently with itself. This removed the need for manual optimization of async-validators in earlier versions because all validators now essentially have a `bufferAsync` on them. This also has the added benefit of allowing developers to have piece of mind that their synchronous and asynchronous validators won't have weird race conditions because of concurrency. While a validator is being ran and its return is processed, all validation attempts are queued to happen after it returns. Before the buffered validations run, they check if they are the latest iteration, and if they aren't they return immediately. This means no matter how many times validation is invoked, only the latest state is validated. This decision for exclusivity was made because of a bug that arose around the `validateIf` validator, where race-conditions were happening with modifying the internal state of the validator to keep track of child validators it returned.

- This library uses `unknown` a lot instead of `any` to align with Deno and strict TypeScript standards. While the common generics, `Args` and `Ancestors` are logically `undefined` by default, using `undefined` as a type causes issues—`unknown` can't be assigned to `undefined`. This distinction is why some of Vuelidify’s types may seem unusual, especially when creating generic validators meant to work universally. Additionally, the default type of `Return` is `any` because it truly *can be* anything; if it was unknown, you wouldn't be able to access it from state. There are only a handful of spots in Vuelidify where any is used (e.g. throttle functions).

Feel free to post issues you may have with the package on the git repo! Happy validating!