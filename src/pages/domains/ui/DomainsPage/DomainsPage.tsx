import { type FC, useMemo, useState } from "react";
import { Link } from "react-router";
import { cx } from "@/shared/lib/cx";
import { SearchIcon } from "@/shared/svg";
import { Header } from "@/widgets/header";
import s from "./DomainsPage.module.css";

/* ─── Types (template-local; no API yet) ─── */
type DomainStatus = "healthy" | "degraded" | "down";

interface Domain {
	id: string;
	name: string;
	/** Base URL / host the domain answers on. */
	host: string;
	status: DomainStatus;
	/** Number of stored request records. */
	requests: number;
	/** Number of stored log entries. */
	logs: number;
	/** Share of error records, 0..1. */
	errorRate: number;
	/** ISO timestamp of the last stored record. */
	lastSeen: string;
}

/* ─── Mock data ─── */
const DOMAINS: Domain[] = [
	{
		id: "dm-auth",
		name: "Auth Domain",
		host: "auth.nexus.io",
		status: "healthy",
		requests: 12840,
		logs: 4210,
		errorRate: 0.004,
		lastSeen: "2026-06-09T10:42:18",
	},
	{
		id: "dm-billing",
		name: "Billing Domain",
		host: "billing.nexus.io",
		status: "degraded",
		requests: 6132,
		logs: 8902,
		errorRate: 0.061,
		lastSeen: "2026-06-09T10:41:30",
	},
	{
		id: "dm-catalog",
		name: "Catalog Domain",
		host: "catalog.nexus.io",
		status: "healthy",
		requests: 28471,
		logs: 1203,
		errorRate: 0.001,
		lastSeen: "2026-06-09T10:42:05",
	},
	{
		id: "dm-import",
		name: "Import Worker",
		host: "import.nexus.io",
		status: "down",
		requests: 904,
		logs: 15677,
		errorRate: 0.214,
		lastSeen: "2026-06-09T09:58:11",
	},
	{
		id: "dm-notify",
		name: "Notification Domain",
		host: "notify.nexus.io",
		status: "healthy",
		requests: 3318,
		logs: 2044,
		errorRate: 0.012,
		lastSeen: "2026-06-09T10:40:48",
	},
	{
		id: "dm-gateway",
		name: "API Gateway",
		host: "api.nexus.io",
		status: "healthy",
		requests: 51209,
		logs: 9821,
		errorRate: 0.008,
		lastSeen: "2026-06-09T10:42:21",
	},
];

/* ─── Filters ─── */
const STATUS_FILTERS: { id: DomainStatus | "all"; label: string }[] = [
	{ id: "all", label: "Все" },
	{ id: "healthy", label: "Работают" },
	{ id: "degraded", label: "Деградация" },
	{ id: "down", label: "Недоступны" },
];

const STATUS_LABEL: Record<DomainStatus, string> = {
	healthy: "Работает",
	degraded: "Деградация",
	down: "Недоступен",
};

/* ─── Helpers ─── */
/** ISO `at` → "DD.MM HH:MM" (no timezone shift). */
function formatAt(iso: string): string {
	const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
	if (!m) return iso;
	const [, , mo, d, hh, mm] = m;
	return `${d}.${mo} ${hh}:${mm}`;
}

/* ─── Page ─── */
export const DomainsPage: FC = () => {
	const [search, setSearch] = useState("");
	const [activeStatus, setActiveStatus] = useState<DomainStatus | "all">("all");

	const rows = useMemo(() => {
		const q = search.trim().toLowerCase();
		return DOMAINS.filter((sv) => {
			if (activeStatus !== "all" && sv.status !== activeStatus) return false;
			if (!q) return true;
			return (
				sv.name.toLowerCase().includes(q) || sv.host.toLowerCase().includes(q)
			);
		});
	}, [search, activeStatus]);

	const counts = useMemo(() => {
		const c: Record<string, number> = {};
		for (const sv of DOMAINS) c[sv.status] = (c[sv.status] ?? 0) + 1;
		return c;
	}, []);

	return (
		<div className={s["dm-frame"]}>
			<Header section="Домены" activeLink="domains" />

			<main className={s["dm-page"]}>
				<div className={s["dm-page-inner"]}>
					{/* Toolbar */}
					<div className={s["dm-toolbar"]}>
						<div className={s["dm-toolbar-head"]}>
							<div>
								<h1 className={s["dm-title"]}>Домены</h1>
								<p className={s["dm-subtitle"]}>
									Источники, по которым хранятся логи и запросы. Кликните
									карточку, чтобы перейти к их записям.
								</p>
							</div>
						</div>

						<div className={s["dm-toolbar-controls"]}>
							<label className={s["dm-search"]}>
								<SearchIcon />
								<input
									type="text"
									placeholder="Поиск по названию или хосту…"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
							</label>

							<div className={s["dm-chips"]}>
								{STATUS_FILTERS.map((f) => (
									<button
										key={f.id}
										type="button"
										className={cx(
											s["dm-chip"],
											activeStatus === f.id && s.active,
										)}
										onClick={() => setActiveStatus(f.id)}
									>
										{f.label}
										{f.id !== "all" && (
											<span className={s["dm-chip-count"]}>
												{counts[f.id] ?? 0}
											</span>
										)}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Grid */}
					{rows.length === 0 ? (
						<div className={s["dm-empty"]}>
							Нет доменов по заданным условиям
						</div>
					) : (
						<div className={s["dm-grid"]}>
							{rows.map((sv) => (
								<div key={sv.id} className={s["dm-card"]}>
									<div className={s["dm-card-head"]}>
										<span
											className={cx(s["dm-status"], s[`dm-st-${sv.status}`])}
										>
											<span className={s["dm-dot"]} />
											{STATUS_LABEL[sv.status]}
										</span>
										<span className={s["dm-card-spacer"]} />
										<span className={s["dm-card-seen"]}>
											{formatAt(sv.lastSeen)}
										</span>
									</div>

									<h2 className={s["dm-card-name"]}>{sv.name}</h2>
									<div className={s["dm-card-host"]}>{sv.host}</div>

									<div className={s["dm-card-actions"]}>
										<Link to="/http-history" className={s["dm-card-link"]}>
											Запросы
										</Link>
										<Link to="/logs" className={s["dm-card-link"]}>
											Логи
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</main>
		</div>
	);
};
