import { type FC, useMemo, useState } from "react";
import { cx } from "@/shared/lib/cx";
import { Header } from "@/widgets/header";
import s from "./FileExplorerPage.module.css";

/* ─── Types (template-local; no API yet) ─── */
type FileKind = "doc" | "archive" | "image" | "code" | "video" | "generic";

interface FolderNode {
	id: string;
	type: "folder";
	name: string;
	children: FsNode[];
}

interface FileNode {
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

type FsNode = FolderNode | FileNode;

/* ─── Mock data ─── */
const photos = (n: number): FileNode[] =>
	Array.from({ length: n }, (_, i) => ({
		id: `ph-${i + 1}`,
		type: "file",
		name: `photo_2026-03-${String(i + 1).padStart(2, "0")}.png`,
		kind: "image",
		size: (140 + i * 11) * 1024,
		shared: i % 3 === 0,
	}));

const ROOT: FolderNode = {
	id: "root",
	type: "folder",
	name: "Главная",
	children: [
		{
			id: "f-docs",
			type: "folder",
			name: "Документы",
			children: [
				{
					id: "f-contracts",
					type: "folder",
					name: "Контракты",
					children: [
						{
							id: "d-nda",
							type: "file",
							name: "NDA-2026.pdf",
							kind: "doc",
							size: 88 * 1024,
							shared: false,
						},
						{
							id: "d-msa",
							type: "file",
							name: "MSA-acme.pdf",
							kind: "doc",
							size: 204 * 1024,
							shared: true,
						},
						{
							id: "d-sow",
							type: "file",
							name: "SOW-q2.pdf",
							kind: "doc",
							size: 51 * 1024,
							shared: false,
						},
					],
				},
				{
					id: "d-requests",
					type: "file",
					name: "requests-standalone.json",
					kind: "doc",
					size: 126 * 1024,
					shared: true,
					preview:
						'{\n  "name": "requests-standalone",\n  "version": "1.4.0",\n  "endpoints": 42,\n  "auth": "bearer"\n}',
				},
				{
					id: "d-sleipnir",
					type: "file",
					name: "Sleipnir_Central_Repository.json",
					kind: "doc",
					size: 143 * 1024,
					shared: true,
					preview:
						'{\n  "repository": "sleipnir-central",\n  "services": 12,\n  "updated": "2026-03-14"\n}',
				},
				{
					id: "d-schemas",
					type: "file",
					name: "API Schemas.html",
					kind: "code",
					size: 41 * 1024,
					shared: true,
					preview:
						"<!doctype html>\n<title>API Schemas</title>\n<h1>Schemas</h1>\n<ul>\n  <li>User</li>\n  <li>Order</li>\n</ul>",
				},
				{
					id: "d-notes",
					type: "file",
					name: "notes.md",
					kind: "doc",
					size: 6 * 1024,
					shared: false,
					preview:
						"# Заметки\n\n- Обновить схемы\n- Согласовать контракты\n- Проверить импорт",
				},
			],
		},
		{
			id: "f-photos",
			type: "folder",
			name: "Фотографии",
			children: photos(12),
		},
		{
			id: "f-video",
			type: "folder",
			name: "Видео",
			children: [
				{
					id: "v-demo",
					type: "file",
					name: "demo-walkthrough.mp4",
					kind: "video",
					size: 18 * 1024 * 1024,
					shared: true,
				},
				{
					id: "v-onboard",
					type: "file",
					name: "onboarding.mp4",
					kind: "video",
					size: 42 * 1024 * 1024,
					shared: false,
				},
				{
					id: "v-release",
					type: "file",
					name: "release-2026-03.mov",
					kind: "video",
					size: 73 * 1024 * 1024,
					shared: false,
				},
			],
		},
		{
			id: "r-docker",
			type: "file",
			name: "docker.zip",
			kind: "archive",
			size: 7 * 1024,
			shared: true,
		},
		{
			id: "r-photo",
			type: "file",
			name: "photo_2026-03-14.png",
			kind: "image",
			size: 235 * 1024,
			shared: true,
		},
	],
};

/* ─── Helpers ─── */
/** 129024 → "126 КБ" (binary, ru locale). */
function formatSize(bytes: number): string {
	const units = ["Б", "КБ", "МБ", "ГБ"];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const rounded =
		value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
	return `${rounded.toLocaleString("ru-RU")} ${units[unit]}`;
}

const KIND_LABEL: Record<FileKind, string> = {
	doc: "Документ",
	code: "Код",
	archive: "Архив",
	image: "Изображение",
	video: "Видео",
	generic: "Файл",
};

/** Resolve the folder addressed by a path of folder ids (from ROOT). */
function resolveFolder(path: string[]): FolderNode {
	let node: FolderNode = ROOT;
	for (const id of path) {
		const next = node.children.find(
			(c): c is FolderNode => c.type === "folder" && c.id === id,
		);
		if (!next) break;
		node = next;
	}
	return node;
}

/* ─── Page ─── */
export const FileExplorerPage: FC = () => {
	const [path, setPath] = useState<string[]>([]);
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<FileNode | null>(null);

	const current = useMemo(() => resolveFolder(path), [path]);

	/** Breadcrumb chain: Главная + each folder along the path. */
	const crumbs = useMemo(() => {
		const chain: { name: string; depth: number }[] = [
			{ name: "Главная", depth: 0 },
		];
		let node: FolderNode = ROOT;
		path.forEach((id, i) => {
			const next = node.children.find(
				(c): c is FolderNode => c.type === "folder" && c.id === id,
			);
			if (next) {
				chain.push({ name: next.name, depth: i + 1 });
				node = next;
			}
		});
		return chain;
	}, [path]);

	const { folders, files } = useMemo(() => {
		const q = search.trim().toLowerCase();
		const match = (n: FsNode) => !q || n.name.toLowerCase().includes(q);
		return {
			folders: current.children.filter(
				(c): c is FolderNode => c.type === "folder" && match(c),
			),
			files: current.children.filter(
				(c): c is FileNode => c.type === "file" && match(c),
			),
		};
	}, [current, search]);

	const openFolder = (id: string) => {
		setSelected(null);
		setSearch("");
		setPath((p) => [...p, id]);
	};

	const goTo = (depth: number) => {
		setSelected(null);
		setSearch("");
		setPath((p) => p.slice(0, depth));
	};

	const isEmpty = folders.length === 0 && files.length === 0;

	return (
		<div className={s["fe-frame"]}>
			<Header section="Файлы" activeLink="file-explorer" />

			<main className={s["fe-page"]}>
				<div className={s["fe-page-inner"]}>
					{/* Toolbar */}
					<div className={s["fe-toolbar"]}>
						<div className={s["fe-toolbar-head"]}>
							<nav className={s["fe-crumbs"]} aria-label="Путь">
								{crumbs.map((c, i) => (
									<span key={c.depth} className={s["fe-crumb-item"]}>
										{i > 0 && <span className={s["fe-crumb-sep"]}>/</span>}
										{i === crumbs.length - 1 ? (
											<span className={s["fe-crumb-current"]}>{c.name}</span>
										) : (
											<button
												type="button"
												className={s["fe-crumb"]}
												onClick={() => goTo(c.depth)}
											>
												{c.name}
											</button>
										)}
									</span>
								))}
							</nav>
							<p className={s["fe-subtitle"]}>
								Каталоги и файлы рабочего пространства. Откройте каталог, чтобы
								перейти внутрь, или файл — чтобы посмотреть его данные.
							</p>
						</div>

						<label className={s["fe-search"]}>
							<SearchIcon />
							<input
								type="text"
								placeholder="Поиск в этом каталоге…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</label>
					</div>

					{isEmpty && (
						<div className={s["fe-empty"]}>
							{search ? "Ничего не найдено" : "Каталог пуст"}
						</div>
					)}

					{/* Folders */}
					{folders.length > 0 && (
						<section className={s["fe-section"]}>
							<h2 className={s["fe-section-title"]}>Каталоги</h2>
							<div className={s["fe-grid"]}>
								{folders.map((folder) => (
									<button
										key={folder.id}
										type="button"
										className={s["fe-card"]}
										onClick={() => openFolder(folder.id)}
									>
										<span className={cx(s["fe-tile"], s["fe-tile-folder"])}>
											<FolderIcon />
										</span>
										<span className={s["fe-card-name"]}>{folder.name}</span>
										<span className={s["fe-card-meta"]}>
											{folder.children.length} эл.
										</span>
									</button>
								))}
							</div>
						</section>
					)}

					{/* Files */}
					{files.length > 0 && (
						<section className={s["fe-section"]}>
							<h2 className={s["fe-section-title"]}>Файлы</h2>
							<div className={s["fe-grid"]}>
								{files.map((file) => (
									<button
										key={file.id}
										type="button"
										className={cx(
											s["fe-card"],
											selected?.id === file.id && s["fe-card-active"],
										)}
										onClick={() => setSelected(file)}
									>
										<span
											className={cx(s["fe-tile"], s[`fe-tile-${file.kind}`])}
										>
											<FileIcon kind={file.kind} />
										</span>
										<span className={s["fe-card-name"]} title={file.name}>
											{file.name}
										</span>
										<span className={s["fe-card-meta"]}>
											{formatSize(file.size)}
										</span>
										{file.shared && (
											<span className={s["fe-badge"]}>Общий</span>
										)}
									</button>
								))}
							</div>
						</section>
					)}
				</div>
			</main>

			{selected && (
				<FileDrawer file={selected} onClose={() => setSelected(null)} />
			)}
		</div>
	);
};

/* ─── File detail / preview drawer ─── */
const FileDrawer: FC<{ file: FileNode; onClose: () => void }> = ({
	file,
	onClose,
}) => (
	<>
		<button
			type="button"
			className={s["fe-backdrop"]}
			aria-label="Закрыть"
			onClick={onClose}
		/>
		<aside className={s["fe-drawer"]}>
			<div className={s["fe-drawer-head"]}>
				<span className={cx(s["fe-tile"], s[`fe-tile-${file.kind}`])}>
					<FileIcon kind={file.kind} />
				</span>
				<div className={s["fe-drawer-titles"]}>
					<h3 className={s["fe-drawer-name"]} title={file.name}>
						{file.name}
					</h3>
					<span className={s["fe-drawer-kind"]}>{KIND_LABEL[file.kind]}</span>
				</div>
				<button
					type="button"
					className={s["fe-drawer-close"]}
					onClick={onClose}
				>
					<CloseIcon />
				</button>
			</div>

			<dl className={s["fe-meta"]}>
				<div className={s["fe-meta-row"]}>
					<dt>Размер</dt>
					<dd>{formatSize(file.size)}</dd>
				</div>
				<div className={s["fe-meta-row"]}>
					<dt>Доступ</dt>
					<dd>{file.shared ? "Общий" : "Личный"}</dd>
				</div>
				<div className={s["fe-meta-row"]}>
					<dt>Тип</dt>
					<dd>{KIND_LABEL[file.kind]}</dd>
				</div>
			</dl>

			<div className={s["fe-preview"]}>
				<span className={s["fe-preview-label"]}>Просмотр</span>
				{file.kind === "image" ? (
					<div className={s["fe-preview-image"]}>
						<FileIcon kind="image" />
						<span>Предпросмотр изображения</span>
					</div>
				) : file.kind === "video" ? (
					<div className={s["fe-preview-image"]}>
						<FileIcon kind="video" />
						<span>Предпросмотр видео</span>
					</div>
				) : file.preview ? (
					<pre className={s["fe-preview-code"]}>{file.preview}</pre>
				) : (
					<div className={s["fe-preview-empty"]}>
						Предпросмотр для этого типа недоступен
					</div>
				)}
			</div>
		</aside>
	</>
);

/* ─── Icons ─── */
const SearchIcon: FC = () => (
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

const CloseIcon: FC = () => (
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

const FolderIcon: FC = () => (
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

const FileIcon: FC<{ kind: FileKind }> = ({ kind }) => {
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
