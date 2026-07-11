import { type FC, useEffect, useState } from "react";
import type { HttpMethod } from "@/entities/endpoint";
import type { RequestSummary } from "@/entities/request";
import {
	actionDeleteAllRequests,
	actionFetchRequests,
	actionResetFilters,
	actionSelectRequest,
	actionSetMethodFilter,
	actionSetPage,
	actionSetPerPage,
	actionSetSearch,
	selectPagination,
	selectRequestList,
	selectSearch,
	selectSelectedRequest,
	useRequestStore,
} from "@/features/request";
import { cx } from "@/shared/lib/cx";
import { Dialog } from "@/shared/ui-kit/modal";
import { Header } from "@/widgets/header";
import { Sidebar } from "@/widgets/sidebar";
import {
	DataTable,
	type DataTableColumn,
	type DataTableFilter,
} from "../DataTable";
import dt from "../DataTable.module.css";
import { DtToolbar } from "../DtToolbar";
import { HcDrawer, hcStatusClass } from "../HcDrawer";
import s from "../HttpHistoryPage.module.css";

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

/**
 * Toolbar chips. Each chip is single-select.
 *
 * Method chips carry `methods` → applied server-side via the request store
 * (`setMethodFilter` + refetch). Status-range chips keep a client-side
 * `predicate`, because the server `status` filter matches exact codes, not
 * ranges. "Все" clears the server filter.
 */
interface HcFilter extends DataTableFilter<RequestSummary> {
	/** HTTP methods sent to the server as `?method=...`. */
	methods?: HttpMethod[];
}

const HC_FILTERS: HcFilter[] = [
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
	{ id: "get", label: "GET", methods: ["GET"] },
	{ id: "post", label: "POST", methods: ["POST"] },
	{
		id: "write",
		label: "PUT / PATCH / DELETE",
		methods: ["PUT", "PATCH", "DELETE"],
	},
];

/* ─── Page ─── */
export const HttpHistoryPage: FC = () => {
	const requestList = useRequestStore(selectRequestList);
	const request = useRequestStore(selectSelectedRequest);
	const search = useRequestStore(selectSearch);
	const pagination = useRequestStore(selectPagination);

	const [isDialogRequestDetailOpen, setIsDialogRequestDetailOpen] =
		useState<boolean>(false);
	const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const fetchRequests = useRequestStore(actionFetchRequests);
	const selectRequest = useRequestStore(actionSelectRequest);
	const setSearch = useRequestStore(actionSetSearch);
	const setMethodFilter = useRequestStore(actionSetMethodFilter);
	const resetFilters = useRequestStore(actionResetFilters);
	const deleteAllRequests = useRequestStore(actionDeleteAllRequests);
	const setPage = useRequestStore(actionSetPage);
	const setPerPage = useRequestStore(actionSetPerPage);

	const [activeFilter, setActiveFilter] = useState<string | null>(
		HC_FILTERS[0].id,
	);

	useEffect(() => {
		fetchRequests();
	}, [fetchRequests]);

	/**
	 * Apply a toolbar chip. Method chips push their methods to the server
	 * filter and refetch; status-range chips reset the server filter (so the
	 * full list is fetched) and rely on the client-side predicate in DataTable.
	 */
	const onFilter = (id: string) => {
		const filter = HC_FILTERS.find((f) => f.id === id);
		if (filter?.methods) {
			setMethodFilter(filter.methods);
		} else {
			resetFilters();
		}
		setActiveFilter(id);
		fetchRequests();
	};

	const close = () => setIsDialogRequestDetailOpen(false);

	const confirmDeleteAll = async () => {
		setIsDeleting(true);
		try {
			await deleteAllRequests();
			setIsConfirmDeleteOpen(false);
		} catch (e) {
			console.error("[HttpHistoryPage] deleteAllRequests failed:", e);
		} finally {
			setIsDeleting(false);
		}
	};

	const onRowClick = (request: RequestSummary) => {
		selectRequest(request.id);
		setIsDialogRequestDetailOpen(true);
	};

	return (
		<div className={s["hc-frame"]}>
			<Header section="История запросов" activeLink="http-history" />

			<div className={s["hc-body"]}>
				<Sidebar />

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
							onFilter={onFilter}
							toolbarActions={
								<button
									type="button"
									className={cx(dt["dt-btn"], dt["dt-btn-danger"])}
									onClick={() => setIsConfirmDeleteOpen(true)}
									disabled={requestList.length === 0}
								>
									<TrashIcon />
									Удалить все
								</button>
							}
						/>
						<DataTable
							columns={HC_COLUMNS}
							data={requestList}
							rowKey={(r) => r.id}
							search={search}
							activeFilter={activeFilter}
							filters={HC_FILTERS}
							initialSort={null}
							serverPagination={{
								pageIndex: Math.max(0, pagination.page - 1),
								pageSize: pagination.perPage || 25,
								pageCount: pagination.totalPages,
								total: pagination.total,
								onPageChange: (pageIndex) => setPage(pageIndex + 1),
								onPageSizeChange: setPerPage,
							}}
							onRowClick={(r) => onRowClick(r)}
							activeKey={request?.id ?? null}
						/>
					</div>
				</main>
			</div>

			{isDialogRequestDetailOpen && <HcDrawer onClose={close} />}

			<Dialog.Root
				open={isConfirmDeleteOpen}
				onOpenChange={(open) => !isDeleting && setIsConfirmDeleteOpen(open)}
			>
				<Dialog.Header>
					<Dialog.Title>Удалить все логи?</Dialog.Title>
					<Dialog.Subtitle>
						Все записи истории запросов будут удалены без возможности
						восстановления.
					</Dialog.Subtitle>
					<Dialog.Close />
				</Dialog.Header>
				<Dialog.Body>
					<p className={s["hc-confirm-text"]}>Это действие нельзя отменить.</p>
				</Dialog.Body>
				<Dialog.Footer>
					<Dialog.BtnCancel
						onClick={() => setIsConfirmDeleteOpen(false)}
						disabled={isDeleting}
					>
						Отмена
					</Dialog.BtnCancel>
					<Dialog.BtnDanger onClick={confirmDeleteAll} disabled={isDeleting}>
						{isDeleting ? "Удаляем…" : "Удалить все"}
					</Dialog.BtnDanger>
				</Dialog.Footer>
			</Dialog.Root>
		</div>
	);
};

/* ─── Icons ─── */
const TrashIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="13"
		height="13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>delete</title>
		<path d="M2.5 3.5h9M5 3.5V2.5h4v1M4 3.5l.5 8h5l.5-8" />
	</svg>
);
