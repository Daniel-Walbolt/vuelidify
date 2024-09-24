# Vuelidify

[Installation](#installation)
[Configuration](#configuration)
[Usage](#usage)
---
*A simple and lightweight Vue 3 model based validation library with strong type support.*

This library was inspired by Vuelidate but seeks to solve some of its biggest problems.This library does NOT support Vue2, and does not support commonJS. Technology must move forward.

**✨ Simple** because it does exactly what it needs to and nothing more.

**🪶 Lightweight** because the .mjs is <9KB (uncompressed).

**📝 Model based** refers to validation being done in the script tag on an object. This is an alternative to template based validation, which uses template components and attributes to validate an object.

**💪 Strong types** makes setting up validation intuitive for developers. No more: "wait, how do I do that again?"

Too many validation libraries for Vue lack good type support; which negatively impacts maintainability. Changes to models will not indicate that validation needs to be updated. We sought to fix that problem

---

## Installation

```sh
npm i veenesse-forms
```

```sh
yarn add veenesse-forms
```

```sh
pnpm add veenesse-forms
```

## Type Breakdown

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
1. Primitives
	```ts
	<script setup lang="ts">
		import { ref } from 'vue';
		import { minLength, useValidation } from "vuelidify";
		
		const string = ref("");
		const v$ = useValidation({
			objectToValidate: string,
			validation: {
				$reactive: [minLength(10)] // Put as many validators you want here
			}
		});
	</script>
	```
2. Simple Objects
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
3. Arrays
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