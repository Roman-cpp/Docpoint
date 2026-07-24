/** Visual category a file is drawn as. Purely presentational: it drives the
 *  icon and tile colour, nothing else. */
export type FileKind =
	| "doc"
	| "archive"
	| "image"
	| "code"
	| "video"
	| "generic";
