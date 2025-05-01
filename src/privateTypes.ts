import type { ComputedRef, Ref } from 'vue';
import type { ArrayValidationState, BaseValidationReturn, BaseValidationState, AsyncValidator, PrimitiveValidationState, SyncValidator, ValidatorParams } from './publicTypes.ts';

/** An internally used type for allowing indexing of unknown types. i.e. obj[key] */
export type IndexableObject = {
	[key: string]: unknown;
}

export type ProcessedValidator = {
	/** The ID of the validator which is also used for the error messages */
	validatorId: string;
	validator: GenericValidator;
	computedValidator?: ComputedRef<ReturnType<GenericSyncValidator>>
	/** Used for determining whether or not to optimize this validator. */
	optimized: boolean;
	/** Does this validator belong to reactive or lazy validation. Used when assigning IDs to spawned validators. */
	isReactive: boolean;
	previouslySpawnedValidators: {
		[key: string]: ProcessedValidator
	};
	spawnedValidators: {
		[key: string]: ProcessedValidator
	};
	previouslyReturnedValidators: boolean;
	// Any additional information can be added here.
}

/** 
 * Stores all the necessary properties for validating a property. Only used within this composable, not visible to the end user.
 * 
 * Be careful to not put Refs inside of Refs, as they will be unwrapped and .value won't work.
 */
export type PropertyValidationConfig = {
	/** Identifies this config uniquely. */
	id: string,
	/** 
	 * Identifier for the current iteration validating this property.
	 * Because of concurrency, a previous iteration can finish while one is still running.
	 * This results in the finished iteration setting the "isValidating" state to false when validation is still happening.
	 * 
	 * Certain state will only change if the current iteration equals the iteration that just finished.
	 */
	validationIterationId: number,

	/** 
	 * True if all reactive validators on this property have passed or if none exist.
	 * Is undefined if reactive validation has not been done yet.
	 */
	isReactiveValid: Ref<boolean | undefined>;
	isValidatingReactive: Ref<boolean>;
	/**
	 * Contains all the reactive validators. Optimizations may have been made on them.
	 */
	reactiveProcessedValidators: ProcessedValidator[];

	/** 
	 * True if all lazy validators on this property have passed or if none exist.
	 * Is undefined if lazy validation has not been done yet.
	 */
	isLazyValid: Ref<boolean | undefined>;
	isValidatingLazy: Ref<boolean>;
	/**
	 * Contains all the lazy validators. Optimizations may have been made on them.
	 */
	lazyProcessedValidators: ProcessedValidator[];


	/** Getter for the current value of the property this validation config is for. */
	property: Readonly<Ref<unknown>>;

	/** The user specified validation object for this property */
	validation: Readonly<AnyGenericValidationType>;

	/** The validation state for this config. */
	validationState: GenericValidationState;

	validationResults: Ref<BaseValidationReturn<unknown>[]>;
	namedValidationResults: Ref<{
		[key: string]: BaseValidationReturn<unknown>;
	}>
	
	/** Contains the validation configs for every element in the array. */
	arrayConfigMap: { [key: number]: ElementValidationConfig },
	/** Stores the next available id to use for elements in the array. */
	elementId: number;
	/** The validation the user provided for each element in the array. Is undefined if the property is not an array. */
	elementValidation: Readonly<GenericValidation | undefined>;
	/** 
	 * An array of all the array elements that were traversed through during validation.
	 * 
	 * Add computed getters to this list
	 * TODO: Are we sure we want to push computed getters to this list? I think this would lead to problems when the index the getter refers to becomes a different object.
	 */
	arrayParents: object[]
}

/** A context-independent version of the public Validation type */
export type GenericValidation = AnyGenericValidationType | IndexableGenericValidation;
export type IndexableGenericValidation = { [key: string]: GenericValidation }
/** A context-independent version of the ArrayValidation type */
export type GenericArrayValidation = GenericBaseValidation & {
	$each?: GenericValidation
}
/** A context-independent version of the PrimitiveValidation type */
export type GenericPrimitiveValidation = GenericBaseValidation;

export type GenericObjectValidation = GenericBaseValidation;
/** A short-hand type for the union of all possible validation types */
export type AnyGenericValidationType = GenericPrimitiveValidation | GenericArrayValidation | GenericObjectValidation;

export type GenericBaseValidation = {
	$reactive?: GenericValidator[];
	$lazy?: GenericValidator[];
}

/** A context-independent version of the public Validator type */
export type GenericValidator = GenericSyncValidator | GenericAsyncValidator;
/** A context-independent version of the public SyncValidator type */
export type GenericSyncValidator = SyncValidator<unknown, unknown, unknown, unknown, unknown>;
/** A context-independent version of the public AsyncValidator type */
export type GenericAsyncValidator = AsyncValidator<unknown, unknown, unknown, unknown, unknown>;

/** A context-independent version of the public ValidationState type */
export type GenericValidationState = GenericArrayValidationState & GenericPrimitiveValidationState | (GenericBaseValidationState & {
	[key: string]: GenericValidationState
});
/* A context-independent version of the public BaseValidationState type */
export type GenericBaseValidationState = BaseValidationState<unknown>;
/** A context-independent version of the public ArrayValidationState type */
export type GenericArrayValidationState = ArrayValidationState<unknown, unknown>;
/** A context-independent version of hte public PrimitiveValidationState type */
export type GenericPrimitiveValidationState = PrimitiveValidationState<unknown>;

export type GenericValidatorParams = ValidatorParams<unknown, unknown, unknown, unknown>;

/** Stores the state and the validation configs of an element within an array. Used internally. */
export type ElementValidationConfig = {
	/** 
	 * The list of validation configs that can be used to validate this element.
	 * Each one should modify a portion of the {@link validationState} 
	 */
	validationConfigs: PropertyValidationConfig[]
	/** The validation state for this element */
	validationState: GenericValidationState;
}