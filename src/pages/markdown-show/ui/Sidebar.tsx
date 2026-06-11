import type { FC } from "react";
import { cx } from "@/shared/lib/cx";
import type { MarkdownFile } from "../model/sampleFiles";
import { ChevronIcon, DocIcon, SearchIcon } from "./icons";
import s from "./Sidebar.module.css";

interface SidebarProps {
	/** Total number of files (for the header count). */
	totalCount: number;
	query: string;
	onQueryChange: (value: string) => void;
	/** Files grouped by folder, already filtered by the search query. */
	groups: Record<string, MarkdownFile[]>;
	openFolders: Record<string, boolean>;
	onToggleFolder: (folder: string) => void;
	activeId: string;
	onSelectFile: (id: string) => void;
}

export const Sidebar: FC<SidebarProps> = ({
	totalCount,
	query,
	onQueryChange,
	groups,
	openFolders,
	onToggleFolder,
	activeId,
	onSelectFile,
}) => {
	const folders = Object.keys(groups);

	return (
		<aside className={s.tree}>
			<div className={s.treeHead}>
				<span className={s.treeHeadTitle}>Файлы · {totalCount}</span>
			</div>
			<div className={s.treeSearch}>
				<SearchIcon />
				<input
					placeholder="Поиск по файлам…"
					value={query}
					onChange={(e) => onQueryChange(e.target.value)}
				/>
			</div>
			<div className={s.treeScroll}>
				{folders.map((folder) => {
					const open = openFolders[folder] !== false;
					return (
						<div className={s.treeGroup} key={folder}>
							<div
								className={s.treeFolder}
								onClick={() => onToggleFolder(folder)}
							>
								<ChevronIcon open={open} />
								{folder}
							</div>
							{open && (
								<div className={s.treeFiles}>
									{groups[folder].map((f) => (
										<button
											type="button"
											key={f.id}
											className={cx(
												s.treeFile,
												activeId === f.id && s.treeFileActive,
											)}
											onClick={() => onSelectFile(f.id)}
										>
											<span className={s.treeFileIcon}>
												<DocIcon />
											</span>
											<span className={s.treeFileName}>{f.name}</span>
											<span className={s.treeFileMeta}>{f.size}</span>
										</button>
									))}
								</div>
							)}
						</div>
					);
				})}
				{folders.length === 0 && (
					<div className={s.treeEmpty}>Ничего не найдено</div>
				)}
			</div>
		</aside>
	);
};
