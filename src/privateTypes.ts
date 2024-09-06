import { Ref } from "vue";
import { ArrayValidationState, ArrayValidatorTypes, BaseValidationReturn, FinalFormValidation, Primitive, PrimitiveValidationState, PrimitiveValidatorTypes, RecursiveValidationState, Validator, ValidatorTypes } from "../dist";

/** An internally used type for allowing indexing of unknown types. i.e. obj[key] */
export type IndexableObject = {
	[key: string]: any;
}

/** Type specifically used for casting validation objects in order to appease TypeScript. */
export type PrimitiveOrArrayValidation = PrimitiveValidatorTypes<Primitive, any, any, any> & ArrayValidatorTypes<any, any[], any, any, any>;

export type ProcessedValidator<T,KParent, Args, FValidationReturn> = {
	/** The ID of the validator which is also used for the error messages */
	validatorId: string;
	validator: Validator<T, KParent, Args, FValidationReturn>;
	isReactive: boolean;
	isLazy: boolean;
	/** Used for determining whether or not to optimize this validator. */
	optimized: boolean;
	previouslySpawnedValidators: {
		[key: string]: ProcessedValidator<T, KParent, Args, FValidationReturn>
	};
	spawnedValidators: {
		[key: string]: ProcessedValidator<T, KParent, Args, FValidationReturn>
	};
	previouslyReturnedValidators: boolean;
	// Any additional information can be added here.
}

/** 
 * Stores all the necessary properties for validating a property. Only used within this composable, not visible to the end user.
 * 
 * Be careful to not put Refs inside of Refs, as they will be unwrapped and .value won't work.
 */
export type PropertyValidationConfig<T, KParent, Args, FValidationReturn> = {
	/** Identifies this config uniquely. */
	id: string,
	/** 
	 * Identifier for the current iteration validating this property.
	 * Because of concurrency, a previous iteration can finish while one is still running.
	 * This results in the finished iteration setting the "isValiding" state to false when validation is still happening.
	 * 
	 * Certain state will only change if the current iteration equals the iteration that just finished.
	 */
	validationIterationId: number,

	/** 
	 * Shows if all reactive validators on this property have passed or failed.
	 * Is undefined if it has not been validated yet. Is always true if there are no reactive validators.
	 */
	reactiveIsValid: Ref<boolean | undefined>;
	reactiveValidationResults: Ref<BaseValidationReturn<FValidationReturn>[]>;
	validatingReactive: Ref<boolean>;

	/** 
	 * Determines if all lazy validators on this property have passed or failed.
	 * Is undefined if it has not been validated yet. Is always true if there are no lazy validators.
	 */
	lazyIsValid: Ref<boolean | undefined>;
	lazyValidationResults: Ref<BaseValidationReturn<FValidationReturn>[]>;
	validatingLazy: Ref<boolean>;

	/**
	 * Contains all the validators that were ran previously. Optimizations may have been made on the async validators.
	 */
	reactiveProcessedValidators: ProcessedValidator<T, KParent, Args, FValidationReturn>[];
	/**
	 * Contains all the validators that were ran previously. Optimizations may have been made on the async validators.
	 */
	lazyProcessedValidators: ProcessedValidator<T, KParent, Args, FValidationReturn>[];

	/** Getter for the current value of the property this validation config is for. */
	property: Readonly<Ref<T>>;

	/** The user specified validation object for this property */
	validation: Readonly<ValidatorTypes<T, KParent, Args, FValidationReturn>>;
	/** The validation state for this property. A fraction of the entire object's validation state, which is given to the end user. */
	validationState: PrimitiveValidationState<FValidationReturn> & Partial<ArrayValidationState<any, FValidationReturn>>;
	
	/** Contains the validation configs for every element in the array. */
	arrayConfigMap: { [key: number]: ElementValidationConfig<unknown, KParent, Args, FValidationReturn> },
	/** Stores whether or not this property is an array AND has validation defined to be ran on each of its elements */
	hasElementValidation: Readonly<boolean>;
	/** Stores the next available id to use for elements in the array. */
	elementId: number;
	/** The validation the user provided for each element in the array. Is undefined if the property is not an array. */
	elementValidation: Readonly<FinalFormValidation<any, Args, FValidationReturn, KParent> | undefined>;
}

/** Stores the state and the validation configs of an element within an array */
export type ElementValidationConfig<T, KParent, Args, FValidationReturn> = {
	/** 
	 * The list of validation configs that can be used to validate this element.
	 * Each one should modify a portion of the {@link validationState} 
	 */
	validationConfigs: PropertyValidationConfig<any, KParent, Args, FValidationReturn>[]
	/** The validation state for this element */
	validationState: RecursiveValidationState<T, FValidationReturn>;
}