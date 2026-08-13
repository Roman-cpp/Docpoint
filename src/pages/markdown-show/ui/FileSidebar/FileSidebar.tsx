import { type FC, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { type FileScope, scopeKey } from "@/entities/shared/file-scope";
import {
	type DirListing,
	EMPTY_LISTING,
	getDirectoryApi,
	isMarkdown,
	markdownRoute,
	parentPath,
	pathCrumbs,
} from "@/entities/vault";
import { cx } from "@/shared/lib/cx";
import { ChevronRightIcon, DocIcon, FolderIcon } from "@/shared/svg";
import s from "../MarkdownShowPage.module.css";

/* ═══════════════ SIDEBAR (left) ═══════════════
   Browsable file tree for the scope the open document belongs to: lists its
   .md files and lets the reader step into sub-folders. */
export const FileSidebar: FC<{
	scope: FileScope;
	/** Scope-relative path of the document on screen, if any. */
	activePath: string | null;
}> = ({ scope, activePath }) => {
	const navigate = useNavigate();
	/** Folder being browsed — scope-relative, "" for the scope root. */
	const [dir, setDir] = useState(() => parentPath(activePath ?? ""));
	const [listing, setListing] = useState<DirListing>(EMPTY_LISTING);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");

	const key = scopeKey(scope);

	// Follow the opened file into its own folder, so the sidebar always shows
	// the neighbours of the document on screen after a navigation.
	useEffect(() => {
		setDir(parentPath(activePath ?? ""));
	}, [activePath]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the scope's identity
	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		getDirectoryApi(scope, dir)
			.then((data) => {
				if (!cancelled) setListing(data);
			})
			.catch((err) => {
				if (cancelled) return;
				setListing(EMPTY_LISTING);
				setError(err instanceof Error ? err.message : String(err));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [key, dir]);

	const crumbs = useMemo(() => pathCrumbs(dir, "Файлы"), [dir]);

	const { folders, files } = useMemo(() => {
		const q = query.trim().toLowerCase();
		const match = (name: string) => !q || name.toLowerCase().includes(q);
		return {
			folders: listing.folders.filter((f) => match(f.name)),
			files: listing.files.filter((f) => isMarkdown(f.name) && match(f.name)),
		};
	}, [listing, query]);

	const isEmpty = folders.length === 0 && files.length === 0;

	return (
		<aside className={s.sidebar}>
			<nav className={s.sideCrumbs} aria-label="Путь">
				{crumbs.map((crumb, i) => (
					<span key={crumb.path} className={s.sideCrumbItem}>
						{i > 0 && <span className={s.sideCrumbSep}>/</span>}
						{i === crumbs.length - 1 ? (
							<span className={s.sideCrumbCur}>{crumb.name}</span>
						) : (
							<button
								type="button"
								className={s.sideCrumb}
								onClick={() => setDir(crumb.path)}
							>
								{crumb.name}
							</button>
						)}
					</span>
				))}
			</nav>

			<div className={s.sideList}>
				{error && <div className={s.sideEmpty}>{error}</div>}
				{!error && loading && <div className={s.sideEmpty}>Загрузка…</div>}
				{!error && !loading && isEmpty && (
					<div className={s.sideEmpty}>
						{query ? "Ничего не найдено" : "Каталог пуст"}
					</div>
				)}

				{!error &&
					!loading &&
					folders.map((folder) => (
						<button
							type="button"
							key={folder.path}
							className={s.sideRow}
							onClick={() => {
								setQuery("");
								setDir(folder.path);
							}}
						>
							<FolderIcon size={13} />
							<span className={s.sideRowName}>{folder.name}</span>
							<ChevronRightIcon size={11} />
						</button>
					))}

				{!error &&
					!loading &&
					files.map((file) => (
						<button
							type="button"
							key={file.path}
							className={cx(
								s.sideRow,
								file.path === activePath && s.sideRowActive,
							)}
							onClick={() => navigate(markdownRoute(scope, file.path))}
						>
							<DocIcon />
							<span className={s.sideRowName}>{file.name}</span>
						</button>
					))}
			</div>
		</aside>
	);
};
