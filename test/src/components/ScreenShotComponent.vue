<script setup lang="ts">
	import { ref } from 'vue';
	import { minLength, useValidation } from "vuelidify";

	type FooBar = {
		name: string;
		isActive: boolean;
	}

	const string = ref<FooBar[]>([]);
	const v$ = useValidation({
		objectToValidate: string,
		validation: {
			$each: {
				name: {
					$reactive: [
						(params) => {
							if (params.arrayParents[0].isActive !== true) {
								return;
							}
							return [minLength(10)]
						}
					]
				}
			}
		}
	});
</script>