import type { FC } from "react";
import { useParams, useSearchParams } from "react-router";
import {
	actionFetchEnvironmentsPlatform,
	useEnvironmentsStore,
} from "@/features/environment";
import { actionFetchPlatform, usePlatformStore } from "@/features/platform";
import { CatalogExplorer } from "@/widgets/catalog-explorer";
import { Header } from "@/widgets/header";
import { SidebarPlatform } from "@/widgets/sidebar";
import b from "./PlatformShowPage.module.css";

/**
 * Страница платформы — проводник по её дереву. Открытый каталог живёт в
 * `?catalog=<id>`, поэтому ссылку на место в дереве можно передать или оставить
 * себе в истории браузера.
 */
export const PlatformShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const fetchEnvironments = useEnvironmentsStore(
		actionFetchEnvironmentsPlatform,
	);
	const fetchPlatform = usePlatformStore(actionFetchPlatform);

	if (!id) return null;

	fetchEnvironments(id);
	fetchPlatform(id);
	const catalogId = searchParams.get("catalog");

	const openCatalog = (nextId: string | null) => {
		const next = new URLSearchParams(searchParams);
		if (nextId) next.set("catalog", nextId);
		else next.delete("catalog");
		setSearchParams(next, { replace: true });
	};

	return (
		<div className={b.wrapper}>
			<Header section="platform" activeLink="docs" />

			<div className={b.shell}>
				<SidebarPlatform />

				<main className={b.main}>
					<div className={b.explorer}>
						<CatalogExplorer
							platformId={id}
							catalogId={catalogId}
							onOpenCatalog={openCatalog}
						/>
					</div>
				</main>
			</div>
		</div>
	);
};
