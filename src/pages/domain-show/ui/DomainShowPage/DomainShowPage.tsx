import { useQueryClient } from "@tanstack/react-query";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { type FC, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "@/core/toast";
import { type Doc, type UpdateDocDTO, useDocsStore } from "@/entities/doc-api";
import { useDomainErds } from "@/entities/doc-erd";
import { useAllDomains, useAttachDoc } from "@/entities/domain";
import { domainScope } from "@/entities/shared/file-scope";
import { markdownRoute } from "@/entities/vault";
import type { DocWebsocket } from "@/entities/websocket";
import { useDomainWebsockets } from "@/entities/websocket";
import {
	EditDocApiModal,
	exportDoc,
	type ImportDocPayload,
	useImportExportDoc,
} from "@/features/doc-api";
import { CreateDocApiModal } from "@/features/doc-api/create-doc-api";
import { domainDocsKeys, useDomainDocs } from "@/features/domain";
import {
	type ImportWebsocketPayload,
	parseWebsocketImport,
	useImportWebsocket,
} from "@/features/websocket";
import {
	DownloadIcon,
	EyeIcon,
	NewWindowIcon,
	PencilIcon,
	PlusIcon,
	TrashIcon,
	UploadIcon,
} from "@/shared/svg";
import { ContextMenu, Dialog } from "@/shared/ui-kit/modal";
import { Header } from "@/widgets/header";
import { SidebarPlatform } from "@/widgets/sidebar";
import { VaultBrowser } from "@/widgets/vault-browser";
import { CreateErdModal } from "../CreateErdModal";
import { CreateWebsocketModal } from "../CreateWebsocketModal";
import { EditWebsocketModal } from "../EditWebsocketModal";
import s from "./DomainShowPage.module.css";

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview: FC<{ id: string }> = ({ id }) => {
	const { domains, isDomainsLoading } = useAllDomains();
	const { docs, isDocsLoading } = useDomainDocs(id);
	const { erds, isErdsLoading, createErdAsync, isCreatingErd } =
		useDomainErds(id);
	const {
		websockets,
		isWebsocketsLoading,
		createWebsocketAsync,
		isCreatingWebsocket,
		updateWebsocketAsync,
		isUpdatingWebsocket,
	} = useDomainWebsockets(id);
	const {
		createDocAsync,
		deleteDocAsync,
		isCreating,
		isDeleting,
		isUpdating,
		updateDocAsync,
	} = useDocsStore();
	const { importDocAsync, isImporting } = useImportExportDoc();
	const { importWebsocket, isImportingWebsocket } = useImportWebsocket(id);
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
	const [wsMenu, setWsMenu] = useState<{
		x: number;
		y: number;
		ws: DocWebsocket;
	} | null>(null);
	const [pendingWsEdit, setPendingWsEdit] = useState<DocWebsocket | null>(null);
	/** Меню создания/импорта: открывается правым кликом по свободной области. */
	const [pageMenu, setPageMenu] = useState<{ x: number; y: number } | null>(
		null,
	);
	const importInputRef = useRef<HTMLInputElement>(null);
	const wsImportInputRef = useRef<HTMLInputElement>(null);
	/** Действие «новый markdown-файл» из VaultBrowser: виджет отдаёт его только
	 *  через renderHeader, а вызвать нужно из меню страницы. */
	const createVaultFileRef = useRef<(() => void) | null>(null);

	/** Правый клик по свободной области открывает меню создания и импорта.
	 *  Карточки гасят событие сами, а VaultBrowser сначала показывает своё меню
	 *  и помечает событие как обработанное — второе меню поверх не нужно. */
	const openPageMenu = (e: React.MouseEvent) => {
		if (e.defaultPrevented) return;
		e.preventDefault();
		setPageMenu({ x: e.clientX, y: e.clientY });
	};

	/** Read a previously exported doc JSON, import it, and immediately attach the
	 *  new doc to this domain so it appears under "Прикреплённые документы". */
	const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		// Reset the input so picking the same file again still fires onChange.
		e.target.value = "";
		if (!file) return;
		try {
			const payload = JSON.parse(await file.text()) as ImportDocPayload;
			const docId = await importDocAsync(payload);
			await attachDocAsync({ domainId: id, docId });
			queryClient.invalidateQueries({
				queryKey: domainDocsKeys.byDomain(id),
			});
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось импортировать документ",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	/** Читает файл WS-дока, создаёт сокет в этом домене и заливает в него
	 *  примеры сообщений. Разбор файла отделён от мутации: свои ошибки он
	 *  объясняет сам, а мутация показывает свои. */
	const handleImportWsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		// Reset the input so picking the same file again still fires onChange.
		e.target.value = "";
		if (!file) return;

		let payload: ImportWebsocketPayload;
		try {
			payload = parseWebsocketImport(await file.text());
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось прочитать файл",
				description: err instanceof Error ? err.message : String(err),
			});
			return;
		}

		importWebsocket(payload);
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

	const domain = domains.find((dom) => dom.id === id);

	if (isDomainsLoading && !domain) {
		return (
			<div className={s.overview}>
				<p className={s.ovSub}>Загрузка домена…</p>
			</div>
		);
	}

	if (!domain) {
		return (
			<div className={s.overview}>
				<span className={s.ovEyebrow}>Domain</span>
				<h1 className={s.ovTitle}>Домен не найден</h1>
			</div>
		);
	}

	return (
		<div className={s.overview} onContextMenu={openPageMenu}>
			<Link className={s.ovSub} to={`/platform-show/${domain.platformId}`}>
				← К платформе
			</Link>
			<p className={s.ovSub} style={{ marginTop: 6, fontSize: 12 }}>
				Правый клик по свободной области — создание и импорт
			</p>

			<div style={{ marginTop: 24 }}>
				<h2 className={s.ovTitle} style={{ fontSize: 18, margin: "0 0 16px" }}>
					Прикреплённые документы
				</h2>
				{isDocsLoading ? (
					<p className={s.ovSub}>Загрузка документов…</p>
				) : docs.length === 0 ? (
					<p className={s.ovSub}>
						К этому домену пока не прикреплён ни один документ — нажмите правой
						кнопкой мыши, чтобы создать или импортировать
					</p>
				) : (
					<div className={s.apiCardsGrid}>
						{docs.map((doc) => (
							<Link
								to={`/doc-show/${doc.id}`}
								key={doc.id}
								className={s.apiCard}
								// Carry the originating domain so the doc page can offer a
								// "back to domain" link.
								state={{ domainId: id, domainName: domain.name }}
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
				<h2 className={s.ovTitle} style={{ fontSize: 18, margin: "0 0 16px" }}>
					ERD-диаграммы
				</h2>
				{isErdsLoading ? (
					<p className={s.ovSub}>Загрузка диаграмм…</p>
				) : erds.length === 0 ? (
					<p className={s.ovSub}>
						К этому домену пока не прикреплена ни одна ERD-диаграмма — нажмите
						правой кнопкой мыши, чтобы создать
					</p>
				) : (
					<div className={s.apiCardsGrid}>
						{erds.map((erd) => (
							<Link
								to={`/doc-erd-show/${erd.id}`}
								key={erd.id}
								className={s.apiCard}
								// Carry the originating domain so the ERD page can offer a
								// "back to domain" link.
								state={{ domainId: id, domainName: domain.name }}
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
				<h2 className={s.ovTitle} style={{ fontSize: 18, margin: "0 0 16px" }}>
					Прикреплённые WebSocket
				</h2>
				{isWebsocketsLoading ? (
					<p className={s.ovSub}>Загрузка WebSocket…</p>
				) : websockets.length === 0 ? (
					<p className={s.ovSub}>
						К этому домену пока не прикреплён ни один WebSocket — нажмите правой
						кнопкой мыши, чтобы создать или импортировать
					</p>
				) : (
					<div className={s.apiCardsGrid}>
						{websockets.map((ws) => (
							<Link
								to={`/doc-ws-show/${ws.id}`}
								key={ws.id}
								className={s.apiCard}
								// Имя и адрес — подсказка для шапки: она рисуется сразу, не
								// дожидаясь, пока страница перечитает сокет по id.
								state={{ url: ws.url, name: ws.name }}
								onContextMenu={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setWsMenu({ x: e.clientX, y: e.clientY, ws });
								}}
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

			<div style={{ marginTop: 32 }}>
				<VaultBrowser
					scope={domainScope(id)}
					rootLabel="Файлы домена"
					onOpenFile={(filePath) =>
						navigate(markdownRoute(domainScope(id), filePath))
					}
					renderHeader={({ openCreateFile }) => {
						// Пробрасываем действие виджета в меню страницы: правый клик по
						// свободной области должен уметь создавать файл и здесь.
						createVaultFileRef.current = openCreateFile;
						return (
							<h2 className={s.ovTitle} style={{ fontSize: 18, margin: 0 }}>
								Файлы домена
							</h2>
						);
					}}
				/>
			</div>

			{/* Инпуты живут в странице, а не в меню: меню закрывается сразу после
			    выбора пункта, а диалог выбора файла открывается по клику по ним. */}
			<input
				ref={importInputRef}
				type="file"
				accept="application/json,.json"
				style={{ display: "none" }}
				onChange={handleImportFile}
			/>
			<input
				ref={wsImportInputRef}
				type="file"
				accept="application/json,.json"
				style={{ display: "none" }}
				onChange={handleImportWsFile}
			/>

			<ContextMenu.Root
				open={!!pageMenu}
				x={pageMenu?.x ?? 0}
				y={pageMenu?.y ?? 0}
				onClose={() => setPageMenu(null)}
				minWidth={230}
			>
				<ContextMenu.Label>Документы</ContextMenu.Label>
				<ContextMenu.Item
					icon={<PlusIcon />}
					onSelect={() => setDocModalOpen(true)}
				>
					Создать документ
				</ContextMenu.Item>
				<ContextMenu.Item
					icon={<UploadIcon />}
					disabled={isImporting || isAttaching}
					onSelect={() => importInputRef.current?.click()}
				>
					{isImporting ? "Импорт…" : "Импортировать документ"}
				</ContextMenu.Item>

				<ContextMenu.Separator />

				<ContextMenu.Label>Диаграммы</ContextMenu.Label>
				<ContextMenu.Item
					icon={<PlusIcon />}
					onSelect={() => setErdModalOpen(true)}
				>
					Создать ERD
				</ContextMenu.Item>

				<ContextMenu.Separator />

				<ContextMenu.Label>WebSocket</ContextMenu.Label>
				<ContextMenu.Item
					icon={<PlusIcon />}
					onSelect={() => setWsModalOpen(true)}
				>
					Создать WebSocket
				</ContextMenu.Item>
				<ContextMenu.Item
					icon={<UploadIcon />}
					disabled={isImportingWebsocket}
					onSelect={() => wsImportInputRef.current?.click()}
				>
					{isImportingWebsocket ? "Импорт…" : "Импортировать WebSocket"}
				</ContextMenu.Item>

				<ContextMenu.Separator />

				<ContextMenu.Label>Файлы домена</ContextMenu.Label>
				<ContextMenu.Item
					icon={<PlusIcon />}
					onSelect={() => createVaultFileRef.current?.()}
				>
					Создать markdown-файл
				</ContextMenu.Item>
			</ContextMenu.Root>

			<CreateDocApiModal
				open={docModalOpen}
				onOpenChange={setDocModalOpen}
				isCreating={isCreating || isAttaching}
				onCreate={async (dto) => {
					try {
						// Create the doc, then attach it to this domain so it
						// shows up under "Прикреплённые документы" right away.
						const docId = await createDocAsync(dto);
						await attachDocAsync({ domainId: id, docId });
						queryClient.invalidateQueries({
							queryKey: domainDocsKeys.byDomain(id),
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
						await createErdAsync({ name, desc, domain_id: id });
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
						await createWebsocketAsync({ name, desc, url, domain_id: id });
						setWsModalOpen(false);
					} catch {
						/* error toast handled by the mutation */
					}
				}}
			/>

			<ContextMenu.Root
				open={!!wsMenu}
				x={wsMenu?.x ?? 0}
				y={wsMenu?.y ?? 0}
				onClose={() => setWsMenu(null)}
			>
				<ContextMenu.Item
					icon={<PencilIcon />}
					onSelect={() => wsMenu && setPendingWsEdit(wsMenu.ws)}
				>
					Редактировать
				</ContextMenu.Item>
			</ContextMenu.Root>

			{pendingWsEdit && (
				<EditWebsocketModal
					open
					onOpenChange={(open) =>
						!open && !isUpdatingWebsocket && setPendingWsEdit(null)
					}
					websocket={pendingWsEdit}
					isSaving={isUpdatingWebsocket}
					onSave={async (updates) => {
						try {
							await updateWebsocketAsync(updates);
							setPendingWsEdit(null);
						} catch {
							/* error toast handled by the mutation */
						}
					}}
				/>
			)}

			<ContextMenu.Root
				open={!!docMenu}
				x={docMenu?.x ?? 0}
				y={docMenu?.y ?? 0}
				onClose={() => setDocMenu(null)}
			>
				<ContextMenu.Item
					icon={<EyeIcon size={14} />}
					onSelect={() => {
						if (!docMenu) return;
						navigate(`/doc-show/${docMenu.doc.id}`, {
							state: { domainId: id, domainName: domain.name },
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
								queryKey: domainDocsKeys.byDomain(id),
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
										queryKey: domainDocsKeys.byDomain(id),
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
		</div>
	);
};

/* ═══════════════ MAIN PAGE ═══════════════ */
export const DomainShowPage: FC = () => {
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
