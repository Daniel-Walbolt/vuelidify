<script setup lang="ts">
	import { ref } from "vue";
	import { minimumLength, useValidation, minValue, bufferAsync } from "vue-final-form"
	import { Child, Person } from "../types";
	import { PartialPersonValidation } from "../separateValidation";
	import NeighborComponent from "./NeighborComponent.vue";
import { randomPerson } from "../dataGen";
	const stringTest = ref<string>();
	const v$ = useValidation({
		objectToValidate: stringTest,
		validation: {
			$reactive: [minimumLength(4)]
		},
		delayReactiveValidation: false
	});
	

	const simpleObjectTest = ref({
		name: "",
		age: 0,
		isPerson: false
	});
	const v$2 = useValidation<{ name: string, age: number, isPerson: boolean }>({
		objectToValidate: simpleObjectTest,
		validation: {
			name: {
				$reactive: [minimumLength(10)]
			},
			age: {
				$reactive: [minValue(0)]
			},
			isPerson: {
				$reactive: [input => {
					const isNotAPerson = input.value == false;
					const isYoungerThanZero = input.parent.age < 0;
					if (isNotAPerson)
						return {
						isValid: isYoungerThanZero  && isNotAPerson || isYoungerThanZero == false && isNotAPerson == false,
						errorMessage: isNotAPerson ? "" : "People are at least 0 years old!"
					}; else {
						return [
							
						]
					}
				}]
			}
		},
		delayReactiveValidation: false
	});

	const objectArrayTest = ref([
		{ name: "12345" }
	]);
	const randomRef = ref(4);
	// setInterval(() => {
	// 	randomRef.value += 100;
	// 	console.log(randomRef.value)
	// }, 100);
	const v$3 = useValidation({
		objectToValidate: objectArrayTest,
		validation: {
			$each: {
				name: {
					$reactive: [minimumLength(5),
						input => {
							return {
								isValid: randomRef.value > 100,
								errorMessage: "Failed"
							}
						}
						// async input => {
						// 	await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
						// 	return {
						// 		isValid: input.value.length > 6,
						// 		errorMessage: "Async failed"
						// 	}
						// }
					]
				}
			}
		},
		delayReactiveValidation: false
	});

	// setInterval(async () => {
	// 	console.time("Array validation");
	// 	await v$3.validate();
	// 	console.timeEnd("Array validation");
	// }, 500)

	function addObjectToArray() {
		objectArrayTest.value.push({
			name: "1234567"
		});
	}

	function swapRandom() {
		const randIndex = Math.floor(Math.random() * objectArrayTest.value.length);
		const randIndex2 = Math.floor(Math.random() * objectArrayTest.value.length);

		const temp = objectArrayTest.value[randIndex];
		objectArrayTest.value[randIndex] = objectArrayTest.value[randIndex2];
		objectArrayTest.value[randIndex2] = temp;
	}

	function swapAll() {
		for (let i = 0; i < objectArrayTest.value.length/2; i++) {
			const opp = objectArrayTest.value.length - i - 1;

			const temp = objectArrayTest.value[i];
			objectArrayTest.value[i] = objectArrayTest.value[opp];
			objectArrayTest.value[opp] = temp;
		}
	}

	for (let i = 0; i < 15; i++) {
		addObjectToArray();
	}

	const simpleValidateIfTest = ref({
		isValidated: false,
		name: ""
	});
	const v$4 = useValidation({
		objectToValidate: simpleValidateIfTest,
		validation: {
			name: {
				$reactive: [async input => {
					if (input.parent.isValidated == false) {
						return undefined;
					}
					return [
						async input => {
							await new Promise(resolve => setTimeout(resolve, 1000));
							return {
								isValid: Math.random() > 0.5,
								errorMessage: "Async failed"
							}
						},
						minimumLength(15)
					]
				}]
			}
		},
		delayReactiveValidation: false
	});

	const testAsyncFunction = bufferAsync(async () => {
		console.log("Async promise activated");
		await new Promise(resolve => setTimeout(resolve, 500));
	})

	const complexObjectValidation = ref<Person>(randomPerson(true, true, 5, 15));
	const v$5 = useValidation({
		objectToValidate: complexObjectValidation,
		validation: {
			...PartialPersonValidation,
			neighbors: {
				$each: {
					name: {
						$reactive: [minimumLength(10), input => {
							return {
								isValid: true
							}
						}]
					},
					age: {
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
										minimumLength(10),
										input => {
											return {
												isValid: Math.random() > 0.5,
												errorMessage: "Async failed"
											}
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
	
	// This validation takes about 1 millisecond with default random data.
	// This validation takes about 2.5 - 3 millisecond with (true, true, 5, 15) random data (6 neighbors)
	// This validation takes about 4 milliseconds with 14 neighbors. ^ same random data generator
	// setInterval(async () => {
	// 	console.time("Validation");
	// 	await v$5.validate();
	// 	console.timeEnd("Validation");
	// }, 2000);
</script>

<template>
	<div class="main">
		<form class="form">
			<h2>Simple String Validation</h2>
			<section>
				<div class="field">
					<label>
						Simple string validation
						<input v-model="stringTest"/>
					</label>
					<div class="input-errors">
						<p v-for="error in v$.propertyState.errorMessages">{{error}}</p>
					</div>
				</div>
			</section>
		</form>
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
						<p v-for="error in v$2.propertyState.name.errorMessages">{{error}}</p>
					</div>
				</div>
				<div class="field">
					<label>
						Age
						<input v-model="simpleObjectTest.age" type="number"/>
					</label>
					<div class="input-errors">
						<p v-for="error in v$2.propertyState.age.errorMessages">{{error}}</p>
					</div>
				</div>
				<div class="field">
					<label>
						Is Person
						<input v-model="simpleObjectTest.isPerson" type="checkbox"/>
					</label>
					<div class="input-errors">
						<p v-for="error in v$2.propertyState.isPerson.errorMessages">{{error}}</p>
					</div>
				</div>
			</section>
		</form>
		<form class="form">
			<h2>Object Array Validation</h2>
			<button type="button" @click="addObjectToArray">Add object</button>
			<button type="button" @click="swapRandom">Swap</button>
			<button type="button" @click="swapAll">Swap All</button>
			<section>
				<div v-for="obj,i in objectArrayTest" class="field">
					<label>
						Name {{ i }}
						<input v-model="obj.name"/>
						<span v-if="v$3.propertyState.arrayState[i].name.isValidating"></span>
					</label>
					<div class="input-errors">
						<p v-for="error in v$3.propertyState.arrayState[i].name.errorMessages">{{error}}</p>
					</div>
				</div>
			</section>
		</form>
		<form class="form">
			<h2>Async ValidateIf Example</h2>
			<section>
				<div class="field">
					<label>
						Should Validate
						<input v-model="simpleValidateIfTest.isValidated" type="checkbox"/>
					</label>
				</div>
				<div class="field">
					<label>
						Name
						<input v-model="simpleValidateIfTest.name" type="number"/>
						<span v-if="v$4.propertyState.name.isValidating"></span>
					</label>
					<div class="input-errors">
						<p v-for="error in v$4.propertyState.name.errorMessages">{{error}}</p>
					</div>
				</div>
			</section>
		</form>
		<form class="form">
			<h2>Complex Object Validation</h2>
			<NeighborComponent :person="complexObjectValidation" :validation="v$5.propertyState"/>
		</form>
	</div>
</template>