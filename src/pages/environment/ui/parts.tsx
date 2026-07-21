import type { FC, ReactNode } from "react";
import type { TokenPlacement } from "@/entities/environment";
import s from "./EnvironmentPage.module.css";

export type EnvKey = "prod" | "staging" | "local" | "dev";

export const ENV_COLOR: Record<EnvKey, string> = {
	prod: "#3F6B4A",
	staging: "#3A5A78",
	local: "#75591A",
	dev: "#3F6B4A",
};

export const SWATCH_COLORS = [
	"#9B3B36",
	"#75591A",
	"#3F6B4A",
	"#3A5A78",
	"#1A1A1A",
	"#888888",
];

export const ACTIVE_COLOR = "#3F6B4A";

export type AuthMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const HTTP_METHODS: AuthMethod[] = [
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
];

export const TOKEN_PLACEMENTS: TokenPlacement[] = ["header", "cookie"];

export const TOKEN_PLACEMENT_LABEL: Record<TokenPlacement, string> = {
	header: "Header (Authorization: Bearer)",
	cookie: "Cookie",
};

export type VarType = "string" | "number" | "secret";

const SECRET_HINT_RE = /(password|secret|token|api[_-]?key)/i;

export const inferVarType = (name: string, value: string): VarType => {
	if (SECRET_HINT_RE.test(name)) return "secret";
	if (value.trim() !== "" && /^-?\d+(\.\d+)?$/.test(value.trim()))
		return "number";
	return "string";
};

/* ─── Icons ────────────────────────────────────────────────── */
export const PlusIcon: FC<{ size?: number }> = ({ size = 12 }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 14 14"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
	>
		<title>plus</title>
		<path d="M7 2v10M2 7h10" />
	</svg>
);

export const ChevronIcon: FC = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 10 10"
		width="10"
		height="10"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>chevron</title>
		<path d="M3 5l4 4 4-4" />
	</svg>
);

export const CopyIcon: FC = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 14 14"
		width="12"
		height="12"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<title>copy</title>
		<rect x="4.5" y="4.5" width="8" height="8" rx="1.5" />
		<path
			d="M9 4.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.5"
			strokeLinecap="round"
		/>
	</svg>
);

export const TrashIcon: FC = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 14 14"
		width="12"
		height="12"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>delete</title>
		<path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M3.5 3.5l.5 9a1 1 0 0 0 1 .9h4a1 1 0 0 0 1-.9l.5-9" />
	</svg>
);

export const BoltIcon: FC<{ size?: number }> = ({ size = 14 }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 14 14"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>bolt</title>
		<path d="M8 1L2.5 8h4L6 13l5.5-7h-4z" />
	</svg>
);

export const RefreshIcon: FC = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 14 14"
		width="13"
		height="13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>refresh</title>
		<path d="M12.5 7a5.5 5.5 0 1 1-1.6-3.9" />
		<path d="M12.5 1.5V4H10" />
	</svg>
);

export const PencilIcon: FC = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 14 14"
		width="12"
		height="12"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>edit</title>
		<path d="M9 2.5L11.5 5l-7 7H2v-2.5l7-7z" />
		<path d="M8 3.5L10.5 6" />
	</svg>
);

export const EyeIcon: FC = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 14 14"
		width="12"
		height="12"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>show</title>
		<path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
		<circle cx="7" cy="7" r="1.7" />
	</svg>
);

export const GripIcon: FC = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 12 12"
		width="12"
		height="12"
		fill="currentColor"
	>
		<title>drag</title>
		<circle cx="4" cy="3" r="1" />
		<circle cx="4" cy="6" r="1" />
		<circle cx="4" cy="9" r="1" />
		<circle cx="8" cy="3" r="1" />
		<circle cx="8" cy="6" r="1" />
		<circle cx="8" cy="9" r="1" />
	</svg>
);

/* ─── Section wrapper ──────────────────────────────────────── */
type SectionProps = {
	title: string;
	sub?: ReactNode;
	right?: ReactNode;
	children: ReactNode;
};

export const Section: FC<SectionProps> = ({ title, sub, right, children }) => (
	<section className={s.envSection}>
		<div className={s.envSectionHdr}>
			<div className={s.envSectionHdrLeft}>
				<h3 className={s.envSectionH}>{title}</h3>
				{sub && <span className={s.envSectionSub}>{sub}</span>}
			</div>
			{right}
		</div>
		<div className={s.envSectionBody}>{children}</div>
	</section>
);

/* ─── Field row ────────────────────────────────────────────── */
type FieldProps = {
	label: ReactNode;
	help?: ReactNode;
	children: ReactNode;
};

export const Field: FC<FieldProps> = ({ label, help, children }) => (
	<div className={s.envField}>
		<div>
			<div className={s.envFieldLbl}>{label}</div>
			{help && <div className={s.envFieldHelp}>{help}</div>}
		</div>
		{children}
	</div>
);
