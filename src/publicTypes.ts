import type { Ref } from 'vue';

/** Shorthand union of the primitive types */
export type Primitive = string | number | boolean;

/** Defines the layout of validation results. Copies the format of the object being validated. */
export type ValidationState<
	T,
	Return
> = T extends Array<infer U> ? ArrayValidationState<U, Return>:
	T extends IndexableObject ? RecursiveValidationState<T, Return>:
	T extends Primitive ? PrimitiveValidationState<Return>:
	never;

/** Intermediate type for handling nested objects for validation state. Used internally. */
export type RecursiveValidationState<T, Return> = BaseValidationState<Return> & {
	// If the type of the property on the object is not a primitive, then it requires another state object.
	[key in keyof T]?: ValidationState<T[key], Return>;
}

/** Describes the Vuelidify validation state. */
export type BaseValidationState<Return> = {
	/** Stores the validation state for this object. Is named this way to avoid naming conflicts with existing object properties. */
	$state?: {
		/** True if all the validators defined for this property have passed. False otherwise. */
		isValid: boolean;
		isValidating: boolean;
		/** 
		 * True if there are any results that failed validation.
		 * 
		 * Not quite the complement of {@link isValid} because !{@link isValid} can be true when no validators have been called yet.
		 * This will only ever be true when validation results have returned.
		 */
		isErrored: boolean;
		/** Easy collection of the error messages from the raw validation returns */
		errorMessages: string[];
		/** A dictionary of the validators that returned with names. */
		results: {
			[key: string]: BaseValidationReturn<Return> | undefined;
		},
		resultsArray: BaseValidationReturn<Return>[];
	}
};

/** Contains the reactive state of validation for a property. */
export type PrimitiveValidationState<Return> = BaseValidationState<Return>;

/** Defines the validation state for properties that are typed as arrays. */
export type ArrayValidationState<U, Return> = BaseValidationState<Return> & {
	/**
	 * Contains the validation state for each element in the array.
	 * 
	 * Maps 1:1 to the array which was validated.
	 */
	$arrayState?: ValidationState<U, Return>[];
}

/** Intermediate type for handling validation of nested objects. */
export type RecursiveValidation<
	T,
	KParent, 
	ValidationArgs,
	Return,
	ArrParent,
	NLevel extends number
> = ObjectValidationTypes<T, KParent, ValidationArgs, Return, ArrParent> & {
	// Recursively define validation on the contents of the object
	[key in keyof Partial<T>]: Validation<T[key], ValidationArgs, Return, KParent, ArrParent, NLevel>;
}

/** Defines the validation rules for properties that are typed as primitive values. */
export type PrimitiveValidation<
	T,
	KParent,
	Args,
	Return,
	ArrParent
> = BaseValidationTypes<T, KParent, Args, Return, ArrParent>;

/** Defines the validation rules for objects */
export type ObjectValidationTypes<
	T,
	KParent,
	Args,
	Return,
	ArrParent
> = BaseValidationTypes<T, KParent, Args, Return, ArrParent>;

type IndexableObject = {
	[key: string]: any;
};

/** Specifies the reactive and lazy validators */
export type BaseValidationTypes<
	T,
	KParent,
	Args,
	Return,
	ArrParent
> = {
	/** The validators that are invoked whenever the model is changed. */
	$reactive?: Validator<T, KParent, Args, Return, ArrParent>[];
	/** The validators that are invoked only after {@link validate()} is invoked. */
	$lazy?: Validator<T, KParent, Args, Return, ArrParent>[];
}

/** Defines the validation rules for properties that are typed as arrays. */
export type ArrayValidationTypes<
	U,
	T extends Array<U>,
	KParent,
	Args,
	Return,
	ArrParent,
	NLevel extends number
> = BaseValidationTypes<T, KParent, Args, Return, ArrParent> & {
	/**
	 * Defines the validation for each element of the array.
	 * 
	 * Works best with arrays of objects; see documentation for details.
	 */
	$each?: Validation<
		U,
		Args,
		Return,
		KParent,
		ArrParent extends undefined
			? Record<string, never> & { [key in NLevel]: U }
			: ArrParent & { [key in NLevel]: U },
		Increment<NLevel>
	>;
}
/** A synchronous or asynchronous validator. */
export type Validator<
	T,
	KParent,
	Args,
	Return,
	ArrParent
