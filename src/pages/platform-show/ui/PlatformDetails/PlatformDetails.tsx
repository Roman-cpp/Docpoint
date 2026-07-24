import type { FC } from "react";
import { useNavigate } from "react-router";
import { PLATFORM_DESCRIPTION_FILE, type Platform } from "@/entities/platform";
import { platformScope } from "@/entities/shared/file-scope";
import { markdownRoute } from "@/entities/vault";
import { usePlatformDescription } from "@/features/platform";
import { Button } from "@/shared/ui-kit/controls";
import { MarkdownView } from "@/shared/ui-kit/MarkdownView";
import b from "./PlatformDetails.module.css";

interface PlatformDetailsProps {
	platform: Platform;
}

/**
 * Details tab of a platform: the markdown file describing it, rendered, plus
 * the handful of facts the database holds. The document is seeded when the
 * platform is created; a platform from before that — or one whose file was
 * deleted — gets an offer to create it.
 */
export const PlatformDetails: FC<PlatformDetailsProps> = ({ platform }) => {
	const navigate = useNavigate();
	const {
		description,
		isDescriptionLoading,
		createDescription,
		isCreatingDescription,
	} = usePlatformDescription(platform.id);

	const openInEditor = () =>
		navigate(
			markdownRoute(platformScope(platform.id), PLATFORM_DESCRIPTION_FILE),
		);

	return (
		<section className={b.section}>
			<div className={b.sectionHead}>
				<div className={b.sectionLabel}>
					<span>Описание платформы</span>
					{description && (
						<span className={b.fileChip}>{PLATFORM_DESCRIPTION_FILE}</span>
					)}
					<span className={b.sectionRule} />
				</div>
				{description && (
					<Button variant="subtle" size="sm" onClick={openInEditor}>
						Редактировать
					</Button>
				)}
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
						создайте его, чтобы рассказать, за что отвечает платформа.
					</p>
					<Button
						variant="primary"
						size="sm"
						onClick={() => createDescription(platform.name)}
						disabled={isCreatingDescription}
					>
						{isCreatingDescription ? "Создаём…" : "Создать описание"}
					</Button>
				</div>
			)}
		</section>
	);
};

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
