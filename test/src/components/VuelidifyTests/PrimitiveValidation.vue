<script setup lang="ts">
	import { ref, watch } from 'vue';
	import { useValidation, minLength } from 'vuelidify';

	const stringTest = ref<string>();
	const v$ = useValidation({
		objectToValidate: stringTest,
		validation: {
			$reactive: [minLength(4)]
		},
		delayReactiveValidation: false
	});

	watch(v$, (state) => console.log(state.propertyState), {
		deep: true
	});
</script>

<template>
	<form class="form">
		<h2>Simple String Validation</h2>
		<section>
			<div class="field">
				<label>
					Name
					<input v-model="stringTest"/>
				</label>
				<div class="input-errors">
					<p v-for="error in v$.propertyState.errorMessages">{{error}}</p>
				</div>
			</div>
		</section>
	</form>
</template>