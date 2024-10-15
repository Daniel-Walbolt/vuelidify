# Vuelidify

![Project Icon](./favicon.ico)


[Installation](#installation)
[Types](#types)
[Examples](#examples)
---
*A simple and lightweight Vue 3 model based validation library with strong type support.*

This library was inspired by Vuelidate but seeks to solve some of its biggest problems. This library does NOT support Vue2, and does NOT support commonJS. Technology must move forward.

**✨ Simple** because it does exactly what it needs to with no dependencies other than Vue.

**🪶 Lightweight** because the .mjs is <9KB (uncompressed), and ~3KB gzipped.

**📝 Model based** refers to validation being done in the script tag on an object. This is an alternative to template based validation, which uses template components and attributes to validate an object.

**💪 Strong types** makes setting up validation intuitive for developers. No more: "wait, how do I do that again?"

Too many validation libraries for Vue lack good type support; which negatively impacts maintainability. Changes to models would not indicate that validation needs to be updated as well. This library was created to fix that problem.

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

This was created for use in ```<script setup lang="ts">```, meaning you need TypeScript in order to get the full benefits of this library.

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
  objectToValidate: T, // The ref, computed, or reactive object you want to validate.
  validation: Validation<T>, // Describes how to validate your object.
  args: A = undefined, // Can be anything! Will be passed into every validator.
  delayReactiveValidation: boolean, // Should reactive validation be active immediately or only after calling validate()?
}
```
That's it, super simple!

Just kidding, ```validation: Validation<T>``` isn't the full picture. The type here is quite complicated, but easy to use. Here's what you need to know.

1. ```Validation<T>``` will copy the type of your object, down to the names of properties. Nested objects will also be copied, and their inner types as well. This type is recursive!
2. Properties which are primitives or arrays are the exit conditions to the recursive type. Instead they will present ```PrimitiveValidationTypes``` or ```ArrayValidationTypes``` respectively.
```ts
{
	// foo is a string
	foo: {
		$reactive?: [],
		$lazy?: []
	}
	// bar is an array
	bar: {
		$each?: {},
		$reactive?: [],
		$lazy?: []
	}
}
```
3. Arrays are special. If you have an array of objects that need validated, ```$each``` will be your friend. ```$each``` will be the same type as ```Validation<U>``` where ```U``` is the type of each object in the array. This loop can go on forever, as long as your object also has sufficiently many children and arrays!
4. ```$reactive``` is an array of validators that should be performed on that property reactively.
5. ```$lazy``` is an array of validators that should be performed on that property whenever ```validate()``` is called. This was added so you can control when more expensive validatiors are invoked.

Here is the breakdown of the return of the composable
```ts
{
	hasValidated: boolean,
	// True if you object has changed from the reference.
	// Useful for enabling save buttons after changes have been made
	isDirty: boolean,
	isValid: boolean, 
	isValidating: boolean,
	// Access the results of validation. This will copy the properties of your object.
	// Every "exit" condition have it's own type explained below
	state: ValidationState<T>,
	// Set the comparison object for determining dirty state.
	// If your object must first load in asynchronously,
	// use this function to set the reference once it has loaded.
	setReference: (reference: T) => void, 
	validate: () => Promise<boolean>
}
```
Here is the breakdown of the validation state
```ts
{
	// The collected error messages returned from all the validators
	errorMessages: string[],
	// True if any validators returned false.
	// Not equivalent to !isValid, because !isValid is true even
	// when validation has not been ran yet.
	// Can be false when there are lazy validators that still need executed.
	isErrored: boolean,
	// True if the last run of lazy and reactive validators all passed.
	isValid: boolean,
	isValidating: boolean,
	// A map for easily accessing named validation results.
	// This is the one spot without type support
	results: { [key: string]: BaseValidationReturn<F> }
	// A 2D array of the validation results
	resultsArray: Array<BaseValidationReturn<F>>
}
```
Here is the breakdown of the return type from validators.
```ts
// Validators must either return a BaseValidationReturn<F> object, undefined,
// or an array of validators which will be invoked immediately.
{
	// Name the result of this validator. This will put the validation result
	// into the results map in the validation state of this property.
	// Make sure your names are unique between your validators.
	name?: string,
	// the unique identifier for this validation result. Assigned interally.
	// you can use this ID to identify your DOM elements that display error messages.
	id? string,
	// required for determining whether or not this validator passed
	isValid: boolean,
	errorMessage?: string,
	// Sometimes a true or false is not enough information for end users.
	// Use this to return any object to give additional information about the validation.
	// In order to access this custom data easily, make sure you give the result a name
	custom?: F,
}
```
Here is the breakdown of the parameters that are passed into validators
```ts
{
	// The value of the property being validated
	value: T,
	// The top-most ancestor being validated. The object that was passed to the composable.
	parent: P,
	// The args that were specified in the composable configuration.
	// This type will only appear for you when args is NOT undefined.
	args: V,
	// Will only appear for properties nested in some array.
	// The type will be an ordered array of strongly typed objects.
	// Each element is a "parent" in the array, or an ancestor to the property you're validating.
	// Index 0 will be appear when you're 1 array deep, and index 1 will appear 2 arrays deep, etc.
	// The limit of nested arrays is currently 20, and I don't think you'll need more than that.
	// Extremely useful for complex validation of arrays where validation depends on the array object,
	// rather than the top-most parent object which contains the array.
	arrayParents: A
}
```

## Examples
#### Primitives
```ts
<script setup lang="ts">
	import { ref } from 'vue';
	import { minLength, useValidation } from "vuelidify";
	
	const string = ref("");
	const v$ = useValidation({
		objectToValidate: string,
		validation: {
			$reactive: [minLength(10)] // Put as many validators as you want here
		}
	});
</script>
```
#### Simple Objects
```ts
<script setup lang="ts">
	import { ref } from 'vue';
	import { minLength, useValidation, minNumber } from "vuelidify";

	const obj = ref({
		foo: "string",
		bar: true,
		zaa: 1
	});
	const v$ = useValidation({
		objectToValidate: obj,
		validation: {
			foo: {
				// Validate foo when v$.validate is called.
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
				// Validate zaa reactively and when v$.validate is called.
				// Notice how validation can depend on other properties in the parent.
				$reactive: [minNumber(10)],
				$lazy: [
					(params) => {
						const isBar = params.parent.bar;
						return {
							isValid: isBar ? params.value > 100 : true,
							errorMessage: "Must be greater than 100 when bar is true"
						}
					}
				]
			}
		}
	});
</script>
```
#### Arrays
```ts
<script setup lang="ts">
	import { ref } from 'vue';
	import { minLength, useValidation } from "vuelidify";

	type FooBar = {
		name: string;
		isActive: boolean;
	}

	const array = ref<FooBar[]>([]);
	const v$ = useValidation({
		objectToValidate: array,
		validation: {
			// Validate each object in the array.
			$each: {
				name: {
					// Reactively validate every name
					$reactive: [
						// Validate the length of the name only if the object's isActive property is true.
						(params) => {
							if (params.arrayParents[0].isActive !== true) {
								// Return undefined to ignore this validator when the condition is not true.
								// This check can even be asynchronous!
								return;
							}
							return [minLength(10)]
						}
					]
				}
			}
		}
	});
</script>
```
#### Complex Objects
Sometimes your objects will contain other objects and arrays.
```ts
<script setup lang="ts">
	import { ref } from 'vue';
	import { minLength, minNumber, useValidation } from "vuelidify";

	type Person = {
		a: Person,
		b: Person[]
	}
	
	type Person = {
		name: string;
		age: number;
	}

	const complexObj = ref<Person>();
	const v$ = useValidation({
		objectToValidate: complexObj,
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
									isValid: params.value < params.parent.a.age,
									errorMessage: "Must be younger than person a."
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

## Technical Details
For those interested in the inner workings of the library without looking at the code:

- Reactive validation is performed by a deep watcher on the parent object. This was done because of inter-property dependence. When a validator for one property relies on another property in the object, it needs to be reevaluated. This does come with the technical debt of running every *reactive* validator in your object every time the user enters a character. But I this is mediated by validator optimizations discussed later.
- Lazy validation is only performed only when the validate() function is called. However, validate() will also invoke all reactive validators to guarantee all validation results are up-to-date with the model. Properties or the object itself may be valid before ever calling validate() if there were no lazy validators specified, and all reactive validators were true (or again none specified).
- Async validators can be mixed with sync validators, so there is no way to distinguish them upon initialization. However, once they are invoked for the first time, it is possible to distinguish them. Optimizations can then be made on the sync and async validators to improve validation behavior and performance. Sync validators will be wrapped in a computed function which has the benefit of determining reactive dependencies and caching the result. This counteracts the downside of using a deep watcher discussed previously. Synchronous validators will not be needlessly reevaluated every time a character changes in an unrelated property because the computed determines it doesn't rely on it. Async validators will be optimized based on how long they take to return. If they return faster than 250ms, they will not be given any optimization; if they return less than 500ms they will be given a throttle of 250ms; if they return longer than that they will be given a buffer. Details of the throttles are below.
- ```throttleQueueAsync``` is a custom function exported by this library which solves some of the problems I had with lodash's throttle function. This function throttles a function, can copy it's signature, and returns a promise for the result of the function. Calling this function will instantly execute the function if there is no active throttle. Calling this function with an active throttle will return a promise to call the function as soon as the throttle has expired. Calling the function multiple times during the throttle period will keep overriding the queued promise. Overridden queued promises will return undefined once the throttle expires. This function is very complicated, but extremely useful for returning control back to the caller and guaranteeing that the function gets called with the latest parameters. This are all problems with current implementation of debounce or throttle which use setTimeout() without being wrapped in a promise.
- ```bufferAsync``` is another custom function exported by this library which offers a more aggressive throttling behavior than ```throttleQueueAsync```. Instead, this function creates an "invocation buffer" on the provided function, copies the functions signature, and returns a promise to the result of the function. Essentially, the function provided will only be ran once the previous invocation of the function has returned. This function also uses a queue to guarantee invocation of the desired function after the previous invocation has returned.

# Create your own validators
There aren't many validators provided by this library on purpose. Mostly because I didn't want to think of what could be useful, and would rather rely on feedback for useful validators. Feel free to give me feedback on the github repo.

I highly encourage you to understand the types enough to create your own validators. It isn't too difficult, and you should be able to base it off some of the existing ones.

Here is a breakdown of one of the validators exported by this library (expanded to make comments more readable):

```ts
// always provide a header comment to explain what the validator does!
/**
 * Checks if the string value is a valid looking email using RegEx.
 * 
 * The RegEx was taken from https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript, and may be updated in the future.
 * @returns Synchronous validator
 */
export function isEmailSync<
	// The type of the property you want to support validation for.
	// adding | undefined | null is good practice for writing more robust code
	// Furthermore, if you just did string here, it wouldn't work with string?
	T extends string | undefined | null, 
	// The type for the parent object.
	// Generally you don't put constraints on this.
	P,
	// The type for the args
	// You may want to put a constraint on this if you need access to a store, or some other external data.
	V,
	// The type for the custom return from the validator
	R,
	// The type for the arrayParents parameter.
	// Generally you don't put constraints on this.
	// But you have to accept this generic in order to pass the type forward to not mess up outside types.
	A
>(
// Specify any parameters you need here. They could be Refs, primitives, whatever!
): SyncValidator<T, P, V, R, A> // Strongly type the type of validator you'll be returning
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
			errorMessage: "Invalid email format"
		}
	};
}
```

The type system that makes all this possible is fairly fragile. These problems may well be a limitation of TypeScript rather than of this package.
I have encountered such problems when trying to build certain generic custom validators. Feel free to post issues you may have with the package on the git repo!