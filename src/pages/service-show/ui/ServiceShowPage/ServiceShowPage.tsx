import { useQueryClient } from "@tanstack/react-query";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { type FC, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "@/core/toast";
import { type Doc, type UpdateDocDTO, useDocsStore } from "@/entities/doc-api";
import { useServiceErds } from "@/entities/doc-erd";
import {
	type DirListing,
	deleteDirectoryApi,
	type File,
	type Folder,
	readDirectoryApi,
} from "@/entities/file-explorer";
import { deleteMarkdownApi } from "@/entities/markdown";
import { useAllServices, useAttachDoc } from "@/entities/service";
import { useServiceWebsockets } from "@/entities/websocket";
import {
	EditDocApiModal,
	exportDoc,
	type ImportDocPayload,
	useImportExportDoc,
} from "@/features/doc-api";
import { CreateDocApiModal } from "@/features/doc-api/create-doc-api";
import { useNewMarkdownFile } from "@/features/markdown";
import { serviceDocsKeys, useServiceDocs } from "@/features/service";
import s from "@/pages/docs/ui/ApiExplorerPage.module.css";
import b from "@/pages/platform-show/ui/PlatformShowPage/PlatformShowPage.module.css";
import { Button } from "@/shared/ui-kit/controls";
import { ContextMenu, Dialog } from "@/shared/ui-kit/modal";
import { FileGrid, FolderGrid } from "@/widgets/file-explorer";
import { Header } from "@/widgets/header";
import { SidebarPlatform } from "@/widgets/sidebar";
import { CreateErdModal } from "../CreateErdModal";
import { CreateWebsocketModal } from "../CreateWebsocketModal";

const EMPTY_LISTING: DirListing = { folders: [], files: [] };

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview: FC<{ id: string }> = ({ id }) => {
	const { services, isServicesLoading } = useAllServices();
	const { docs, isDocsLoading } = useServiceDocs(id);
	const { erds, isErdsLoading, createErdAsync, isCreatingErd } =
		useServiceErds(id);
	const {
		websockets,
		isWebsocketsLoading,
		createWebsocketAsync,
		isCreatingWebsocket,
	} = useServiceWebsockets(id);
	const {
		createDocAsync,
		deleteDocAsync,
		isCreating,
		isDeleting,
		isUpdating,
		updateDocAsync,
	} = useDocsStore();
	const { importDocAsync, isImporting } = useImportExportDoc();
	const { attachDocAsync, isAttaching } = useAttachDoc();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [docMenu, setDocMenu] = useState<{
		x: number;
		y: number;
		doc: Doc;
	} | null>(null);
	const [pendingDelete, setPendingDelete] = useState<Doc | null>(null);
	const [pendingEdit, setPendingEdit] = useState<Doc | null>(null);
	const [erdModalOpen, setErdModalOpen] = useState(false);
	const [docModalOpen, setDocModalOpen] = useState(false);
	const [wsModalOpen, setWsModalOpen] = useState(false);
	const importInputRef = useRef<HTMLInputElement>(null);

	/** Read a previously exported doc JSON, import it, and immediately attach the
	 *  new doc to this microservice so it appears under "Прикреплённые документы". */
	const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		// Reset the input so picking the same file again still fires onChange.
		e.target.value = "";
		if (!file) return;
		try {
			const payload = JSON.parse(await file.text()) as ImportDocPayload;
			const docId = await importDocAsync(payload);
			await attachDocAsync({ serviceId: id, docId });
			queryClient.invalidateQueries({
				queryKey: serviceDocsKeys.byService(id),
			});
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось импортировать документ",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	/** Export a doc to JSON, in the same format handleImportFile accepts. */
	const handleExportDoc = async (doc: Doc) => {
		try {
			await exportDoc(doc.id, doc.name);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось экспортировать документ",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	/** Vault folder holding this microservice's files. */
	const baseDir = `services/${id}`;
	const [listing, setListing] = useState<DirListing>(EMPTY_LISTING);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	/** Current folder: a vault-relative path, always under `baseDir`. */
	const [path, setPath] = useState(baseDir);

	useEffect(() => {
		let cancelled = false;
		readDirectoryApi(path)
			.then((data) => {
				if (!cancelled) setListing(data);
			})
			.catch(() => {
				if (!cancelled) setListing(EMPTY_LISTING);
			});
		return () => {
			cancelled = true;
		};
	}, [path]);

	/** Re-read the current folder after a mutation (e.g. creating a file). */
	const reloadCurrent = () => {
		readDirectoryApi(path)
			.then(setListing)
			.catch(() => setListing(EMPTY_LISTING));
	};

	const {
		openMenu,
		openCreateFile,
		element: newFileUi,
	} = useNewMarkdownFile(path, reloadCurrent);

	/** Open a doc in a separate native window. Reuses/focuses an existing
	 *  window for the same doc instead of erroring on the duplicate label. */
	const openDocInNewWindow = async (doc: Doc) => {
		const label = `doc-show-${doc.id}`;
		const existing = await WebviewWindow.getByLabel(label);
		if (existing) {
			await existing.setFocus();
			return;
		}
		const win = new WebviewWindow(label, {
			url: `/doc-show/${doc.id}`,
			title: doc.name,
			width: 1100,
			height: 760,
		});
		win.once("tauri://error", (e) => {
			toast({
				variant: "error",
				title: "Не удалось открыть окно",
				description: String(e.payload),
			});
		});
	};

	const openFolder = (folderId: string) => {
		setSelectedFile(null);
		setPath(folderId);
	};

	const deleteFolder = async (folder: Folder) => {
		try {
			await deleteDirectoryApi(folder.id);
			reloadCurrent();
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось удалить каталог",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const deleteFile = async (file: File) => {
		try {
			await deleteMarkdownApi(`${path}/${file.name}`);
			if (selectedFile?.name === file.name) setSelectedFile(null);
			reloadCurrent();
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось удалить файл",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	/** Double-click a file: `.md` files open in the markdown viewer. */
	const openFile = (file: File) => {
		if (!file.name.toLowerCase().endsWith(".md")) return;
		const fileId = `${path}/${file.name}`;
		navigate(`/markdown-show?file=${encodeURIComponent(fileId)}`);
	};

	/** Breadcrumb chain relative to the service root (the `baseDir` prefix is
	 *  hidden from the user). */
	const crumbs: { name: string; id: string }[] = [
		{ name: "Файлы", id: baseDir },
	];
	{
		const rel = path === baseDir ? "" : path.slice(baseDir.length + 1);
		let prefix = baseDir;
		for (const segment of rel.split("/").filter(Boolean)) {
			prefix = `${prefix}/${segment}`;
			crumbs.push({ name: segment, id: prefix });
		}
	}

	const service = services.find((svc) => svc.id === id);

	if (isServicesLoading && !service) {
		return (
			<div className={s.overview}>
				<p className={s.ovSub}>Загрузка микросервиса…</p>
			</div>
		);
	}

	if (!service) {
		return (
			<div className={s.overview}>
				<span className={s.ovEyebrow}>Microservice</span>
				<h1 className={s.ovTitle}>Микросервис не найден</h1>
			</div>
		);
	}

	return (
		<div className={s.overview}>
			{service.platform_id && (
				<Link className={s.ovSub} to={`/platform-show/${service.platform_id}`}>
					← К платформе
				</Link>
			)}

			<div style={{ marginTop: 24 }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 16,
					}}
				>
					<h2 className={s.ovTitle} style={{ fontSize: 18, margin: 0 }}>
						Прикреплённые документы
					</h2>
					<div style={{ display: "flex", gap: 8 }}>
						<Button
							variant="subtle"
							disabled={isImporting || isAttaching}
							onClick={() => importInputRef.current?.click()}
						>
							{isImporting ? "Импорт…" : "↓ Импортировать"}
						</Button>
						<Button variant="subtle" onClick={() => setDocModalOpen(true)}>
							+ Создать документ
						</Button>
					</div>
					<input
						ref={importInputRef}
						type="file"
						accept="application/json,.json"
						style={{ display: "none" }}
						onChange={handleImportFile}
					/>
				</div>
				{isDocsLoading ? (
					<p className={s.ovSub}>Загрузка документов…</p>
				) : docs.length === 0 ? (
					<p className={s.ovSub}>
						К этому микросервису пока не прикреплён ни один документ
					</p>
				) : (
					<div className={s.apiCardsGrid}>
						{docs.map((doc) => (
							<Link
								to={`/doc-show/${doc.id}`}
								key={doc.id}
								className={s.apiCard}
								// Carry the originating service so the doc page can offer a
								// "back to service" link.
								state={{ serviceId: id, serviceName: service.name }}
								onContextMenu={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setDocMenu({ x: e.clientX, y: e.clientY, doc });
								}}
							>
								<div className={s.acAccent} />
								<div className={s.acTop}>
									<div className={s.acName}>{doc.name}</div>
								</div>
								<div className={s.acDesc}>{doc.desc}</div>
								<div className={s.acFooter}>
									<span className={s.acTag}>doc</span>
									{doc.tags.map((t) => (
										<span key={t} className={s.acTag}>
											{t}
										</span>
									))}
								</div>
							</Link>
						))}
					</div>
				)}
			</div>

			<div style={{ marginTop: 32 }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 16,
					}}
				>
					<h2 className={s.ovTitle} style={{ fontSize: 18, margin: 0 }}>
						ERD-диаграммы
					</h2>
					<Button variant="subtle" onClick={() => setErdModalOpen(true)}>
						+ Создать ERD
					</Button>
				</div>
				{isErdsLoading ? (
					<p className={s.ovSub}>Загрузка диаграмм…</p>
				) : erds.length === 0 ? (
					<p className={s.ovSub}>
						К этому микросервису пока не прикреплена ни одна ERD-диаграмма
					</p>
				) : (
					<div className={s.apiCardsGrid}>
						{erds.map((erd) => (
							<Link
								to={`/doc-erd-show/${erd.id}`}
								key={erd.id}
								className={s.apiCard}
								// Carry the originating service so the ERD page can offer a
								// "back to service" link.
								state={{ serviceId: id, serviceName: service.name }}
							>
								<div className={s.acAccent} />
								<div className={s.acTop}>
									<div className={s.acName}>{erd.name}</div>
								</div>
								<div className={s.acDesc}>{erd.desc}</div>
								<div className={s.acFooter}>
									<span className={s.acTag}>erd</span>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>

			<div style={{ marginTop: 32 }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 16,
					}}
				>
					<h2 className={s.ovTitle} style={{ fontSize: 18, margin: 0 }}>
						Прикреплённые WebSocket
					</h2>
					<Button variant="subtle" onClick={() => setWsModalOpen(true)}>
						+ Создать WS
					</Button>
				</div>
				{isWebsocketsLoading ? (
					<p className={s.ovSub}>Загрузка WebSocket…</p>
				) : websockets.length === 0 ? (
					<p className={s.ovSub}>
						К этому микросервису пока не прикреплён ни один WebSocket
					</p>
				) : (
					<div className={s.apiCardsGrid}>
						{websockets.map((ws) => (
							<Link
								to="/websocket"
								key={ws.id}
								className={s.apiCard}
								// Carry the socket's id and URL so the tester page can prefill
								// the connection and load its saved example messages.
								state={{ id: ws.id, url: ws.url, name: ws.name }}
							>
								<div className={s.acAccent} />
								<div className={s.acTop}>
									<div className={s.acName}>{ws.name}</div>
								</div>
								<div className={s.acDesc}>{ws.desc || ws.url}</div>
								<div className={s.acFooter}>
									<span className={s.acTag}>ws</span>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>

			<div
				className={b.fileBrowser}
				style={{ marginTop: 32 }}
				onContextMenu={openMenu}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 16,
					}}
				>
					<h2 className={s.ovTitle} style={{ fontSize: 18, margin: 0 }}>
						ERD-диаграммы
					</h2>
					<Button variant="subtle" onClick={openCreateFile}>
						+ Создать MD
					</Button>
				</div>
				{path !== baseDir && (
					<nav className={b.crumbs} aria-label="Путь">
						{crumbs.map((c, i) => (
							<span key={c.id} className={b.crumbItem}>
								{i > 0 && <span className={b.crumbSep}>/</span>}
								{i === crumbs.length - 1 ? (
									<span className={b.crumbCurrent}>{c.name}</span>
								) : (
									<button
										type="button"
										className={b.crumb}
										onClick={() => openFolder(c.id)}
									>
										{c.name}
									</button>
								)}
							</span>
						))}
					</nav>
				)}
				<FolderGrid
					folders={listing.folders}
					onOpen={openFolder}
					onDelete={deleteFolder}
				/>
				<FileGrid
					files={listing.files}
					selectedId={selectedFile?.name ?? null}
					onSelect={setSelectedFile}
					onOpen={openFile}
					onDelete={deleteFile}
				/>
			</div>

			<CreateDocApiModal
				open={docModalOpen}
				onOpenChange={setDocModalOpen}
				isCreating={isCreating || isAttaching}
				onCreate={async (dto) => {
					try {
						// Create the doc, then attach it to this microservice so it
						// shows up under "Прикреплённые документы" right away.
						const docId = await createDocAsync(dto);
						await attachDocAsync({ serviceId: id, docId });
						queryClient.invalidateQueries({
							queryKey: serviceDocsKeys.byService(id),
						});
						setDocModalOpen(false);
					} catch {
						/* error toast handled by the mutation */
					}
				}}
			/>

			<CreateErdModal
				open={erdModalOpen}
				onOpenChange={setErdModalOpen}
				isSaving={isCreatingErd}
				onCreate={async ({ name, desc }) => {
					try {
						await createErdAsync({ name, desc, service_id: id });
						setErdModalOpen(false);
					} catch {
						/* error toast handled by the mutation */
					}
				}}
			/>

			<CreateWebsocketModal
				open={wsModalOpen}
				onOpenChange={setWsModalOpen}
				isSaving={isCreatingWebsocket}
				onCreate={async ({ name, desc, url }) => {
					try {
						await createWebsocketAsync({ name, desc, url, service_id: id });
						setWsModalOpen(false);
					} catch {
						/* error toast handled by the mutation */
					}
				}}
			/>

			<ContextMenu.Root
				open={!!docMenu}
				x={docMenu?.x ?? 0}
				y={docMenu?.y ?? 0}
				onClose={() => setDocMenu(null)}
			>
				<ContextMenu.Item
					icon={<EyeIcon />}
					onSelect={() => {
						if (!docMenu) return;
						navigate(`/doc-show/${docMenu.doc.id}`, {
							state: { serviceId: id, serviceName: service.name },
						});
					}}
				>
					Открыть
				</ContextMenu.Item>

				<ContextMenu.Item
					icon={<NewWindowIcon />}
					onSelect={() => docMenu && openDocInNewWindow(docMenu.doc)}
				>
					Открыть в новом окне
				</ContextMenu.Item>

				<ContextMenu.Item
					icon={<PencilIcon />}
					onSelect={() => docMenu && setPendingEdit(docMenu.doc)}
				>
					Редактировать
				</ContextMenu.Item>

				<ContextMenu.Item
					icon={<DownloadIcon />}
					onSelect={() => docMenu && handleExportDoc(docMenu.doc)}
				>
					Экспортировать
				</ContextMenu.Item>

				<ContextMenu.Separator />

				<ContextMenu.Item
					danger
					icon={<TrashIcon />}
					onSelect={() => docMenu && setPendingDelete(docMenu.doc)}
				>
					Удалить документ
				</ContextMenu.Item>
			</ContextMenu.Root>

			{pendingEdit && (
				<EditDocApiModal
					open
					onOpenChange={(open) => !open && !isUpdating && setPendingEdit(null)}
					doc={pendingEdit}
					isSaving={isUpdating}
					onSave={async (updates: UpdateDocDTO) => {
						try {
							await updateDocAsync(updates);

							queryClient.invalidateQueries({
								queryKey: serviceDocsKeys.byService(id),
							});

							setPendingEdit(null);
						} catch {
							/* error toast handled by the mutation */
						}
					}}
				/>
			)}

			{pendingDelete && (
				<Dialog.Root
					open
					onOpenChange={(open) =>
						!open && !isDeleting && setPendingDelete(null)
					}
				>
					<Dialog.Header>
						<Dialog.Title>Удалить документ?</Dialog.Title>
						<Dialog.Close />
					</Dialog.Header>
					<Dialog.Body>
						<p className={s.ovSub} style={{ margin: 0 }}>
							Документ «{pendingDelete.name}» будет удалён без возможности
							восстановления.
						</p>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.BtnCancel
							onClick={() => setPendingDelete(null)}
							disabled={isDeleting}
						>
							Отмена
						</Dialog.BtnCancel>
						<Dialog.BtnDanger
							onClick={async () => {
								if (isDeleting) return;
								try {
									await deleteDocAsync(pendingDelete.id);
									queryClient.invalidateQueries({
										queryKey: serviceDocsKeys.byService(id),
									});
									setPendingDelete(null);
								} catch {
									/* error toast handled by the mutation */
								}
							}}
							disabled={isDeleting}
						>
							{isDeleting ? "Удаляем…" : "Удалить"}
						</Dialog.BtnDanger>
					</Dialog.Footer>
				</Dialog.Root>
			)}

			{newFileUi}
		</div>
	);
};

const EyeIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>open</title>
		<path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z" />
		<circle cx="8" cy="8" r="2" />
	</svg>
);

const NewWindowIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>open in new window</title>
		<path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5" />
		<path d="M12 9.5v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3" />
	</svg>
);

const PencilIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>edit</title>

		<path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5Z" />
	</svg>
);

const DownloadIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>export</title>
		<path d="M8 1.5v8.5M4.5 6.5 8 10l3.5-3.5" />
		<path d="M2.5 12.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
	</svg>
);

const TrashIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>delete</title>
		<path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1L11 4M6.5 7v4M9.5 7v4" />
	</svg>
);

/* ═══════════════ MAIN PAGE ═══════════════ */
export const ServiceShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();

	if (!id) return null;

	return (
		<div className={s.wrapper}>
			<Header section="platform" activeLink="docs" />

			<div className={s.shell}>
				<SidebarPlatform />
				<Overview id={id} />
			</div>
		</div>
	);
};
