<script setup lang="ts">
	import { ref } from 'vue';
	import { minLength, minNumber, useValidation } from "vuelidify";

	type FooBar = {
		a: Zaa,
		b: Zaa[]
	}
	
	type Zaa = {
		name: string;
		age: number;
	}

	const complexObj = ref<FooBar>();
	const v$ = useValidation({
		form: complexObj,
		validation: {
			a: {
				age: {
					$reactive: [minNumber(10)]
				}
			},
			b: {
				$each: {
					age: {
						$reactive: [(params) => {
							return {
								isValid: params.value < params.parent.a.age,
								message: "Must be younger than person a."
							};
						}],
						$lazy: [minNumber(15)]
					},
					name: {
						$reactive: [minLength(10)]
					}
				}
			}
		}
	});
</script>