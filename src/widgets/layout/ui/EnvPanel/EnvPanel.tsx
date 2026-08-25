import { type FC, useState } from "react";
import {
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { getEnvDotColor } from "@/shared/lib/env-color";
import s from "./EnvPanel.module.css";

const CopyField: FC<{ text: string; className: string; title: string }> = ({
	text,
	className,
	title,
}) => {
	const [copied, setCopied] = useState(false);
	const copy = () => {
		navigator.clipboard?.writeText(text).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1200);
	};
	return (
		<button
			type="button"
			className={`${className} ${s.copyField}${copied ? ` ${s.copied}` : ""}`}
			onClick={copy}
			title={title}
		>
			{text}
		</button>
	);
};

export const EnvPanel: FC = () => {
	const [open, setOpen] = useState(false);
	const env = useEnvironmentsStore(selectSelectedEnvironment);

	const dotColor = env ? getEnvDotColor(env.env) : "var(--border)";

	return (
		<>
			{open && env && (
				<div className={s.panel}>
					<div className={s.panelHdr}>
						<div className={s.panelTitle}>
							<span className={s.panelDot} style={{ background: dotColor }} />
							{env.label}
						</div>
						<button
							type="button"
							className={s.panelClose}
							onClick={() => setOpen(false)}
						>
							<svg
								aria-hidden="true"
								viewBox="0 0 11 11"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							>
								<path d="M1.5 1.5l8 8M9.5 1.5l-8 8" />
							</svg>
						</button>
					</div>

					<div className={s.metaBlock}>
						<div className={s.metaRow}>
							<span className={s.metaKey}>Base URL</span>
							<span className={s.metaVal}>{env.baseUrl || "—"}</span>
						</div>
						{env.prefix && (
							<div className={s.metaRow}>
								<span className={s.metaKey}>Prefix</span>
								<span className={s.metaVal}>{env.prefix}</span>
							</div>
						)}
					</div>

					<div className={s.varSection}>
						<div className={s.varSectionLabel}>Variables</div>
						{env.value.length === 0 ? (
							<div className={s.empty}>No variables</div>
						) : (
							env.value.map((v) => (
								<div key={v.id} className={s.varRow}>
									<CopyField
										text={v.name}
										className={s.varName}
										title="Copy name"
									/>
									<span className={s.varEq}>=</span>
									<CopyField
										text={v.value}
										className={s.varVal}
										title="Copy value"
									/>
								</div>
							))
						)}
					</div>
				</div>
			)}

			<button
				type="button"
				className={`${s.toggleBtn}${open ? ` ${s.open}` : ""}`}
				onClick={() => setOpen((v) => !v)}
				title="Environment variables"
			>
				<svg
					aria-hidden="true"
					viewBox="0 0 14 14"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M2 4l3 3-3 3M7 10h5" />
				</svg>
				{env ? (
					<>
						<span className={s.toggleDot} style={{ background: dotColor }} />
						{env.label}
					</>
				) : (
					"No env"
				)}
			</button>
		</>
	);
};
