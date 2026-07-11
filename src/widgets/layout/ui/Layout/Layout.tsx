import { type ReactNode, useCallback, useRef } from "react";
import s from "@/shared/styles/apiDocs.module.css";
import { Header } from "@/widgets/header";
import { Sidebar } from "@/widgets/layout/ui/Sidebar";
import { EnvPanel } from "../EnvPanel";

const SIDEBAR_INIT = 248;
const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;

interface LayoutProps {
	children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
	const sidebarRef = useRef<HTMLDivElement>(null);

	const onSidebarDrag = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		const startX = e.clientX;
		const startW = sidebarRef.current?.offsetWidth ?? SIDEBAR_INIT;

		const onMove = (ev: MouseEvent) => {
			const w = Math.max(
				SIDEBAR_MIN,
				Math.min(SIDEBAR_MAX, startW + ev.clientX - startX),
			);
			if (sidebarRef.current) sidebarRef.current.style.width = `${w}px`;
		};
		const onUp = () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};

		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
	}, []);

	return (
		<div className={s.wrapper}>
			<Header section="docs1" activeLink="docs" />

			<div className={s.shell}>
				<div
					ref={sidebarRef}
					style={{ width: SIDEBAR_INIT, flexShrink: 0, overflow: "hidden" }}
				>
					<Sidebar />
				</div>

				<div className={s.resizeHandle} onMouseDown={onSidebarDrag} />

				<div className={s.main}>{children}</div>
			</div>

			<EnvPanel />
		</div>
	);
}
