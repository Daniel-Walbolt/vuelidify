import { ArrayValidationState, ArrayValidatorTypes, AsyncValidator, BaseValidationReturn, FinalFormValidation, Primitive, PrimitiveValidationState, PrimitiveValidatorTypes, RecursiveValidation, RecursiveValidationState, SyncValidator, ValidationConfig, ValidationState, Validator, ValidatorTypes } from "./finalFormTypes";
import { Ref, ref, computed, watch, reactive } from "vue";
import { flatMap, reduceUndefined, throttleQueueAsync } from "./finalFormUtilities";

/** An internally used type for allowing indexing of unknown types. i.e. obj[key] */
type IndexableObject = {
	[key: string]: any;
}

/** Type specifically used for casting validation objects in order to appease TypeScript. */
type PrimitiveOrArrayValidation = PrimitiveValidatorTypes<Primitive, any, any, any> & ArrayValidatorTypes<any, any[], any, any, any>;

/** 
 * Stores all the necessary properties for validating a property. Only used within this composable, not visible to the end user.
 * 
 * Be careful to not put Refs inside of Refs, as they will be unwrapped and .value won't work.
 */
type PropertyValidationConfig<T, KParent, Args, FValidationReturn> = {
	/** Identifies this property/validator combination uniquely. Depends on the order the validators are processed. */
	id: number,
	/** 
	 * Identifier for the current iteration validating this property.
	 * Because of concurrency, a previous iteration can finish while one is still running.
	 * This results in the finished iteration setting the "isValiding" state to false when validation is still happening.
	 * 
	 * Certain state will only change if the current iteration equals the iteration that just finished.
	 */
	validationIterationId: number,

	/** Shows if all reactive validators on this property have passed or failed. Is undefined if it has not been validated yet. Is always true if there are no reactive validators. */
	reactiveIsValid: Ref<boolean | undefined>;
	reactiveValidationResults: Ref<BaseValidationReturn<FValidationReturn>[]>;
	validatingReactive: Ref<boolean>;

	/** Determines if all lazy validators on this property have passed or failed. Is undefined if it has not been validated yet. Is always true if there are no lazy validators.*/
	lazyIsValid: Ref<boolean | undefined>;
	lazyValidationResults: Ref<BaseValidationReturn<FValidationReturn>[]>;
	validatingLazy: Ref<boolean>; 

	/** The user specified validation object for this property */
	validation: Readonly<ValidatorTypes<T, KParent, Args, FValidationReturn>>;
	/** Stores the sync validators that were found after the first validation was performed */
	syncValidators: {
		$reactive?: SyncValidator<T, KParent, Args, FValidationReturn>[];
		$lazy?: SyncValidator<T, KParent, Args, FValidationReturn>[];
	}
	/** Stores the async validators that were found after the first validation was performed */
	asyncValidators: {
		$reactive?: AsyncValidator<T, KParent, Args, FValidationReturn>[];
		$lazy?: AsyncValidator<T, KParent, Args, FValidationReturn>[];
	}

	/** Getter for the current value of the property this validation config is for. */
	property: Readonly<Ref<T>>;

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
type ElementValidationConfig<T, KParent, Args, FValidationReturn> = {
	/** The list of validation configs that can be used to validate this element. Each one should modify a portion of the {@link validationState} */
	validationConfigs: PropertyValidationConfig<any, KParent, Args, FValidationReturn>[]
	/** The validation state for this element */
	validationState: RecursiveValidationState<T, FValidationReturn>;
}

/** Used to assign IDs to validators that don't have one. */
const globalId = ref(0);

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
		console.log("Complex object");
		const typedObject = object as Ref<IndexableObject>;
		const typedValidation = validation as RecursiveValidation<typeof typedObject, T, Args, FValidationReturn>;
		const validationSetup = setupNestedPropertiesForValidation(typedObject.value, typedValidation);
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
		propertyState: propertyState as Readonly<typeof propertyState>,
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
	if (propertyConfig.validation.$reactive == undefined) {
		return true;
	}
	propertyConfig.validatingReactive.value = true;

	// Get the specified reactive validators and run them.
	let reactiveValidators: Validator<G, KParent, Args, FValidationReturn>[] = propertyConfig.validation.$reactive;

	let shouldOptimizeValidators = true;

	// Check if these validators have been ran before
	// If they have, some optimizations may have been applied.
	if (propertyConfig.syncValidators.$reactive || propertyConfig.asyncValidators.$reactive) {
		shouldOptimizeValidators = false;
		reactiveValidators = ((propertyConfig.syncValidators.$reactive ?? []) as typeof reactiveValidators)
			.concat((propertyConfig.asyncValidators.$reactive ?? []) as typeof reactiveValidators);
	}

	// Assume every validator returns true. If any return false, this property will be invalid.
	let allValid = true;
	// Local ID for identifying each validator in the array.
	let localId = 0;

	function processValidator(ret: BaseValidationReturn[]) {
		let temp: BaseValidationReturn | undefined;
		if (iterationId != propertyConfig.validationIterationId) {
			return;
		}
		for (let i = 0; i < ret.length; i++) {
			if (ret[i].isValid == false) {
				allValid = false;
			}
			ret[i].identifier = `validator-reactive-${propertyConfig.id}-${localId++}`;
			temp = propertyConfig.reactiveValidationResults.value.find(x => x.identifier == ret[i].identifier);
			if (temp != undefined) {
				Object.assign(temp, ret[i]);
			}
			else {
				propertyConfig.reactiveValidationResults.value.push(ret[i]);
			}
		}
	}

	const reactiveValidationResults = invokeValidators(propertyConfig.property.value, parent, args, reactiveValidators, processValidator);

	// Optimize the validators based on certain conditions
	// Currently, optimizations pertain to throttling asynchronous validators
	if (shouldOptimizeValidators) {
		const bufferedAsyncValidators: typeof reactiveValidationResults.asyncValidators = [];
		for (const validator of reactiveValidationResults.asyncValidators) {
			bufferedAsyncValidators.push(throttleQueueAsync<typeof validator, Awaited<ReturnType<typeof validator>>>(validator, 1000));
		}
		propertyConfig.asyncValidators.$reactive = bufferedAsyncValidators;
		propertyConfig.syncValidators.$reactive = reactiveValidationResults.syncValidators;
	}

	// Process the synchronous results instantly
	processValidator(reactiveValidationResults.syncResults);
	// Wait for all the asynchronous validators to finish before returning.
	await Promise.all(reactiveValidationResults.asyncPromises);

	if (iterationId == propertyConfig.validationIterationId) {
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
	if (propertyConfig.validation.$lazy == undefined) {
		return true;
	}
	propertyConfig.validatingLazy.value = true;

	let allValid = true;
	let localId = 0;
	let shouldOptimizeValidators = true;

	// Get the specified reactive validators and run them.
	let lazyValidators: Validator<G, KParent, Args, FValidationReturn>[] = propertyConfig.validation.$lazy;
	
	if (propertyConfig.syncValidators.$lazy || propertyConfig.asyncValidators.$lazy) {
		shouldOptimizeValidators = false;
		lazyValidators = ((propertyConfig.syncValidators.$lazy ?? []) as typeof lazyValidators)
			.concat((propertyConfig.asyncValidators.$lazy ?? []) as typeof lazyValidators);
	}

	// Function for processing validation on the property itself
	function processValidator(ret: BaseValidationReturn[]) {
		let temp: BaseValidationReturn | undefined;

		if (iterationId != propertyConfig.validationIterationId) {
			return;
		}

		for (let i = 0; i < ret.length; i++) {
			if (ret[i].isValid == false) {
				allValid = false;
			}
			ret[i].identifier = `validator-lazy-${propertyConfig.id}-${localId++}`;
			temp = propertyConfig.lazyValidationResults.value.find(x => x.identifier == ret[i].identifier);
			if (temp != undefined) {
				Object.assign(temp, ret[i]);
			}
			else {
				propertyConfig.lazyValidationResults.value.push(ret[i]);
			}
		}
	}

	const lazyValidationResults = invokeValidators(propertyConfig.property.value, parent, args, lazyValidators, processValidator);

	if (shouldOptimizeValidators) {
		const bufferedAsyncValidators: typeof lazyValidationResults.asyncValidators = [];
		for (const validator of lazyValidationResults.asyncValidators) {
			bufferedAsyncValidators.push(throttleQueueAsync<typeof validator, Awaited<ReturnType<typeof validator>>>(validator, 500));
		}
		propertyConfig.asyncValidators.$lazy = bufferedAsyncValidators;
		propertyConfig.syncValidators.$lazy = lazyValidationResults.syncValidators;
	}

	// Process the synchronous results instantly
	processValidator(lazyValidationResults.syncResults);
	// Wait for all the asynchronous validators to finish before returning.
	await Promise.all(lazyValidationResults.asyncPromises);

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

/** Handles invoking the provided list of validators. Can differ between the async and sync validators, but always returns a promise for validation. */
function invokeValidators<
	G, 
	KParent,
	Args,
	FValidationReturn
>(
	property: G,
	parent: KParent | null | undefined,
	args: Args,
	validators: Validator<G, KParent, Args, FValidationReturn>[] = [],
	/** The callback function for handling resolved validation promises */
	thenCallback: (ret: BaseValidationReturn<any>[]) => any
) {
	const promises: Promise<BaseValidationReturn>[] = [];
	const results: BaseValidationReturn<any>[] = [];
	const syncValidators: SyncValidator<G, KParent, Args, FValidationReturn>[] = [];
	const asyncValidators: AsyncValidator<G, KParent, Args, FValidationReturn>[] = [];
	for (const validator of validators) {
		// The parent can be undefinable when using singular property validation.
		// In these cases, the type the user sees is accurate, and the type problem here is inconsequential.
		const validationReturn = validator({
			value: property,
			parent: parent!,
			args: args
		});
		if (validationReturn instanceof Promise) {
			promises.push(validationReturn.then(ret => ret ? thenCallback([ret]) : undefined));
			asyncValidators.push(validator as AsyncValidator<G, KParent, Args, FValidationReturn>);
		}
		else {
			results.push(validationReturn);
			syncValidators.push(validator as SyncValidator<G, KParent, Args, FValidationReturn>);
		}
	}
	return {
		syncResults: results,
		asyncPromises: promises,
		syncValidators: syncValidators,
		asyncValidators: asyncValidators
	};
}

function configureValidationOnProperty<G, KParent, Args, FValidationReturn>(
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
			if (Array.isArray(object.value) === false) {
				return undefined;
			}
			console.time("array state");
			// Declare some variables for readability
			const arr = object.value;
			const elValidation = validationConfig.elementValidation;
			const validationMap = validationConfig.arrayConfigMap;
			
			// Determines whether or not the validation is for a primitive or array.
			const isPrimitiveOrArray = elValidation?.$reactive != undefined || elValidation?.$lazy != undefined;
			
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

				// Setup validation for each object in the array			
				if (isPrimitiveOrArray) {
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
			// Loop over the array of object IDs and assemble the array of corresponding validation states.
			// Each index in this array should be the validation state of the object at the same index in the array being validated.
			for (let i = 0; i < objectIds.length; i++) {
				elemValidationState.push(validationMap[objectIds[i]].validationState);
			}
			console.timeEnd("array state");
			return elemValidationState;
		})
	});

	// If there are no lazy validators, lazy validation is automatically valid (true).
	const initIsLazyValid = !((validation.$lazy?.length ?? -1) > 0);
	// If there are no reactive validators, reactive validation is automatically valid (true).
	const initIsReactiveValid = !((validation.$reactive?.length ?? -1) > 0);

	const validationConfig: PropertyValidationConfig<G, KParent, Args, FValidationReturn> = {
		id: globalId.value++,
		validationIterationId: 0,
		reactiveIsValid: ref(initIsReactiveValid),
		reactiveValidationResults: ref([]),
		validatingReactive: ref(false),
		lazyIsValid: ref(initIsLazyValid),
		lazyValidationResults: ref([]),
		validatingLazy: ref(false),
		validation: validation,
		syncValidators: {},
		asyncValidators: {},
		property: object,
		validationState: validationState,
		arrayConfigMap: {},
		hasElementValidation: isArrayValidation,
		elementId: 0,
		elementValidation: (validation as ArrayValidatorTypes<unknown, any, KParent, Args, FValidationReturn>).$each
	}
	return validationConfig;
}

