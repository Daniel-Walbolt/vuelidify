import { BaseValidationReturn, Primitive, PrimitiveValidatorTypes, RecursiveValidation, ValidationConfig, ValidationState, Validator } from "./finalFormTypes";
import { Ref, ref, computed, watch, reactive } from "vue";
import { throttleQueueAsync } from "./finalFormUtilities";
import { IndexableObject, PrimitiveOrArrayValidation, ProcessedValidator, PropertyValidationConfig } from "./privateTypes";
import { invokeAndOptimizeValidators } from "./services/validatorInvocation";
import { configureValidationOnProperty, setupNestedPropertiesForValidation } from "./services/validatorProcessing";

/** 
 * Vue3 composable that handles lazy and reactive synchronous and asynchronous validation.
 * 
 * If the object you provided is not in a good state (i.e. it must be loaded in asynchronously first), call the {@link setup()} method returned by this composable.
 * 
 * Setting up validation on an incomplete object will mean that the properties of the object can not be linked to the validation configured, thus causing problems.
 * @author Daniel Walbolt
 */
export function useValidation<
	T,
	Args = undefined,
	FValidationReturn = unknown
>(
	validationConfig: ValidationConfig<T, Args | undefined, FValidationReturn>
) {
	validationConfig.delayReactiveValidation ??= true; // Default value for delayReactiveValidation
	const { objectToValidate: object, validation, delayReactiveValidation, args } = validationConfig;

	/** Only true after {@link validate()} finished successfully. */
	const hasValidated = ref(false);
	const isValidating = computed(() => validationConfigs.some(x => x.validationState.isValidating));
	const isValid = computed(() => {
		const allValidatorsValid = validationConfigs.every(x => x.reactiveIsValid.value && x.lazyIsValid.value);
		return allValidatorsValid;
	});
	/** List of objects that relates validation to the object's properties. */
	let validationConfigs: PropertyValidationConfig<any, T, any, FValidationReturn>[] = [];
	let propertyState: ValidationState<T, FValidationReturn> = reactive({} as any);

	/** The reference for determining if the object has been changed or not.  */
	const dirtyReference = ref(JSON.stringify(validationConfig.objectToValidate.value));
	/** 
	 * Reactively determines if the object being validated has changed from the reference state.
	 * 
	 * The reference state can be changed using {@link setReference()}.
	 */
	const isDirty = computed(() => dirtyReference.value !== JSON.stringify(validationConfig.objectToValidate.value));

	// Based on the validation we are provided, we can reasonably assume what the object is supposed to be.
	// We can distinguish if this is a validatable property (array or primitive)
	const isPrimitiveOrArray = (validation as PrimitiveOrArrayValidation)?.$reactive != undefined ||
		(validation as PrimitiveOrArrayValidation)?.$lazy != undefined ||
		(validation as PrimitiveOrArrayValidation)?.$each != undefined;

	// If the object is a primitive type or undefined (at time of initialization) we will treat it as singular property validation
	if (isPrimitiveOrArray) {
		// The user is attempting to add validation onto a singular property instead of an object.
		// Assert the type of the provided ref to a more accurate type that describes the state of this branch.
		const typedValidation = validation as PrimitiveValidatorTypes<Primitive | undefined, T, Args | undefined, FValidationReturn>;
		const typedObject = object as Ref<Primitive>;
		const validatedPropertyConfig = configureValidationOnProperty(typedObject, typedValidation);
		propertyState = reactive(validatedPropertyConfig.validationState) as any; // typescript can't comprehend this type
		validationConfigs = [validatedPropertyConfig];
	}
	else {
		const typedObject = object as Ref<IndexableObject>;
		const typedValidation = validation as RecursiveValidation<typeof typedObject, T, Args, FValidationReturn>;
		const validationSetup = setupNestedPropertiesForValidation<IndexableObject, T, Args, FValidationReturn>(typedObject.value, typedValidation);
		propertyState = reactive(validationSetup.state) as ValidationState<T, FValidationReturn>;
		validationConfigs = validationSetup.validationConfigs;
	}

	/** 
	 * Watch the object for any changes.
	 * This is the alternative to watching every property individually.
	 * This may be more costly on performance, but does allow for property inter-dependence.
	 * Editing one property will validate every other.
	 */
	watch(
		validationConfig.objectToValidate,
		() => {
			if (delayReactiveValidation) {
				if (hasValidated.value == true) {
					invokeAllValidators(validationConfigs, object, args, true, false)
				}
			}
			else {
				invokeAllValidators(validationConfigs, object, args, true, false)
			}
		},
		{ deep: true }
	);

	/** Calls all reactive and lazy validators. Returns whether or not all validators passed.*/
	async function validate() {
		const isValid = await invokeAllValidators(validationConfigs, object, args, true, true);
		hasValidated.value = true;
		return isValid;
	}

	/** Change the reference object to compare the current object state against. The reference is used to determine dirty state. */
	function setReference(reference: T) {
		dirtyReference.value = JSON.stringify(reference);
	}

	return reactive({
		hasValidated,
		validate,
		isValidating,
		propertyState: computed(() => propertyState),
		isValid,
		setReference,
		isDirty
	});
}

