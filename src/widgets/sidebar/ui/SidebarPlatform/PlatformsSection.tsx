import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useAllDomains } from "@/entities/domain";
import { type Platform, usePlatformsStore } from "@/entities/platform";
import {
	DeletePlatformModal,
	PlatformModal,
	usePlatformDocs,
} from "@/features/platform";
import { DropMenu } from "@/shared/ui-kit/controls";
import s from "./SidebarPlatform.module.css";

/** Русская форма слова по числу: [1, 2-4, 5-0]. */
const plural = (n: number, forms: [string, string, string]): string => {
	const m10 = n % 10;
	const m100 = n % 100;
	if (m10 === 1 && m100 !== 11) return forms[0];
	if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
	return forms[2];
};

interface PlatformCardProps {
	platform: Platform;
	active: boolean;
	domainCount: number | null;
	onEdit: (p: Platform) => void;
	onDelete: (p: Platform) => void;
}

const PlatformCard = ({
	platform,
	active,
	domainCount,
	onEdit,
	onDelete,
}: PlatformCardProps) => {
	const { docs, isDocsLoading } = usePlatformDocs(platform.id);

	const meta =
		domainCount === null ? (
			<>— доменов · — файлов</>
		) : (
			<>
				{domainCount} {plural(domainCount, ["домен", "домена", "доменов"])} ·{" "}
				{isDocsLoading
					? "—"
					: `${docs.length} ${plural(docs.length, ["файл", "файла", "файлов"])}`}
			</>
		);

	return (
		<div className={`${s.pfCard} ${active ? s.pfCardActive : ""}`}>
			<Link
				to={`/platform-show/${platform.id}`}
				className={s.pfCardLink}
				title={platform.desc || platform.name}
			>
				<span className={s.pfCardIcon} aria-hidden />
				<span className={s.pfCardBody}>
					<span className={s.pfCardName}>{platform.name}</span>
					<span className={s.pfCardMeta}>{meta}</span>
				</span>
			</Link>

			<div className={s.pfCardMenu} onClick={(e) => e.stopPropagation()}>
				<DropMenu>
					<DropMenu.Trigger>
						<button type="button" className={s.sbMenuBtn} aria-label="Действия">
							<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
								<circle cx="8" cy="3" r="1.4" />
								<circle cx="8" cy="8" r="1.4" />
								<circle cx="8" cy="13" r="1.4" />
							</svg>
						</button>
					</DropMenu.Trigger>
					<DropMenu.Content>
						<DropMenu.Item onClick={() => onEdit(platform)}>Edit</DropMenu.Item>
						<DropMenu.Separator />
						<DropMenu.Item danger onClick={() => onDelete(platform)}>
							Delete
						</DropMenu.Item>
					</DropMenu.Content>
				</DropMenu>
			</div>
		</div>
	);
};

export const PlatformsSection = () => {
	const { platforms, createPlatform, updatePlatform, isCreating, isUpdating } =
		usePlatformsStore();
	const { domains, isDomainsLoading } = useAllDomains();

	const { id: activeId } = useParams();

	const [editing, setEditing] = useState<Platform | null>(null);
	const [pending, setPending] = useState<Platform | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);

	/** Кол-во доменов на каждую платформу из общего списка. */
	const domainCounts = useMemo(() => {
		const map = new Map<string, number>();
		for (const dom of domains) {
			map.set(dom.platformId, (map.get(dom.platformId) ?? 0) + 1);
		}
		return map;
	}, [domains]);

	const openCreate = () => {
		setEditing(null);
		setIsFormOpen(true);
	};

	const openEdit = (platform: Platform) => {
		setEditing(platform);
		setIsFormOpen(true);
	};

	const openDelete = (platform: Platform) => {
		setPending(platform);
		setIsDeleteOpen(true);
	};

	return (
		<div className={s.sbApis}>
			<span className={s.sbSecLbl}>Платформы</span>

			<div className={s.pfList}>
				{platforms.map((p) => (
					<PlatformCard
						key={p.id}
						platform={p}
						active={String(p.id) === activeId}
						domainCount={
							isDomainsLoading ? null : (domainCounts.get(p.id) ?? 0)
						}
						onEdit={openEdit}
						onDelete={openDelete}
					/>
				))}
			</div>

			{platforms.length === 0 && (
				<span className={s.sbSecLbl} style={{ color: "var(--ink-low)" }}>
					Пока пусто
				</span>
			)}

			<button
				type="button"
				className={s.sbImportBtn}
				style={{ marginTop: 8 }}
				onClick={openCreate}
			>
				+ Платформа
			</button>

			<PlatformModal
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
				platform={editing}
				isSaving={isCreating || isUpdating}
				onCreate={(dto) => {
					createPlatform(dto);
					setIsFormOpen(false);
				}}
				onUpdate={(dto) => {
					updatePlatform(dto);
					setIsFormOpen(false);
				}}
			/>

			{pending && (
				<DeletePlatformModal
					open={isDeleteOpen}
					onOpenChange={setIsDeleteOpen}
					platform={pending}
				/>
			)}
		</div>
	);
};
