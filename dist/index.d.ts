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
/**
 * Represents an element in {@link ValidatorParams.arrayAncestors | arrayAncestors} which
 * holds context about the ancestor along with the ancestor itself.
 */
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
type BaseValidator<T, KModel, Args, Return, Ancestors> = (input: ValidatorParams<T, KModel, Args, Ancestors>) => Return;
/** Defines a validator which always runs synchronously */
type SyncValidator<T = unknown, KModel = unknown, Args = unknown, Return = any, Ancestors = unknown> = BaseValidator<T, KModel, Args, BaseValidationReturn<Return> | Array<Validator<T, KModel, Args, Return, Ancestors>> | undefined, Ancestors>;
/** Defines a validator which returns a promise */
type AsyncValidator<T = unknown, KModel = unknown, Args = unknown, Return = any, Ancestors = unknown> = BaseValidator<T, KModel, Args, Promise<BaseValidationReturn<Return> | Array<Validator<T, KModel, Args, Return, Ancestors>> | undefined>, Ancestors>;
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

/** Vuelidify's constant Symbol used for identifying when a throttle function returned early. */
declare const V$_IGNORE: unique symbol;
/**
 * Buffers a function such that only one instance of the function executes at a time.
 *
 * Calls during execution return a promise to execute the function after current execution finishes.
 * Only the latest buffered call will execute the function; the rest resolve to {@link V$_IGNORE}.
 *
 * @param func The function to apply a buffer to.
 *
 * @example
 * const buffered = bufferAsync(someAsyncFn);
 * buffered('a'); // executes
 * buffered('b'); // queued but will resolve to undefined
 * buffered('c'); // queued and will executed after first completes
 */
declare function bufferAsync<F extends (...args: any[]) => any>(func: F): (...params: Parameters<F>) => Promise<Awaited<ReturnType<F>> | typeof V$_IGNORE>;
/**
 * Throttles and buffers a function such that it is only called once per delay period.
 *
 * Calls during the throttle return a promise to execute the function after the throttle.
 * Only the latest buffered call will execute; the rest resolve to {@link V$_IGNORE}.
 *
 * Useful when you want to avoid spamming a resource and using the latest parameters is important.
 *
 * @param func - The function to throttle.
 * @param delayMs - Time between invocations.
 * @returns A throttled version of the function.
 *
 * @example
 * async function saveInput(input: string) { ... }
 * const throttledSave = throttleBufferAsync(saveInput, 1000);
 *
 * throttledSave("a"); // Executes immediately
 * throttledSave("b"); // Queued but will resolve to IGNORE_RESULT
 * throttledSave("c"); // Replaces "b", starts after 1s
 *
 * // Only "a" and "c" will be processed
 */
declare function throttleBufferAsync<F extends (...args: any[]) => any>(func: F, delayMs: number): (...params: Parameters<F>) => Promise<Awaited<ReturnType<F>> | typeof V$_IGNORE>;
/**
 * Adds trailing debounce behavior to a function.
 *
 * Waits for the specified delay after the last call before executing.
 * All previous calls during the delay resolve to {@link V$_IGNORE}. Guarantees the call will have the latest parameters.
 *
 * @param func - The async function to debounce.
 * @param delay - Delay in milliseconds after the last call before execution.
 * @returns A debounced version of the function.
 *
 * @example
 * async function fetchResults(query: string) { ... }
 * const debouncedFetch = trailingDebounceAsync(fetchResults, 500);
 *
 * debouncedFetch("a"); // resolves to IGNORE_RESULT
 * debouncedFetch("ab"); // resolves to IGNORE_RESULT
 * debouncedFetch("abc"); // Only this call will be executed after 500ms
 */
declare function trailingDebounceAsync<F extends (...args: any) => any>(func: F, delayMs: number): (...params: Parameters<F>) => Promise<Awaited<ReturnType<F>> | typeof V$_IGNORE>;
/**
 * Throttles a function, ensuring it's called once per delay period.
 *
 * Calls during the delay are ignored, and the first call after the delay executes immediately.
 *
 * Useful for hard limiting actions (e.g. form submissions or API calls).
 *
 * @param func - The function to throttle.
 * @param delayMs - The minimum time (in milliseconds) between calls.
 * @returns A ref indicating throttle state and the throttled function.
 *
 * @example
 * async function fetchResults(query: string) { ... }
 * const { throttledFunc } = throttleAsync(fetchResults, 500);
 *
 * throttledFunc("a"); // executes immediately
 * throttledFunc("ab"); // ignored
 * // ... 500 ms later ...
 * throttledFunc("abc"); // executes immediately
 */
declare function throttleAsync<F extends (...args: any) => any>(func: F, delayMs: number): {
    isThrottled: Ref<boolean>;
    throttledFunc: (...params: Parameters<F>) => ReturnType<F> | typeof V$_IGNORE;
};

