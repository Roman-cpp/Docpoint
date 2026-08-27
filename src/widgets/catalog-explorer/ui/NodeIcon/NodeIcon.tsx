import type { FC } from "react";
import type { NodeKind } from "@/entities/catalog";
import type { IconProps } from "@/shared/svg";
import {
	ApiIcon,
	ErdIcon,
	FileIcon,
	FolderIcon,
	SocketIcon,
} from "@/shared/svg";

/** Сопоставление вида узла и глифа. Набор иконок про виды узлов не знает —
 *  соответствие живёт здесь, там, где оно используется. */
const GLYPH_BY_KIND: Record<NodeKind, FC<IconProps>> = {
	catalog: FolderIcon,
	docApi: ApiIcon,
	docWs: SocketIcon,
	docErd: ErdIcon,
	markdown: FileIcon,
};

export const NodeIcon: FC<IconProps & { kind: NodeKind }> = ({
	kind,
	...rest
}) => {
	const Glyph = GLYPH_BY_KIND[kind];
	return <Glyph {...rest} />;
};
