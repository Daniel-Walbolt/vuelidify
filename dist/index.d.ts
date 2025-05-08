import { Ref, Reactive, ComputedRef } from 'vue';

/** Shorthand union of the primitive types */
type Primitive = string | number | boolean;
/** Defines the layout of validation results. Copies the format of the object being validated. */
type ValidationState<T, Return = any> = T extends Array<infer U> ? ArrayValidationState<U, Return> : T extends IndexableRecord ? RecursiveValidationState<T, Return> : T extends Primitive ? PrimitiveValidationState<Return> : never;
/** Determines the validation state available to objects. */
type RecursiveValidationState<T extends IndexableRecord, Return = any> = BaseValidationState<Return> & {
    [key in keyof T]?: ValidationState<T[key], Return>;
};
/** Describes the Vuelidify validation state. */
type BaseValidationState<Return = any> = {
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
type PrimitiveValidationState<Return = any> = BaseValidationState<Return>;
/** Defines the validation state for an array. */
type ArrayValidationState<U, Return = any> = BaseValidationState<Return> & {
    /**
     * Contains the validation state for each element in the array.
     *
     * Maps 1:1 to the array which was validated.
     */
    $arrayState: ValidationState<U, Return>[];
};
/** Defines validation rules for records. */
type RecursiveValidation<T, KModel, ValidationArgs, Return, Ancestors, NLevel extends number> = ObjectValidationTypes<T, KModel, ValidationArgs, Return, Ancestors> & {
    [key in keyof Partial<T>]: Validation<T[key], ValidationArgs, Return, KModel, Ancestors, NLevel>;
};
/** Defines the validation rules for records */
type ObjectValidationTypes<T = unknown, KModel = unknown, Args = unknown, Return = any, Ancestors = unknown> = BaseValidation<T, KModel, Args, Return, Ancestors>;
type IndexableRecord = Record<string, unknown>;
/** Defines the validation rules for all supported objects. */
type BaseValidation<T = unknown, KModel = unknown, Args = unknown, Return = any, Ancestors = unknown> = {
    /** Validators invoked whenever the model is changed. */
    $reactive?: Validator<T, KModel, Args, Return, Ancestors>[];
    /** Validators invoked only after {@link UseValidationReturn.validate | validate()} is invoked. */
    $lazy?: Validator<T, KModel, Args, Return, Ancestors>[];
};
/** Defines the validation rules for an array. */
type ArrayValidation<U, T = U[], KModel = unknown, Args = unknown, Return = any, Ancestors = unknown, NLevel extends number = number> = BaseValidation<T, KModel, Args, Return, Ancestors> & {
    /**
     * Defines the validation rules for each element of an array.
     *
     * Works best with arrays of objects; see documentation for details.
     */
    $each?: Validation<U, Args, Return, KModel, Ancestors extends undefined ? {
        [key in NLevel]: ArrayAncestor<U, T>;
    } : Ancestors & {
        [key in NLevel]: ArrayAncestor<U, T>;
    }, Increment<NLevel>>;
};
type ArrayAncestor<U = unknown, // the type of T's elements
T = unknown> = Readonly<{
    /** The index this ancestor is at in `array` */
    index: number;
    /** The array which contains the ancestor. Useful for referencing this ancestor's siblings. */
    array: T;
    /** An object which contains the value you are validating. */
    ancestor: U;
}>;
/** A synchronous or asynchronous validator. */
type Validator<T = unknown, KModel = unknown, Args = unknown, Return = any, Ancestors = unknown> = SyncValidator<T, KModel, Args, Return, Ancestors> | AsyncValidator<T, KModel, Args, Return, Ancestors>;
/** Defines a validator function */
type BaseValidator<T, Parent, Args, Return, Ancestors> = (input: ValidatorParams<T, Parent, Args, Ancestors>) => Return;
/** Defines a validator which always runs synchronously */
type SyncValidator<T = unknown, Parent = unknown, Args = unknown, Return = any, Ancestors = unknown> = BaseValidator<T, Parent, Args, BaseValidationReturn<Return> | Array<Validator<T, Parent, Args, Return, Ancestors>> | undefined, Ancestors>;
/** Defines a validator which returns a promise */
type AsyncValidator<T = unknown, Parent = unknown, Args = unknown, Return = any, Ancestors = unknown> = BaseValidator<T, Parent, Args, Promise<BaseValidationReturn<Return> | Array<Validator<T, Parent, Args, Return, Ancestors>> | undefined>, Ancestors>;
/** Defines the return value of validators */
type BaseValidationReturn<F = unknown> = {
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
type Validation<T, Args = unknown, Return = any, KModel = T, Ancestors = unknown, NLevel extends number = 0> = [
    NonNullable<T>
] extends [Array<infer U>] ? ArrayValidation<U, T, KModel, Args, Return, Ancestors, NLevel> : [NonNullable<T>] extends [IndexableRecord] ? RecursiveValidation<T, KModel, Args, Return, Ancestors, NLevel> : [NonNullable<T>] extends [Primitive] ? BaseValidation<T, KModel, Args, Return, Ancestors> : never;
/** Defines the configuration for the {@link useValidation | useValidation() } composable */
type ValidationConfig<T = unknown, Args = unknown, Return = any> = {
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
type ValidatorParams<T = unknown, KModel = unknown, Args = unknown, Ancestors = unknown> = {
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
    ...number[]
][N];

/**
 * Returns a function that will execute the provided function
 * with the latest params only if a previously created promise does not exist.
 * ```ts
 * async function test(): Promise<boolean> {}
 * // Call this constant instead of the function to get the buffer benefits
 * const bufferedTest = bufferAsync<
 * 		typeof test, // this type makes the return the same signature as test()
 * 		Awaited<ReturnType<typeof test>> // this type makes the returned function have the same return type
 * >(test);
 * ```
 */
declare function bufferAsync<F extends (...args: any[]) => any, K>(func: (...params: Parameters<F>) => K | Promise<K>): (...params: Parameters<typeof func>) => Promise<K | undefined>;
/**
 * Guarantees delay between invocations of the given function.
 *
 * Invocations of the throttled function after the given interval has passed will execute instantly.
 *
 * Subsequent invocations during the cool down return a promise to invoke the function after the remaining delay has passed.
 *
 * Once the interval has passed, all queued promises are executed, but only the latest promise will execute the function. The others will return undefined.
 * ```ts
 * async function test(): Promise<boolean> {}
 * // Call this constant instead of the function to get the throttle benefits
 * const throttledTest = throttleQueueAsync<
 * 		typeof test, // this type makes the return the same signature as test()
 * 		Awaited<ReturnType<typeof test>> // this type makes the returned function have the same return type
 * >(test);
 * ```
 * @param func the function to throttle
 * @param delay milliseconds required between invocations of the function.
 */
declare function throttleQueueAsync<F extends (...args: any[]) => any, K>(func: (...params: Parameters<F>) => K | Promise<K>, delay: number): (...params: Parameters<typeof func>) => Promise<K | undefined>;

/**
 * Validates the object is not loosely undefined.
 */
declare function required(): SyncValidator;
/**
 * Validates a string or number has a length >= to the provided length. Undefined and null are 0 length.
 * @param minLength
 */
declare function minLength<T extends string | number | undefined | null>(minLength: number): SyncValidator<T>;
/**
 * Validates a string or number's length. Undefined and null are 0 length.
 * @param maxLength the maximum length of the string or number
 */
declare function maxLength<T extends string | number | undefined | null>(maxLength: number): SyncValidator<T>;
/**
 * Validates a number is defined and is at least some value.
 * @param minNumber the minimum number the value can be
 */
declare function minNumber<T extends number | undefined | null>(minNumber: number): SyncValidator<T>;
/**
 * Validates a number is defined and is at most some value.
 * @param maxNumber the maximum number the value can be
 */
declare function maxNumber<T extends number | undefined | null>(maxNumber: number): SyncValidator<T>;
/**
 * Validate the provided predicate function.
 * @param fn predicate that returns true if the value is valid.
 * @param errorMessage the message to display when the values are not equal.
 */
declare function must<T, K, V, R, A>(fn: (params: ValidatorParams<T, K, V, A>) => boolean, errorMessage: string): SyncValidator<T, K, V, R, A>;
/**
 * Validates a string is a valid looking email using RegEx.
 *
 * The RegEx was taken from https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript, and may be updated in the future.
s */
declare function isEmailSync<T extends string | undefined | null>(): SyncValidator<T>;

type UseValidationReturn<T = unknown, Return = any> = {
    hasValidated: Ref<boolean>;
    validate: () => Promise<boolean>;
    isValidating: ComputedRef<boolean>;
    /** Stores the results of validation */
    state: ComputedRef<ValidationState<T, Return>>;
    /** True only if all validators passed. */
    isValid: ComputedRef<boolean>;
    /** True if any of the validators failed. */
    isErrored: ComputedRef<boolean>;
    /** Sets the internal reference object for determining {@link isDirty} */
    setReference: (reference: T) => void;
    /**
     * Reactively determines if the object being validated has changed from the reference state.
     *
     * The reference state can be changed using {@link setReference()}.
     */
    isDirty: ComputedRef<boolean>;
};
/**
 * The starting point for validation with Vuelidify.
 *
 * @author Daniel Walbolt
 */
declare function useValidation<T, Args = unknown, Return = any>(validationConfig: ValidationConfig<T, Args, Return>): Reactive<UseValidationReturn<T, Return>>;

export { ArrayAncestor, ArrayValidation, ArrayValidationState, AsyncValidator, BaseValidation, BaseValidationReturn, BaseValidationState, BaseValidator, ObjectValidationTypes, Primitive, PrimitiveValidationState, RecursiveValidation, RecursiveValidationState, SyncValidator, Validation, ValidationConfig, ValidationState, Validator, ValidatorParams, bufferAsync, isEmailSync, maxLength, maxNumber, minLength, minNumber, must, required, throttleQueueAsync, useValidation };
