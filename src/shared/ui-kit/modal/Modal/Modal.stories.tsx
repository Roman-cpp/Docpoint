import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Field, Input } from "@/shared/ui-kit/controls";
import {
	Modal,
	ModalBtnCancel,
	ModalBtnDanger,
	ModalBtnPrimary,
} from "./Modal";

const meta: Meta<typeof Modal> = {
	title: "UI Kit/Modal",
	component: Modal,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Modal>;

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

export const CreateForm: Story = {
	name: "Form — create",
	render: () => (
		<WithTrigger label="Новая переменная">
			{({ open, onOpenChange }) => (
				<Modal
					open={open}
					onOpenChange={onOpenChange}
					title="Новая переменная"
					subtitle="Подставляется в URL, headers и body как {{NAME}}"
					actions={
						<>
							<ModalBtnCancel onClick={() => onOpenChange(false)}>
								Отмена
							</ModalBtnCancel>
							<ModalBtnPrimary>Создать</ModalBtnPrimary>
						</>
					}
				>
					<Field label="Name" required>
						<Input
							placeholder="VARIABLE_NAME"
							autoFocus
							style={{ width: "100%", fontFamily: "var(--font-mono)" }}
						/>
					</Field>
					<Field label="Value">
						<Input
							placeholder="value"
							style={{ width: "100%", fontFamily: "var(--font-mono)" }}
						/>
					</Field>
				</Modal>
			)}
		</WithTrigger>
	),
};

export const EditForm: Story = {
	name: "Form — edit",
	render: () => (
		<WithTrigger label="Редактировать">
			{({ open, onOpenChange }) => (
				<Modal
					open={open}
					onOpenChange={onOpenChange}
					title="Редактировать переменную"
					subtitle="Изменения применятся ко всем запросам этого окружения"
					actions={
						<>
							<ModalBtnCancel onClick={() => onOpenChange(false)}>
								Отмена
							</ModalBtnCancel>
							<ModalBtnPrimary>Сохранить</ModalBtnPrimary>
						</>
					}
				>
					<Field label="Name" required>
						<Input
							defaultValue="BASE_URL"
							style={{ width: "100%", fontFamily: "var(--font-mono)" }}
						/>
					</Field>
					<Field label="Value">
						<Input
							defaultValue="https://api.example.com"
							style={{ width: "100%", fontFamily: "var(--font-mono)" }}
						/>
					</Field>
				</Modal>
			)}
		</WithTrigger>
	),
};

export const DeleteConfirm: Story = {
	name: "Confirm — delete",
	render: () => (
		<WithTrigger label="Удалить переменную">
			{({ open, onOpenChange }) => (
				<Modal
					open={open}
					onOpenChange={onOpenChange}
					title="Удалить переменную"
					subtitle="Действие необратимо. Переменная будет удалена из окружения."
					actions={
						<>
							<ModalBtnCancel onClick={() => onOpenChange(false)}>
								Отмена
							</ModalBtnCancel>
							<ModalBtnDanger autoFocus>Удалить</ModalBtnDanger>
						</>
					}
				>
					<p
						style={{
							margin: 0,
							fontSize: 13,
							color: "var(--ink)",
							lineHeight: "var(--lh-snug)",
						}}
					>
						Удалить переменную{" "}
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
							{"{{BASE_URL}}"}
						</code>
						?
					</p>
				</Modal>
			)}
		</WithTrigger>
	),
};

export const WideModal: Story = {
	name: "Wide — custom width",
	render: () => (
		<WithTrigger label="Открыть широкую модалку">
			{({ open, onOpenChange }) => (
				<Modal
					open={open}
					onOpenChange={onOpenChange}
					title="Новое окружение"
					subtitle="Базовый URL и тег для группы запросов"
					width={520}
					actions={
						<>
							<ModalBtnCancel onClick={() => onOpenChange(false)}>
								Отмена
							</ModalBtnCancel>
							<ModalBtnPrimary>Создать</ModalBtnPrimary>
						</>
					}
				>
					<Field label="Label" required>
						<Input placeholder="Production" style={{ width: "100%" }} />
					</Field>
					<Field label="Env tag" required>
						<Input
							placeholder="prod"
							style={{ width: "100%", fontFamily: "var(--font-mono)" }}
						/>
					</Field>
					<Field label="Base URL">
						<Input
							placeholder="https://api.example.com"
							style={{ width: "100%", fontFamily: "var(--font-mono)" }}
						/>
					</Field>
					<Field label="Prefix">
						<Input
							placeholder="/api/v1"
							style={{ width: "100%", fontFamily: "var(--font-mono)" }}
						/>
					</Field>
				</Modal>
			)}
		</WithTrigger>
	),
};

export const NoActions: Story = {
	name: "Info — no actions",
	render: () => (
		<WithTrigger label="Открыть инфо-модалку">
			{({ open, onOpenChange }) => (
				<Modal
					open={open}
					onOpenChange={onOpenChange}
					title="О компоненте"
					subtitle="Шаблон для любых модальных окон"
				>
					<p
						style={{
							margin: 0,
							fontSize: 13,
							color: "var(--ink-mid)",
							lineHeight: "var(--lh-body)",
						}}
					>
						Компонент{" "}
						<code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
							Modal
						</code>{" "}
						принимает <strong>open</strong>, <strong>onOpenChange</strong>,{" "}
						<strong>title</strong>, <strong>subtitle</strong>,{" "}
						<strong>actions</strong> и <strong>width</strong>. Нажмите Escape
						или кликните на оверлей чтобы закрыть.
					</p>
				</Modal>
			)}
		</WithTrigger>
	),
};
