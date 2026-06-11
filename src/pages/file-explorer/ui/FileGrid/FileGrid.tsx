import type { FC } from "react";
import type { File } from "@/entities/file-explorer";
import { FileIcon } from "@/shared/icon/icons";
import { cx } from "@/shared/lib/cx";
import s from "./FileGrid.module.css";
import { formatSize } from "../lib";

/* ─── Files — content tiles ─── */
export const FileGrid: FC<{
	files: File[];
	selectedId: string | null;
	onSelect: (file: File) => void;
	/** Activate a file (double-click) — e.g. open a `.md` file in the viewer. */
	onOpen?: (file: File) => void;
}> = ({ files, selectedId, onSelect, onOpen }) => {
	if (files.length === 0) return null;
	return (
		<section className={s["fe-section"]}>
			<h2 className={s["fe-section-title"]}>Файлы</h2>
			<div className={s["fe-grid"]}>
				{files.map((file) => {
					const kind = "doc";
					return (
						<button
							key={file.name}
							type="button"
							className={cx(
								s["fe-card"],
								selectedId === file.name && s["fe-card-active"],
							)}
							onClick={() => onSelect(file)}
							onDoubleClick={() => onOpen?.(file)}
						>
							{/* {file.shared && (
							<span className={s["fe-share-dot"]} title="Общий доступ">
								<ShareIcon />
							</span>
						)} */}
							<span className={cx(s["fe-tile"], s[`fe-tile-${kind}`])}>
								<FileIcon kind={kind} />
							</span>
							<span className={s["fe-card-name"]} title={file.name}>
								{file.name}
							</span>
							<span className={s["fe-card-meta"]}>{formatSize(file.size)}</span>
						</button>
					);
				})}
			</div>
		</section>
	);
};
