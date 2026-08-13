import type { FC } from "react";
import { createIcon } from "../lib/createIcon";
import type { FileKind } from "../model/fileKind";
import type { IconProps } from "../model/icon.type";

export const SearchIcon = createIcon(
	"SearchIcon",
	{ viewBox: "0 0 14 14", size: 14 },
	<>
		<circle cx="6" cy="6" r="4.2" />
		<path d="M9.2 9.2L12 12" />
	</>,
);

export const DocIcon = createIcon(
	"DocIcon",
	{ viewBox: "0 0 14 14", size: 13 },
	<>
		<path d="M3 1.5h5L11 4.5v8H3z" />
		<path d="M8 1.5V4.5H11" />
		<path d="M5 7.5h4M5 9.5h4" />
	</>,
);

export const FolderIcon = createIcon(
	"FolderIcon",
	{ viewBox: "0 0 20 20", size: 20, strokeWidth: 1.5 },
	<path d="M2.5 5.5a1.5 1.5 0 0 1 1.5-1.5h3l1.5 1.8h6.5a1.5 1.5 0 0 1 1.5 1.5v6.7a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V5.5Z" />,
);

export const LogsIcon = createIcon(
	"LogsIcon",
	{ viewBox: "0 0 14 14", size: 14, strokeWidth: 1.5 },
	<>
		<rect x="2" y="2" width="10" height="10" rx="2" />
		<path d="M4.5 5.2h5M4.5 7h5M4.5 8.8h3" />
	</>,
);

/* ─── Файл по типу содержимого ─── */

const ImageFileIcon = createIcon(
	"ImageFileIcon",
	{ viewBox: "0 0 20 20", size: 20, strokeWidth: 1.5 },
	<>
		<rect x="3" y="3.5" width="14" height="13" rx="1.8" />
		<circle cx="7.5" cy="8" r="1.4" />
		<path d="M3.5 13.5 7.5 10l3 2.5 3-3 3 3.2" />
	</>,
);

const VideoFileIcon = createIcon(
	"VideoFileIcon",
	{ viewBox: "0 0 20 20", size: 20, strokeWidth: 1.5 },
	<>
		<rect x="2.5" y="4.5" width="11" height="11" rx="1.8" />
		<path d="M13.5 8.5 17.5 6v8l-4-2.5z" />
	</>,
);

const ArchiveFileIcon = createIcon(
	"ArchiveFileIcon",
	{ viewBox: "0 0 20 20", size: 20, strokeWidth: 1.5 },
	<>
		<path d="M5 2.5h7l3 3v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
		<path d="M11.5 2.5v3.2h3.2" />
		<path d="M8.4 5.5h1.4M8.4 7.5h1.4M8.4 9.5h1.4" />
	</>,
);

/** doc / code / generic рисуются одним листом с текстом. */
const PlainFileIcon = createIcon(
	"PlainFileIcon",
	{ viewBox: "0 0 20 20", size: 20, strokeWidth: 1.5 },
	<>
		<path d="M5 2.5h7l3 3v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
		<path d="M11.5 2.5v3.2h3.2" />
		<path d="M6.8 11h6.4M6.8 13.5h6.4" />
	</>,
);

const BY_KIND: Record<FileKind, FC<IconProps>> = {
	image: ImageFileIcon,
	video: VideoFileIcon,
	archive: ArchiveFileIcon,
	doc: PlainFileIcon,
	code: PlainFileIcon,
	generic: PlainFileIcon,
};

/** Иконка файла по его визуальной категории. */
export const FileIcon: FC<IconProps & { kind: FileKind }> = ({
	kind,
	...rest
}) => {
	const Glyph = BY_KIND[kind];
	return <Glyph {...rest} />;
};
