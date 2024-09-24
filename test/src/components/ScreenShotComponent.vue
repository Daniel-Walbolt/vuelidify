<script setup lang="ts">
	import { ref } from 'vue';
	import { isEmailSync, minLength, useValidation, Validator } from "vuelidify";

	const string = ref("");
	const v$ = useValidation({
		objectToValidate: string,
		validation: {
			$reactive: [
				minLength(10)
			]
		}
	});
</script>