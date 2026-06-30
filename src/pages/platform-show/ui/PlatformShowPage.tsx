import { type FC, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "@/core/toast";
import {
	type DirListing,
	deleteDirectoryApi,
	deleteMarkdownApi,
	type File,
	type Folder,
	readDirectoryApi,
} from "@/entities/file-explorer";
import { usePlatformsStore } from "@/entities/platform";
import { type Service, usePlatformServices } from "@/entities/service";
import {
	actionFetchEnvironmentsPlatform,
	useEnvironmentsStore,
} from "@/features/environment";
import { actionFetchPlatform, usePlatformStore } from "@/features/platform";
import s from "@/pages/docs/ui/ApiExplorerPage.module.css";
import { Sidebar } from "@/pages/docs/ui/Sidebar";
import { FileGrid } from "@/pages/file-explorer/ui/FileGrid/FileGrid";
import { FolderGrid } from "@/pages/file-explorer/ui/FolderGrid/FolderGrid";
import { useNewMarkdownFile } from "@/pages/file-explorer/ui/useNewMarkdownFile";
import { Button, FileDropZone } from "@/shared/ui-kit/controls";
import { Modal, ModalBtnCancel, ModalBtnDanger } from "@/shared/ui-kit/modal";
import { Header } from "@/widgets/header";
import b from "./PlatformShowPage.module.css";
import { ServiceModal } from "./ServiceModal";

const EMPTY_LISTING: DirListing = { folders: [], files: [] };

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview: FC<{ id: string }> = ({ id }) => {
	const { platforms } = usePlatformsStore();
	const {
		services,
		isServicesLoading,
		createService,
		isCreatingService,
		updateService,
		isUpdatingService,
		deleteServiceAsync,
		isDeletingService,
	} = usePlatformServices(id);
	const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
	const [editingService, setEditingService] = useState<Service | null>(null);
	const [pendingDelete, setPendingDelete] = useState<Service | null>(null);
	const [svcMenu, setSvcMenu] = useState<{
		x: number;
		y: number;
		svc: Service;
	} | null>(null);
	const [listing, setListing] = useState<DirListing>(EMPTY_LISTING);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	/** Current folder inside the vault: a vault-relative path, "" for the root. */
	const [path, setPath] = useState("");
	const navigate = useNavigate();

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

	const { openMenu, element: newFileUi } = useNewMarkdownFile(
		path,
		reloadCurrent,
	);

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
			await deleteMarkdownApi(path ? `${path}/${file.name}` : file.name);
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
		const fileId = path ? `${path}/${file.name}` : file.name;
		navigate(`/markdown-show?file=${encodeURIComponent(fileId)}`);
	};

	/** Breadcrumb chain: root + each folder segment along the current path. */
	const crumbs: { name: string; id: string }[] = [{ name: "Файлы", id: "" }];
	{
		let prefix = "";
		for (const segment of path.split("/").filter(Boolean)) {
			prefix = prefix ? `${prefix}/${segment}` : segment;
			crumbs.push({ name: segment, id: prefix });
		}
	}

	const platform = platforms.find((p) => p.id === id);

	if (!platform) {
		return (
			<div className={s.overview}>
				<span className={s.ovEyebrow}>Platform</span>
				<h1 className={s.ovTitle}>Платформа не найдена</h1>
			</div>
		);
	}

	return (
		<div className={s.overview} onContextMenu={openMenu}>
			<section className={b.section}>
				<div className={b.sectionHead}>
					<h2 className={b.fileBrowserTitle}>
						Микросервисы
						{services.length > 0 && (
							<span className={b.titleCount}>{services.length}</span>
						)}
					</h2>
					<Button
						variant="subtle"
						size="sm"
						onClick={() => setIsServiceModalOpen(true)}
					>
						+ Добавить
					</Button>
				</div>
				{isServicesLoading ? (
					<p className={s.ovSub}>Загрузка микросервисов…</p>
				) : services.length === 0 ? (
					<div className={b.emptyState}>
						<p className={b.emptyText}>
							К этой платформе пока не прикреплён ни один микросервис
						</p>
						<Button
							variant="primary"
							size="sm"
							onClick={() => setIsServiceModalOpen(true)}
						>
							+ Добавить микросервис
						</Button>
					</div>
				) : (
					<div className={s.apiCardsGrid}>
						{services.map((svc) => (
							<button
								type="button"
								key={svc.id}
								className={`${s.apiCard} ${b.svcCard}`}
								onClick={() => navigate(`/service-show/${svc.id}`)}
								onContextMenu={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setSvcMenu({ x: e.clientX, y: e.clientY, svc });
								}}
							>
								<div className={s.acName}>{svc.name}</div>
								{svc.desc && <div className={s.acDesc}>{svc.desc}</div>}
							</button>
						))}
					</div>
				)}
			</section>

			<div className={b.fileBrowser}>
				<h2 className={b.fileBrowserTitle}>Файлы платформы</h2>
					{path !== "" && (
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
					<FileDropZone folder={path} onImported={reloadCurrent} />
				</div>

			<ServiceModal
				open={isServiceModalOpen || editingService != null}
				onOpenChange={(open) => {
					if (open) return;
					setIsServiceModalOpen(false);
					setEditingService(null);
				}}
				platformId={id}
				service={editingService}
				onCreate={(dto) =>
					createService(dto, { onSuccess: () => setIsServiceModalOpen(false) })
				}
				onUpdate={(dto) =>
					updateService(dto, { onSuccess: () => setEditingService(null) })
				}
				isSaving={editingService ? isUpdatingService : isCreatingService}
			/>

			{svcMenu && (
				<>
					<button
						type="button"
						className={b.svcMenuBackdrop}
						aria-label="Закрыть меню"
						onClick={() => setSvcMenu(null)}
						onContextMenu={(e) => {
							e.preventDefault();
							setSvcMenu(null);
						}}
					/>
					<div
						className={b.svcMenu}
						style={{ left: svcMenu.x, top: svcMenu.y }}
						role="menu"
					>
						<button
							type="button"
							className={b.svcMenuItem}
							role="menuitem"
							onClick={() => {
								setEditingService(svcMenu.svc);
								setSvcMenu(null);
							}}
						>
							<PencilIcon />
							Редактировать
						</button>
						<button
							type="button"
							className={b.svcMenuItem}
							role="menuitem"
							onClick={() => {
								setPendingDelete(svcMenu.svc);
								setSvcMenu(null);
							}}
						>
							<TrashIcon />
							Удалить микросервис
						</button>
					</div>
				</>
			)}

			{pendingDelete && (
				<Modal
					open
					onOpenChange={(open) =>
						!open && !isDeletingService && setPendingDelete(null)
					}
					title="Удалить микросервис?"
					actions={
						<>
							<ModalBtnCancel
								onClick={() => setPendingDelete(null)}
								disabled={isDeletingService}
							>
								Отмена
							</ModalBtnCancel>
							<ModalBtnDanger
								onClick={async () => {
									if (isDeletingService) return;
									try {
										await deleteServiceAsync(pendingDelete.id);
										setPendingDelete(null);
									} catch {
										/* error toast handled by the mutation */
									}
								}}
								disabled={isDeletingService}
							>
								{isDeletingService ? "Удаляем…" : "Удалить"}
							</ModalBtnDanger>
						</>
					}
				>
					<p className={s.ovSub} style={{ margin: 0 }}>
						Микросервис «{pendingDelete.name}» будет удалён без возможности
						восстановления.
					</p>
				</Modal>
			)}

			{newFileUi}
		</div>
	);
};

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
		<path d="M11.5 2.5a1.4 1.4 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5Z" />
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
export const PlatformShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();
	const fetchEnvironments = useEnvironmentsStore(
		actionFetchEnvironmentsPlatform,
	);
	const fetchPlatform = usePlatformStore(actionFetchPlatform);

	if (!id) return null;

	fetchEnvironments(id);
	fetchPlatform(id);

	return (
		<div className={s.wrapper}>
			<Header section="platform" activeLink="docs" />

			<div className={s.shell}>
				<Sidebar />
				<Overview id={id} />
			</div>
		</div>
	);
};
