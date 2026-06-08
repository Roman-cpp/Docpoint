import { type FC, useEffect, useState } from "react";
import type { RequestSummary } from "@/entities/request";
import {
	actionFetchRequests,
	actionSelectRequest,
	actionSetSearch,
	selectRequestList,
	selectSearch,
	selectSelectedRequest,
	useRequestStore,
} from "@/features/request";
import { cx } from "@/shared/lib/cx";
import { Header } from "@/widgets/header";
import {
	DataTable,
	type DataTableColumn,
	type DataTableFilter,
} from "./DataTable";
import dt from "./DataTable.module.css";
import { DtToolbar } from "./DtToolbar";
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
const isErrRecord = (r: RequestSummary): boolean => statusNum(r.code) === 0;

/** ISO `sent_at` → "DD.MM HH:MM" (no timezone shift). */
function formatSentAt(iso: string): string {
	const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
	if (!m) return iso;
	const [, , mo, d, hh, mm] = m;
	return `${d}.${mo} ${hh}:${mm}`;
}

/* ─── Table columns + filters ─── */
const HC_COLUMNS: DataTableColumn<RequestSummary>[] = [
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
			const { path } = splitUrl(r.url);
			return (
				<div className={s["hc-url-cell"]}>
					<div className={s["hc-url-path"]}>{path}</div>
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

const HC_FILTERS: DataTableFilter<RequestSummary>[] = [
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
	const requestList = useRequestStore(selectRequestList);
	const request = useRequestStore(selectSelectedRequest);
	const search = useRequestStore(selectSearch);

  const [isDialogRequestDetailOpen, setIsDialogRequestDetailOpen] = useState<boolean>(false)

	const fetchRequests = useRequestStore(actionFetchRequests);
	const selectRequest = useRequestStore(actionSelectRequest);
	const setSearch = useRequestStore(actionSetSearch);

	const [activeFilter, setActiveFilter] = useState<string | null>(
		HC_FILTERS[0].id,
	);

	useEffect(() => {
		fetchRequests();
	}, [fetchRequests]);

	const close = () => setIsDialogRequestDetailOpen(false);

  const onRowClick = (request: RequestSummary) => {
    selectRequest(request.id);
    setIsDialogRequestDetailOpen(true);
  }

	return (
		<div className={s["hc-frame"]}>
			<Header section="История запросов" activeLink="http-history" />

			<main className={s["hc-page"]}>
				<div className={s["hc-page-inner"]}>
					<DtToolbar
						title="История запросов"
						subtitle="Все запросы, отправленные из HTTP-клиента. Кликните строку, чтобы посмотреть детали."
						data={requestList}
						searchKeys={["url", "method"]}
						search={search}
						onSearch={setSearch}
						filters={HC_FILTERS}
						activeFilter={activeFilter}
						onFilter={setActiveFilter}
					/>
					<DataTable
						columns={HC_COLUMNS}
						data={requestList}
						rowKey={(r) => r.id}
						search={search}
						activeFilter={activeFilter}
						searchKeys={["url", "method"]}
						filters={HC_FILTERS}
						initialSort={null}
						initialPageSize={25}
						onRowClick={(r) => onRowClick(r)}
						activeKey={request?.id ?? null}
					/>
				</div>
			</main>

			{isDialogRequestDetailOpen && <HcDrawer onClose={close} />}
		</div>
	);
};
