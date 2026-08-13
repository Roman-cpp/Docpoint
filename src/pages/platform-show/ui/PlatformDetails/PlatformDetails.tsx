import { type FC, useState } from "react";
import { useNavigate } from "react-router";
import { PLATFORM_DESCRIPTION_FILE, type Platform } from "@/entities/platform";
import { platformScope } from "@/entities/shared/file-scope";
import { markdownRoute } from "@/entities/vault";
import { usePlatformDescription } from "@/features/platform";
import { MarkdownView } from "@/shared/ui-kit/MarkdownView";
import { ContextMenu } from "@/shared/ui-kit/modal";
import b from "./PlatformDetails.module.css";

interface PlatformDetailsProps {
	platform: Platform;
}

/**
 * Details tab of a platform: the markdown file describing it, rendered, plus
 * the handful of facts the database holds. The document is seeded when the
 * platform is created; a platform from before that — or one whose file was
 * deleted — gets an offer to create it.
 *
 * Actions live in the right-click menu of the section, not in buttons above it.
 */
export const PlatformDetails: FC<PlatformDetailsProps> = ({ platform }) => {
	const navigate = useNavigate();
	const {
		description,
		isDescriptionLoading,
		createDescription,
		isCreatingDescription,
	} = usePlatformDescription(platform.id);
	const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

	const openInEditor = () =>
		navigate(
			markdownRoute(platformScope(platform.id), PLATFORM_DESCRIPTION_FILE),
		);

	/** Правый клик по секции: редактирование готового описания или его
	 *  создание, если файла ещё нет. Пока описание грузится, показывать нечего. */
	const openMenu = (e: React.MouseEvent) => {
		if (e.defaultPrevented || isDescriptionLoading) return;
		e.preventDefault();
		setMenu({ x: e.clientX, y: e.clientY });
	};

	return (
		<section className={b.section} onContextMenu={openMenu}>
			<div className={b.sectionHead}>
				<div className={b.sectionLabel}>
					<span>Описание платформы</span>
					{description && (
						<span className={b.fileChip}>{PLATFORM_DESCRIPTION_FILE}</span>
					)}
					<span className={b.sectionRule} />
				</div>
			</div>

			{isDescriptionLoading ? (
				<div className={b.docCard}>
					<div
						className={b.skeleton}
						role="status"
						aria-label="Загрузка описания"
					>
						<div className={`${b.skelLine} ${b.skelTitle}`} />
						<div className={b.skelLine} />
						<div className={b.skelLine} />
						<div className={b.skelLine} />
						<div className={b.skelLine} />
					</div>
				</div>
			) : description ? (
				<div className={b.docCard}>
					<MarkdownView className={b.doc}>{description.content}</MarkdownView>
				</div>
			) : (
				<div className={b.emptyState}>
					<DocIcon />
					<h3 className={b.emptyTitle}>Описание ещё не создано</h3>
					<p className={b.emptyText}>
						У платформы нет файла{" "}
						<span className={b.emptyFile}>{PLATFORM_DESCRIPTION_FILE}</span> —
						нажмите правой кнопкой мыши, чтобы создать его и рассказать, за что
						отвечает платформа.
					</p>
				</div>
			)}

			<ContextMenu.Root
				open={!!menu}
				x={menu?.x ?? 0}
				y={menu?.y ?? 0}
				onClose={() => setMenu(null)}
			>
				{description ? (
					<ContextMenu.Item icon={<PencilIcon />} onSelect={openInEditor}>
						Редактировать описание
					</ContextMenu.Item>
				) : (
					<ContextMenu.Item
						icon={<PlusIcon />}
						disabled={isCreatingDescription}
						onSelect={() => createDescription(platform.name)}
					>
						{isCreatingDescription ? "Создаём…" : "Создать описание"}
					</ContextMenu.Item>
				)}
			</ContextMenu.Root>
		</section>
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

const PlusIcon: FC = () => (
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
		<title>create</title>
		<path d="M8 3v10M3 8h10" />
	</svg>
);

const DocIcon: FC = () => (
	<svg
		className={b.emptyIcon}
		viewBox="0 0 24 24"
		width="34"
		height="34"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<title>документ</title>
		<path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5L14 3Z" />
		<path d="M14 3v4.5h4.5M9 12h6M9 15.5h6M9 8.5h2" />
	</svg>
);
