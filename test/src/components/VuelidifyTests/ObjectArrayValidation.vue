<script setup lang="ts">
	import { ref } from "vue";
	import { minLength, useValidation } from "vuelidify";
	const objectArrayTest = ref([
		{ name: '12345' }
	]);
	const v$ = useValidation({
		form: objectArrayTest,
		validation: {
			$each: {
				name: {
					$reactive: [
						minLength(5),
						async input => {
							await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
							return {
								isValid: input.value.length > 6,
								message: "Async failed"
							};
						}
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
			name: '1234567'
		});
	}

	function swapRandom() {
		const randIndex = Math.floor(Math.random() * objectArrayTest.value.length);
		const randIndex2 = Math.floor(Math.random() * objectArrayTest.value.length);

		const temp = objectArrayTest.value[randIndex];
		objectArrayTest.value[randIndex] = objectArrayTest.value[randIndex2];
		objectArrayTest.value[randIndex2] = temp;
	}

	function swapAll(array: any[]) {
		for (let i = 0; i < array.length/2; i++) {
			const opp = array.length - i - 1;

			const temp = array[i];
			array[i] = array[opp];
			array[opp] = temp;
		}
	}

	for (let i = 0; i < 15; i++) {
		addObjectToArray();
	}
</script>

<template>
	<form class="form">
		<h2>Object Array Validation</h2>
		<p>Notice how async validation is done separately on each item in the array.</p>
		<p>Swapping the items should move the error messages, not just recalculate them.</p>
		<p>Yes, async validation is done every time on every object in the array whenever any object changes. There is no way of knowing when to update it. However, promises are throttled so not just every character triggers a new promise.</p>
		<button type="button" @click="addObjectToArray">Add object</button>
		<button type="button" @click="swapRandom">Swap</button>
		<button type="button" @click="() => swapAll(objectArrayTest)">Swap All</button>
		<section>
			<div v-for="obj,i in objectArrayTest" class="field">
				<label>
					Name {{ i }}
					<input v-model="obj.name"/>
					<span v-if="v$.state.$arrayState[i].name.$state.isValidating"></span>
				</label>
				<div class="input-errors">
					<p v-for="error in v$.state.$arrayState[i].name.$state.errorMessages">{{error}}</p>
				</div>
			</div>
		</section>
	</form>
</template>