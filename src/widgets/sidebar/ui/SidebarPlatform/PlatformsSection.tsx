import { useState } from "react";
import { Link, useParams } from "react-router";
import { type Platform, usePlatformsStore } from "@/entities/platform";
import { DeletePlatformModal, PlatformModal } from "@/features/platform";
import { DropMenu } from "@/shared/ui-kit/controls";
import s from "./SidebarPlatform.module.css";

interface PlatformCardProps {
	platform: Platform;
	active: boolean;
	onEdit: (p: Platform) => void;
	onDelete: (p: Platform) => void;
}

const PlatformCard = ({
	platform,
	active,
	onEdit,
	onDelete,
}: PlatformCardProps) => {
	return (
		<div className={`${s.pfCard} ${active ? s.pfCardActive : ""}`}>
			<Link
				to={`/platform-show/${platform.id}`}
				className={s.pfCardLink}
				title={platform.desc || platform.name}
			>
				<span className={s.pfCardName}>{platform.name}</span>
			</Link>

			<div className={s.pfCardMenu}>
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

	const { id: activeId } = useParams();

	const [editing, setEditing] = useState<Platform | null>(null);
	const [pending, setPending] = useState<Platform | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
