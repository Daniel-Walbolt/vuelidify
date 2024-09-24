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
	// required for determining whether or not this validator passed
	isValid: boolean,
	errorMessage?: string,
	// Sometimes a true or false is not enough information for end users.
	// Use this to return any object to give additional information about the validation.
	// In order to access this custom data easily, make sure you give the result a name
	custom?: F,
	// Name the result of this validator. This will put the validation result
	// into the results map in the validation state of this property.
	// Make sure your names are unique between your validators.
	name?: string,
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
				$reactive: [minLength(10)]
			}
		});
	</script>
	```
	```ts
	
	```