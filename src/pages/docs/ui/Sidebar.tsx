import s from "./ApiExplorerPage.module.css";
import { PlatformsSection } from "./PlatformsSection";

export const Sidebar = () => {
	return (
		<aside className={s.sidebar}>
			<PlatformsSection />
		</aside>
	);
};
