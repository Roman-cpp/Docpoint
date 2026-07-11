import { type FC, useMemo, useState } from "react";
import { Link } from "react-router";
import { cx } from "@/shared/lib/cx";
import { Header } from "@/widgets/header";
import s from "./ServicesPage.module.css";

/* ─── Types (template-local; no API yet) ─── */
type ServiceStatus = "healthy" | "degraded" | "down";

interface Service {
	id: string;
	name: string;
	/** Base URL / host the service answers on. */
	host: string;
	status: ServiceStatus;
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
const SERVICES: Service[] = [
	{
		id: "sv-auth",
		name: "Auth Service",
		host: "auth.nexus.io",
		status: "healthy",
		requests: 12840,
		logs: 4210,
		errorRate: 0.004,
		lastSeen: "2026-06-09T10:42:18",
	},
	{
		id: "sv-billing",
		name: "Billing Service",
		host: "billing.nexus.io",
		status: "degraded",
		requests: 6132,
		logs: 8902,
		errorRate: 0.061,
		lastSeen: "2026-06-09T10:41:30",
	},
	{
		id: "sv-catalog",
		name: "Catalog Service",
		host: "catalog.nexus.io",
		status: "healthy",
		requests: 28471,
		logs: 1203,
		errorRate: 0.001,
		lastSeen: "2026-06-09T10:42:05",
	},
	{
		id: "sv-import",
		name: "Import Worker",
		host: "import.nexus.io",
		status: "down",
		requests: 904,
		logs: 15677,
		errorRate: 0.214,
		lastSeen: "2026-06-09T09:58:11",
	},
	{
		id: "sv-notify",
		name: "Notification Service",
		host: "notify.nexus.io",
		status: "healthy",
		requests: 3318,
		logs: 2044,
		errorRate: 0.012,
		lastSeen: "2026-06-09T10:40:48",
	},
	{
		id: "sv-gateway",
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
const STATUS_FILTERS: { id: ServiceStatus | "all"; label: string }[] = [
	{ id: "all", label: "Все" },
	{ id: "healthy", label: "Работают" },
	{ id: "degraded", label: "Деградация" },
	{ id: "down", label: "Недоступны" },
];

const STATUS_LABEL: Record<ServiceStatus, string> = {
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

/** 12840 → "12 840". */
function formatNum(n: number): string {
	return n.toLocaleString("ru-RU");
}

/* ─── Page ─── */
export const ServicesPage: FC = () => {
	const [search, setSearch] = useState("");
	const [activeStatus, setActiveStatus] = useState<ServiceStatus | "all">(
		"all",
	);

	const rows = useMemo(() => {
		const q = search.trim().toLowerCase();
		return SERVICES.filter((sv) => {
			if (activeStatus !== "all" && sv.status !== activeStatus) return false;
			if (!q) return true;
			return (
				sv.name.toLowerCase().includes(q) || sv.host.toLowerCase().includes(q)
			);
		});
	}, [search, activeStatus]);

	const counts = useMemo(() => {
		const c: Record<string, number> = {};
		for (const sv of SERVICES) c[sv.status] = (c[sv.status] ?? 0) + 1;
		return c;
	}, []);

	return (
		<div className={s["sv-frame"]}>
			<Header section="Сервисы" activeLink="services" />

			<main className={s["sv-page"]}>
				<div className={s["sv-page-inner"]}>
					{/* Toolbar */}
					<div className={s["sv-toolbar"]}>
						<div className={s["sv-toolbar-head"]}>
							<div>
								<h1 className={s["sv-title"]}>Сервисы</h1>
								<p className={s["sv-subtitle"]}>
									Источники, по которым хранятся логи и запросы. Кликните
									карточку, чтобы перейти к их записям.
								</p>
							</div>
						</div>

						<div className={s["sv-toolbar-controls"]}>
							<label className={s["sv-search"]}>
								<SearchIcon />
								<input
									type="text"
									placeholder="Поиск по названию или хосту…"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
							</label>

							<div className={s["sv-chips"]}>
								{STATUS_FILTERS.map((f) => (
									<button
										key={f.id}
										type="button"
										className={cx(
											s["sv-chip"],
											activeStatus === f.id && s.active,
										)}
										onClick={() => setActiveStatus(f.id)}
									>
										{f.label}
										{f.id !== "all" && (
											<span className={s["sv-chip-count"]}>
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
						<div className={s["sv-empty"]}>
							Нет сервисов по заданным условиям
						</div>
					) : (
						<div className={s["sv-grid"]}>
							{rows.map((sv) => (
								<div key={sv.id} className={s["sv-card"]}>
									<div className={s["sv-card-head"]}>
										<span
											className={cx(s["sv-status"], s[`sv-st-${sv.status}`])}
										>
											<span className={s["sv-dot"]} />
											{STATUS_LABEL[sv.status]}
										</span>
										<span className={s["sv-card-spacer"]} />
										<span className={s["sv-card-seen"]}>
											{formatAt(sv.lastSeen)}
										</span>
									</div>

									<h2 className={s["sv-card-name"]}>{sv.name}</h2>
									<div className={s["sv-card-host"]}>{sv.host}</div>

									<div className={s["sv-card-actions"]}>
										<Link to="/http-history" className={s["sv-card-link"]}>
											Запросы
										</Link>
										<Link to="/logs" className={s["sv-card-link"]}>
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

/* ─── Icons ─── */
const SearchIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="14"
		height="14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
	>
		<title>search</title>
		<circle cx="6" cy="6" r="4.2" />
		<path d="M9.2 9.2L12 12" />
	</svg>
);
