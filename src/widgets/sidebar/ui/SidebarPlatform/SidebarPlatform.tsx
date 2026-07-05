import { PlatformsSection } from "./PlatformsSection";
import s from "./SidebarPlatform.module.css";

export const SidebarPlatform = () => {
	return (
		<aside className={s.sidebar}>
			<PlatformsSection />
		</aside>
	);
};
