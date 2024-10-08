import { FinalFormValidation, minLength, validateIf } from "../../dist";
import { Person } from "./types";

export const PartialPersonValidation: FinalFormValidation<Person> = {
	name: {
		$reactive: [minLength(10)]
	},
	age: {
	},
	countChildren: {},
	children: {
		$each: {
			name: {
				$reactive: [validateIf(p => p.parent.validateChildren, [minLength(10), async input => {
					return {
						isValid: Math.random() > 0.5,
						errorMessage: "Async failed"
					}
				}])]
			}
		}
	},
}