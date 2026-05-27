import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
	title: "UI Kit/Input",
	component: Input,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: {
		style: { width: 280 },
	},
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
	args: {
		placeholder: "Enter text…",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		placeholder: "Small input",
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		placeholder: "Medium input",
	},
};

export const WithPrefix: Story = {
	args: {
		prefix: "@",
		placeholder: "username",
	},
};

export const WithSuffix: Story = {
	args: {
		suffix: "kg",
		placeholder: "Weight",
	},
};

export const Password: Story = {
	args: {
		type: "password",
		placeholder: "••••••••",
	},
};

export const ErrorState: Story = {
	args: {
		error: true,
		defaultValue: "invalid@",
		placeholder: "Email",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		defaultValue: "Disabled value",
	},
};

export const SansFont: Story = {
	args: {
		sans: true,
		placeholder: "Sans-serif font input",
	},
};
