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
    errorMessages: string | string[];
    validationResults: BaseValidationReturn<FValidationReturn>[];
};
type ArrayValidationState<U, FValidationReturn> = PrimitiveValidationState<FValidationReturn> & {
    /**
     * Contains the validation state for each element in the array.
     *
     * Useful for passing validation state to components rendered from the array being validated.
     */
    arrayState: U extends IndexableObject ? ValidationState<U, FValidationReturn>[] : undefined;
};
/** Indexed type that describes the validation of objects with nested properties. */
type RecursiveValidation<T extends IndexableObject, KParent, ValidationArgs, FValidationReturn> = {
    [key in keyof Partial<T>]: FinalFormValidation<T[key], ValidationArgs, FValidationReturn, KParent>;
};
type PrimitiveValidation<T extends Primitive | undefined | null, KParent, Args, FValidationReturn> = PrimitiveValidatorTypes<T, KParent, Args, FValidationReturn>;
type IndexableObject = {
    [key: string]: any;
};
/** Separates the reactive and lazy validators of a primitive property. */
type PrimitiveValidatorTypes<T, KParent, Args, FValidationReturn> = {
    /** The validators for this property that are invoked whenever the form is changed. */
    $reactive?: Validator<T, KParent, Args, FValidationReturn>[];
    /** The validators for this property that are invoked only after {@link validate()} is invoked. */
    $lazy?: Validator<T, KParent, Args, FValidationReturn>[];
};
type ArrayValidatorTypes<U, T extends Array<U>, KParent, Args, FValidationReturn> = {
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
};
/** A synchronous or asynchronous validator. */
type Validator<T, KParent, Args, FValidationReturn> = (SyncValidator<T, KParent, Args, FValidationReturn> | AsyncValidator<T, KParent, Args, FValidationReturn>);
type ValidatorTypes<T, KParent, Args, FValidationReturn> = T extends Array<infer U> ? ArrayValidatorTypes<U, T, KParent, Args, FValidationReturn> : PrimitiveValidatorTypes<T, KParent, Args, FValidationReturn>;
type BaseValidator<T, K, V, F> = (input: ValidatorParams<T, K, V>) => F;
type SyncValidator<T, K, V, F> = BaseValidator<T, K, V, BaseValidationReturn<F> | Array<Validator<T, K, V, F>>>;
type AsyncValidator<T, K, V, F> = BaseValidator<T, K, V, Promise<BaseValidationReturn<F> | Array<Validator<T, K, V, F>> | undefined>>;
type BaseValidationReturn<F = any> = {
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
    custom?: F;
};
type ArrayValidationReturn<U, FValidationReturn> = BaseValidationReturn<FValidationReturn> & {
    /** The raw list of results from validating every object in the array */
    arrayResults?: ValidationState<U, FValidationReturn>[];
};
/** The general validation object type for Final Form. */
type FinalFormValidation<T, Args = undefined, FValidationReturn = undefined, KParent = T> = T extends Array<infer U> ? ArrayValidatorTypes<U, T, KParent, Args, FValidationReturn> : T extends IndexableObject ? RecursiveValidation<T, KParent, Args, FValidationReturn> : T extends boolean ? PrimitiveValidation<boolean | undefined | null, KParent | undefined | null, Args, FValidationReturn> : T extends Primitive ? PrimitiveValidation<T | undefined | null, KParent | undefined | null, Args, FValidationReturn> : undefined;
type ValidationConfig<T, Args, FValidationReturn> = {
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
    args?: Args;
};
/** The parameter passed into validator functions */
type ValidatorParams<T, KParent, Args> = {
    /** The current value of the property */
    value: T;
    /** The object that was passed into the FinalForm validation composable to be validated. */
    parent: KParent;
    /** User provided object for validating with data outside of the base object. */
    args: Args;
};

/**
 * Returns a function that will only execute the provided promise returning function
 * with the most recently specified params only if a previously created promise does not exist.
 */
declare function bufferAsync<F extends (...args: any) => any, K>(func: (...params: Parameters<F>) => Promise<K>): (...params: Parameters<typeof func>) => Promise<K | undefined>;
/**
 * Gurantees delay between invocations of the given function.
 *
 * Invocations of the throttled function after the given interval has passed will execute instantly.
 *
 * Subsequent invocations during the cooldown return a promise to invoke the function after the remaining delay has passed.
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
declare function required<T, P, V, R>(): SyncValidator<T, P, V, R>;
/**
 * Validates the provided validators if the provided condition is true.
 * @param condition the condition to evaluate before executing validators.
 * @param validators the validators that get executed if the condition returns true.
 * @returns Asynchronous validator
 */
declare function validateIf<T, P, V, R>(condition: ((params: ValidatorParams<T, P, V>) => boolean) | ((params: ValidatorParams<T, P, V>) => Promise<boolean>), validators: (SyncValidator<T, P, V, R> | AsyncValidator<T, P, V, R>)[]): AsyncValidator<T, P, V, R>;
/**
 * Makes sure the string to validate has a length >= to the provided length. Undefined strings are treated as 0 length.
 * @param minLength
 * @returns Synchronous validator
 */
declare function minimumLength<T extends string | number | undefined | null, P, V, R>(minLength: number): SyncValidator<T, P, V, R>;
/**
 * Makes sure the string to validate is less than the provided length. Undefined strings are treated as 0 length.
 * @param maxLength
 * @return Synchronous validator
 */
declare function maximumLength<T extends string | undefined | null, P, V, R>(maxLength: number): SyncValidator<T, P, V, R>;
/**
 * Makes sure the number to validate is not undefined and is atleast the provided value.
 * @param minValue
 * @returns Synchronous validator
 */
declare function minValue<T extends number | undefined | null, P, V, R>(minValue: number): SyncValidator<T, P, V, R>;
/**
 * Checks if the string value is a valid looking email using RegEx.
 * @returns Synchronous validator
 */
declare function isEmailSync<T extends string | undefined | null, P, V, R>(): SyncValidator<T, P, V, R>;

/**
 * Vue3 composable that handles lazy and reactive synchronous and asynchronous validation.
 *
 * If the object you provided is not in a good state (i.e. it must be loaded in asynchronously first), call the {@link setup()} method returned by this composable.
 *
 * Setting up validation on an incomplete object will mean that the properties of the object can not be linked to the validation configured, thus causing problems.
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

export { ArrayValidationReturn, ArrayValidationState, ArrayValidatorTypes, AsyncValidator, BaseValidationReturn, BaseValidator, FinalFormValidation, Primitive, PrimitiveValidation, PrimitiveValidationState, PrimitiveValidatorTypes, RecursiveValidation, RecursiveValidationState, SyncValidator, ValidationConfig, ValidationState, Validator, ValidatorParams, ValidatorTypes, bufferAsync, isEmailSync, maximumLength, minValue, minimumLength, required, throttleQueueAsync, useValidation, validateIf };
