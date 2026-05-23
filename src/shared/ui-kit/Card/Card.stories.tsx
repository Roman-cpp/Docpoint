import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";
import { Input } from "../Input/Input";
import { Field } from "../Field/Field";
import { Toggle } from "../Toggle/Toggle";
import { Select } from "../Select/Select";

const meta: Meta<typeof Card> = {
	title: "UI Kit/Card",
	component: Card,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div style={{ maxWidth: 640, width: "100%" }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
	args: {
		title: "Identification",
		subtitle: "Display name and environment tag",
		children: (
			<>
				<Field label="Name" required>
					<Input placeholder="Production" style={{ width: "100%" }} />
				</Field>
				<Field label="Base URL" required>
					<Input placeholder="https://api.example.com" style={{ width: "100%" }} />
				</Field>
			</>
		),
	},
};

export const NoHeader: Story = {
	args: {
		children: (
			<p style={{ margin: 0, fontSize: 13, color: "var(--ink-mid)" }}>
				A card without a title — just a styled surface container.
			</p>
		),
	},
};

export const WithHeaderRight: Story = {
	args: {
		title: "Authorization",
		subtitle: "Configure how the access token is fetched",
		headerRight: (
			<span
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: 6,
					fontSize: 11,
					fontWeight: 500,
					padding: "3px 9px 3px 7px",
					borderRadius: "var(--r-pill)",
					border: "1px solid var(--green-border)",
					background: "var(--green-bg)",
					color: "var(--green)",
				}}
			>
				<span
					style={{
						width: 6,
						height: 6,
						borderRadius: "50%",
						background: "currentColor",
					}}
				/>
				Token valid
			</span>
		),
		children: (
			<Field label="Token path" hint='JSON path, e.g. "data.accessToken"'>
				<Input placeholder="data.accessToken" style={{ width: "100%" }} />
			</Field>
		),
	},
};

export const WithToggleRow: Story = {
	args: {
		title: "Settings",
		children: (
			<>
				<Field label="Auto-save" layout="row">
					<Toggle defaultChecked />
				</Field>
				<Field label="Dark mode" layout="row">
					<Toggle />
				</Field>
				<Field label="Notifications" layout="row">
					<Toggle disabled />
				</Field>
			</>
		),
	},
};

export const WithFooter: Story = {
	args: {
		title: "Authorization",
		subtitle: "Configure how the access token is fetched",
		footer: (
			<>
				<button
					type="button"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						fontFamily: "var(--font-sans)",
						fontSize: 13,
						fontWeight: 500,
						padding: "8px 14px",
						borderRadius: "var(--r-md)",
						border: "1px solid var(--ink)",
						background: "var(--ink)",
						color: "var(--surface)",
						cursor: "pointer",
					}}
				>
					Fetch token
				</button>
				<button
					type="button"
					style={{
						display: "inline-flex",
						alignItems: "center",
						fontFamily: "var(--font-sans)",
						fontSize: 13,
						fontWeight: 500,
						padding: "8px 14px",
						borderRadius: "var(--r-md)",
						border: "1px solid var(--border)",
						background: "var(--surface)",
						color: "var(--ink)",
						cursor: "pointer",
					}}
				>
					Clear
				</button>
				<span
					style={{
						marginLeft: "auto",
						fontFamily: "var(--font-mono)",
						fontSize: 11.5,
						color: "var(--ink-low)",
					}}
				>
					Last fetched 2 min ago
				</span>
			</>
		),
		children: (
			<Field label="Token path" hint='JSON path, e.g. "data.accessToken"'>
				<Input placeholder="data.accessToken" style={{ width: "100%" }} />
			</Field>
		),
	},
};

export const WithSelect: Story = {
	args: {
		title: "Environment",
		subtitle: "Choose the target deployment environment",
		children: (
			<Field label="Type">
				<Select
					options={[
						{ value: "prod", label: "Production" },
						{ value: "staging", label: "Staging" },
						{ value: "dev", label: "Development" },
						{ value: "local", label: "Local" },
					]}
					defaultValue="staging"
					style={{ width: "100%" }}
				/>
			</Field>
		),
	},
};
