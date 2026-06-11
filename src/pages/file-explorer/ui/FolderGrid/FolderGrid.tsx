import type { FC } from "react";
import type { Folder } from "@/entities/file-explorer";
import { ChevronIcon, FolderIcon } from "@/shared/icon/icons";
import { cx } from "@/shared/lib/cx";
import s from "./FolderGrid.module.css";

export const FolderGrid: FC<{
	folders: Folder[];
	onOpen: (id: string) => void;
}> = ({ folders, onOpen }) => {
	if (folders.length === 0) return null;
	return (
		<section className={s["fe-section"]}>
			<h2 className={s["fe-section-title"]}>Каталоги</h2>
			<div className={s["fe-folder-grid"]}>
				{folders.map((folder) => (
					<button
						key={folder.id}
						type="button"
						className={s["fe-folder"]}
						onClick={() => onOpen(folder.id)}
					>
						<span className={cx(s["fe-tile"], s["fe-tile-folder"])}>
							<FolderIcon />
						</span>
						<span className={s["fe-folder-body"]}>
							<span className={s["fe-folder-name"]} title={folder.name}>
								{folder.name}
							</span>
							<span className={s["fe-folder-count"]}>
								{folder.childrenCount} эл.
							</span>
						</span>
						<span className={s["fe-folder-go"]} aria-hidden="true">
							<ChevronIcon />
						</span>
					</button>
				))}
			</div>
		</section>
	);
};
