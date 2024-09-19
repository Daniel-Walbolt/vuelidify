import { Ref } from 'vue';

/** Shorthand union for conditional types scattered around Final Form */
type Primitive = string | number | boolean | bigint | symbol;
/** Holds the latest results of validation */
type ValidationState<T, FValidationReturn> = T extends Array<infer U> ? ArrayValidationState<U, FValidationReturn> : T extends IndexableObject ? RecursiveValidationState<T, FValidationReturn> : T extends Primitive ? PrimitiveValidationState<FValidationReturn> : undefined;
type RecursiveValidationState<T, FValidationReturn> = {
    [key in keyof T]?: ValidationState<T[key], FValidationReturn>;
};
/** Contains the reactive state of the validation of a property. */
type PrimitiveValidationState<FValidationReturn> = {
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
    };
    resultsArray: BaseValidationReturn<FValidationReturn>[];
};
type ArrayValidationState<U, FValidationReturn> = PrimitiveValidationState<FValidationReturn> & {
    /**
     * Contains the validation state for each element in the array.
     *
     * Maps 1:1 to the array which was validated.
     */
    arrayState: ValidationState<U, FValidationReturn>[];
};
/** Indexed type that describes the validation of objects with nested properties. */
type RecursiveValidation<T extends IndexableObject, KParent, ValidationArgs, FValidationReturn, ArrParent, NLevel extends number> = {
    [key in keyof Partial<T>]: FinalFormValidation<T[key], ValidationArgs, FValidationReturn, KParent, ArrParent, NLevel>;
};
type PrimitiveValidation<T extends Primitive | undefined | null, KParent, Args, FValidationReturn, ArrParent> = PrimitiveValidatorTypes<T, KParent, Args, FValidationReturn, ArrParent>;
type IndexableObject = {
    [key: string]: any;
};
/** Separates the reactive and lazy validators of a primitive property. */
type PrimitiveValidatorTypes<T, KParent, Args, FValidationReturn, ArrParent> = {
    /** The validators for this property that are invoked whenever the form is changed. */
    $reactive?: Validator<T, KParent, Args, FValidationReturn, ArrParent>[];
    /** The validators for this property that are invoked only after {@link validate()} is invoked. */
    $lazy?: Validator<T, KParent, Args, FValidationReturn, ArrParent>[];
};
type ArrayValidatorTypes<U, T extends Array<U>, KParent, Args, FValidationReturn, ArrParent, NLevel extends number> = {
    /**
     * Can only be used with object arrays. Not string, number, or boolean (primitive) arrays.
     *
     * Defines the validation that should be performed on each element of the array.
     *
     * Element validation requires much more logic, which may introduce performance problems for large arrays.
     */
    $each?: FinalFormValidation<U, Args, FValidationReturn, KParent, ArrParent extends undefined ? Array<any> & {
        [key in NLevel]: U;
    } : ArrParent & {
        [key in NLevel]: U;
    }, Increment<NLevel>>;
    /** The validators for the array that are invoked whenever the form is changed. */
    $reactive?: Validator<T, KParent, Args, FValidationReturn, ArrParent>[];
    /** The validators for the array that are invoked only when {@link validate()} is called. */
    $lazy?: Validator<T, KParent, Args, FValidationReturn, ArrParent>[];
};
/** A synchronous or asynchronous validator. */
type Validator<T, KParent, Args, FValidationReturn, ArrParent> = (SyncValidator<T, KParent, Args, FValidationReturn, ArrParent> | AsyncValidator<T, KParent, Args, FValidationReturn, ArrParent>);
type ValidatorTypes<T, KParent, Args, FValidationReturn, ArrParent, NLevel extends number> = T extends Array<infer U> ? ArrayValidatorTypes<U, T, KParent, Args, FValidationReturn, ArrParent, NLevel> : PrimitiveValidatorTypes<T, KParent, Args, FValidationReturn, ArrParent>;
type BaseValidator<T, K, V, F, A> = (input: ValidatorParams<T, K, V, A>) => F;
type SyncValidator<T, K, V, F, A> = BaseValidator<T, K, V, BaseValidationReturn<F> | Array<Validator<T, K, V, F, A>>, A>;
type AsyncValidator<T, K, V, F, A> = BaseValidator<T, K, V, Promise<BaseValidationReturn<F> | Array<Validator<T, K, V, F, A>> | undefined>, A>;
type BaseValidationReturn<F = any> = {
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
    custom?: F;
};
type ArrayValidationReturn<U, FValidationReturn> = BaseValidationReturn<FValidationReturn> & {
    /** The raw list of results from validating every object in the array. */
    arrayResults?: ValidationState<U, FValidationReturn>[];
};
type FinalFormValidation<T, Args = undefined, FValidationReturn = undefined, KParent = T, ArrParent = undefined, NLevel extends number = 0> = T extends Array<infer U> ? ArrayValidatorTypes<U, T, KParent, Args, FValidationReturn, ArrParent, NLevel> : T extends IndexableObject ? RecursiveValidation<T, KParent, Args, FValidationReturn, ArrParent, NLevel> : T extends boolean ? PrimitiveValidation<boolean | undefined | null, KParent | undefined | null, Args, FValidationReturn, ArrParent> : T extends Primitive ? PrimitiveValidation<T | undefined | null, KParent | undefined | null, Args, FValidationReturn, ArrParent> : undefined;
type ValidationConfig<T, Args, FValidationReturn> = {
    /**
     * If the object you provided is not in a good state (i.e. it must be loaded in asynchronously first),
     * call the {@link setup()} method returned by this composable after it has loaded.
     *
     * Setting up validation on an incomplete object will mean that the properties of the object
     * can not be linked to the validation configured, thus causing problems.
     */
    objectToValidate: Readonly<Ref<T | undefined | null>>;
    validation: FinalFormValidation<T, Args, FValidationReturn, T>;
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
};
/** Describes the parameter passed into validator functions */
type ValidatorParams<T, KParent, Args, ArrParent> = {
    /** The current value of the property */
    value: T;
    /** The entire object that was passed into the useValidation() composable to be validated. */
    parent: KParent;
} & (Args extends undefined ? {} : {
    /** The args passed in to the useValidation() composable configuration. */
    args: Args;
}) & (ArrParent extends undefined ? {} : {
    /**
     * An ordered list of objects that were traversed through while navigating to this validator.
     *
     * Each nested array will add 1 entry to this list. Each entry will be strongly-typed to the element of its respective array.
     *
     * Useful for inter-property dependence when validating arrays of complex objects.
     */
    arrayParents: ArrParent;
});
/** Type that increments a provided integer (0-19). */
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
    ...number[]
][N];

