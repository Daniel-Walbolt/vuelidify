<script setup lang="ts">
	import { ref } from "vue";
	import { minimumLength, useValidation, minValue, validateIf, bufferAsync } from "vue-final-form"
	import { Child, Person } from "./types";
	import { PartialPersonValidation } from "./separateValidation";
	import NeighborComponent from "./components/NeighborComponent.vue";
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
					return {
						isValid: isYoungerThanZero  && isNotAPerson || isYoungerThanZero == false && isNotAPerson == false,
						errorMessage: isNotAPerson ? "" : "People are at least 0 years old!"
					}
				}]
			}
		},
		delayReactiveValidation: false
	});

	const objectArrayTest = ref([
		{ name: "" }
	]);
	const v$3 = useValidation({
		objectToValidate: objectArrayTest,
		validation: {
			$each: {
				name: {
					$reactive: [minimumLength(5), async input => {
						await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
						return {
							isValid: input.value.length > 6,
							errorMessage: "Async failed"
						}
					}]
				}
			}
		},
		delayReactiveValidation: false
	});

	function addObjectToArray() {
		objectArrayTest.value.push({
			name: ""
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

	const names = ["Alex", "Daniel", "Jacob", "Wendy", "Steve", "Phil", "Mike", "Brandon", "John", "Miranda", "Kyle", "Yoda", "Padame", "Tony"];
	const randomPerson = (genNeighbors: boolean = true): Person => {
		const countChildren = Math.ceil(Math.random() * 1);
		const children = []
		for (let i = 0; i < countChildren; i++) { children.push(randomChild()); }
		const countNeighbors = Math.ceil(Math.random() * 2);
		const neighbors = [];
		if (genNeighbors) {
			for (let i = 0; i < countNeighbors; i++) { neighbors.push(randomPerson(false)); }
		}
		return {
			name: randomName(),
			age: Math.ceil(Math.random() * 30 + 23),
			validateChildren: true,
			validateNeighbors: true,
			countChildren: countChildren,
			children: children,
			neighbors: neighbors
		}
	}

	const randomName = () => names[Math.floor(Math.random() * names.length)];

	const randomChild = (): Child => ({
		name: randomName(),
		age: Math.ceil(Math.random() * 12)
	});

	const complexObjectValidation = ref<Person>(randomPerson());
	const v$5 = useValidation({
		objectToValidate: complexObjectValidation,
		validation: {
			...PartialPersonValidation,
			neighbors: {
				$each: {
					name: {
						$reactive: [minimumLength(10), input => {
							console.log(input.arrayParents);
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
										async input => {
											await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
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
	console.log(complexObjectValidation.value)
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

<style>
	.main {
		display: flex;
		flex-wrap: wrap;
		gap: 5rem;
	}

	.form {
		border: 1px solid rgb(50, 50, 50);
		border-radius: 1rem;
		padding: 1rem;
		> section {
			display: flex;
			flex-wrap: wrap;
			gap: 1rem;
		}
	}

	section > section {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}


	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.input-errors {
		display: flex;
		flex-direction: column;
		color: red;
		align-items: flex-end;
	}

	label {
		display: flex;
		position: relative;
		flex-direction: column;
		gap: 0.25rem;
		height: 4rem;
		> span {
			position: absolute;
			top: 1.5rem;
			right: 5px;
			width: 16px;
			height: 16px;
			border-top: 1px solid white;
			border-radius: 100%;
			animation: infinite spin 1s linear;
		}
	}
	
	@keyframes spin {
		50% {
			transform: rotate(180deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
	input {
		padding: 0.25rem 0.5rem;
		background: rgba(25,25,25,0.5);
		border: none;
		border-bottom: 2px solid rgb(180,180,180);
		color: white;
		box-shadow: none;
		transition: border-color 0.2s ease;
		&:focus {
			outline: none;
			border-color: aqua;
		}
		&[type="checkbox"] {
			appearance: none;
			width: 1rem;
			height: 1rem;
			background-color: white;
			border: none;
			&:checked {
				background-color: aqua;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: small;
				&:after {
					content: '✓';
					color: black;
				}
			}
		}
	}
</style>