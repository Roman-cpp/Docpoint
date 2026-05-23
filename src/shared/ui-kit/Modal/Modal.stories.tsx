import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Modal, ModalBtnCancel, ModalBtnDanger, ModalBtnPrimary } from "./Modal";
import { Input } from "../Input/Input";
import { Field } from "../Field/Field";

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
	children: (onClose: () => void) => React.ReactNode;
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
			{open && children(() => setOpen(false))}
		</div>
	);
};

/* ─── Stories ────────────────────────────────────────────── */

export const CreateForm: Story = {
	name: "Form — create",
	render: () => (
		<WithTrigger label="Новая переменная">
			{(onClose) => (
				<Modal
					title="Новая переменная"
					subtitle="Подставляется в URL, headers и body как {{NAME}}"
					onClose={onClose}
					actions={
						<>
							<ModalBtnCancel onClick={onClose}>Отмена</ModalBtnCancel>
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
			{(onClose) => (
				<Modal
					title="Редактировать переменную"
					subtitle="Изменения применятся ко всем запросам этого окружения"
					onClose={onClose}
					actions={
						<>
							<ModalBtnCancel onClick={onClose}>Отмена</ModalBtnCancel>
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
			{(onClose) => (
				<Modal
					title="Удалить переменную"
					subtitle="Действие необратимо. Переменная будет удалена из окружения."
					onClose={onClose}
					actions={
						<>
							<ModalBtnCancel onClick={onClose}>Отмена</ModalBtnCancel>
							<ModalBtnDanger autoFocus>Удалить</ModalBtnDanger>
						</>
					}
				>
					<p style={{ margin: 0, fontSize: 13, color: "var(--ink)", lineHeight: "var(--lh-snug)" }}>
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
			{(onClose) => (
				<Modal
					title="Новое окружение"
					subtitle="Базовый URL и тег для группы запросов"
					onClose={onClose}
					width={520}
					actions={
						<>
							<ModalBtnCancel onClick={onClose}>Отмена</ModalBtnCancel>
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
			{(onClose) => (
				<Modal title="О компоненте" subtitle="Шаблон для любых модальных окон" onClose={onClose}>
					<p style={{ margin: 0, fontSize: 13, color: "var(--ink-mid)", lineHeight: "var(--lh-body)" }}>
						Компонент <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>Modal</code>{" "}
						принимает <strong>title</strong>, <strong>subtitle</strong>,{" "}
						<strong>onClose</strong>, <strong>actions</strong> и{" "}
						<strong>width</strong>. Нажмите Escape или кликните на оверлей чтобы закрыть.
					</p>
				</Modal>
			)}
		</WithTrigger>
	),
};
