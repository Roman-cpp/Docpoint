import { type FC, useState } from "react";
import { cx } from "@/shared/lib/cx";
import { Header } from "@/widgets/header";
import { HC_HISTORY } from "../data/historyData";
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

/* ─── Table columns + filters ─── */
const HC_COLUMNS: DataTableColumn<HistoryRecord>[] = [
	{
		key: "method",
		header: "Метод",
		width: "84px",
		sortable: true,
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
		sortable: true,
		sortValue: (r) => splitUrl(r.url).path,
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
		key: "status",
		header: "Статус",
		width: "104px",
		align: "",
		sortable: true,
		render: (r) =>
			r.isError ? (
				<span className={cx(s["hc-status"], s.err)}>
					<span className={s.sdot} />
					ERR
				</span>
			) : (
				<span className={cx(s["hc-status"], s[hcStatusClass(r.status)])}>
					<span className={s.sdot} />
					{r.status}
				</span>
			),
	},
	{
		key: "duration",
		header: "Время",
		width: "92px",
		align: "num",
		sortable: true,
		render: (r) =>
			r.isError ? (
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
		key: "size",
		header: "Размер",
		width: "84px",
		align: "num",
		render: (r) => (
			<span className={cx(dt["dt-mono"], dt["dt-muted"])}>{r.size}</span>
		),
	},
	{
		key: "sentAt",
		header: "Отправлен",
		width: "130px",
		render: (r) => (
			<span className={cx(dt["dt-muted"], dt["dt-mono"])}>{r.sentAt}</span>
		),
	},
];

const HC_FILTERS: DataTableFilter<HistoryRecord>[] = [
	{ id: "all", label: "Все" },
	{
		id: "ok",
		label: "Успешные",
		predicate: (r) => r.status >= 200 && r.status < 400,
	},
	{
		id: "err",
		label: "Ошибки",
		predicate: (r) => r.status >= 400 || !!r.isError,
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
	const open = openId ? HC_HISTORY.find((r) => r.id === openId) : null;

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
						data={HC_HISTORY}
						rowKey={(r) => r.id}
						searchKeys={["url", "title", "method"]}
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
