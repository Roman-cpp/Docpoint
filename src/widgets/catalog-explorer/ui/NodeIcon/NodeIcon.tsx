import type { FC } from "react";
import type { NodeKind } from "@/entities/catalog";
import type { IconProps } from "@/shared/svg";
import {
	ApiIcon,
	ArchiveFileIcon,
	DocIcon,
	ErdIcon,
	FileIcon,
	FolderIcon,
	ImageFileIcon,
	SocketIcon,
	VideoFileIcon,
} from "@/shared/svg";

/** Сопоставление вида узла и глифа. Набор иконок про виды узлов не знает —
 *  соответствие живёт здесь, там, где оно используется. */
const GLYPH_BY_KIND: Record<NodeKind, FC<IconProps>> = {
	catalog: FolderIcon,
	docApi: ApiIcon,
	docWs: SocketIcon,
	docErd: ErdIcon,
	markdown: FileIcon,
	file: FileIcon,
};

const IMAGE = [
	"png",
	"jpg",
	"jpeg",
	"gif",
	"webp",
	"svg",
	"bmp",
	"ico",
	"avif",
];
const VIDEO = ["mp4", "mov", "mkv", "avi", "webm", "m4v", "mp3", "wav", "ogg"];
const ARCHIVE = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso"];
const DOCUMENT = [
	"pdf",
	"doc",
	"docx",
	"odt",
	"rtf",
	"xls",
	"xlsx",
	"ods",
	"ppt",
	"pptx",
	"csv",
];

/** Вид узла у всех загруженных файлов один, а картинка, архив и таблица в
 *  проводнике должны различаться — остаётся расширение имени. */
const fileGlyph = (name: string): FC<IconProps> => {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";

	if (IMAGE.includes(ext)) return ImageFileIcon;
	if (VIDEO.includes(ext)) return VideoFileIcon;
	if (ARCHIVE.includes(ext)) return ArchiveFileIcon;
	if (DOCUMENT.includes(ext)) return DocIcon;

	return FileIcon;
};

/** Имя нужно только файлам: по нему выбирается глиф под расширение. Меню
 *  создания зовёт иконку без имени и получает общий глиф вида. */
export const NodeIcon: FC<IconProps & { kind: NodeKind; name?: string }> = ({
	kind,
	name,
	...rest
}) => {
	const Glyph = kind === "file" && name ? fileGlyph(name) : GLYPH_BY_KIND[kind];
	return <Glyph {...rest} />;
};
