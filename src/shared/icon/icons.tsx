import type { FC } from "react";
import type { FileKind } from "./fileKind";

/* ─── Icons shared across the file explorer ─── */
export const SearchIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
	>
		<title>search</title>
		<circle cx="6" cy="6" r="4.2" />
		<path d="M9.2 9.2L12 12" />
	</svg>
);

export const ChevronIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>open</title>
		<path d="M5 3l4 4-4 4" />
	</svg>
);

export const ShareIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="11"
		height="11"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>shared</title>
		<circle cx="3.6" cy="7" r="1.6" />
		<circle cx="10.4" cy="3.4" r="1.6" />
		<circle cx="10.4" cy="10.6" r="1.6" />
		<path d="M5 6.2l4-2M5 7.8l4 2" />
	</svg>
);

export const CloseIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
	>
		<title>close</title>
		<path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
	</svg>
);

export const FolderIcon: FC = () => (
	<svg
		viewBox="0 0 20 20"
		width="20"
		height="20"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>folder</title>
		<path d="M2.5 5.5a1.5 1.5 0 0 1 1.5-1.5h3l1.5 1.8h6.5a1.5 1.5 0 0 1 1.5 1.5v6.7a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V5.5Z" />
	</svg>
);

export const FileIcon: FC<{ kind: FileKind }> = ({ kind }) => {
	if (kind === "image") {
		return (
			<svg
				viewBox="0 0 20 20"
				width="20"
				height="20"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<title>image</title>
				<rect x="3" y="3.5" width="14" height="13" rx="1.8" />
				<circle cx="7.5" cy="8" r="1.4" />
				<path d="M3.5 13.5 7.5 10l3 2.5 3-3 3 3.2" />
			</svg>
		);
	}
	if (kind === "video") {
		return (
			<svg
				viewBox="0 0 20 20"
				width="20"
				height="20"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<title>video</title>
				<rect x="2.5" y="4.5" width="11" height="11" rx="1.8" />
				<path d="M13.5 8.5 17.5 6v8l-4-2.5z" />
			</svg>
		);
	}
	if (kind === "archive") {
		return (
			<svg
				viewBox="0 0 20 20"
				width="20"
				height="20"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<title>archive</title>
				<path d="M5 2.5h7l3 3v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
				<path d="M11.5 2.5v3.2h3.2" />
				<path d="M8.4 5.5h1.4M8.4 7.5h1.4M8.4 9.5h1.4" />
			</svg>
		);
	}
	// doc / code / generic share a document glyph
	return (
		<svg
			viewBox="0 0 20 20"
			width="20"
			height="20"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<title>file</title>
			<path d="M5 2.5h7l3 3v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
			<path d="M11.5 2.5v3.2h3.2" />
			<path d="M6.8 11h6.4M6.8 13.5h6.4" />
		</svg>
	);
};
