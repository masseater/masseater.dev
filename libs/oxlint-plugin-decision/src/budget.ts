const OUT_OF_BUDGET = /^http (?:402|403): .*(?:credit|budget)/iu;

const outOfBudget = (reason: string): boolean => OUT_OF_BUDGET.test(reason);

export { outOfBudget };
