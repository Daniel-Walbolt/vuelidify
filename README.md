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

## Usage

This was created for use in ```<script setup lang="ts">```, meaning you need TypeScript in order to get the full benefits of this library.

**useValidation()** is the starting point for validating your models.

```ts
import { useValidation } from "vuelidify";
...

// In your <script setup>
const v$ = useValidation({});
```

Here is a basic breakdown of the configuration object the composable expects. You can explore this in your editor as well.
```ts
{
  objectToValidate: T, // The ref, computed, or reactive object you want to validate.
  validation: Validation<T>, // Describes how to validate your object.
  args: A = undefined, // Can be anything! Will be passed into every validator.
  delayReactiveValidation: boolean, // Should reactive validation be active immediately or only after calling validate()?
}
```
That's it, super simple!

Just kidding, ```validation: Validation<T>``` isn't the full picture. The type here is incredibly complicated. Here's what you need to know.

1. ```Validation<T>``` will copy the format of your object, down to the names of properties. Nested objects will also be copied, and their inner types as well. This type is recursive!
2. Properties which are primitives or arrays are "exit" conditions to the recursive type. Instead they will present ```PrimitiveValidationTypes``` or ```ArrayValidationTypes``` respectively.
```ts
{
	// Let's say foo is a string type in your object
	foo: {
		$reactive?: [],
		$lazy?: []
	}
	// Let's say bar is an array type in your object
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