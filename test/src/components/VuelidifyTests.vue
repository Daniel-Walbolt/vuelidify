<script setup lang="ts">

</script>

<template>
	<div class="container">
		<nav class="navbar">
			<router-link :to="{ path: '/vuelidify/primitive-test' }" class="navlink">Primitive Validation</router-link>
		</nav>
		<RouterView />
	</div>
</template>

<style scoped>
	.container {
		display: flex;
		flex-direction: column;
		gap: 4
	}
	.navbar {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.navlink {
		padding: 1rem 2rem;
		border: 2px solid #333333;
		border-radius: 1rem;
		color: blue;
		transition: color 0.3s ease;
		&:hover {
			color: lightblue;
		}
		&:active {
			color: darkblue;
		}
	}
</style>