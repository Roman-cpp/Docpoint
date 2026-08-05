import { type FC, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { type Domain, usePlatformDomains } from "@/entities/domain";
import { usePlatformsStore } from "@/entities/platform";
import { platformScope } from "@/entities/shared/file-scope";
import { markdownRoute } from "@/entities/vault";
import { DomainModal } from "@/features/domain";
import {
	actionFetchEnvironmentsPlatform,
	useEnvironmentsStore,
} from "@/features/environment";
import { actionFetchPlatform, usePlatformStore } from "@/features/platform";
import { Button } from "@/shared/ui-kit/controls";
import { ContextMenu, Dialog } from "@/shared/ui-kit/modal";
import { Header } from "@/widgets/header";
import { SidebarPlatform } from "@/widgets/sidebar";
import { VaultBrowser } from "@/widgets/vault-browser";
import { PlatformDetails } from "../PlatformDetails";
import b from "./PlatformShowPage.module.css";

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview: FC<{ id: string }> = ({ id }) => {
	const { platforms } = usePlatformsStore();
	const {
		domains,
		isDomainsLoading,
		createDomain,
		isCreatingDomain,
		updateDomain,
		isUpdatingDomain,
		deleteDomainAsync,
		isDeletingDomain,
	} = usePlatformDomains(id);
	const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
	const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
	const [pendingDelete, setPendingDelete] = useState<Domain | null>(null);
	const [domMenu, setDomMenu] = useState<{
		x: number;
		y: number;
		dom: Domain;
	} | null>(null);
	/** Which section is shown: platform details, domains, or files. */
	const [tab, setTab] = useState<"details" | "domains" | "files">("domains");
	const navigate = useNavigate();

	const platform = platforms.find((p) => p.id === id);

	if (!platform) {
		return (
			<div className={b.overview}>
				<div className={b.content}>
					<header className={b.hero}>
						<div className={b.ovEyebrow}>Платформа</div>
						<h1 className={b.ovTitle}>Платформа не найдена</h1>
					</header>
				</div>
			</div>
		);
	}

	return (
		<div className={b.overview}>
			<div className={b.content}>
				<div className={b.tabs} role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={tab === "details"}
						className={`${b.tab} ${tab === "details" ? b.tabActive : ""}`}
						onClick={() => setTab("details")}
					>
						Подробности
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={tab === "domains"}
						className={`${b.tab} ${tab === "domains" ? b.tabActive : ""}`}
						onClick={() => setTab("domains")}
					>
						Домены
						{domains.length > 0 && (
							<span className={b.tabCount}>{domains.length}</span>
						)}
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={tab === "files"}
						className={`${b.tab} ${tab === "files" ? b.tabActive : ""}`}
						onClick={() => setTab("files")}
					>
						Файлы платформы
					</button>
				</div>

				{tab === "details" && <PlatformDetails platform={platform} />}

				{tab === "domains" && (
					<section className={b.section}>
						<div className={b.sectionHead}>
							<div className={b.sectionLabel}>
								<span>Домены</span>
								{domains.length > 0 && (
									<span className={b.sectionCount}>{domains.length}</span>
								)}
								<span className={b.sectionRule} />
							</div>
							<Button
								variant="subtle"
								size="sm"
								onClick={() => setIsDomainModalOpen(true)}
							>
								+ Добавить
							</Button>
						</div>
						{isDomainsLoading ? (
							<p className={b.ovSub}>Загрузка доменов…</p>
						) : domains.length === 0 ? (
							<div className={b.emptyState}>
								<p className={b.emptyText}>
									К этой платформе пока не прикреплён ни один домен
								</p>
								<Button
									variant="primary"
									size="sm"
									onClick={() => setIsDomainModalOpen(true)}
								>
									+ Добавить домен
								</Button>
							</div>
						) : (
							<div className={b.apiCardsGrid}>
								{domains.map((dom) => (
									<button
										type="button"
										key={dom.id}
										className={`${b.apiCard} ${b.domCard}`}
										onClick={() => navigate(`/domain-show/${dom.id}`)}
										onContextMenu={(e) => {
											e.preventDefault();
											e.stopPropagation();
											setDomMenu({ x: e.clientX, y: e.clientY, dom });
										}}
									>
										<div className={b.acName}>{dom.name}</div>
										{dom.desc && <div className={b.acDesc}>{dom.desc}</div>}
									</button>
								))}
							</div>
						)}
					</section>
				)}

				{tab === "files" && (
					<VaultBrowser
						scope={platformScope(id)}
						rootLabel="Файлы платформы"
						onOpenFile={(filePath) =>
							navigate(markdownRoute(platformScope(id), filePath))
						}
					/>
				)}
			</div>

			<DomainModal
				open={isDomainModalOpen || editingDomain != null}
				onOpenChange={(open) => {
					if (open) return;
					setIsDomainModalOpen(false);
					setEditingDomain(null);
				}}
				platformId={id}
				domain={editingDomain}
				onCreate={(dto) =>
					createDomain(dto, { onSuccess: () => setIsDomainModalOpen(false) })
				}
				onUpdate={(dto) =>
					updateDomain(dto, { onSuccess: () => setEditingDomain(null) })
				}
				isSaving={editingDomain ? isUpdatingDomain : isCreatingDomain}
			/>

			<ContextMenu.Root
				open={!!domMenu}
				x={domMenu?.x ?? 0}
				y={domMenu?.y ?? 0}
				onClose={() => setDomMenu(null)}
			>
				<ContextMenu.Item
					icon={<PencilIcon />}
					onSelect={() => domMenu && setEditingDomain(domMenu.dom)}
				>
					Редактировать
				</ContextMenu.Item>

				<ContextMenu.Separator />

				<ContextMenu.Item
					danger
					icon={<TrashIcon />}
					onSelect={() => domMenu && setPendingDelete(domMenu.dom)}
				>
					Удалить домен
				</ContextMenu.Item>
			</ContextMenu.Root>

			{pendingDelete && (
				<Dialog.Root
					open
					onOpenChange={(open) =>
						!open && !isDeletingDomain && setPendingDelete(null)
					}
				>
					<Dialog.Header>
						<Dialog.Title>Удалить домен?</Dialog.Title>
						<Dialog.Close />
					</Dialog.Header>
					<Dialog.Body>
						<p className={b.ovSub} style={{ margin: 0 }}>
							Домен «{pendingDelete.name}» будет удалён без возможности
							восстановления.
						</p>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.BtnCancel
							onClick={() => setPendingDelete(null)}
							disabled={isDeletingDomain}
						>
							Отмена
						</Dialog.BtnCancel>
						<Dialog.BtnDanger
							onClick={async () => {
								if (isDeletingDomain) return;
								try {
									await deleteDomainAsync(pendingDelete.id);
									setPendingDelete(null);
								} catch {
									/* error toast handled by the mutation */
								}
							}}
							disabled={isDeletingDomain}
						>
							{isDeletingDomain ? "Удаляем…" : "Удалить"}
						</Dialog.BtnDanger>
					</Dialog.Footer>
				</Dialog.Root>
			)}
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
		<div className={b.wrapper}>
			<Header section="platform" activeLink="docs" />

			<div className={b.shell}>
				<SidebarPlatform />
				<Overview id={id} />
			</div>
		</div>
	);
};
