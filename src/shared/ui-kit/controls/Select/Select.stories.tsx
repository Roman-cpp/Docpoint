import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "./Select";

const COUNTRIES = [
	{ value: "us", label: "United States" },
	{ value: "gb", label: "United Kingdom" },
	{ value: "de", label: "Germany" },
	{ value: "fr", label: "France" },
	{ value: "jp", label: "Japan" },
];

const meta: Meta<typeof Select> = {
	title: "UI Kit/Select",
	component: Select,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: {
		options: COUNTRIES,
		style: { width: 240 },
	},
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
	args: {
		defaultValue: "us",
	},
};

export const WithPlaceholder: Story = {
	args: {
		placeholder: "Select a country…",
	},
};

export const ErrorState: Story = {
	args: {
		error: true,
		placeholder: "Required field",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		defaultValue: "de",
	},
};