/**
 * Accepts an array and uses the provided getter to get any value from each element
 * and ignoring any undefined or null values returned.
 *
 * ```ts
 * const array = [{ id: 123, name: "Foo"}, { id: 456, name: undefined }]
 * const validNames = reduceUndefined(array, v => v.name) // ["Foo"]
 * ```
 * @param array the array to map values from
 * @param getter a function executed with each element which can perform any kind of custom mapping.
 * @returns an array of the getter's return value invoked with each source element, with undefined values omitted.
 */
declare function reduceUndefined<T, K = NonNullable<T>>(array: T[], getter?: (value: T) => K | undefined | null): K[];

/**
 * Validates the object is not loosely undefined.
 * This does allow for empty strings. If you need a non-empty value, use {@link notEmpty()}.
 * @param message sets the error message returned.
 */
declare function required(message?: string): SyncValidator;
/**
 * Validates the object is not loosely undefined and is not an empty string.
 * @param message sets the error message returned.
 */
declare function notEmpty(message?: string): SyncValidator;
/**
 * Validates a string or number has a length >= to the provided length. Undefined and null are 0 length.
 * @param min the minimum length of the string or number.
 * @param message sets the error message returned.
 */
declare function minLength<T extends string | number | undefined | null>(min: number, message?: string): SyncValidator<T>;
/**
 * Validates a string or number's length. Undefined and null are 0 length.
 * @param max the maximum length of the string or number.
 * @param message sets the error message returned.
 */
declare function maxLength<T extends string | number | undefined | null>(max: number, message?: string): SyncValidator<T>;
/**
 * Validates a value is a number and is at least some value.
 * @param min the minimum number the value can be.
 * @param message sets the error message returned.
 */
declare function minNumber<T extends number | undefined | null>(min: number, message?: string): SyncValidator<T>;
/**
 * Validates a value is a number and is greater than some value.
 * @param min the number the value must be greater than.
 * @param message sets the error message returned.
 */
declare function exclusiveMinNumber<T extends number | undefined | null>(min: number, message?: string): SyncValidator<T>;
/**
 * Validates a value is a number and is at most some value.
 * @param max the maximum number the value can be.
 * @param message sets the error message returned.
 */
declare function maxNumber<T extends number | undefined | null>(max: number, message?: string): SyncValidator<T>;
/**
 * Validates a value is a number and is less than some value.
 * @param max the number the value must be less than.
 * @param message sets the error message returned.
 */
declare function exclusiveMaxNumber<T extends number | undefined | null>(max: number, message?: string): SyncValidator<T>;
/**
 * Validate the provided predicate function.
 * @param fn predicate that returns true if the value is valid.
 * @param message sets the error message returned.
 */
declare function must<T, K, V, R, A>(fn: (params: ValidatorParams<T, K, V, A>) => boolean, message: string): SyncValidator<T, K, V, R, A>;
/**
 * Execute a set of validators only if the provided predicate is true.
 * @param predicate determines if the set of validators should be returned.
 * @param validators The set of validators to execute if the predicate returns true.
 */
declare function validateIf<T, K, V, R, A, Validators extends Validator<T, K, V, R, A>[]>(predicate: (params: ValidatorParams<T, K, V, A>) => boolean | Promise<boolean>, validators: Validators): AsyncValidator<T, K, V, R, A>;
/**
 * Validates a string is a valid looking email using RegEx.
 *
 * The RegEx was taken from https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript, and may be updated in the future.
 * @param message sets the error message returned.
 */
declare function isEmailSync<T extends string | undefined | null>(message?: string): SyncValidator<T>;

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
    /**
     * Resets the internal state of the composable back to its starting state.
     */
    reset: () => void;
};
/**
 * The starting point for validation with Vuelidify.
 *
 * @author Daniel Walbolt
 */
declare function useValidation<T, Args = unknown, Return = any>(validationConfig: ValidationConfig<T, Args, Return>): Reactive<UseValidationReturn<T, Return>>;

export { ArrayAncestor, ArrayValidation, ArrayValidationState, AsyncValidator, BaseValidation, BaseValidationReturn, BaseValidationState, BaseValidator, ObjectValidationTypes, Primitive, PrimitiveValidationState, RecursiveValidation, RecursiveValidationState, SyncValidator, V$_IGNORE, Validation, ValidationConfig, ValidationState, Validator, ValidatorParams, bufferAsync, exclusiveMaxNumber, exclusiveMinNumber, isEmailSync, maxLength, maxNumber, minLength, minNumber, must, notEmpty, reduceUndefined, required, throttleAsync, throttleBufferAsync, trailingDebounceAsync, useValidation, validateIf };