/**
 * Returns a function that will only execute the provided promise returning function
 * with the most recently specified params only if a previously created promise does not exist.
 */
declare function bufferAsync<F extends (...args: any) => any, K>(func: (...params: Parameters<F>) => Promise<K>): (...params: Parameters<typeof func>) => Promise<K | undefined>;
/**
 * Guarantees delay between invocations of the given function.
 *
 * Invocations of the throttled function after the given interval has passed will execute instantly.
 *
 * Subsequent invocations during the cool down return a promise to invoke the function after the remaining delay has passed.
 *
 * Once the interval has passed, all queued promises are executed, but only the latest promise will execute the function. The others will return undefined.
 * @param func the function to throttle
 * @param delay milliseconds required between invocations of the function.
 */
declare function throttleQueueAsync<F extends (...args: any) => any, K>(func: (...params: Parameters<F>) => K | Promise<K>, delay: number): (...params: Parameters<typeof func>) => Promise<K | undefined>;

/**
 * Makes sure the object is not undefined and the trim length is greater than 0.
 * @param value
 * @returns Synchronous validator
 */
declare function required<T, P, V, R, A>(): SyncValidator<T, P, V, R, A>;
/**
 * Validates the provided validators if the provided condition is true.
 * @param condition the condition to evaluate before executing validators.
 * @param validators the validators that get executed if the condition returns true.
 * @returns Asynchronous validator
 */
declare function validateIf<T, P, V, R, A>(condition: ((params: ValidatorParams<T, P, V, A>) => boolean) | ((params: ValidatorParams<T, P, V, A>) => Promise<boolean>), validators: (SyncValidator<T, P, V, R, A> | AsyncValidator<T, P, V, R, A>)[]): AsyncValidator<T, P, V, R, A>;
/**
 * Makes sure the string or number to validate has a length >= to the provided length.
 * @param minLength
 * @returns Synchronous validator
 */
declare function minLength<T extends string | number | undefined | null, P, V, R, A>(minLength: number): SyncValidator<T, P, V, R, A>;
/**
 * Makes sure the string or number to validate is less than the provided length. Undefined strings are treated as 0 length.
 * @param maxLength
 * @return Synchronous validator
 */
declare function maxLength<T extends string | number | undefined | null, P, V, R, A>(maxLength: number): SyncValidator<T, P, V, R, A>;
/**
 * Makes sure the number to validate is not undefined and is at least the provided value.
 * @param minNumber
 * @returns Synchronous validator
 */
declare function minNumber<T extends number | undefined | null, P, V, R, A>(minNumber: number): SyncValidator<T, P, V, R, A>;
/**
 * Makes sure the number to validate is not undefined and is at most the provided value.
 * @param maxNumber
 * @returns Synchronous validator
 */
declare function maxNumber<T extends number | undefined | null, P, V, R, A>(maxNumber: number): SyncValidator<T, P, V, R, A>;
/**
 * Checks if the string value is a valid looking email using RegEx.
 *
 * The RegEx was taken from https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript, and may be updated in the future.
 * @returns Synchronous validator
 */
declare function isEmailSync<T extends string | undefined | null, P, V, R, A>(): SyncValidator<T, P, V, R, A>;

/**
 * A lightweight Vue3 composable which provides model-based validation.
 *
 * @author Daniel Walbolt
 */
declare function useValidation<T, Args = undefined, FValidationReturn = unknown>(validationConfig: ValidationConfig<T, Args | undefined, FValidationReturn>): {
    hasValidated: boolean;
    validate: () => Promise<boolean>;
    isValidating: boolean;
    propertyState: ValidationState<T, FValidationReturn>;
    isValid: boolean;
    setReference: (reference: T) => void;
    isDirty: boolean;
};

export { ArrayValidationReturn, ArrayValidationState, ArrayValidatorTypes, AsyncValidator, BaseValidationReturn, BaseValidator, FinalFormValidation, Primitive, PrimitiveValidation, PrimitiveValidationState, PrimitiveValidatorTypes, RecursiveValidation, RecursiveValidationState, SyncValidator, ValidationConfig, ValidationState, Validator, ValidatorParams, ValidatorTypes, bufferAsync, isEmailSync, maxLength, maxNumber, minLength, minNumber, required, throttleQueueAsync, useValidation, validateIf };
