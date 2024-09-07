import { computed, reactive, Ref, ref } from "vue";
import { ArrayValidationState, ArrayValidatorTypes, Primitive, PrimitiveValidationState, PrimitiveValidatorTypes, RecursiveValidation, RecursiveValidationState, ValidationState, Validator, ValidatorTypes } from "../../dist";
import { IndexableObject, PrimitiveOrArrayValidation, ProcessedValidator, PropertyValidationConfig } from "../privateTypes";
import { flatMap, reduceUndefined } from "../finalFormUtilities";
import { FinalFormValidation } from "../finalFormTypes";

function uniqueId() {
	return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Takes in a list of validators and returns an equally sized list of processed validators.
 * Processed validators have additional information tied to the validator function itself.
 * @param validators
 * @param markReactive
 */
export function processValidators<
	G,
	KParent,
	Args,
	FValidationReturn
>(
	validators: Validator<G, KParent, Args, FValidationReturn>[],
	/** Mark the processed validators as reactive or lazy */
	markReactive: boolean,
	/** Change how the ID is assigned. Will use the provided ID and simply attach the validator's index to it. */
	useExistingIdWithIndex?: string
): ProcessedValidator<G, KParent, Args, FValidationReturn>[] {
	const processedValidators: ProcessedValidator<G, KParent, Args, FValidationReturn>[] = [];
	let getId = (index: number) => `${markReactive ? "reactive" : "lazy"}-${uniqueId()}`;
	if (useExistingIdWithIndex != undefined) {
		getId = (index: number) => `${useExistingIdWithIndex}-${index}`
	}
	for (const [index,validator] of validators.entries()) {
		processedValidators.push({
			validatorId: getId(index),
			validator: validator,
			isLazy: !markReactive,
			isReactive: markReactive,
			optimized: false,
			previouslyReturnedValidators: false,
			previouslySpawnedValidators: {},
			spawnedValidators: {}
		});
	}
	return processedValidators;
}

/**
 * Performs setup of validation on a property. Creates a property validation config, and validation state object.
 */
export function configureValidationOnProperty<G, KParent, Args, FValidationReturn>(
	object: Ref<G>,
	validation: ValidatorTypes<G, KParent, Args, FValidationReturn>
) {
	const isArrayValidation = (validation as ArrayValidatorTypes<unknown, any, KParent, Args, FValidationReturn>).$each != undefined;

	// Create a reactive object for the validation state just for convenience.
	// Users don't have to type .value on any of the these properties in
	// JavaScript or in the Vue templates while still having reactivity.
	const validationState: PrimitiveValidationState<FValidationReturn> & Partial<ArrayValidationState<any, FValidationReturn>> = reactive({
		isValid: computed(() => {
			// If the lazy validators are undefined, then they haven't been called yet. The property can not be guaranteed to be valid until these validators are ran.
			const isLazyValid = validationConfig.lazyIsValid.value ?? false;
			// If the reactive validators are undefined then they haven't been called yet. The property can not be guaranteed to be valid.
			const isReactiveValid = validationConfig.reactiveIsValid.value ?? false;
			return isLazyValid && isReactiveValid;
		}),
		/** State indicating that validators are currently being called. */
		isValidating: computed(() => validationConfig.validatingReactive.value || validationConfig.validatingLazy.value),
		isErrored: computed(() => validationState.validationResults.some(x => x.isValid == false)),
		/** Array of the error messages that come from the {@link validationResults[]} for ease of use. */
		errorMessages: computed(() => flatMap(reduceUndefined(validationState.validationResults, val => val.isValid ? undefined : val.errorMessage))),
		validationResults: computed(() => (validationConfig.reactiveValidationResults.value ?? []).concat(validationConfig.lazyValidationResults.value ?? [])),
		arrayState: computed(() => {
			// Array state should be undefined until the object is actually an array.
			if (Array.isArray(object.value) === false || validationConfig.elementValidation === undefined) {
				return undefined;
			}
			// Declare some variables for readability
			const arr = object.value;
			const elValidation = validationConfig.elementValidation;
			const validationMap = validationConfig.arrayConfigMap;

			/** Stores the ID for the object that is currently being handled in the loop */
			let tempId;
			/** Stores the IDs of objects, indicating their order in the array */
			const objectIds: number[] = [];

			for (let i = 0; i < arr.length; i++) {
				// Give the object an ID if it doesn't already have one.
				// This step is crucial in order to know what validation state this object is bound to.
				if (arr[i].$ffId === undefined) {
					// Use define property to make this property invisible to enumerators
					// Concatenates the ID of the array validator with a unique number within the array.
					Object.defineProperty(
						arr[i],
						`$ffId`,
						{
							value: `${validationConfig.id}-${validationConfig.elementId++}`,
							writable: false,
							configurable: false,
							enumerable: false
						},
					)
				}
				// Store the id on the object so we can use it to keep track of the validation config.
				tempId = arr[i].$ffId;
				objectIds.push(tempId);

				// Skip setting up validation if this object already has a validation configuration
				if (validationMap[tempId]) {
					continue;
				}

				if (isPrimitiveOrArrayValidation(elValidation)) {
					const typedValidation = elValidation as PrimitiveValidatorTypes<Primitive | undefined, KParent, Args | undefined, FValidationReturn>;
					const typedObject = computed(() => arr[i]) as Ref<Primitive>;
					const validationConfig = configureValidationOnProperty(typedObject, typedValidation);
					validationMap[tempId] = {
						validationConfigs: [validationConfig],
						validationState: validationConfig.validationState
					};
				}
				else {
					const typedObject = arr[i] as IndexableObject;
					const typedValidation = elValidation as RecursiveValidation<typeof typedObject, KParent, Args, FValidationReturn>;
					const validationSetup = setupNestedPropertiesForValidation(typedObject, typedValidation);
					validationMap[tempId] = {
						validationConfigs: validationSetup.validationConfigs,
						validationState: validationSetup.state
					};
				}
			}

			// Generate the list of validation states
			const elemValidationState: RecursiveValidationState<any, FValidationReturn>[] = [];
			// Generate a new validation map to get rid of old data.
			const prunedValidationMap: typeof validationMap = {};
			// Loop over the array of object IDs and assemble the array of corresponding validation states.
			// Each index in this array should be the validation state of the object at the same index in the array being validated.
			for (const objectId of objectIds) {
				elemValidationState.push(validationMap[objectId].validationState);
				prunedValidationMap[objectId] = validationMap[objectId];
			}
			validationConfig.arrayConfigMap = prunedValidationMap;
			return elemValidationState;
		})
	});

	// If there are no lazy validators, lazy validation is automatically valid (true).
	const initIsLazyValid = !((validation.$lazy?.length ?? -1) > 0);
	// If there are no reactive validators, reactive validation is automatically valid (true).
	const initIsReactiveValid = !((validation.$reactive?.length ?? -1) > 0);

	const reactiveValidators = validation.$reactive ? processValidators(validation.$reactive, true) : [];
	const lazyValidators = validation.$lazy ? processValidators(validation.$lazy, false) : [];

	const validationConfig: PropertyValidationConfig<G, KParent, Args, FValidationReturn> = {
		id: uniqueId(),
		validationIterationId: 0,
		reactiveIsValid: ref(initIsReactiveValid),
		reactiveValidationResults: ref([]),
		validatingReactive: ref(false),
		lazyIsValid: ref(initIsLazyValid),
		lazyValidationResults: ref([]),
		validatingLazy: ref(false),
		property: object,
		validation: validation,
		validationState: validationState,
		reactiveProcessedValidators: reactiveValidators,
		lazyProcessedValidators: lazyValidators,
		arrayConfigMap: {},
		hasElementValidation: isArrayValidation,
		elementId: 0,
		elementValidation: (validation as ArrayValidatorTypes<unknown, any, KParent, Args, FValidationReturn>).$each
	}
	return validationConfig;
}

/** Recursive function that analyzes the object provided, relates properties to validators, and creates validation state for each property. */
export function setupNestedPropertiesForValidation<G extends IndexableObject, KParent, Args, FValidationReturn>(
	object: G,
	validation: RecursiveValidation<G, KParent, Args, FValidationReturn> | undefined,
) {
	// Store the validation configurations for all relevant properties.
	const validationConfigs: PropertyValidationConfig<any, KParent, Args, FValidationReturn>[] = [];
	const state: ValidationState<IndexableObject , FValidationReturn> = {} as any;
	if (validation != undefined) {
		recursiveSetup(object, validation);
	}

	/** Recursive function to iterate through the validation object and create validation configs. */
	function recursiveSetup<G extends IndexableObject>(
		rObject: G,
		rValidation: RecursiveValidation<G, KParent, Args, FValidationReturn>
	) {
		for (const key in rValidation) {
			/** 
			 * Can return null, undefined, a primitive, array, or custom object.
			 * Note, this has to be a getter Ref.
			 */
			const property = computed(() => rObject[key]);
			// Based on the validation we are provided, we can reasonably assume what the object is supposed to be.
			// We can distinguish if this is a validatable property (array or primitive)
			if (isPrimitiveOrArrayValidation(validation)) {
				const propertyValidation = rValidation[key] as unknown as ValidatorTypes<G[keyof G], KParent, Args, FValidationReturn>;
				const validatedPropertyConfig = configureValidationOnProperty(property, propertyValidation);
				validationConfigs.push(validatedPropertyConfig);
				state[key] = validatedPropertyConfig.validationState;
			}
			// Lastly, the property is an object with nested properties. The types for validation require a nested object in this case.
			else {
				// The property can be null, undefined, or a nested object.
				const nestedState = {} as RecursiveValidationState<G[keyof G], FValidationReturn>
				const nestedValidation = rValidation[key] as RecursiveValidation<G[keyof G], KParent, Args, FValidationReturn>;
				state[key] = nestedState;
				recursiveSetup(
					property,
					nestedValidation
				);
			}
		}
	}

	return {
		/** All the validation configs from all the validators the user defined */
		validationConfigs,
		/** The object that can be used to represent that state of validation for the provided object. */
		state
	}
}

function isPrimitiveOrArrayValidation(validation: FinalFormValidation<any, any, any, any>): validation is PrimitiveOrArrayValidation {
	return (validation as PrimitiveOrArrayValidation)?.$reactive !== undefined ||
		(validation as PrimitiveOrArrayValidation)?.$lazy !== undefined ||
		(validation as PrimitiveOrArrayValidation)?.$each !== undefined
}