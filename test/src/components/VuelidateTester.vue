<script setup lang="ts">
	import { useVuelidate, Validation, ValidationArgs } from "@vuelidate/core";
	import { helpers, required } from "@vuelidate/validators";
	import { ref } from "vue";
import { throttleQueueAsync } from "../../../dist";

	const simpleObjectTest = ref({
		name: undefined,
		age: undefined,
		isPerson: false
	});
	const debouncedFunction = throttleQueueAsync(asyncTestFunction, 500);
	const rules: ValidationArgs<typeof simpleObjectTest.value> = {
		name: {
			required,
		},
		age: {
			required,
			asyncTest: helpers.withAsync(asyncTestFunction)
		},
		isPerson: {
			required
		}
	}
	const v$ = useVuelidate<typeof simpleObjectTest.value>(rules, simpleObjectTest, {
		$autoDirty: true
	});

	async function asyncTestFunction(value) {
		console.log("Ran async validator");
		await new Promise(resolve => setTimeout(resolve, 500));
		if (value == 6) {
			return undefined;
		}
		return {
			$valid: value > 5,
			$message: "Test"
		};
	}
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
</template>