import { Ref } from "vue";
import { bufferAsync, throttleQueueAsync } from "../finalFormUtilities";
import { ProcessedValidator, PropertyValidationConfig } from "../privateTypes";
import { processValidators } from "./validatorProcessing";
import { AsyncValidator, BaseValidationReturn, Validator, ValidatorParams } from "../finalFormTypes";

type ResultProcessor<G, KParent, Args, FValidationReturn> = (
	processedValidator: ProcessedValidator<G, KParent, Args, FValidationReturn>,
	ret: BaseValidationReturn<any>
) => void;

/** The duration of throttling that is put onto validators that take longer than this time to return. */
const ThrottleDurationMs = 500;

/** 
 * Handles invoking and optimization of the provided list of validators.
 * @returns boolean for if all validators were valid
 */
export async function invokeAndOptimizeValidators<
	G, 
	KParent,
	Args,
	FValidationReturn
>(
	propertyConfig: PropertyValidationConfig<G, KParent, Args, FValidationReturn>,
	parent: KParent | null | undefined,
	args: Args,
	validators: ProcessedValidator<G, KParent, Args, FValidationReturn>[],
	/** Must match latest iteration ID on property config before updating any state. */
	iterationId: number
) {
	let isAllValid = true;
	
	// Create a callback to process the result of each validator.
	const resultProcessor: ResultProcessor<G, KParent, Args, FValidationReturn> = (
		processedValidator: ProcessedValidator<G, KParent, Args, FValidationReturn>,
		ret: BaseValidationReturn<any>
	) => {
		// Don't perform any updates if this isn't the latest iteration
		if (iterationId !== propertyConfig.validationIterationId) {
			return;
		}
		if (ret.isValid === false) {
			isAllValid = false;
		}
		// Identify reactive and lazy validators separately because they are run concurrently.
		ret.identifier = processedValidator.validatorId;

		// Check if this validation result already exists.
		// Replace it if it does, otherwise add it.
		const result = propertyConfig.reactiveValidationResults.value.find(x => x.identifier == ret.identifier);
		if (result !== undefined) {
			Object.assign(result, ret); 
		}
		else {
			propertyConfig.reactiveValidationResults.value.push(ret);
		}
	}
	const { asyncPromises, validatorsWhichPreviouslyReturnedValidators} = recursiveInvokeAndOptimizeValidators(
		propertyConfig,
		parent,
		args,
		validators,
		iterationId,
		resultProcessor,
		true,
		1
	);
	await Promise.all(asyncPromises);

	if (iterationId === propertyConfig.validationIterationId) {
		// Remove the error messages of validators that were ran in the previous run but not in this run.
		for (const processedValidator of validatorsWhichPreviouslyReturnedValidators) {
			for (const validatorId of Object.keys(processedValidator.previouslySpawnedValidators)) {
				if (processedValidator.spawnedValidators[validatorId] == undefined) {
					const index = propertyConfig.reactiveValidationResults.value.findIndex(x => x.identifier === validatorId);
					if (index !== -1) {
						propertyConfig.reactiveValidationResults.value.splice(index);
					}
				}
			}
		}
	}
	return isAllValid;
}

/**
 * Private function that has extra parameterss for recursive calls and returns the promises for the validator results.
 */
function recursiveInvokeAndOptimizeValidators<
	G, 
	KParent,
	Args,
	FValidationReturn
>(
	propertyConfig: PropertyValidationConfig<G, KParent, Args, FValidationReturn>,
	parent: KParent | null | undefined,
	args: Args,
	validators: ProcessedValidator<G, KParent, Args, FValidationReturn>[],
	iterationId: number,
	processValidatorResult: ResultProcessor<G, KParent, Args, FValidationReturn>,
	shouldOptimize: boolean,
	recursionCount: number
) {
	const property = propertyConfig.property.value;
	// Collect all the promised results and synchronous results in lists to return later.
	const allPromises: Promise<BaseValidationReturn>[] = [];
	const allResults: BaseValidationReturn<any>[] = [];
	// Add validators to this list that returned validators from a previous run, but did not this time.
	const validatorsWhichPreviouslyReturnedValidators: ProcessedValidator<G, KParent, Args, FValidationReturn>[] = [];
	for (const processedValidator of validators) {
		const isValidatorAlreadyOptimized = processedValidator.optimized;
		let checkForValidatorReturn = false;
		if (processedValidator.previouslyReturnedValidators) {
			processedValidator.previouslySpawnedValidators = processedValidator.spawnedValidators;
			processedValidator.spawnedValidators = {}; // This will be set later on if this validator does return validators again.
			checkForValidatorReturn = true;
		}
		processedValidator.previouslyReturnedValidators = false;

		// The type the user sees will be conditional and correct, but in this code it needs to account for all cases.
		// This will require a cast to the type the validator expects in order to avoid type errors.
		const params: ValidatorParams<G, KParent, unknown, any[]> = {
			value: property,
			parent: parent,
			args: args,
			arrayParents: propertyConfig.arrayParents.map(x => x.value)
		}
		const validationReturn = processedValidator.validator(params as unknown as ValidatorParams<G, KParent, Args, any>);

		if (validationReturn instanceof Promise) {
			// Check how long this async validator takes to return.
			const past = Date.now();
			allPromises.push(
				validationReturn.then(async ret => {
					if (ret === undefined) {
						if (checkForValidatorReturn) {
							validatorsWhichPreviouslyReturnedValidators.push(processedValidator);
						}
						return undefined;
					}
					const duration = Date.now() - past;
					if (shouldOptimize && duration > ThrottleDurationMs && isValidatorAlreadyOptimized === false) {
						processedValidator.optimized = true;
						if (duration < (2 * ThrottleDurationMs)) {
							// Moderately slow validators will receive a throttle.
							// Calls will overlap, but it shouldn't overwhelm the server
							processedValidator.validator = throttleQueueAsync<
									typeof processedValidator.validator,
									Awaited<ReturnType<typeof processedValidator.validator>>
								>(processedValidator.validator, ThrottleDurationMs);
						}
						else {
							// Slow validators will receive a buffer.
							// Calls will never overlap
							processedValidator.validator = bufferAsync<
									typeof processedValidator.validator,
									Awaited<ReturnType<typeof processedValidator.validator>>
								>(processedValidator.validator as AsyncValidator<G, KParent, Args, FValidationReturn, undefined>);
						}
					}
					if (Array.isArray(ret)) {
						const { asyncPromises, syncResults } = handleReturnedValidators(
							propertyConfig,
							parent,
							args,
							iterationId,
							processValidatorResult,
							processedValidator,
							ret,
							recursionCount
						);
						allResults.push(...syncResults);
						await Promise.all(asyncPromises); // Wait for all spawned validators to finish
						return;
					}
					else if (checkForValidatorReturn) {
						validatorsWhichPreviouslyReturnedValidators.push(processedValidator);
					}
					processValidatorResult(processedValidator, ret);
				})
			);
		}
		else if (Array.isArray(validationReturn)) {
			// Assume the array is full of validators. TypeScript should warn them from returning any other type of array.
			// We can't optimize these validators because we're not keeping track of them for subsequent runs.
			// So if async calls are returned in this array they will NOT be throttled.
			// This is because the list of validators returned COULD be dynamic, although it's very unlikely.
			// It's impossible to know which validator is a previously ran validator because there's no ID attached to the function.
			const { asyncPromises, syncResults } = handleReturnedValidators(
				propertyConfig,
				parent,
				args,
				iterationId,
				processValidatorResult,
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
				processValidatorResult(processedValidator, validationReturn);
			}
		}
	}
	return {
		asyncPromises: allPromises,
		syncResults: allResults,
		validatorsWhichPreviouslyReturnedValidators
	}
}

