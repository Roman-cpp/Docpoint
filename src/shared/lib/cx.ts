/** Join truthy class names into a single space-separated string. */
export function cx(...classes: (string | false | null | undefined)[]): string {
	return classes.filter(Boolean).join(" ");
}
