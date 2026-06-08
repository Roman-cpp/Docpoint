import { type FC, useEffect, useState } from "react";
import { fetchRequestsApi } from "@/entities/request";
import { cx } from "@/shared/lib/cx";
import { Header } from "@/widgets/header";
import type { HistoryRecord } from "../model/types";
import {
	DataTable,
	type DataTableColumn,
	type DataTableFilter,
} from "./DataTable";
import dt from "./DataTable.module.css";
import { HcDrawer, hcStatusClass } from "./HcDrawer";
import s from "./HttpHistoryPage.module.css";

/* ─── Helpers ─── */
function splitUrl(url: string): { host: string; path: string } {
	const host = (url.match(/^https?:\/\/([^/]+)/) || [])[1] || "";
	const path = url.replace(/^https?:\/\/[^/]+/, "") || "/";
	return { host, path };
}

/** Numeric status from the string `code`; `0` means the request never landed. */
const statusNum = (code: string): number => Number(code) || 0;
const isErrRecord = (r: HistoryRecord): boolean => statusNum(r.code) === 0;

/** ISO `sent_at` → "DD.MM HH:MM" (no timezone shift). */
function formatSentAt(iso: string): string {
	const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
	if (!m) return iso;
	const [, , mo, d, hh, mm] = m;
	return `${d}.${mo} ${hh}:${mm}`;
}

/* ─── Table columns + filters ─── */
const HC_COLUMNS: DataTableColumn<HistoryRecord>[] = [
	{
		key: "method",
		header: "Метод",
		width: "84px",
		render: (r) => (
			<span className={cx(s["hc-pill"], s[`hc-m-${r.method.toLowerCase()}`])}>
				{r.method}
			</span>
		),
	},
	{
		key: "url",
		header: "Endpoint",
		width: "2.4fr",
		render: (r) => {
			const { host, path } = splitUrl(r.url);
			return (
				<div className={s["hc-url-cell"]}>
					<div className={s["hc-url-path"]}>{path}</div>
					<div className={s["hc-url-host"]}>{host}</div>
				</div>
			);
		},
	},
	{
		key: "code",
		header: "Статус",
		width: "104px",
		align: "",
		render: (r) =>
			isErrRecord(r) ? (
				<span className={cx(s["hc-status"], s.err)}>
					<span className={s.sdot} />
					ERR
				</span>
			) : (
				<span
					className={cx(s["hc-status"], s[hcStatusClass(statusNum(r.code))])}
				>
					<span className={s.sdot} />
					{r.code}
				</span>
			),
	},
	{
		key: "duration",
		header: "Время",
		width: "92px",
		align: "num",
		render: (r) =>
			isErrRecord(r) ? (
				<span className={s["hc-dur"]} style={{ color: "var(--ink-low)" }}>
					—
				</span>
			) : (
				<span className={cx(s["hc-dur"], r.duration >= 1000 && s.slow)}>
					{r.duration} мс
				</span>
			),
	},
	{
		key: "sent_at",
		header: "Отправлен",
		width: "130px",
		render: (r) => (
			<span className={cx(dt["dt-muted"], dt["dt-mono"])}>
				{formatSentAt(r.sent_at)}
			</span>
		),
	},
];

const HC_FILTERS: DataTableFilter<HistoryRecord>[] = [
	{ id: "all", label: "Все" },
	{
		id: "ok",
		label: "Успешные",
		predicate: (r) => statusNum(r.code) >= 200 && statusNum(r.code) < 400,
	},
	{
		id: "err",
		label: "Ошибки",
		predicate: (r) => isErrRecord(r) || statusNum(r.code) >= 400,
	},
	{ id: "get", label: "GET", predicate: (r) => r.method === "GET" },
	{ id: "post", label: "POST", predicate: (r) => r.method === "POST" },
	{
		id: "write",
		label: "PUT / PATCH / DELETE",
		predicate: (r) => ["PUT", "PATCH", "DELETE"].includes(r.method),
	},
];

/* ─── Page ─── */
export const HttpHistoryPage: FC = () => {
	const [openId, setOpenId] = useState<string | null>(null);
	const [history, setHistory] = useState<HistoryRecord[]>([]);

	useEffect(() => {
		const controller = new AbortController();
		fetchRequestsApi(controller.signal)
			.then(setHistory)
			.catch((err) => {
				if (err.name !== "AbortError") console.error(err);
			});
		return () => controller.abort();
	}, []);

	const open = openId ? history.find((r) => r.id === openId) : null;

	return (
		<div className={s["hc-frame"]}>
			<Header section="История запросов" activeLink="http-history" />

			<main className={s["hc-page"]}>
				<div className={s["hc-page-inner"]}>
					<DataTable
						title="История запросов"
						subtitle="Все запросы, отправленные из HTTP-клиента. Кликните строку, чтобы посмотреть детали."
						entityName="запросов"
						columns={HC_COLUMNS}
						data={history}
						rowKey={(r) => r.id}
						searchKeys={["url", "method"]}
						filters={HC_FILTERS}
						initialSort={null}
						initialPageSize={8}
						onRowClick={(r) => setOpenId(r.id)}
						activeKey={openId}
					/>
				</div>
			</main>

			{open && <HcDrawer r={open} onClose={() => setOpenId(null)} />}
		</div>
	);
};
