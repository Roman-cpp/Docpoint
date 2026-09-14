import type { FC, ReactNode } from "react";
import type {
	AuthType,
	BodyContentType,
	TokenPlacement,
	TokenSource,
	WsTokenPlacement,
} from "@/entities/environment";
import s from "./EnvironmentPage.module.css";

export type EnvKey = "prod" | "staging" | "local" | "dev";

export type AuthMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const HTTP_METHODS: AuthMethod[] = [
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
];

export const TOKEN_PLACEMENTS: TokenPlacement[] = ["header", "cookie", "query"];

export const TOKEN_PLACEMENT_LABEL: Record<TokenPlacement, string> = {
	header: "Header",
	cookie: "Cookie",
	query: "Query (?имя=…)",
};

export const WS_TOKEN_PLACEMENTS: WsTokenPlacement[] = [
	"query",
	"header",
	"cookie",
];

export const WS_TOKEN_PLACEMENT_LABEL: Record<WsTokenPlacement, string> = {
	query: "Query (?имя=…)",
	header: "Header",
	cookie: "Cookie",
};

export const AUTH_TYPES: AuthType[] = ["none", "basic", "token"];

export const AUTH_TYPE_LABEL: Record<AuthType, string> = {
	none: "Нет",
	basic: "Basic Auth",
	token: "Токен",
};

export const TOKEN_SOURCES: TokenSource[] = ["static", "login"];

export const TOKEN_SOURCE_LABEL: Record<TokenSource, string> = {
	static: "Статическое значение",
	login: "Через запрос авторизации",
};

export const BODY_CONTENT_TYPES: BodyContentType[] = ["json", "form"];

export const BODY_CONTENT_TYPE_LABEL: Record<BodyContentType, string> = {
	json: "JSON",
	form: "Form (x-www-form-urlencoded)",
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
