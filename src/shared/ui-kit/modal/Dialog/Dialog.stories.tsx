import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "./Dialog";

const meta: Meta<typeof Dialog.Root> = {
	title: "UI Kit/Dialog",
	component: Dialog.Root,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Dialog.Root>;

/* ─── Обёртка с кнопкой открытия ────────────────────────── */
const WithTrigger = ({
	label,
	children,
}: {
	label: string;
	children: (props: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
	}) => React.ReactNode;
}) => {
	const [open, setOpen] = useState(false);
	return (
		<div
			style={{
				height: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "var(--bg)",
			}}
		>
			<button
				type="button"
				onClick={() => setOpen(true)}
				style={{
					fontFamily: "var(--font-sans)",
					fontSize: 13,
					fontWeight: 500,
					padding: "10px 18px",
					borderRadius: "var(--r-md)",
					border: "1px solid var(--ink)",
					background: "var(--ink)",
					color: "var(--surface)",
					cursor: "pointer",
				}}
			>
				{label}
			</button>
			{children({ open, onOpenChange: setOpen })}
		</div>
	);
};

/* ─── Stories ────────────────────────────────────────────── */

/** Форма создания — повторяет CreateDocModal на compound-API. */
export const CreateForm: Story = {
	name: "Form — create",
	render: () => (
		<WithTrigger label="Новый документ">
			{({ open, onOpenChange }) => (
				<Dialog.Root open={open} onOpenChange={onOpenChange}>
					<Dialog.Header>
						<Dialog.Title>Новый документ</Dialog.Title>
						<Dialog.Subtitle>
							Создайте документ, чтобы добавлять в него endpoints
						</Dialog.Subtitle>
						<Dialog.Close />
					</Dialog.Header>
					<Dialog.Body>
						<Field label="Название" required>
							<Input
								placeholder="Например, Payments API"
								style={{ width: "100%" }}
							/>
						</Field>
						<Field label="Версия">
							<Input
								defaultValue="1.0.0"
								style={{ width: "100%", fontFamily: "var(--font-mono)" }}
							/>
						</Field>
						<Field label="Описание">
							<Textarea
								placeholder="Краткое описание документа"
								rows={3}
								style={{ width: "100%" }}
							/>
						</Field>
						<Field label="Теги" hint="Список через запятую">
							<Input
								placeholder="payments, v1, internal"
								style={{ width: "100%", fontFamily: "var(--font-mono)" }}
							/>
						</Field>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.BtnCancel onClick={() => onOpenChange(false)}>
							Отмена
						</Dialog.BtnCancel>
						<Dialog.BtnPrimary autoFocus>Создать</Dialog.BtnPrimary>
					</Dialog.Footer>
				</Dialog.Root>
			)}
		</WithTrigger>
	),
};

/** Подтверждение удаления — вариант кнопки danger. */
export const DeleteConfirm: Story = {
	name: "Confirm — delete",
	render: () => (
		<WithTrigger label="Удалить документ">
			{({ open, onOpenChange }) => (
				<Dialog.Root open={open} onOpenChange={onOpenChange}>
					<Dialog.Header>
						<Dialog.Title>Удалить документ</Dialog.Title>
						<Dialog.Subtitle>
							Действие необратимо. Документ и его endpoints будут удалены.
						</Dialog.Subtitle>
						<Dialog.Close />
					</Dialog.Header>
					<Dialog.Body>
						<p
							style={{
								margin: 0,
								fontSize: 13,
								color: "var(--ink)",
								lineHeight: "var(--lh-snug)",
							}}
						>
							Удалить документ{" "}
							<code
								style={{
									fontFamily: "var(--font-mono)",
									fontSize: 12,
									padding: "1px 6px",
									background: "var(--cat-bg)",
									border: "1px solid var(--border)",
									borderRadius: "var(--r-sm)",
								}}
							>
								Payments API
							</code>
							?
						</p>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.BtnCancel onClick={() => onOpenChange(false)}>
							Отмена
						</Dialog.BtnCancel>
						<Dialog.BtnDanger autoFocus>Удалить</Dialog.BtnDanger>
					</Dialog.Footer>
				</Dialog.Root>
			)}
		</WithTrigger>
	),
};

/** Своя ширина бокса через проп `width`. */
export const WideDialog: Story = {
	name: "Wide — custom width",
	render: () => (
		<WithTrigger label="Открыть широкую модалку">
			{({ open, onOpenChange }) => (
				<Dialog.Root open={open} onOpenChange={onOpenChange} width={520}>
					<Dialog.Header>
						<Dialog.Title>Новое окружение</Dialog.Title>
						<Dialog.Subtitle>
							Базовый URL и тег для группы запросов
						</Dialog.Subtitle>
						<Dialog.Close />
					</Dialog.Header>
					<Dialog.Body>
						<Field label="Label" required>
							<Input placeholder="Production" style={{ width: "100%" }} />
						</Field>
						<Field label="Base URL">
							<Input
								placeholder="https://api.example.com"
								style={{ width: "100%", fontFamily: "var(--font-mono)" }}
							/>
						</Field>
					</Dialog.Body>
					<Dialog.Footer>
						<Dialog.BtnCancel onClick={() => onOpenChange(false)}>
							Отмена
						</Dialog.BtnCancel>
						<Dialog.BtnPrimary>Создать</Dialog.BtnPrimary>
					</Dialog.Footer>
				</Dialog.Root>
			)}
		</WithTrigger>
	),
};
