import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
	DataTable,
	type DataTableColumn,
	type SortCriterion,
} from "./DataTable";

const meta: Meta<typeof DataTable> = {
	title: "UI Kit/DataTable",
	component: DataTable,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DataTable>;

/* ─── Shared data ─────────────────────────────────────────────── */

type User = {
	id: number;
	name: string;
	email: string;
	role: "Admin" | "Editor" | "Viewer";
	status: "active" | "inactive";
	createdAt: string;
};

const USERS: User[] = [
	{
		id: 1,
		name: "Иван Петров",
		email: "ivan@example.com",
		role: "Admin",
		status: "active",
		createdAt: "2024-01-12",
	},
	{
		id: 2,
		name: "Мария Сидорова",
		email: "maria@example.com",
		role: "Editor",
		status: "active",
		createdAt: "2024-02-03",
	},
	{
		id: 3,
		name: "Алексей Козлов",
		email: "alex@example.com",
		role: "Viewer",
		status: "inactive",
		createdAt: "2024-03-18",
	},
	{
		id: 4,
		name: "Елена Новикова",
		email: "elena@example.com",
		role: "Editor",
		status: "active",
		createdAt: "2024-04-07",
	},
	{
		id: 5,
		name: "Дмитрий Орлов",
		email: "dmitry@example.com",
		role: "Viewer",
		status: "active",
		createdAt: "2024-05-22",
	},
	{
		id: 6,
		name: "Ольга Фёдорова",
		email: "olga@example.com",
		role: "Admin",
		status: "inactive",
		createdAt: "2024-06-11",
	},
	{
		id: 7,
		name: "Сергей Морозов",
		email: "sergey@example.com",
		role: "Viewer",
		status: "active",
		createdAt: "2024-07-30",
	},
	{
		id: 8,
		name: "Наталья Волкова",
		email: "natalia@example.com",
		role: "Editor",
		status: "active",
		createdAt: "2024-08-14",
	},
	{
		id: 9,
		name: "Андрей Соколов",
		email: "andrey@example.com",
		role: "Viewer",
		status: "inactive",
		createdAt: "2024-09-05",
	},
	{
		id: 10,
		name: "Юлия Лебедева",
		email: "yulia@example.com",
		role: "Editor",
		status: "active",
		createdAt: "2024-10-19",
	},
	{
		id: 11,
		name: "Виктор Попов",
		email: "viktor@example.com",
		role: "Viewer",
		status: "active",
		createdAt: "2024-11-02",
	},
	{
		id: 12,
		name: "Тамара Кузнецова",
		email: "tamara@example.com",
		role: "Admin",
		status: "active",
		createdAt: "2024-12-28",
	},
];

const ROLE_COLOR: Record<User["role"], string> = {
	Admin: "var(--violet, #7c5fe6)",
	Editor: "var(--blue,   #3b82f6)",
	Viewer: "var(--ink-mid)",
};

const badge = (color: string, label: string) => (
	<span
		style={{
			display: "inline-flex",
			alignItems: "center",
			gap: 5,
			fontSize: 11,
			fontWeight: 500,
			padding: "2px 8px",
			borderRadius: "var(--r-pill)",
			border: "1px solid currentColor",
			color,
		}}
	>
		{label}
	</span>
);

const statusDot = (status: User["status"]) => (
	<span
		style={{
			display: "inline-flex",
			alignItems: "center",
			gap: 6,
			fontSize: 13,
			color: "var(--ink)",
		}}
	>
		<span
			style={{
				width: 7,
				height: 7,
				borderRadius: "50%",
				background:
					status === "active" ? "var(--green, #22c55e)" : "var(--ink-low)",
			}}
		/>
		{status === "active" ? "Активен" : "Неактивен"}
	</span>
);

const cell = (content: React.ReactNode) => (
	<div
		style={{
			padding: "0 12px",
			display: "flex",
			alignItems: "center",
			fontSize: 13,
			color: "var(--ink)",
		}}
	>
		{content}
	</div>
);

const BASE_COLUMNS: DataTableColumn<User>[] = [
	{
		label: "Имя",
		sortKey: "name",
		width: "1.8fr",
		render: (u) => cell(u.name),
	},
	{
		label: "Email",
		sortKey: "email",
		width: "2fr",
		render: (u) =>
			cell(
				<span
					style={{
						color: "var(--ink-mid)",
						fontFamily: "var(--font-mono)",
						fontSize: 12,
					}}
				>
					{u.email}
				</span>,
			),
	},
	{
		label: "Роль",
		sortKey: "role",
		width: "120px",
		render: (u) => cell(badge(ROLE_COLOR[u.role], u.role)),
	},
	{
		label: "Статус",
		sortKey: "status",
		width: "130px",
		render: (u) => cell(statusDot(u.status)),
	},
	{
		label: "Создан",
		sortKey: "createdAt",
		width: "120px",
		render: (u) =>
			cell(<span style={{ color: "var(--ink-mid)" }}>{u.createdAt}</span>),
	},
];

/* ─── Stories ─────────────────────────────────────────────────── */

/** Базовая таблица. Клик по заголовку — сортировка, Shift+клик — мульти-уровень */
export const Default: Story = {
	render: () => (
		<DataTable
			columns={BASE_COLUMNS}
			data={USERS}
			getRowKey={(u) => u.id}
			pageSize={5}
		/>
	),
};

/** Контролируемая сортировка — состояние живёт снаружи */
export const ControlledSorting: Story = {
	render: () => {
		const [sort, setSort] = useState<SortCriterion[]>([
			{ key: "name", dir: "asc" },
		]);
		return (
			<DataTable
				columns={BASE_COLUMNS}
				data={USERS}
				getRowKey={(u) => u.id}
				pageSize={5}
				sortCriteria={sort}
				onSortChange={setSort}
			/>
		);
	},
};

/** Кнопка редактирования в последней колонке */
export const WithRowActions: Story = {
	render: () => (
		<DataTable
			columns={BASE_COLUMNS}
			data={USERS}
			getRowKey={(u) => u.id}
			pageSize={5}
			renderRowActions={(u) => (
				<div style={{ display: "flex", justifyContent: "center" }}>
					<button
						type="button"
						title={`Редактировать ${u.name}`}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: 28,
							height: 28,
							border: "none",
							background: "transparent",
							borderRadius: "var(--r-sm)",
							cursor: "pointer",
							color: "var(--ink-mid)",
						}}
					>
						<svg
							aria-hidden="true"
							width="14"
							height="14"
							viewBox="0 0 14 14"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M9.5 2.5l2 2-7 7-2.5.5.5-2.5 7-7z" />
						</svg>
					</button>
				</div>
			)}
		/>
	),
};

/** Разбивка по 4 строки — все кнопки пагинации видны */
export const Pagination: Story = {
	render: () => (
		<DataTable
			columns={BASE_COLUMNS}
			data={USERS}
			getRowKey={(u) => u.id}
			pageSize={4}
		/>
	),
};

/** Мульти-сортировка: стартует с двумя активными уровнями */
export const MultiSort: Story = {
	render: () => {
		const [sort, setSort] = useState<SortCriterion[]>([
			{ key: "role", dir: "asc" },
			{ key: "name", dir: "asc" },
		]);
		return (
			<DataTable
				columns={BASE_COLUMNS}
				data={USERS}
				getRowKey={(u) => u.id}
				pageSize={6}
				sortCriteria={sort}
				onSortChange={setSort}
			/>
		);
	},
};

/** Пустое состояние */
export const Empty: Story = {
	render: () => (
		<DataTable columns={BASE_COLUMNS} data={[]} getRowKey={(u) => u.id} />
	),
};
