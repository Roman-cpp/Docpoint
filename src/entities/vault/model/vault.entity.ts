/** A file inside a scope. `path` is relative to the scope root. */
export interface VaultFile {
	path: string;
	name: string;
	/** Size in bytes — format for display with `formatSize`. */
	size: number;
	/** Last modification time, unix seconds. */
	updated: number;
}

/** A sub-folder inside a scope. `path` is relative to the scope root. */
export interface VaultFolder {
	path: string;
	name: string;
	childrenCount: number;
}

/** Direct contents of a single folder, each list sorted by name. */
export interface DirListing {
	folders: VaultFolder[];
	files: VaultFile[];
}

/** An empty listing, for use as an initial or error state. */
export const EMPTY_LISTING: DirListing = { folders: [], files: [] };
