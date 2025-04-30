<script setup lang="ts">
	import { ref } from 'vue';
	import { minLength, minNumber, useValidation } from "vuelidify";
	import AssertIs from '../verification/AssertIs.vue';

	const simpleObjectTest = ref({
		name: '',
		age: 0,
		isPerson: false
	});
	const v$ = useValidation<{ name: string, age: number, isPerson: boolean }>({
		form: simpleObjectTest,
		validation: {
			_reactive: [
				(params) => {
					console.log(params);
					return {
						isValid: Math.random() * 5 > 0.5,
						message: "This is the object validation"
					};
				}
			],
			name: {
				$reactive: [minLength(10)]
			},
			age: {
				$reactive: [minNumber(0)]
			},
			isPerson: {
				$reactive: [input => {
					const isNotAPerson = input.value == false;
					const isYoungerThanZero = input.parent.age < 0;
						return {
							name: 'test',
							isValid: (isYoungerThanZero && isNotAPerson) || (!isNotAPerson && !isYoungerThanZero),
							errorMessage: 'People are at least 0 years old!',
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
</script>

<template>
	<form class="form">
		<h2>Simple Object Validation</h2>
		<h6>with inter-property dependence</h6>
		<section>
			<div class="field">
				<label>
					Name
					<input v-model="simpleObjectTest.name"/>
				</label>
				<div class="input-errors">
					<p v-for="error in v$.state.name.$state.errorMessages">{{error}}</p>
				</div>
			</div>
			<div class="field">
				<label>
					Age
					<input v-model="simpleObjectTest.age" type="number"/>
				</label>
				<div class="input-errors">
					<p v-for="error in v$.state.age.$state.errorMessages">{{error}}</p>
				</div>
			</div>
			<div class="field">
				<label>
					Is Person
					<input v-model="simpleObjectTest.isPerson" type="checkbox"/>
				</label>
				<div class="input-errors">
					<p v-for="error in v$.state.isPerson.$state.errorMessages">{{error}}</p>
				</div>
			</div>
		</section>
		<h3>State:</h3>
		<pre>{{ JSON.stringify(v$.state, null, "\t") }}</pre>
	</form>
</template>