/** Invokes all reactive validators for a property and returns whether or not they all passed. */
async function invokeReactivePropertyValidators<
	G,
	KParent,
	Args,
	FValidationReturn
>(
	propertyConfig: PropertyValidationConfig<G, KParent, Args, FValidationReturn>,
	parent: KParent | null | undefined,
	args: Args,
	/** Gives this concurrent iteration an ID which must match current iteration ID before updating the state. */
	iterationId: number
) {
	// Early return optimization
	if (propertyConfig.reactiveProcessedValidators == undefined) {
		return true;
	}
	propertyConfig.validatingReactive.value = true;
	
	// Assume every validator returns true. If any return false, this property will be set to false.
	let allValid = true;

	// Get the specified reactive validators and run them.
	const reactiveValidators = propertyConfig.reactiveProcessedValidators;

	/** Process the result of a validator and add it to the validation results. */
	function processValidators(
		processedValidator: ProcessedValidator<G, KParent, Args, FValidationReturn>,
		ret: BaseValidationReturn
	) {
		let temp: BaseValidationReturn | undefined;
		// Don't perform any updates if this isn't the latest iteration
		if (iterationId != propertyConfig.validationIterationId) {
			return;
		}
		if (ret.isValid == false) {
			allValid = false;
		}
		ret.identifier = `reactive-${processedValidator.validatorId}`;

		// Check if this validation result already exists.
		// Replace it if it does, otherwise add it.
		temp = propertyConfig.reactiveValidationResults.value.find(x => x.identifier == ret.identifier);
		if (temp != undefined) {
			Object.assign(temp, ret); 
		}
		else {
			propertyConfig.reactiveValidationResults.value.push(ret);
		}
	}

	console.time("Reactive Validation");
	const reactiveValidationResults = invokeAndOptimizeValidators(
		propertyConfig.property.value,
		parent,
		args,
		reactiveValidators,
		processValidators
	);
	console.timeEnd("Reactive Validation");

	// Wait for all the asynchronous validators to finish before returning.
	await Promise.all(reactiveValidationResults.asyncPromises);

	// Only update the validation config if this is the latest validation iteration
	if (iterationId == propertyConfig.validationIterationId) {
		// Now all the processed validators should have the most up-to-date information.
		// Loop through the validators that had previously returned validators.
		console.log(propertyConfig.reactiveValidationResults.value);
		for (const processedValidator of reactiveValidationResults.validatorsWhichPreviouslyReturnedValidators) {
			console.log(processedValidator);
			for (const validatorId of Object.keys(processedValidator.previouslySpawnedValidators)) {
				if (processedValidator.spawnedValidators[validatorId] == undefined) {
					// Remove the error messages associated with the previously ran validator.
					const identifier = `reactive-${processedValidator.validatorId}`;
					const index = propertyConfig.reactiveValidationResults.value.findIndex(x => x.identifier === identifier);
					propertyConfig.reactiveValidationResults.value.splice(index);
				}
			}
		}

		propertyConfig.reactiveIsValid.value = allValid;
		propertyConfig.validatingReactive.value = false;
	}

	return propertyConfig.reactiveIsValid.value;
}

