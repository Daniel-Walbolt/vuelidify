<script setup lang="ts">
	import { ref, watch } from 'vue';
	import { useValidation, minLength } from 'vuelidify';

	const stringTest = ref<string>();
	const v$ = useValidation({
		form: stringTest,
		validation: {
			$reactive: [minLength(4)]
		},
		delayReactiveValidation: false
	});

	watch(v$, (state) => console.log(state.state), {
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
					<p v-for="error in v$.state.$state.errorMessages">{{error}}</p>
				</div>
			</div>
		</section>
	</form>
</template>