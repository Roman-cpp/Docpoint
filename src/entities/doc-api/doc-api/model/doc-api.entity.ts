export interface Doc {
	id: string;
	name: string;
	desc: string;
	/** Префикс документа: дописывается после префикса окружения. */
	prefix: string;
}