/** Invokes all lazy validators for a property and returns whether or not they all passed. */
async function invokeLazyPropertyValidators<
	G,
	KParent,
	Args,
	FValidationReturn
>(
	propertyConfig: PropertyValidationConfig<G, KParent, Args, FValidationReturn>,
	parent: KParent | null | undefined,
	args: Args,
	/** Gives this concurrent iteration an ID which must match current iteration ID before updating the state. */
	iterationId: number
) {
	// Early return optimization
	if (propertyConfig.validation.$lazy == undefined) {
		return true;
	}
	propertyConfig.validatingLazy.value = true;

	// Assume every validator returns true. If any return false, this property will be set to false.
	let allValid = true;

	// Get the specified reactive validators and run them.
	const lazyValidators = propertyConfig.lazyProcessedValidators;

	/** Process the results of several validators and add them to the validation results with unique identifiers. */
	function processValidators(
		processedValidator: ProcessedValidator<G, KParent, Args, FValidationReturn>,
		ret: BaseValidationReturn
	) {
		let temp: BaseValidationReturn | undefined;

		if (iterationId != propertyConfig.validationIterationId) {
			return;
		}

		if (ret.isValid == false) {
			allValid = false;
		}
		ret.identifier = `lazy-${processedValidator.validatorId}`;
		temp = propertyConfig.lazyValidationResults.value.find(x => x.identifier == ret.identifier);
		if (temp != undefined) {
			Object.assign(temp, ret);
		}
		else {
			propertyConfig.lazyValidationResults.value.push(ret);
		}
	}

	const lazyValidationResults = invokeAndOptimizeValidators(
		propertyConfig.property.value,
		parent,
		args,
		lazyValidators,
		processValidators
	);

	// Wait for all the asynchronous validators to finish before returning.
	await Promise.all(lazyValidationResults.asyncPromises);

	// Only update the validation config if this is the latest validation iteration
	if (iterationId == propertyConfig.validationIterationId) {
		propertyConfig.lazyIsValid.value = allValid;
		propertyConfig.validatingLazy.value = false;
	}

	return propertyConfig.lazyIsValid.value;
}

/** 
 * Invoke either or both types of validators from the validation configs provided.
 * @param reactive invoke all the reactive validators
 * @param lazy invoke all the lazy validators
 */
async function invokeAllValidators<KParent, Args, FValidationReturn>(
	validationConfigs: PropertyValidationConfig<any, KParent, Args, FValidationReturn>[],
	parent: Ref<KParent | null | undefined>,
	args: Args,
	reactive: boolean,
	lazy: boolean
): Promise<boolean> {
	const validatorPromises: Promise<boolean | undefined>[] = [];
	for (const validationConfig of validationConfigs) {
		const iterationId = ++validationConfig.validationIterationId;
		// Check if we should validate reactive validators
		if (reactive) {
			validatorPromises.push(invokeReactivePropertyValidators(validationConfig, parent.value, args, iterationId));
		}
		// Check if we should validate lazy validators
		if (lazy) {
			validatorPromises.push(invokeLazyPropertyValidators(validationConfig, parent.value, args, iterationId));
		}
		
		// Check if there are array elements to validate. Each element can have it's own lazy or reactive properties.
		if (validationConfig.elementValidation != undefined) {
			const elementValidationConfigs: PropertyValidationConfig<any, KParent, Args, FValidationReturn>[] = [];
			for (const key in validationConfig.arrayConfigMap) {
				elementValidationConfigs.push(...validationConfig.arrayConfigMap[key].validationConfigs);
			}
			validatorPromises.push(invokeAllValidators(elementValidationConfigs, parent, args, reactive, lazy));
		}
	}
	return Promise.all(validatorPromises).then(response => response.every(x => x == true));
}