import { Ref } from "vue";
import { BaseValidationReturn, Validator } from "../../dist";
import { throttleQueueAsync } from "../finalFormUtilities";
import { ProcessedValidator, PropertyValidationConfig } from "../privateTypes";
import { processValidators } from "./validatorProcessing";

type ThenCallback<G, KParent, Args, FValidationReturn> = (
	processedValidator: ProcessedValidator<G, KParent, Args, FValidationReturn>,
	ret: BaseValidationReturn<any>
) => any;

/** 
 * Handles invoking and optimization of the provided list of validators. 
 */
export function invokeAndOptimizeValidators<
	G, 
	KParent,
	Args,
	FValidationReturn
>(
	property: G,
	parent: KParent | null | undefined,
	args: Args,
	latestProcessedValidators: ProcessedValidator<G, KParent, Args, FValidationReturn>[] = [],
	/** The callback function for handling resolved validation promises */
	thenCallback: ThenCallback<G, KParent, Args, FValidationReturn>,
	shouldOptimize: boolean = true,
	recursionCount: number = 1
) {
	// Collect all the promised results and synchronous results in lists to return later.
	const allPromises: Promise<BaseValidationReturn>[] = [];
	const allResults: BaseValidationReturn<any>[] = [];
	// Add validators to this list that returned validators from a previous run, but did not this time.
	const validatorsWhichPreviouslyReturnedValidators: ProcessedValidator<G, KParent, Args, FValidationReturn>[] = [];

	for (const processedValidator of latestProcessedValidators) {
		const shouldOptimizeValidator = !processedValidator.optimized;
		let checkForValidatorReturn = false;
		if (processedValidator.previouslyReturnedValidators) {
			processedValidator.previouslySpawnedValidators = processedValidator.spawnedValidators;
			processedValidator.spawnedValidators = {}; // This will be set later on if this validator does return validators again.
			checkForValidatorReturn = true;
		}
		processedValidator.previouslyReturnedValidators = false;
		const validationReturn = processedValidator.validator({
			value: property,
			parent: parent,
			args: args
		});
		if (validationReturn instanceof Promise) {
			allPromises.push(
				validationReturn.then(ret => {
					if (ret === undefined) {
						return undefined;
					}
					if (Array.isArray(ret)) {
						const { asyncPromises, syncResults } = handleReturnedValidators(
							property,
							parent,
							args,
							thenCallback,
							processedValidator,
							ret,
							recursionCount
						);
						allPromises.push(...asyncPromises);
						allResults.push(...syncResults);
						return;
					}
					else if (checkForValidatorReturn) {
						validatorsWhichPreviouslyReturnedValidators.push(processedValidator);
					}
					thenCallback(processedValidator, ret);
				})
			);
			if (shouldOptimize && shouldOptimizeValidator) {
				processedValidator.optimized = true;
				// Optimize async requests by adding a throttle to them.
				processedValidator.validator = throttleQueueAsync<
						typeof processedValidator.validator,
						Awaited<ReturnType<typeof processedValidator.validator>>
					>(processedValidator.validator, 500);
			}
		}
		else if (Array.isArray(validationReturn)) {
			// Assume the array is full of validators. TypeScript should warn them from returning any other type of array.
			// We can't optimize these validators because we're not keeping track of them for subsequent runs.
			// So if async calls are returned in this array they will NOT be throttled.
			// This is because the list of validators returned COULD be dynamic, although it's very unlikely.
			// It's impossible to know which validator is a previously ran validator because there's no ID attached to the function.
			const { asyncPromises, syncResults } = handleReturnedValidators(
				property,
				parent,
				args,
				thenCallback,
				processedValidator,
				validationReturn,
				recursionCount
			);
			allPromises.push(...asyncPromises);
			allResults.push(...syncResults);
		}
		else {
			if (checkForValidatorReturn) {
				validatorsWhichPreviouslyReturnedValidators.push(processedValidator);
			}
			// This check was added to support returning an array of promises for the validateIf() validator.
			if (validationReturn !== undefined) {
				allResults.push(validationReturn);
				thenCallback(processedValidator, validationReturn);
			}
		}
	}
	return {
		syncResults: allResults,
		/** The promised results from the async validators */
		asyncPromises: allPromises,
		validatorsWhichPreviouslyReturnedValidators
	};
}