/** Recursive function that analyzes the object provided, relates properties to validators, and creates validation state for each property. */
function setupNestedPropertiesForValidation<G extends IndexableObject, KParent, Args, FValidationReturn>(
	object: G,
	validation: RecursiveValidation<G, KParent, Args, FValidationReturn> | undefined,
) {
	// Store the validation configurations for all relevant properties.
	const validationConfigs: PropertyValidationConfig<any, KParent, Args, FValidationReturn>[] = [];
	const state: ValidationState<IndexableObject , FValidationReturn> = {} as any;
	console.log("Performing complex validation setup", validation);
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
			const isPrimitiveOrArray = (rValidation as PrimitiveOrArrayValidation)?.$reactive != undefined ||
				(rValidation as PrimitiveOrArrayValidation)?.$lazy != undefined ||
				(rValidation as PrimitiveOrArrayValidation)?.$each != undefined;
			if (isPrimitiveOrArray) {
				const propertyValidation = rValidation[key] as unknown as ValidatorTypes<G[keyof G], KParent, Args, FValidationReturn>;
				const validatedPropertyConfig = configureValidationOnProperty(property, propertyValidation);
				validationConfigs.push(validatedPropertyConfig);
				state[key] = validatedPropertyConfig.validationState;
			}
			// Lastly, the property is an object with nested properties. The types for validation require a nested object in this case.
			else if (isPrimitiveOrArray == false) {
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