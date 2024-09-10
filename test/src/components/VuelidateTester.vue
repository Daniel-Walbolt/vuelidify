<script setup lang="ts">
	import { useVuelidate, ValidationArgs } from "@vuelidate/core";
	import { helpers, required } from "@vuelidate/validators";
	import { ref } from "vue";
import { Person } from "../types";
import { randomPerson } from "../dataGen";
import NeighborComponent from "./NeighborComponent.vue";

	const simpleObjectTest = ref({
		name: undefined,
		age: undefined,
		isPerson: false
	});
	const refTest = ref(100);

	const rules: ValidationArgs<typeof simpleObjectTest.value> = {
		name: {
			required,
		},
		age: {
			required,
			syncTest: helpers.withMessage("Must be less than 1000", syncTest),
			asyncTest: helpers.withMessage("Error", helpers.withAsync(asyncTestFunction, [refTest]))
		},
		isPerson: {
			required
		}
	}
	const v$ = useVuelidate<typeof simpleObjectTest.value>(rules, simpleObjectTest, {
		$autoDirty: true
	});

	async function timeValidation() {
		console.time("Validation");
		await v$.value.$validate();
		console.timeEnd("Validation");
	}

	function syncTest(value) {
		console.log("test");
		return {
			$valid: (value + refTest.value) < 1000,
			$message: "Must be less than 1000"
		}
	}

	async function asyncTestFunction(value) {
		console.log("Ran async validator");
		await new Promise(resolve => setTimeout(resolve, 500));
		if (value == 6) {
			return undefined;
		}
		return {
			$valid: (value + refTest.value) > 5,
			$message: "Test"
		};
	}

	const complexObjectValidation = ref<Person>(randomPerson());
	const complexRules: ValidationArgs<Person> = {
		children: {
			$each: helpers.forEach({
				age: {
					syncTest
				}
			})
		}
	}
	const v$2 = useVuelidate(complexRules, complexObjectValidation, {
		$autoDirty: true
	});

	setInterval(async () => {
		for (const child of complexObjectValidation.value.children) {
			child.age += 500;
		}
		console.log(await v$2.value.$validate());
	}, 1000);

</script>

<template>
	<form class="form">
		<h2>Simple Object Validation</h2>
		<section>
			<div class="field">
				<label>
					Name
					<input v-model="simpleObjectTest.name"/>
				</label>
				<div class="input-errors">
					<p v-for="error in v$.name.$errors">{{error.$message}}</p>
				</div>
			</div>
			<div class="field">
				<label>
					Age
					<input v-model="simpleObjectTest.age" type="number"/>
					<span v-if="v$.age.$pending"></span>
				</label>
				<div class="input-errors">
					{{ v$.age.asyncTest }}
					<p v-for="error in v$.age.$errors">{{error.$message}}</p>
				</div>
			</div>
		</section>
	</form>
	<form class="form">
		<h2>Complex Object Validation</h2>
		<NeighborComponent :person="complexObjectValidation"/>
	</form>
</template>