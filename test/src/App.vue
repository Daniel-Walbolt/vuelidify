<script setup lang="ts">
</script>

<template>
	<RouterView/>
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