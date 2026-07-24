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
export const PlatformDetails: FC<PlatformDetailsProps> = ({
	platform,
}) => {
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
					<span className={b.sectionRule} />
				</div>
				{description && (
					<Button variant="subtle" size="sm" onClick={openInEditor}>
						Редактировать
					</Button>
				)}
			</div>

			{isDescriptionLoading ? (
				<p className={b.sub}>Загрузка описания…</p>
			) : description ? (
				<MarkdownView className={b.doc}>{description.content}</MarkdownView>
			) : (
				<div className={b.emptyState}>
					<p className={b.emptyText}>
						У платформы ещё нет файла описания «{PLATFORM_DESCRIPTION_FILE}»
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
