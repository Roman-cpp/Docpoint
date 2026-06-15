import { useState } from "react";
import { Link, useParams } from "react-router";
import { type Platform, usePlatformsStore } from "@/entities/platform";
import { DropMenu } from "@/shared/ui-kit/controls";
import s from "./ApiExplorerPage.module.css";
import { DeletePlatformModal } from "./DeletePlatformModal";
import { PlatformModal } from "./PlatformModal";

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

	return (
		<div className={s.sbApis}>
			<span className={s.sbSecLbl}>Platforms</span>

			{platforms.map((p) => (
				<div
					key={p.id}
					className={`${s.sbApiRow} ${String(p.id) === activeId ? s.on : ""}`}
				>
					<Link
						to={`/platform-show/${p.id}`}
						className={s.sbApiBtn}
						title={p.desc || p.name}
					>
						<span className={s.sbApiName}>{p.name}</span>
					</Link>
					<div className={s.acMenuWrap} onClick={(e) => e.stopPropagation()}>
						<DropMenu>
							<DropMenu.Trigger>
								<button
									type="button"
									className={s.sbMenuBtn}
									aria-label="Действия"
								>
									<svg
										viewBox="0 0 16 16"
										fill="currentColor"
										aria-hidden="true"
									>
										<circle cx="8" cy="3" r="1.4" />
										<circle cx="8" cy="8" r="1.4" />
										<circle cx="8" cy="13" r="1.4" />
									</svg>
								</button>
							</DropMenu.Trigger>
							<DropMenu.Content>
								<DropMenu.Item onClick={() => openEdit(p)}>Edit</DropMenu.Item>
								<DropMenu.Separator />
								<DropMenu.Item
									danger
									onClick={() => {
										setPending(p);
										setIsDeleteOpen(true);
									}}
								>
									Delete
								</DropMenu.Item>
							</DropMenu.Content>
						</DropMenu>
					</div>
				</div>
			))}

			{platforms.length === 0 && (
				<span className={s.sbSecLbl} style={{ color: "var(--ink-low)" }}>
					Пока пусто
				</span>
			)}

			<button
				type="button"
				className={s.sbImportBtn}
				style={{ marginTop: 6 }}
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
