import type { Ref } from "vue";
import type { useValidation, UseValidationReturn } from "./useValidation.ts";

// I'm not sure where to put this comment, but here's the explanation of why this library uses unknown instead of undefined in many places.
// In TypeScript, and especially `strict` typescript, undefined is not assignable to anything but undefined.
// However, unknown is assignable to anything.
// If the default values of the Args or Ancestors generics were undefined, generic validators end up having type problems.
// Many generic validators will not care about Args, Ancestors, or Return values, and they should still be usable in specifically typed situations.
// To do this, without using `any` for those generics, the generic validators would use unknown to indicate they don't care about that type.
// This lead to problems because the array holding the validators would expect validators that had undefined Ancestors, or undefined Args, and unknown isn't assignable to it.
// The one useful feature of using undefined as the default value for Args and Ancestors was that it is detectable in conditional types.
// As a result, I could completely omit the `args` and `arrayParents` property from the validator parameters if it was undefined in that context.
// However, because undefined makes the type system unstable, I chose to use unknown instead and just have the `args` and `arrayParents` properties show up as `unknown`.
// TypeScript is hard... hopefully you don't fall down the rabbit hole of trying to make Args undefined by default in the future.

/** Shorthand union of the primitive types */
export type Primitive = string | number | boolean;

/** Defines the layout of validation results. Copies the format of the object being validated. */
export type ValidationState<
	T,
	Return = any,
> = T extends Array<infer U> ? ArrayValidationState<U, Return>
	: T extends IndexableRecord ? RecursiveValidationState<T, Return>
	: T extends Primitive ? PrimitiveValidationState<Return>
	: never;

/** Determines the validation state available to objects. */
export type RecursiveValidationState<
	T extends IndexableRecord,
	Return = any,
> =
	& BaseValidationState<Return>
	& {
		// If the type of the property on the object is not a primitive, then it requires another state object.
		[key in keyof T]?: ValidationState<T[key], Return>;
	};

/** Describes the Vuelidify validation state. */
export type BaseValidationState<
	Return = any,
> = {
	/**
	 * The validation state for this object.
	 *
	 * Is named this way to avoid naming conflicts with existing object properties.
	 */
	$state?: {
		/** True if all the validators defined have passed. False otherwise. */
		isValid: boolean;
		isValidating: boolean;
		/**
		 * True if there are any results that failed validation.
		 *
		 * Not always equal to `!isValid` because `!isValid` can be true when validators haven't been invoked.
		 */
		isErrored: boolean;
		/** Collection of the error messages from validators */
		errorMessages: string[];
		/**
		 * An indexable object of the validators that returned with names.
		 *
		 * Useful for validators which return data you want to use.
		 */
		results: {
			[key: string]: BaseValidationReturn<Return> | undefined;
		};
		resultsArray: BaseValidationReturn<Return>[];
	};
};

/** Defines the validation state for a primitive value. */
export type PrimitiveValidationState<
	Return = any,
> = BaseValidationState<Return>;

/** Defines the validation state for an array. */
export type ArrayValidationState<
	U,
	Return = any,
> = BaseValidationState<Return> & {
	/**
	 * Contains the validation state for each element in the array.
	 *
	 * Maps 1:1 to the array which was validated.
	 */
	$arrayState: ValidationState<U, Return>[];
};

/** Defines validation rules for records. */
export type RecursiveValidation<
	T,
	KModel,
	ValidationArgs,
	Return,
	Ancestors,
	NLevel extends number,
> =
	& ObjectValidationTypes<T, KModel, ValidationArgs, Return, Ancestors>
	& {
		// Recursively define validation on the contents of the object
		[key in keyof Partial<T>]: Validation<
			T[key],
			ValidationArgs,
			Return,
			KModel,
			Ancestors,
			NLevel
		>;
	};

/** Defines the validation rules for records */
export type ObjectValidationTypes<
	T = unknown,
	KModel = unknown,
	Args = unknown,
	Return = any,
	Ancestors = unknown,
> = BaseValidation<T, KModel, Args, Return, Ancestors>;

type IndexableRecord = Record<string, unknown>;

/** Defines the validation rules for all supported objects. */
export type BaseValidation<
	T = unknown,
	KModel = unknown,
	Args = unknown,
	Return = any,
	Ancestors = unknown,
> = {
	/** Validators invoked whenever the model is changed. */
	$reactive?: Validator<T, KModel, Args, Return, Ancestors>[];
	/** Validators invoked only after {@link UseValidationReturn.validate | validate()} is invoked. */
	$lazy?: Validator<T, KModel, Args, Return, Ancestors>[];
};

/** Defines the validation rules for an array. */
export type ArrayValidation<
	U,
	T = U[],
	KModel = unknown,
	Args = unknown,
	Return = any,
	Ancestors = unknown,
	NLevel extends number = number,
> = BaseValidation<T, KModel, Args, Return, Ancestors> & {
	/**
	 * Defines the validation rules for each element of an array.
	 *
	 * Works best with arrays of objects; see documentation for details.
	 */
	$each?: Validation<
		U,
		Args,
		Return,
		KModel,
		Ancestors extends undefined ? { [key in NLevel]: ArrayAncestor<U, T> }
			: Ancestors & { [key in NLevel]: ArrayAncestor<U, T> },
		Increment<NLevel>
	>;
};

