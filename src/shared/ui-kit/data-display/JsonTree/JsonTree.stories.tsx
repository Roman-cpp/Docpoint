import type { Meta, StoryObj } from "@storybook/react";
import { useRef } from "react";
import { Button } from "@/shared/ui-kit/controls";
import { JsonTree, type JsonTreeHandle } from "./JsonTree";

const meta: Meta<typeof JsonTree> = {
	title: "UI Kit/JsonTree",
	component: JsonTree,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div
				style={{ height: 480, display: "flex", background: "var(--code-bg)" }}
			>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof JsonTree>;

const sample = {
	id: "ep_01H8X",
	method: "POST",
	path: "/v1/orders",
	auth: { type: "bearer", scopes: ["orders:read", "orders:write"] },
	body: {
		symbol: "BTCUSDT",
		qty: 0.25,
		reduceOnly: false,
		meta: null,
		tags: ["algo", "twap"],
	},
	responses: [
		{ status: 200, description: "OK" },
		{ status: 422, description: "Validation error" },
	],
};

export const Default: Story = {
	args: { data: sample, defaultExpandedDepth: 2 },
};

export const Compact: Story = {
	args: { data: sample, size: "sm", defaultExpandedDepth: 1 },
};

/** 20 000 элементов — проверка, что дерево остаётся отзывчивым */
const huge = {
	total: 20_000,
	items: Array.from({ length: 20_000 }, (_, i) => ({
		id: i,
		name: `item-${i}`,
		active: i % 3 === 0,
		payload: { nested: { depth: 3, value: `v${i}` } },
	})),
};

export const Huge: Story = {
	args: { data: huge, size: "md" },
};

/** Императивное «развернуть/свернуть всё» через ref */
export const ExpandCollapseAll: Story = {
	render: () => {
		const ref = useRef<JsonTreeHandle>(null);
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					width: "100%",
					minHeight: 0,
				}}
			>
				<div style={{ display: "flex", gap: 8, padding: 8 }}>
					<Button size="sm" onClick={() => ref.current?.expandAll()}>
						Развернуть всё
					</Button>
					<Button size="sm" onClick={() => ref.current?.collapseAll()}>
						Свернуть всё
					</Button>
				</div>
				<JsonTree ref={ref} data={sample} size="md" />
			</div>
		);
	},
};