> = (SyncValidator<T, KParent, Args, Return, ArrParent> | AsyncValidator<T, KParent, Args, Return, ArrParent>);

/** Represents the basic structure of a validator function */
export type BaseValidator<T, Parent, Args, Return, ArrParent> = (input: ValidatorParams<T, Parent, Args, ArrParent>) => Return

/** Indicates a validator which run synchronously */
export type SyncValidator<T, Parent, Args, Return, ArrParent> = BaseValidator<
	T,
	Parent,
	Args,
	BaseValidationReturn<Return> | Array<Validator<T,Parent,Args,Return,ArrParent>> | undefined,
	ArrParent
>

/** Indicates a validator which returns a promise */
export type AsyncValidator<T, Parent, Args, Return, ArrParent> = BaseValidator<
	T,
	Parent,
	Args,
	Promise<BaseValidationReturn<Return> | Array<Validator<T,Parent,Args,Return,ArrParent>> | undefined>,
	ArrParent
>

/** The base type for the return value of validators */
export type BaseValidationReturn<F = any> = {
	/** 
	 * Assign this validator's result a name.
	 * The result will then be added to a indexable object using the name as the key
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
	/** Used to determine if validation passed. */
	isValid: boolean;
	/** The error message for this validator. */
	message?: string;
	/**
	 * Return a custom object from this validator.
	 * 
	 * Should be used for more sophisticated return types than a boolean.
	 * 
	 * i.e. password strength, severity levels, functions, etc.
	 */
	custom?: F
}

/** Used in the validation state on properties which are typed as arrays. */
export type ArrayValidationReturn<U, Return> = BaseValidationReturn<Return> & {
	/** The raw list of results from validating every object in the array. */
	arrayResults?: ValidationState<U, Return>[];
}

/**
 * The main recursive type which dictates the layout of the validation rules.
 */
export type Validation<
	T,
	Args = undefined,
	Return = undefined,
	KParent = T,
	ArrParent = undefined,
	NLevel extends number = 0
> = 
	// Arrays are objects, so we have to check those first
	[NonNullable<T>] extends [Array<infer U>] ? ArrayValidationTypes<U, U[], KParent, Args, Return, ArrParent, NLevel>:
	// Use recursion to specify validation for nested properties
	[NonNullable<T>] extends [IndexableObject] ? RecursiveValidation<T, KParent, Args, Return, ArrParent, NLevel>:
	// boolean is checked separately from other primitives
	// because TypeScript splits it into true | false--resulting in undefined nested types.
	[NonNullable<T>] extends [boolean] ? PrimitiveValidation<boolean, KParent, Args, Return, ArrParent>:
	[NonNullable<T>] extends [Primitive] ? PrimitiveValidation<T, KParent, Args, Return, ArrParent>:
	never;

export type ValidationConfig<
	T,
	Args,
	Return
> = {
	/** The object to validate */
	model: Ref<T>;
	/** Configures the validation on the model. */
	validation: Validation<T, Args, Return, T>;
	/**
	 * False - reactive validation will always be active.
	 *
	 * True - reactive validation will start after the first invocation of {@link validate()}.
	 *
	 * Defaults to true.
	 */
	delayReactiveValidation?: boolean;
	/**
	 * Provide anything you want your validators to have access to.
	 * 
	 * Particularly useful when defining validation in separate files and you want to reference local variables.
	 */
	args?: Args;
}

/** Describes the parameter passed into validator functions */
export type ValidatorParams<T, KParent, Args, ArrParent> = {
		/** The current value of the property */
		value: T,
		/** The entire object that was passed into the useValidation() composable to be validated. */
		parent: KParent
	} &
	([Args] extends [undefined] ? Record<string, never> : { 
		/** The args passed in to the useValidation() composable configuration. */
		args: Args
	}) &
	([ArrParent] extends [undefined] ? Record<string, never> : {
		/**
		 * An ordered list of objects that were traversed through while navigating to this validator.
		 * 
		 * Each nested array will add 1 entry to this list. Each entry will be strongly-typed to the element of its respective array.
		 * 
		 * Useful for inter-property dependence when validating arrays of complex objects.
		 */
		arrayParents: ArrParent
	})


/** Type that increments a provided integer (0-19). */
type Increment<N extends number> = [
	1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
	...number[]
][N];