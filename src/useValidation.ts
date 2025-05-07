import type { ValidationConfig, ValidationState } from './publicTypes.ts';
import { ref, computed, watch, reactive, type Ref, type ComputedRef, type Reactive } from 'vue';
import type { GenericValidation, PropertyValidationConfig } from './privateTypes.ts';
import { invokeValidatorConfigs } from './services/validatorInvocation.ts';
import { setupValidation } from './services/validatorProcessing.ts';

export type UseValidationReturn<
	T = unknown,
	Return = unknown
> = {
	hasValidated: Ref<boolean>,
	validate: () => Promise<boolean>,
	isValidating: ComputedRef<boolean>,
	/** Stores the results of validation */
	state: ComputedRef<ValidationState<T, Return>>,
	/** True only if all validators passed. */
	isValid: ComputedRef<boolean>,
	/** True if any of the validators failed. */
	isErrored: ComputedRef<boolean>,
	/** Sets the internal reference object for determining {@link isDirty} */
	setReference: (reference: T) => void,
	/**
	 * Reactively determines if the object being validated has changed from the reference state.
	 *
	 * The reference state can be changed using {@link setReference()}.
	 */
	isDirty: ComputedRef<boolean>
}

/** 
 * The starting point for validation with Vuelidify.
 * 
 * @author Daniel Walbolt
 */
export function useValidation<
	T,
	Args = unknown,
	Return = unknown
>(
	validationConfig: ValidationConfig<T, Args, Return>
): Reactive<UseValidationReturn<T, Return>> {
	validationConfig.delayReactiveValidation ??= true; // Default value for delayReactiveValidation
	const { model: object, validation, delayReactiveValidation, args } = validationConfig;

	/** Only true after {@link validate()} finished successfully. */
	const hasValidated = ref(false);
	const isValidating = computed(() => validationConfigs.some(x => x.isValidatingLazy.value || x.isValidatingReactive.value));
	const isErrored = computed(() => validationConfigs.some(x => x.validationResults.value.some(x => x.isValid === false)));
	const isValid = computed(() => {
		const allValidatorsValid = validationConfigs.every(x => x.isReactiveValid.value && x.isLazyValid.value);
		return allValidatorsValid;
	});
	/** List of objects that relates validation to the object's properties. */
	let validationConfigs: PropertyValidationConfig[] = [];

	/** The reference for determining if the object has been changed or not.  */
	const dirtyReference = ref(JSON.stringify(validationConfig.model.value));
	const isDirty = computed(() => dirtyReference.value !== JSON.stringify(validationConfig.model.value));

	const setup = setupValidation(object as Ref<T>, validation as GenericValidation);
	const validationState = setup.state as ValidationState<T, Return>;
	validationConfigs = setup.validationConfigs;

	/** 
	 * Watch the object for any changes.
	 * This is the alternative to watching every property individually.
	 * This may be more costly on performance, but does allow for property inter-dependence.
	 * Editing one property will invoke the reactive validators of every other and itself.
	 */
	watch(
		validationConfig.model,
		() => {
			if (delayReactiveValidation) {
				if (hasValidated.value === true) {
					invokeValidatorConfigs(validationConfigs, object, args, true, false);
				}
			} else {
				invokeValidatorConfigs(validationConfigs, object, args, true, false);
			}
		},
		{ deep: true }
	);

	/** Invokes all reactive and lazy validators. Returns whether or not all validators passed.*/
	async function validate() {
		const isValid = await invokeValidatorConfigs(validationConfigs, object, args, true, true);
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
		state: computed(() => validationState),
		isValid,
		isErrored,
		setReference,
		isDirty
	});
}