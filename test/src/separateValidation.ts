import { FinalFormValidation, minimumLength, minValue } from "../../dist";
import { Person } from "./types";

export const PartialPersonValidation: FinalFormValidation<Person> = {
	name: {
		$reactive: [minimumLength(10)]
	},
	age: {
	},
	countChildren: {},
	children: {
		$each: {
			name: {
				$reactive: [minimumLength(10), async input => {
					await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
					return {
						isValid: Math.random() > 0.5,
						errorMessage: "Async failed"
					}
				}]
			}
		}
	},
}