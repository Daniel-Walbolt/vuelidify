import { type Ref } from "vue";

/** Shorthand union for conditional types scattered around Final Form */
export type Primitive = string | number | boolean | bigint | symbol;

/** Holds the latest results of validation */
export type ValidationState<
	T,
	FValidationReturn
> = T extends Array<infer U>
	? ArrayValidationState<U, FValidationReturn>
	: T extends IndexableObject
		? RecursiveValidationState<T, FValidationReturn>
		: T extends Primitive 
			? PrimitiveValidationState<FValidationReturn>
			: undefined;

export type RecursiveValidationState<T, FValidationReturn> = {
	// If the type of the property on the object is not a primitive, then it requires another state object.
	[key in keyof T]?: ValidationState<T[key], FValidationReturn>;
}

/** Contains the reactive state of the validation of a property. */
export type PrimitiveValidationState<FValidationReturn> = {
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
	errorMessages: string | string[];
	results: {
		[key: string]: BaseValidationReturn<FValidationReturn>;
	},
	resultsArray: BaseValidationReturn<FValidationReturn>[];
}

export type ArrayValidationState<U, FValidationReturn> = PrimitiveValidationState<FValidationReturn> & {
	/** 
	 * Contains the validation state for each element in the array.
	 * 
	 * Useful for passing validation state to components rendered from the array being validated.
	 */
	arrayState: U extends IndexableObject ? ValidationState<U, FValidationReturn>[] : undefined;
}

/** Indexed type that describes the validation of objects with nested properties. */
export type RecursiveValidation<
	T extends IndexableObject,
	KParent, 
	ValidationArgs,
	FValidationReturn,
	ArrParent,
	NLevel extends number
> = {
	// If the type of the property on the object is not a primitive, then it requires a nested validation object.
	[key in keyof Partial<T>]: FinalFormValidation<T[key], ValidationArgs, FValidationReturn, KParent, ArrParent, NLevel>;
}

export type PrimitiveValidation<
	T extends Primitive | undefined | null, 
	KParent,
	Args,
	FValidationReturn,
	ArrParent
> = PrimitiveValidatorTypes<T, KParent, Args, FValidationReturn, ArrParent>;

type IndexableObject = {
	[key: string]: any;
};

/** Separates the reactive and lazy validators of a primitive property. */
export type PrimitiveValidatorTypes<
	T,
	KParent,
	Args,
	FValidationReturn,
	ArrParent
> = {
	/** The validators for this property that are invoked whenever the form is changed. */
	$reactive?: Validator<T, KParent, Args, FValidationReturn, ArrParent>[];
	/** The validators for this property that are invoked only after {@link validate()} is invoked. */
	$lazy?: Validator<T, KParent, Args, FValidationReturn, ArrParent>[];
}

export type ArrayValidatorTypes<
	U,
	T extends Array<U>,
	KParent,
	Args,
	FValidationReturn,
	ArrParent,
	NLevel extends number
> = {
	/**
	 * Can only be used with object arrays. Not string, number, or boolean (primitive) arrays.
	 * 
	 * Defines the validation that should be performed on each element of the array.
	 * 
	 * Element validation requires much more logic, which may introduce performance problems for large arrays.
	 */
	$each?: FinalFormValidation<U, Args, FValidationReturn, KParent, ArrParent extends undefined ? Array<any> & { [key in NLevel]: U } : ArrParent & { [key in NLevel]: U }, Increment<NLevel>>;
	/** The validators for the array that are invoked whenever the form is changed. */
	$reactive?: Validator<T, KParent, Args, FValidationReturn, ArrParent>[];
	/** The validators for the array that are invoked only when {@link validate()} is called. */
	$lazy?: Validator<T, KParent, Args, FValidationReturn, ArrParent>[];
}
/** A synchronous or asynchronous validator. */
export type Validator<
	T,
	KParent,
	Args,
	FValidationReturn,
	ArrParent
> = (SyncValidator<T, KParent, Args, FValidationReturn, ArrParent> | AsyncValidator<T, KParent, Args, FValidationReturn, ArrParent>);

export type ValidatorTypes<
	T,
	KParent,
	Args,
	FValidationReturn,
	ArrParent,
	NLevel extends number
