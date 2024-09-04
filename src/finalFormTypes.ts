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
	validationResults: BaseValidationReturn<FValidationReturn>[];
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
	FValidationReturn
> = {
	// If the type of the property on the object is not a primitive, then it requires a nested validation object.
	[key in keyof Partial<T>]: FinalFormValidation<T[key], ValidationArgs, FValidationReturn, KParent>;
}

export type PrimitiveValidation<
	T extends Primitive | undefined | null, 
	KParent,
	Args,
	FValidationReturn
> = PrimitiveValidatorTypes<T, KParent, Args, FValidationReturn>;

type IndexableObject = {
	[key: string]: any;
};

/** Separates the reactive and lazy validators of a primitive property. */
export type PrimitiveValidatorTypes<
	T,
	KParent,
	Args,
	FValidationReturn
> = {
	/** The validators for this property that are invoked whenever the form is changed. */
	$reactive?: Validator<T, KParent, Args, FValidationReturn>[];
	/** The validators for this property that are invoked only after {@link validate()} is invoked. */
	$lazy?: Validator<T, KParent, Args, FValidationReturn>[];
}

export type ArrayValidatorTypes<
	U,
	T extends Array<U>,
	KParent,
	Args,
	FValidationReturn
> = {
	/**
	 * Can only be used with object arrays. Not string, number, or boolean (primitive) arrays.
	 * 
	 * Defines the validation that should be performed on each element of the array.
	 * 
	 * Element validation requires much more logic, which may introduce performance problems for large arrays.
	 */
	$each?: FinalFormValidation<U, Args, FValidationReturn, KParent>;
	/** The validators for the array that are invoked whenever the form is changed. */
	$reactive?: Validator<T, KParent, Args, FValidationReturn>[];
	/** The validators for the array that are invoked only when {@link validate()} is called. */
	$lazy?: Validator<T, KParent, Args, FValidationReturn>[];
}
/** A synchronous or asynchronous validator. */
export type Validator<
	T,
	KParent,
	Args,
	FValidationReturn,
> = (SyncValidator<T, KParent, Args, FValidationReturn> | AsyncValidator<T, KParent, Args, FValidationReturn>);

export type ValidatorTypes<
	T,
	KParent,
	Args,
	FValidationReturn
> = T extends Array<infer U>
	? ArrayValidatorTypes<U, T, KParent, Args, FValidationReturn>
	: PrimitiveValidatorTypes<T, KParent, Args, FValidationReturn>

export type BaseValidator<T, K, V, F> = (input: ValidatorParams<T, K, V>) => F
export type SyncValidator<T, K, V, F> = BaseValidator<T,K,V,BaseValidationReturn<F> | Array<Validator<T,K,V,F>>>
export type AsyncValidator<T, K, V, F> = BaseValidator<T,K,V,Promise<BaseValidationReturn<F> | Array<Validator<T,K,V,F>> | undefined>>

export type BaseValidationReturn<F = any> = {
	/** An identifer for this validation result. Guaranteed to be unique within each instance of the composable. */
	identifier?: string;
	/** Used to determine whether a property passed this validator or not. */
	isValid: boolean;
	/** The message or messages to display if isValid is false. */
	errorMessage?: string | string[];
	/**
	 * User specified object that can be returned from each validator.
	 * 
	 * Can be used to add to FinalForm's base features (e.g. severity levels)
	 */
	custom?: F
}

export type ArrayValidationReturn<U, FValidationReturn> = BaseValidationReturn<FValidationReturn> & {
	/** The raw list of results from validating every object in the array */
	arrayResults?: ValidationState<U, FValidationReturn>[];
}

/** The general validation object type for Final Form. */
export type FinalFormValidation<
	T,
	Args = undefined,
	FValidationReturn = undefined,
	KParent = T
> = T extends Array<infer U>
	? ArrayValidatorTypes<U, T, T, Args, FValidationReturn>
	: T extends IndexableObject
		? RecursiveValidation<T, KParent, Args, FValidationReturn>
		: T extends boolean // boolean is separate from Primitive because TS would otherwise split boolean into true | false here. Resulting in undefined nested types.
			? PrimitiveValidation<boolean | undefined | null, KParent | undefined | null, Args, FValidationReturn>
			: T extends Primitive
				? PrimitiveValidation<T | undefined | null, KParent | undefined | null, Args, FValidationReturn>
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
	args?: Args;
}

/** The parameter passed into validator functions */
export type ValidatorParams<T, KParent, Args> = {
	/** The current value of the property */
	value: T,
	/** The object that was passed into the FinalForm validation composable to be validated. */
	parent: KParent,
	/** User provided object for validating with data outside of the base object. */
	args: Args
}