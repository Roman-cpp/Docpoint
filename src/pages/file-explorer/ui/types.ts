/* ─── File-explorer types (template-local; no API yet) ─── */
export type FileKind =
	| "doc"
	| "archive"
	| "image"
	| "code"
	| "video"
	| "generic";

export interface FolderNode {
	id: string;
	type: "folder";
	name: string;
	children: FsNode[];
}

export interface FileNode {
	id: string;
	type: "file";
	name: string;
	kind: FileKind;
	/** Size in bytes. */
	size: number;
	/** Whether the file is shared. */
	shared: boolean;
	/** Faux preview payload shown in the drawer. */
	preview?: string;
}

export type FsNode = FolderNode | FileNode;
