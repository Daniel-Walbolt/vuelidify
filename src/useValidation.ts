import type { ValidationConfig, ValidationState } from './publicTypes.ts';
import { ref, computed, watch, reactive, type Ref, type ComputedRef, type Reactive } from 'vue';
import type { PropertyValidationConfig } from './privateTypes.ts';
import { invokeValidatorConfigs } from './services/validatorInvocation.ts';
import { setupValidation } from './services/validatorProcessing.ts';

type UseValidationReturn<T, FValidationReturn> = {
	hasValidated: Ref<boolean>,
	validate: () => Promise<boolean>,
	isValidating: ComputedRef<boolean>,
	/** Stores the results of validation */
	state: ComputedRef<Reactive<ValidationState<T, FValidationReturn>>>,
	isValid: ComputedRef<boolean>,
	/** Sets the internal reference object for determining if the object being validated has changed (is dirty) */
	setReference: (reference: T) => void,
	isDirty: ComputedRef<boolean>
}

/** 
 * A simple and lightweight Vue3 model based validation library with strong type support.
 * 
 * @author Daniel Walbolt
 */
export function useValidation<
	T,
	Args = undefined,
	FValidationReturn = unknown
>(
	validationConfig: ValidationConfig<T, Args | undefined, FValidationReturn>
): Reactive<UseValidationReturn<T, FValidationReturn>> {
	validationConfig.delayReactiveValidation ??= true; // Default value for delayReactiveValidation
	const { form: object, validation, delayReactiveValidation, args } = validationConfig;

	/** Only true after {@link validate()} finished successfully. */
	const hasValidated = ref(false);
	const isValidating = computed(() => validationConfigs.some(x => x.isValidatingLazy || x.isValidatingReactive));
	const isValid = computed(() => {
		const allValidatorsValid = validationConfigs.every(x => x.isReactiveValid.value && x.isLazyValid.value);
		return allValidatorsValid;
	});
	/** List of objects that relates validation to the object's properties. */
	let validationConfigs: PropertyValidationConfig<unknown, T, unknown, FValidationReturn>[] = [];

	/** The reference for determining if the object has been changed or not.  */
	const dirtyReference = ref(JSON.stringify(validationConfig.form.value));
	/**
	 * Reactively determines if the object being validated has changed from the reference state.
	 *
	 * The reference state can be changed using {@link setReference()}.
	 */
	const isDirty = computed(() => dirtyReference.value !== JSON.stringify(validationConfig.form.value));

	const setup = setupValidation<T, T, Args, FValidationReturn>(object as Ref<T>, validation);
	const validationState = setup.propertyState;
	validationConfigs = setup.validationConfigs;

	/** 
	 * Watch the object for any changes.
	 * This is the alternative to watching every property individually.
	 * This may be more costly on performance, but does allow for property inter-dependence.
	 * Editing one property will invoke the reactive validators of every other and itself.
	 */
	watch(
		validationConfig.form,
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
		setReference,
		isDirty
	});
}