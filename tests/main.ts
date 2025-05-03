export const pause = (length: number = 50) => new Promise(resolve => setTimeout(resolve, length));

export type Child = {
	name: string;
	age: number;
}

export type Person = {
	name: string;
	age: number;
	validateChildren: boolean;
	validateNeighbors: boolean;
	countChildren: number;
	children: Child[],
	neighbors: Person[],
	bestFriend: Person;
}

const names = ["Alex", "Daniel", "Jacob", "Wendy", "Steve", "Phil", "Mike", "Brandon", "John", "Miranda", "Kyle", "Yoda", "Padame", "Tony", "Bailey", "Haley", "Elvis", "Ty"];
export const randomPerson = (params?: {
	genNeighbors?: boolean,
	genBestFriend?: boolean,
	maxChildren?: number,
	maxNeighbors?: number
}): Person => {
	// Provide default values
	const {
		genNeighbors = true,
		genBestFriend = true,
		maxChildren = 5,
		maxNeighbors = 3
	} = params ?? {};

	const countChildren = Math.ceil(Math.random() * maxChildren);
	const children = [];
	for (let i = 0; i < countChildren; i++) { children.push(randomChild()); }
	const countNeighbors = Math.ceil(Math.random() * maxNeighbors);
	const neighbors = [];
	if (genNeighbors) {
		for (let i = 0; i < countNeighbors; i++) { neighbors.push(randomPerson({ genNeighbors: false, genBestFriend: false })); }
	}
	return {
		name: randomName(),
		age: Math.ceil(Math.random() * 30 + 23),
		validateChildren: true,
		validateNeighbors: true,
		countChildren: countChildren,
		children: children,
		neighbors: neighbors,
		bestFriend: genBestFriend ? randomPerson({genNeighbors: false, genBestFriend: false, maxChildren: 0, maxNeighbors: 0}) : undefined,
	};
};

const randomName = () => names[Math.floor(Math.random() * names.length)];

const randomChild = (): Child => ({
	name: randomName(),
	age: Math.ceil(Math.random() * 17)
});