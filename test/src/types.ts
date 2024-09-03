export type Child = {
	name: string;
	age: number;
}

export type Person = {
	name: string;
	age: number;
	countChildren: number;
	children: Child[],
	neighbors: Person[]
}