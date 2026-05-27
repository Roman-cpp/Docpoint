import type { Meta, StoryObj } from "@storybook/react";
import { Field } from "./Field";
import { Input } from "../Input/Input";
import { Toggle } from "../Toggle/Toggle";

const meta: Meta<typeof Field> = {
	title: "UI Kit/Field",
	component: Field,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {
	args: {
		label: "Email address",
		children: <Input placeholder="you@example.com" style={{ width: 280 }} />,
	},
};

export const WithHint: Story = {
	args: {
		label: "Username",
		hint: "Must be 3–20 characters, letters and numbers only",
		children: <Input placeholder="john_doe" style={{ width: 280 }} />,
	},
};

export const WithError: Story = {
	args: {
		label: "Password",
		error: "Too short — minimum 8 characters",
		children: <Input type="password" error style={{ width: 280 }} />,
	},
};

export const Required: Story = {
	args: {
		label: "Full name",
		required: true,
		children: <Input placeholder="John Doe" style={{ width: 280 }} />,
	},
};

export const RowLayout: Story = {
	args: {
		label: "Enable notifications",
		layout: "row",
		children: <Toggle defaultChecked />,
	},
};
