<script setup lang="ts">
	import { ref } from 'vue';
	import { randomPerson } from '../../dataGen';
	import { Person } from '../../types';
	import { PartialPersonValidation } from '../../separateValidation';
	import { minLength, minNumber, useValidation } from "vuelidify";
	import NeighborComponent from '../NeighborComponent.vue';

	const complexObjectValidation = ref<Person>(randomPerson(true, true, 5, 15));
	const v$ = useValidation<Person>({
		objectToValidate: complexObjectValidation,
		validation: {
			...PartialPersonValidation,
			neighbors: {
				$each: {
					name: {
						$reactive: [
							minLength(10),
							input => {
								return {
									isValid: true
								};
							}
						]
					},
					age: {
						$reactive: [
							minNumber(30)
						]
					},
					countChildren: {},
					children: {
						$each: {
							name: {
								$reactive: [async params => {
									if (params.arrayParents[0].validateChildren === false) {
										return;
									}
									return [
										minLength(10),
										input => {
											return {
												isValid: Math.random() > 0.5,
												errorMessage: 'Async failed'
											};
										}
									];
								}]
							}
						}
					}
				},
			}
		},
		delayReactiveValidation: false,
		args: true
	});
</script>

<template>
	<form class="form">
		<h2>Complex Object Validation</h2>
		<p>Validate Children checkbox does as it says. Disabling the checkbox should remove all error messages from the children and return early from their validators. This is a feature implemented on the validator level not internally!</p>
		<p>Doing this kind of thing in Vuelidate would require validation rules in every sub-component, but in Vuelidify it's all done in the parent component.</p>
		<p>Furthermore, accessing the outermost parent object from inside a sub-component validator is not supported by Vuelidate.</p>
		<NeighborComponent :person="complexObjectValidation" :validation="v$.state"/>
	</form>
</template>