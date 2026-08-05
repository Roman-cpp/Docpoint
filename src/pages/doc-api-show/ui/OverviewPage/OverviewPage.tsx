import { Link, useLocation } from "react-router";
import {
	selectDocApi,
	selectEntities,
	selectGroups,
	useDocApiStore,
} from "@/features/doc-api";
import {
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { joinUrl } from "@/shared/lib/url";
import s from "@/shared/styles/apiDocs.module.css";

interface DocOrigin {
	domainId?: string;
	domainName?: string;
}

export const OverviewPage = () => {
	const doc = useDocApiStore(selectDocApi);
	const groups = useDocApiStore(selectGroups);
	const entities = useDocApiStore(selectEntities);
	const env = useEnvironmentsStore(selectSelectedEnvironment);

	// When the doc was opened from a domain page, `state` carries it so we
	// can offer a link back to that domain.
	const origin = useLocation().state as DocOrigin | null;

	const endpointCount =
		groups?.reduce((sum, g) => sum + g.endpoints.length, 0) ?? 0;
	const resourceCount = entities.length;

	if (!doc) return null;

	// База всех запросов документа: base URL выбранного окружения + его префикс +
	// префикс самого документа. Без выбранного окружения показываем то, что
	// документ добавляет от себя.
	const baseUrl = joinUrl(env?.baseUrl, env?.prefix, doc.prefix) || "—";

	return (
		<div>
			<div className={s.breadcrumb}>
				{origin?.domainId && (
					<>
						<Link className={s.bcItem} to={`/domain-show/${origin.domainId}`}>
							← {origin.domainName ?? "Домен"}
						</Link>
						<span className={s.bcSep}>/</span>
					</>
				)}
				<span className={s.bcCurrent}>Overview</span>
			</div>
			<div className={s.endpointHeader}>
				<h1
					style={{
						fontFamily: "var(--font-serif)",
						fontSize: "30px",
						fontWeight: 400,
						letterSpacing: "-0.3px",
						lineHeight: 1.2,
						marginBottom: "10px",
					}}
				>
					{doc.name}
				</h1>
				<p className={s.endpointDesc}>{doc.desc}</p>
			</div>

			<div className={s.overviewGrid}>
				<div className={s.overviewCard}>
					<div className={s.overviewCardLabel}>Base URL</div>
					<div className={s.overviewCardValue}>
						<code>{baseUrl}</code>
					</div>
				</div>
				<div className={s.overviewCard}>
					<div className={s.overviewCardLabel}>Version</div>
					<div className={s.overviewCardValue}>
						<code>{doc.version}</code>
					</div>
				</div>
				<div className={s.overviewCard}>
					<div className={s.overviewCardLabel}>Endpoints</div>
					<div className={s.overviewCardValue}>
						{endpointCount} endpoints across {resourceCount} resources
					</div>
				</div>
				{/* <div className={s.overviewCard}>
					<div className={s.overviewCardLabel}>Auth</div>
					<div className={s.overviewCardValue}>
						Bearer token via <code>/auth/token</code>
					</div>
				</div> */}
			</div>

			<div className={s.divider} />
			{/*<div className={s.sectionBlock}>
				<div className={s.sectionLabel}>Authentication</div>
				<p
					style={{
						fontSize: "14px",
						color: "var(--ink-mid)",
						lineHeight: 1.75,
						marginBottom: "14px",
					}}
				>
					Most endpoints require a Bearer token in the{" "}
					<span className={s.ic}>Authorization</span> header. Obtain a token via{" "}
					<span className={s.ic}>POST /auth/token</span>. Tokens expire after{" "}
					<strong>60 minutes</strong>; use the refresh token to extend the
					session.
				</p>
				{/* <div className={s.codeBlock}>
					<div className={s.codeHeader}>
						<span className={s.codeLang}>HTTP Header</span>
						<CopyBtn text="Authorization: Bearer {your_token}" />
					</div>
					<div className={s.codeBody}>
						<pre>
							<span className={s.hlK}>Authorization</span>
							{": Bearer "}
							<span className={s.hlS}>{"{" + "your_token" + "}"}</span>
						</pre>
					</div>
				</div>
			</div> */}

			{/*<div className={s.sectionBlock}>
				<div className={s.sectionLabel}>Rate Limiting</div>
				<p
					style={{
						fontSize: "14px",
						color: "var(--ink-mid)",
						lineHeight: 1.75,
						marginBottom: "14px",
					}}
				>
					API requests are limited to <strong>1 000 requests / hour</strong> per
					token. Rate limit headers are included in every response.
				</p>
				<div className={s.schemaBlock}>
					{[
						["X-RateLimit-Limit", "string", "Maximum requests per window"],
						[
							"X-RateLimit-Remaining",
							"string",
							"Requests left in current window",
						],
						[
							"X-RateLimit-Reset",
							"string",
							"Unix timestamp when window resets",
						],
						[
							"Retry-After",
							"string",
							"Seconds to wait if rate limited (429 only)",
						],
					].map(([k, t, d]) => (
						<div className={s.schemaRow} key={k}>
							<span className={s.schemaKey}>{k}</span>
							<span className={s.schemaType}>{t}</span>
							<span className={s.schemaDesc}>{d}</span>
						</div>
					))}
				</div>
			</div> */}

			<div className={s.sectionBlock}>
				<div className={s.sectionLabel}>Errors</div>
				<p
					style={{
						fontSize: "14px",
						color: "var(--ink-mid)",
						lineHeight: 1.75,
						marginBottom: "14px",
					}}
				>
					All errors follow a consistent shape with a machine-readable{" "}
					<span className={s.ic}>error</span> code and a human-readable{" "}
					<span className={s.ic}>message</span>.
				</p>
				<div className={s.schemaBlock}>
					{[
						["400", "Bad Request", "Invalid query params or request format"],
						["401", "Unauthorized", "Missing or invalid token"],
						["403", "Forbidden", "Token lacks required scope"],
						["404", "Not Found", "Resource doesn't exist"],
						["409", "Conflict", "Duplicate resource (e.g. email taken)"],
						["422", "Unprocessable", "Validation errors in request body"],
						["429", "Too Many Requests", "Rate limit exceeded"],
						["500", "Server Error", "Internal error — please retry"],
					].map(([code, label, desc]) => (
						<div className={s.schemaRow} key={code}>
							<span
								className={s.schemaKey}
								style={{
									color:
										parseInt(code) >= 500
											? "var(--red)"
											: parseInt(code) >= 400
												? "var(--amber)"
												: "var(--green)",
								}}
							>
								{code}
							</span>
							<span className={s.schemaType} style={{ color: "var(--ink)" }}>
								{label}
							</span>
							<span className={s.schemaDesc}>{desc}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