/** Takes the array of validators returned from a validator and adds them to the normal validation process. */
function handleReturnedValidators<
	G, 
	KParent,
	Args,
	FValidationReturn
>(
	property: G,
	parent: KParent | null | undefined,
	args: Args,
	/** The callback function for handling resolved validation promises */
	thenCallback: ThenCallback<G, KParent, Args, FValidationReturn>,
	parentProcessedValidator: ProcessedValidator<G, KParent, Args, FValidationReturn>,
	ret: Validator<G, KParent, Args, FValidationReturn>[],
	recursionCount: number
) {
	// Process the returned validators
	const processedRetValidators = processValidators(
		ret,
		parentProcessedValidator.isReactive,
		parentProcessedValidator.validatorId
	);
	// Enable support for returning a list of validators to run after a validator was ran.
	// This feature was added for the validateIf() validator to handle async validators asynchronously from the synchronous validators.
	const { asyncPromises, syncResults } = invokeAndOptimizeValidators(
		property,
		parent,
		args,
		processedRetValidators,
		thenCallback,
		false,
		++recursionCount
	);

	const spawnedValidatorsMap: ProcessedValidator<G, KParent, Args, FValidationReturn>["spawnedValidators"] = {}
	for (const processedValidator of processedRetValidators) {
		spawnedValidatorsMap[processedValidator.validatorId] = processedValidator;
	}
	parentProcessedValidator.spawnedValidators = spawnedValidatorsMap;
	parentProcessedValidator.previouslyReturnedValidators = true;

	return {
		asyncPromises,
		syncResults
	};
}

/** Invokes all reactive validators for a property and returns whether or not they all passed. */
export async function invokeReactivePropertyValidators<
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
					const identifier = `reactive-${validatorId}`;
					const index = propertyConfig.reactiveValidationResults.value.findIndex(x => x.identifier === identifier);
					if (index !== -1) {
						propertyConfig.reactiveValidationResults.value.splice(index);
					}
				}
			}
		}

		propertyConfig.reactiveIsValid.value = allValid;
		propertyConfig.validatingReactive.value = false;
	}

	return propertyConfig.reactiveIsValid.value;
}

/** Invokes all lazy validators for a property and returns whether or not they all passed. */
export async function invokeLazyPropertyValidators<
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
 * The starting point of the validation process, after the validators have been processed into validator configs.
 * 
 * Invoke either or both types of validators from the validation configs provided.
 * @param validationConfigs the validation configs to invoke validators from
 * @param parent the object to be passed into the "parent" parameter of the validators.
 * @param args the argument object to be passed into the "args" parameter of the validators.
 * @param reactive invoke reactive validators
 * @param lazy invoke lazy validators
 */
export async function invokeValidatorConfigs<KParent, Args, FValidationReturn>(
	validationConfigs: PropertyValidationConfig<any, KParent, Args, FValidationReturn>[],
	parent: Ref<KParent | null | undefined>,
	args: Args,
	reactive: boolean,
	lazy: boolean
): Promise<boolean> {
	const validatorPromises: Promise<boolean | undefined>[] = [];
	for (const validationConfig of validationConfigs) {
		const iterationId = ++validationConfig.validationIterationId;
		if (reactive && validationConfig.validation.$reactive != undefined) {
			validatorPromises.push(invokeReactivePropertyValidators(validationConfig, parent.value, args, iterationId));
		}
		// Check if we should validate lazy validators
		if (lazy && validationConfig.validation.$lazy != undefined) {
			validatorPromises.push(invokeLazyPropertyValidators(validationConfig, parent.value, args, iterationId));
		}
		
		// Check if there are array elements to validate. Each element can have it's own lazy or reactive properties.
		if (validationConfig.elementValidation != undefined) {
			const elementValidationConfigs: PropertyValidationConfig<any, KParent, Args, FValidationReturn>[] = [];
			for (const key in validationConfig.arrayConfigMap) {
				elementValidationConfigs.push(...validationConfig.arrayConfigMap[key].validationConfigs);
			}
			validatorPromises.push(invokeValidatorConfigs(elementValidationConfigs, parent, args, reactive, lazy));
		}
	}
	return Promise.all(validatorPromises).then(response => response.every(x => x == true));
}