> = T extends Array<infer U>
	? ArrayValidatorTypes<U, T, KParent, Args, FValidationReturn, ArrParent, NLevel>
	: PrimitiveValidatorTypes<T, KParent, Args, FValidationReturn, ArrParent>

export type BaseValidator<T, K, V, F, A> = (input: ValidatorParams<T, K, V, A>) => F
export type SyncValidator<T, K, V, F, A> = BaseValidator<T,K,V,BaseValidationReturn<F> | Array<Validator<T,K,V,F,A>>, A>
export type AsyncValidator<T, K, V, F, A> = BaseValidator<T,K,V,Promise<BaseValidationReturn<F> | Array<Validator<T,K,V,F,A>> | undefined>, A>

export type BaseValidationReturn<F = any> = {
	/** 
	 * Assign this validator's result a name.
	 * The result will then be added to a map using the name as the key
	 * so you can easily access the result.
	 * 
	 * Note, the map entry will not exist until this validator has been run at least once, so account for undefined.
	 */
	name?: string;
	/** 
	 * A unique identifier for this validation result which is unique to each validator.
	 *
	 * Used internally, but can be used as your element's ID or key attribute.
	 */
	id?: string;
	/** Used to determine if validation was successful or not. */
	isValid: boolean;
	/** The message or messages to display if isValid is false. */
	errorMessage?: string | string[];
	/**
	 * Return a custom object from this validator.
	 * 
	 * Should be used for more sophisticated return types than a boolean.
	 * 
	 * i.e. password strength, severity levels, functions, etc.
	 */
	custom?: F
}

export type ArrayValidationReturn<U, FValidationReturn> = BaseValidationReturn<FValidationReturn> & {
	/** The raw list of results from validating every object in the array. */
	arrayResults?: ValidationState<U, FValidationReturn>[];
}

export type FinalFormValidation<
	T,
	Args = undefined,
	FValidationReturn = undefined,
	KParent = T,
	ArrParent = undefined,
	NLevel extends number = 0
> = T extends Array<infer U>
	? ArrayValidatorTypes<U, T, KParent, Args, FValidationReturn, ArrParent, NLevel>
	: T extends IndexableObject
		? RecursiveValidation<T, KParent, Args, FValidationReturn, ArrParent, NLevel>
		: T extends boolean // boolean is separate from Primitive because TS would otherwise split boolean into true | false here. Resulting in undefined nested types.
			? PrimitiveValidation<boolean | undefined | null, KParent | undefined | null, Args, FValidationReturn, ArrParent>
			: T extends Primitive
				? PrimitiveValidation<T | undefined | null, KParent | undefined | null, Args, FValidationReturn, ArrParent>
				: undefined;

export type ValidationConfig<
	T,
	Args,
	FValidationReturn
> = {
	objectToValidate: Readonly<Ref<T | undefined | null>>,
	validation: FinalFormValidation<T, Args, FValidationReturn, T>,
	/**
	 * False - reactive validation will always be active.
	 *
	 * True - reactive validation will start after the first invocation of {@link validate()}.
	 *
	 * Defaults to true.
	 */
	delayReactiveValidation?: boolean;
	/**
	 * Provide an object, ref, or function that will be passed to each validator.
	 * Particularly useful when defining validation in separate files and you want to use variables outside of the object being validated.
	 */
	args?: Args;
}

/** The parameter passed into validator functions */
export type ValidatorParams<T, KParent, Args, ArrParent> = {
		/** The current value of the property */
		value: T,
		/** The entire object that was passed into the useValidation() composable to be validated. */
		parent: KParent
	} &
	(Args extends undefined ? {} : { 
		/** The args passed in to the useValidation() composable configuration. */
		args: Args
	}) &
	(ArrParent extends undefined ? {} : {
		/**
		 * An ordered list of objects that were traversed through while navigating to this validator.
		 * 
		 * Each nested array will add 1 entry to this list. Each entry will be strongly-typed to the element of its respective array.
		 * 
		 * Useful for inter-property depdendence when validating arrays of complex objects.
		 */
		arrayParents: ArrParent
	})


/** Type that increments a provided integer (0-19). */
type Increment<N extends number> = [
	1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
	...number[]
][N];