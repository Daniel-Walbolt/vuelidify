<script setup lang="ts">
	import { ref } from 'vue';
	import { minLength, minNumber, useValidation, setup } from "vuelidify";

	type SimpleObject = {
		name: string;
		age: number;
		isPerson: boolean;
	}

	const optionalObjectTest = ref<SimpleObject | undefined>();
	const v$ = useValidation({
		form: optionalObjectTest,
		validation: {
			name: {
				$reactive: [minLength(10)]
			},
			age: {
				$reactive: [minNumber(0)]
			},
			isPerson: {
				$reactive: [input => {
					const isAPerson = input.value;
					const isYoungerThanZero = input.parent.age < 0;
					return {
						name: 'test',
						isValid: (isAPerson === false) || (isAPerson && isYoungerThanZero === false),
						message: 'People are at least 0 years old!',
						custom: {
							severity: 10,
							passwordStrength: 3
						}
					};
				}]
			}
		},
		delayReactiveValidation: false
	});

	setTimeout(() => {
		optionalObjectTest.value = {
			name: "Name",
			age: 15,
			isPerson: true
		};
	}, 2000);
</script>

<template>
	<form class="form">
		<h2>Optional Object Validation</h2>
		<h4>with inter-property dependence</h4>
		<h4>with customized validation response (see 'custom' property)</h4>
		<p v-if="!optionalObjectTest">The object will load in after a couple seconds...</p>
		<section v-else>
			<div class="field">
				<label>
					Name
					<input v-model="optionalObjectTest.name"/>
				</label>
				<div class="input-errors">
					<p v-for="error in v$.state.name.$state.errorMessages">{{error}}</p>
				</div>
			</div>
			<div class="field">
				<label>
					Age
					<input v-model="optionalObjectTest.age" type="number"/>
				</label>
				<div class="input-errors">
					<p v-for="error in v$.state.age.$state.errorMessages">{{error}}</p>
				</div>
			</div>
			<div class="field">
				<label>
					Is Person
					<input v-model="optionalObjectTest.isPerson" type="checkbox"/>
				</label>
				<div class="input-errors">
					<p v-for="error in v$.state.isPerson.$state.errorMessages">{{error}}</p>
					<pre>{{ JSON.stringify(v$.state.isPerson.$state.results, null, 4) }}</pre>
				</div>
			</div>
			<p>Note, the "isValid" property should be changing if isPerson is true and age is less than 0</p>
		</section>
	</form>
</template>