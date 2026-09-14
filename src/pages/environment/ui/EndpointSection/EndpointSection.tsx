import type { FC } from "react";
import { joinUrl } from "@/shared/lib/url";
import s from "../EnvironmentPage.module.css";
import { Field, Section } from "../parts";

type Props = {
	baseUrl: string;
	onBaseUrlChange: (value: string) => void;
	onBaseUrlBlur: () => void;
	prefix: string;
	onPrefixChange: (value: string) => void;
	onPrefixBlur: () => void;
};

const composeFinalUrl = (baseUrl: string, prefix: string) =>
	joinUrl(baseUrl, prefix) || "—";

export const EndpointSection: FC<Props> = ({
	baseUrl,
	onBaseUrlChange,
	onBaseUrlBlur,
	prefix,
	onPrefixChange,
	onPrefixBlur,
}) => (
	<Section
		title="Endpoint"
		sub="базовый URL и префикс — общие для всех запросов"
	>
		<Field
			label={
				<>
					Base URL<span className={s.req}>*</span>
				</>
			}
		>
			<input
				className={s.envInput}
				value={baseUrl}
				onChange={(e) => onBaseUrlChange(e.target.value)}
				onBlur={onBaseUrlBlur}
				placeholder="https://api.example.com"
			/>
		</Field>
		<Field label="Prefix" help="приписывается ко всем путям">
			<input
				className={s.envInput}
				value={prefix}
				onChange={(e) => onPrefixChange(e.target.value)}
				onBlur={onPrefixBlur}
				placeholder="/api/v1"
			/>
		</Field>
		<Field label="Итоговый префикс">
			<code>{composeFinalUrl(baseUrl, prefix)}</code>
		</Field>
	</Section>
);
