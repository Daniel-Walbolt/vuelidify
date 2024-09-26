import { type Ref } from "vue";

/** Shorthand union of the primitive types */
export type Primitive = string | number | boolean;

/** Holds the latest results of validation for an object */
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

/** Contains the reactive state of validation for a property. */
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
	errorMessages: string[];
	results: {
		[key: string]: BaseValidationReturn<FValidationReturn>;
	},
	resultsArray: BaseValidationReturn<FValidationReturn>[];
}

export type ArrayValidationState<U, FValidationReturn> = PrimitiveValidationState<FValidationReturn> & {
	/**
	 * Contains the validation state for each element in the array.
	 * 
	 * Maps 1:1 to the array which was validated.
	 */
	arrayState: ValidationState<U, FValidationReturn>[];
}

export type RecursiveValidation<
	T extends IndexableObject,
	KParent, 
	ValidationArgs,
	FValidationReturn,
	ArrParent,
	NLevel extends number
> = {
	// If the type of the property on the object is not a primitive, then it requires a nested validation object.
	[key in keyof Partial<T>]: Validation<T[key], ValidationArgs, FValidationReturn, KParent, ArrParent, NLevel>;
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
	$each?: Validation<
		U,
		Args,
		FValidationReturn,
		KParent,
		ArrParent extends undefined
			? Array<any> & { [key in NLevel]: U }
			: ArrParent & { [key in NLevel]: U },
		Increment<NLevel>
	>;
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

export type BaseValidator<T, Parent, Args, Return, ArrParent> = (input: ValidatorParams<T, Parent, Args, ArrParent>) => Return

export type SyncValidator<T, Parent, Args, Return, ArrParent> = BaseValidator<
	T,
	Parent,
	Args,
	BaseValidationReturn<Return> | Array<Validator<T,Parent,Args,Return,ArrParent>> | undefined,
	ArrParent
>

export type AsyncValidator<T, Parent, Args, Return, ArrParent> = BaseValidator<
	T,
	Parent,
	Args,
	Promise<BaseValidationReturn<Return> | Array<Validator<T,Parent,Args,Return,ArrParent>> | undefined>,
	ArrParent
>

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
	 * The unique identifier for this validation result.
	 *
	 * Assigned and used internally, but can be used as your element's ID or key attribute.
	 */
	id?: string;
	/** Used to determine if validation was successful or not. */
	isValid: boolean;
	/** The message or messages to display if isValid is false. */
	errorMessage?: string;
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

export type Validation<
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
		// boolean is checked separately from Primitive 
		// because TS splits it into true | false here. Resulting in undefined nested types.
		: T extends boolean 
			? PrimitiveValidation<boolean | undefined | null, KParent | undefined | null, Args, FValidationReturn, ArrParent>
			: T extends Primitive
				? PrimitiveValidation<T | undefined | null, KParent | undefined | null, Args, FValidationReturn, ArrParent>
				: undefined;

export type ValidationConfig<
	T,
	Args,
	FValidationReturn
> = {
	/**
	 * If the object you provided is not in a good state (i.e. it must be loaded in asynchronously first),
	 * call the {@link setup()} method returned by this composable after it has loaded.
	 * 
	 * Setting up validation on an incomplete object will mean that the properties of the object
	 * can not be linked to the validation configured, thus causing problems.
	 */
	objectToValidate: Ref<T | undefined | null>,
	validation: Validation<T, Args, FValidationReturn, T>,
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

/** Describes the parameter passed into validator functions */
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
		 * Useful for inter-property dependence when validating arrays of complex objects.
		 */
		arrayParents: ArrParent
	})


/** Type that increments a provided integer (0-19). */
type Increment<N extends number> = [
	1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
	...number[]
][N];