export interface Doc {
	id: string;
	name: string;
	version: string;
	desc: string;
	/** Префикс документа: дописывается после префикса окружения. */
	prefix: string;
	tags: string[];
}