/** Takes the array of validators returned from a validator and adds them to the normal validation process. */
function handleReturnedValidators<
	G, 
	KParent,
	Args,
	FValidationReturn
>(
	propertyConfig: PropertyValidationConfig<G, KParent, Args, FValidationReturn>,
	parent: KParent | null | undefined,
	args: Args,
	/** Must match latest iteration ID on property config before updating any state. */
	iterationId: number,
	processValidatorResult: ResultProcessor<G, KParent, Args, FValidationReturn>,
	parentProcessedValidator: ProcessedValidator<G, KParent, Args, FValidationReturn>,
	returnedValidators: Validator<G, KParent, Args, FValidationReturn, any>[],
	recursionCount: number
) {
	const processedRetValidators = processValidators(
		returnedValidators,
		parentProcessedValidator.isReactive,
		parentProcessedValidator.validatorId
	);
	const response = recursiveInvokeAndOptimizeValidators(
		propertyConfig,
		parent,
		args,
		processedRetValidators,
		iterationId,
		processValidatorResult,
		false,
		++recursionCount
	);

	const spawnedValidatorsMap: ProcessedValidator<G, KParent, Args, FValidationReturn>["spawnedValidators"] = {}
	for (const processedValidator of processedRetValidators) {
		spawnedValidatorsMap[processedValidator.validatorId] = processedValidator;
	}
	parentProcessedValidator.spawnedValidators = spawnedValidatorsMap;
	parentProcessedValidator.previouslyReturnedValidators = true;

	return response;
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
	/** Must match latest iteration ID on property config before updating any state. */
	iterationId: number
) {
	propertyConfig.validatingReactive.value = true;

	// Get the specified reactive validators and run them.
	const reactiveValidators = propertyConfig.reactiveProcessedValidators;
	const isAllValid = await invokeAndOptimizeValidators(
		propertyConfig,
		parent,
		args,
		reactiveValidators,
		iterationId
	);

	// Only update the validation config if this is the latest validation iteration
	if (iterationId === propertyConfig.validationIterationId) {
		propertyConfig.reactiveIsValid.value = isAllValid;
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

	// Get the specified reactive validators and run them.
	const lazyValidators = propertyConfig.lazyProcessedValidators;
	const isAllValid = await invokeAndOptimizeValidators(
		propertyConfig,
		parent,
		args,
		lazyValidators,
		iterationId
	);

	// Only update the validation config if this is the latest validation iteration
	if (iterationId === propertyConfig.validationIterationId) {
		propertyConfig.lazyIsValid.value = isAllValid;
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
		if (reactive && validationConfig.validation.$reactive !== undefined) {
			validatorPromises.push(invokeReactivePropertyValidators(validationConfig, parent.value, args, iterationId));
		}
		// Check if we should validate lazy validators
		if (lazy && validationConfig.validation.$lazy !== undefined) {
			validatorPromises.push(invokeLazyPropertyValidators(validationConfig, parent.value, args, iterationId));
		}
		
		// Check if there are array elements to validate. Each element can have its own lazy or reactive properties.
		if (validationConfig.elementValidation !== undefined) {
			const elementValidationConfigs: PropertyValidationConfig<any, KParent, Args, FValidationReturn>[] = [];
			for (const key in validationConfig.arrayConfigMap) {
				elementValidationConfigs.push(...validationConfig.arrayConfigMap[key].validationConfigs);
			}
			validatorPromises.push(invokeValidatorConfigs(elementValidationConfigs, parent, args, reactive, lazy));
		}
	}
	// Return true if all promises returned true, otherwise false.
	return Promise.all(validatorPromises).then(response => response.every(x => x === true));
}