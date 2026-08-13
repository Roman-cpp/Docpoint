import type { FC, ReactNode } from "react";
import type { TokenPlacement, WsTokenPlacement } from "@/entities/environment";
import s from "./EnvironmentPage.module.css";

export type EnvKey = "prod" | "staging" | "local" | "dev";

export const ENV_COLOR: Record<EnvKey, string> = {
	prod: "#3F6B4A",
	staging: "#3A5A78",
	local: "#75591A",
	dev: "#3F6B4A",
};

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

export const WS_TOKEN_PLACEMENTS: WsTokenPlacement[] = [
	"query",
	"header",
	"cookie",
];

export const WS_TOKEN_PLACEMENT_LABEL: Record<WsTokenPlacement, string> = {
	query: "Query (?token=…)",
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
