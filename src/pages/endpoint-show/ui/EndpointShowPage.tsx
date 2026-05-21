import { useRef, useCallback } from "react";
import { useParams } from "react-router";
import { type FC } from "react";
import { EndpointPage } from "./EndpointPage";
import s from "@/shared/styles/apiDocs.module.css";
import { Layout } from "@/widgets/layout";
import { TryItPanel } from "./TryItPanel";
import {
	actionSelectEndpoint,
	selectSelectedEndpoint,
	selectSelectedEnvironment,
	useDocStore,
} from "@/features/doc";

const TRY_INIT = 348;
const TRY_MIN = 240;
const TRY_MAX = 600;

export const EndpointShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();

	const endpoint = useDocStore(selectSelectedEndpoint);
  const selectedEnvConfig = useDocStore(selectSelectedEnvironment);
	const selectEndpoint = useDocStore(actionSelectEndpoint);

	const tryPanelRef = useRef<HTMLDivElement>(null);

	const onTryPanelDrag = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		const startX = e.clientX;
		const startW = tryPanelRef.current?.offsetWidth ?? TRY_INIT;

		const onMove = (ev: MouseEvent) => {
			const w = Math.max(TRY_MIN, Math.min(TRY_MAX, startW - (ev.clientX - startX)));
			if (tryPanelRef.current) tryPanelRef.current.style.width = `${w}px`;
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

	if (!id) return;

	selectEndpoint(id);

	if (!endpoint) {
		return (
			<Layout>
				<div className={s.wrapper}>
					<div className={s.emptyState}>
						<svg
							width="40"
							height="40"
							viewBox="0 0 40 40"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						>
							<rect x="8" y="6" width="24" height="28" rx="3" />
							<path d="M14 14h12M14 19h12M14 24h8" />
						</svg>
						<span>Endpoint not found</span>
					</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className={s.shell}>
				<div className={s.main}>
					<div className={s.endpointPanel}>
						<EndpointPage detail={endpoint} key={id} />
					</div>
				</div>
			</div>

			<div className={s.resizeHandle} onMouseDown={onTryPanelDrag} />

      {selectedEnvConfig && (
        <div
				ref={tryPanelRef}
				style={{ width: TRY_INIT, flexShrink: 0, overflow: "hidden" }}
			>
				<TryItPanel />
			</div>
      )}
		</Layout>
	);
};