/**
 * Represents an element in {@link ValidatorParams.arrayAncestors | arrayAncestors} which
 * holds context about the ancestor along with the ancestor itself.
 */
export type ArrayAncestor<
	U = unknown, // the type of T's elements
	T = unknown, // the array of U
> = Readonly<{
	/** The index this ancestor is at in `array` */
	index: number;
	/** The array which contains the ancestor. Useful for referencing this ancestor's siblings. */
	array: T;
	/** An object which contains the value you are validating. */
	ancestor: U;
}>;

/** A synchronous or asynchronous validator. */
export type Validator<
	T = unknown,
	KModel = unknown,
	Args = unknown,
	Return = any,
	Ancestors = unknown,
> =
	| SyncValidator<T, KModel, Args, Return, Ancestors>
	| AsyncValidator<T, KModel, Args, Return, Ancestors>;

/** Defines a validator function */
export type BaseValidator<T, Parent, Args, Return, Ancestors> = (
	input: ValidatorParams<T, Parent, Args, Ancestors>,
) => Return;

/** Defines a validator which always runs synchronously */
export type SyncValidator<
	T = unknown,
	Parent = unknown,
	Args = unknown,
	Return = any,
	Ancestors = unknown,
> = BaseValidator<
	T,
	Parent,
	Args,
	| BaseValidationReturn<Return>
	| Array<Validator<T, Parent, Args, Return, Ancestors>>
	| undefined,
	Ancestors
>;

/** Defines a validator which returns a promise */
export type AsyncValidator<
	T = unknown,
	Parent = unknown,
	Args = unknown,
	Return = any,
	Ancestors = unknown,
> = BaseValidator<
	T,
	Parent,
	Args,
	Promise<
		| BaseValidationReturn<Return>
		| Array<Validator<T, Parent, Args, Return, Ancestors>>
		| undefined
	>,
	Ancestors
>;

/** Defines the return value of validators */
export type BaseValidationReturn<F = unknown> = {
	/**
	 * The validation result's name.
	 * The result will be added to a record using the name as the key
	 *
	 * Note, the entry will not exist until this validator has been ran once, so account for undefined.
	 */
	name?: string;
	/**
	 * The unique identifier for this validation result.
	 *
	 * Assigned and used internally, but can be used as an element's ID or key.
	 */
	id?: string;
	/** Determines if this validator passed. */
	isValid: boolean;
	/** The error message for this validator. */
	message?: string;
	/**
	 * Return any extra data you want from this validator.
	 *
	 * Meant for more sophisticated validation which returns data instead of just an error message (e.g. password strength, severity levels, or arrays).
	 */
	custom?: F;
};

/**
 * The entry point for validation with Vuelidify.
 *
 * Defines the validation rules for all the supported object types.
 */
export type Validation<
	T,
	Args = unknown,
	Return = any,
	KModel = T,
	Ancestors = unknown,
	NLevel extends number = 0,
> =
	// Arrays are objects, so we have to check those first
	[NonNullable<T>] extends [Array<infer U>] ? ArrayValidation<U, T, KModel, Args, Return, Ancestors, NLevel>
		// Use recursion to specify validation for nested properties
		: [NonNullable<T>] extends [IndexableRecord] ? RecursiveValidation<T, KModel, Args, Return, Ancestors, NLevel>
		: [NonNullable<T>] extends [Primitive] ? BaseValidation<T, KModel, Args, Return, Ancestors>
		: never;

/** Defines the configuration for the {@link useValidation | useValidation() } composable */
export type ValidationConfig<
	T = unknown,
	Args = unknown,
	Return = any,
> = {
	/** The object to validate */
	model: Ref<T>;
	/** Configures the validation on the model. */
	validation: Validation<T, Args, Return, T>;
	/**
	 * Controls when reactive validation is triggered.
	 *
	 * - `false`: Reactive validation is always active.
	 * - `true`: Reactive validation starts after the first invocation of {@link validate()}.
	 *
	 * Defaults to `true`.
	 */
	delayReactiveValidation?: boolean;
	/**
	 * Provide anything you want your validators to have access to.
	 *
	 * Particularly useful when defining validation in separate files and you want to reference local variables.
	 */
	args?: Args;
};

/** Defines the parameters passed into every validator */
export type ValidatorParams<
	T = unknown,
	KModel = unknown,
	Args = unknown,
	Ancestors = unknown,
> = {
	/** The current value of the property */
	value: T;
	/** The entire object that was passed into the useValidation() composable to be validated. */
	model: KModel;
	/** The args passed in to the useValidation() composable configuration. */
	args: Args;
	/**
	 * An ordered list of objects that were traversed through while navigating to this validator.
	 *
	 * Each nested array will add 1 entry to this list. Each entry will be strongly-typed to the element of its respective array.
	 *
	 * Useful for inter-property dependence when validating arrays of complex objects.
	 */
	arrayAncestors: Ancestors;
};

/** Increments a provided integer. Only works for 0 through 19, inclusive. */
type Increment<N extends number> = [
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	11,
	12,
	13,
	14,
	15,
	16,
	17,
	18,
	19,
	20,
	...number[],
][N];
