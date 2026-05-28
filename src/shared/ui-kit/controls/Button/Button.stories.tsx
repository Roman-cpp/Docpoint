import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const PlusIcon = () => (
	<svg
		viewBox="0 0 14 14"
		width={12}
		height={12}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
	>
		<title>plus</title>
		<path d="M7 2v10M2 7h10" />
	</svg>
);

const TrashIcon = () => (
	<svg
		viewBox="0 0 14 14"
		width={12}
		height={12}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>delete</title>
		<path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M3.5 3.5l.5 9a1 1 0 0 0 1 .9h4a1 1 0 0 0 1-.9l.5-9" />
	</svg>
);

const PencilIcon = () => (
	<svg
		viewBox="0 0 14 14"
		width={12}
		height={12}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>edit</title>
		<path d="M9 2.5L11.5 5l-7 7H2v-2.5l7-7zM8 3.5L10.5 6" />
	</svg>
);

const BoltIcon = () => (
	<svg
		viewBox="0 0 14 14"
		width={13}
		height={13}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>bolt</title>
		<path d="M8 1L2.5 8h4L6 13l5.5-7h-4z" />
	</svg>
);

const meta: Meta<typeof Button> = {
	title: "UI Kit/Button",
	component: Button,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["primary", "ghost", "subtle", "danger", "danger-ghost", "icon"],
		},
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Button>;

/* ─── Одиночные примеры ──────────────────────────────────── */

export const Primary: Story = {
	args: { variant: "primary", children: "Создать окружение" },
};

export const Ghost: Story = {
	args: { variant: "ghost", children: "Отмена" },
};

export const Subtle: Story = {
	args: { variant: "subtle", children: "Подробнее" },
};

export const Danger: Story = {
	args: { variant: "danger", children: "Удалить" },
};

export const DangerGhost: Story = {
	name: "Danger Ghost",
	args: { variant: "danger-ghost", children: "Удалить окружение" },
};

export const WithIcon: Story = {
	args: {
		variant: "primary",
		icon: <PlusIcon />,
		children: "Добавить переменную",
	},
};

export const WithIconGhost: Story = {
	args: { variant: "ghost", icon: <TrashIcon />, children: "Удалить" },
};

export const Loading: Story = {
	args: { variant: "primary", loading: true, children: "Сохраняем…" },
};

export const Disabled: Story = {
	args: { variant: "primary", disabled: true, children: "Недоступно" },
};

/* ─── Icon-only ──────────────────────────────────────────── */

export const IconOnly: Story = {
	name: "Icon only",
	args: {
		variant: "icon",
		children: <PencilIcon />,
		"aria-label": "Редактировать",
	},
};

/* ─── Размеры ────────────────────────────────────────────── */

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
			<Button variant="primary" size="sm">
				Small
			</Button>
			<Button variant="primary" size="md">
				Medium
			</Button>
			<Button variant="primary" size="lg">
				Large
			</Button>
		</div>
	),
};

/* ─── Все варианты ───────────────────────────────────────── */

export const AllVariants: Story = {
	name: "All variants",
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
			{/* Primary */}
			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<Button variant="primary">Primary</Button>
				<Button variant="primary" icon={<PlusIcon />}>
					With icon
				</Button>
				<Button variant="primary" loading>
					Loading
				</Button>
				<Button variant="primary" disabled>
					Disabled
				</Button>
			</div>

			{/* Ghost */}
			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<Button variant="ghost">Ghost</Button>
				<Button variant="ghost" icon={<TrashIcon />}>
					With icon
				</Button>
				<Button variant="ghost" disabled>
					Disabled
				</Button>
			</div>

			{/* Subtle */}
			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<Button variant="subtle">Subtle</Button>
				<Button variant="subtle" icon={<BoltIcon />}>
					Fetch token
				</Button>
			</div>

			{/* Danger */}
			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<Button variant="danger">Danger filled</Button>
				<Button variant="danger" loading>
					Удаляем…
				</Button>
				<Button variant="danger-ghost">Danger ghost</Button>
			</div>

			{/* Icon-only */}
			<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
				<Button variant="icon" aria-label="Редактировать">
					<PencilIcon />
				</Button>
				<Button variant="icon" aria-label="Удалить">
					<TrashIcon />
				</Button>
				<Button variant="icon" aria-label="Добавить">
					<PlusIcon />
				</Button>
			</div>
		</div>
	),
};

/* ─── Группа действий (как в модалке) ───────────────────── */

export const ActionGroup: Story = {
	name: "Action group",
	render: () => (
		<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
			<Button variant="ghost">Отмена</Button>
			<Button variant="primary" size="lg">
				Сохранить
			</Button>
		</div>
	),
};
