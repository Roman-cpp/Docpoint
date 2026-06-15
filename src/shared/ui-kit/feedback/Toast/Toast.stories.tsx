import type { Meta, StoryObj } from "@storybook/react";
import type { FC } from "react";
import { Button } from "../../controls/Button/Button";
import { ToastProvider, type ToastVariant, useToast } from "./Toast";

const meta: Meta = {
	title: "UI Kit/Toast",
	parameters: { layout: "centered" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

/* ─── Helpers ───────────────────────────────────────────────── */

const VARIANTS: {
	variant: ToastVariant;
	label: string;
	title: string;
	message: string;
}[] = [
	{
		variant: "success",
		label: "Success",
		title: "Изменения сохранены",
		message: "Конфигурация обновлена и применена.",
	},
	{
		variant: "error",
		label: "Error",
		title: "Ошибка деплоя",
		message: "Не удалось подключиться к серверу.",
	},
	{
		variant: "warning",
		label: "Warning",
		title: "Истекает срок токена",
		message: "Обновите API-ключ в течение 3 дней.",
	},
	{
		variant: "info",
		label: "Info",
		title: "Синхронизация запущена",
		message: "Данные обновятся через несколько секунд.",
	},
];

/* ─── All variants playground ───────────────────────────────── */

const Playground: FC = () => {
	const { push } = useToast();
	return (
		<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
			{VARIANTS.map(({ variant, label, title, message }) => (
				<Button
					key={variant}
					variant="ghost"
					onClick={() => push({ variant, title, message })}
				>
					{label}
				</Button>
			))}
		</div>
	);
};

export const AllVariants: Story = {
	name: "All variants",
	render: () => (
		<ToastProvider>
			<Playground />
		</ToastProvider>
	),
};

/* ─── Title only ────────────────────────────────────────────── */

const TitleOnlyDemo: FC = () => {
	const { push } = useToast();
	return (
		<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
			{VARIANTS.map(({ variant, label, title }) => (
				<Button
					key={variant}
					variant="ghost"
					onClick={() => push({ variant, title })}
				>
					{label}
				</Button>
			))}
		</div>
	);
};

export const TitleOnly: Story = {
	name: "Title only",
	render: () => (
		<ToastProvider>
			<TitleOnlyDemo />
		</ToastProvider>
	),
};

/* ─── Persistent ────────────────────────────────────────────── */

const PersistentDemo: FC = () => {
	const { push } = useToast();
	return (
		<Button
			variant="ghost"
			onClick={() =>
				push({
					variant: "warning",
					title: "Требуется подтверждение",
					message: "Это уведомление не исчезнет автоматически.",
					duration: 0,
				})
			}
		>
			Постоянное уведомление
		</Button>
	);
};

export const Persistent: Story = {
	name: "Persistent (no auto-dismiss)",
	render: () => (
		<ToastProvider>
			<PersistentDemo />
		</ToastProvider>
	),
};

/* ─── Multiple stacked ──────────────────────────────────────── */

const StackDemo: FC = () => {
	const { push } = useToast();

	const pushAll = () => {
		push({
			variant: "info",
			title: "Сборка запущена",
			message: "production-v2.1.0",
		});
		setTimeout(
			() =>
				push({
					variant: "warning",
					title: "Предупреждение линтера",
					message: "3 предупреждения в src/api",
				}),
			200,
		);
		setTimeout(
			() =>
				push({
					variant: "success",
					title: "Сборка завершена",
					message: "Время: 12.4 сек",
				}),
			400,
		);
	};

	return (
		<Button variant="primary" onClick={pushAll}>
			Запустить все
		</Button>
	);
};

export const Stacked: Story = {
	name: "Stacked toasts",
	render: () => (
		<ToastProvider>
			<StackDemo />
		</ToastProvider>
	),
};
