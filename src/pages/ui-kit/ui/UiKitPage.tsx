import { type FC, useState } from "react";
import {
	Checkbox,
	Field,
	Input,
	RadioGroup,
	Select,
	Textarea,
	Toggle,
} from "@/shared/ui-kit";
import s from "./UiKitPage.module.css";

const SearchIcon = () => (
	<svg
		viewBox="0 0 14 14"
		width={13}
		height={13}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
	>
		<title>search</title>
		<circle cx="6" cy="6" r="4" />
		<path d="M10 10l2.5 2.5" />
	</svg>
);

const AtIcon = () => (
	<svg
		viewBox="0 0 14 14"
		width={13}
		height={13}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>at</title>
		<circle cx="7" cy="7" r="3" />
		<path d="M10 7c0 2.5 3 2.5 3 0a6 6 0 1 0-3 5.2" />
	</svg>
);

const CopyIcon = () => (
	<svg
		viewBox="0 0 14 14"
		width={12}
		height={12}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
	>
		<title>copy</title>
		<rect x="4.5" y="4.5" width="8" height="8" rx="1.5" />
		<path d="M9 4.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.5" />
	</svg>
);

export const UiKitPage: FC = () => {
	const [text, setText] = useState("");
	const [email, setEmail] = useState("");
	const [search, setSearch] = useState("");
	const [pass, setPass] = useState("");
	const [url, setUrl] = useState("http://localhost:8080/api/v1");
	const [desc, setDesc] = useState("");
	const [method, setMethod] = useState("GET");
	const [env, setEnv] = useState("dev");
	const [radio, setRadio] = useState("string");
	const [checks, setChecks] = useState({ auth: false, required: true, sync: false });
	const [toggles, setToggles] = useState({ notify: true, dark: false, auto: true });

	const toggle = (k: keyof typeof checks) =>
		setChecks((p) => ({ ...p, [k]: !p[k] }));
	const tog = (k: keyof typeof toggles) =>
		setToggles((p) => ({ ...p, [k]: !p[k] }));

	return (
		<div className={s.page}>
			<div className={s.inner}>
				<h1 className={s.title}>UI Kit · Input Forms</h1>
				<p className={s.sub}>Компоненты ввода на токенах дизайн-системы Docpoint</p>

				{/* ─── Text Input ─── */}
				<section className={s.section}>
					<h2 className={s.sectionTitle}>Input</h2>
					<div className={s.grid}>
						<div className={s.row}>
							<div className={s.block}>
								<div className={s.label}>Default</div>
								<Input
									value={text}
									onChange={(e) => setText(e.target.value)}
									placeholder="Введите значение…"
									sans
								/>
							</div>
							<div className={s.block}>
								<div className={s.label}>Placeholder</div>
								<Input placeholder="{{переменная}}" />
							</div>
						</div>

						<div className={s.row}>
							<div className={s.block}>
								<div className={s.label}>С иконкой слева</div>
								<Input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Поиск…"
									prefix={<SearchIcon />}
									sans
								/>
							</div>
							<div className={s.block}>
								<div className={s.label}>С иконкой справа</div>
								<Input
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									suffix={<CopyIcon />}
									onSuffixClick={() => navigator.clipboard.writeText(url)}
								/>
							</div>
						</div>

						<div className={s.row}>
							<div className={s.block}>
								<div className={s.label}>Email с префиксом</div>
								<Input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="user@example.com"
									prefix={<AtIcon />}
									sans
								/>
							</div>
							<div className={s.block}>
								<div className={s.label}>Password</div>
								<Input
									type="password"
									value={pass}
									onChange={(e) => setPass(e.target.value)}
									placeholder="••••••••"
									sans
								/>
							</div>
						</div>

						<div className={s.row}>
							<div className={s.block}>
								<div className={s.label}>Error</div>
								<Input
									value="invalid-value!"
									error
									sans
								/>
							</div>
							<div className={s.block}>
								<div className={s.label}>Disabled</div>
								<Input
									value="нельзя менять"
									disabled
									sans
								/>
							</div>
						</div>

						<div className={s.divider} />

						<div className={s.row}>
							<div className={s.block}>
								<div className={s.label}>Size: sm</div>
								<Input size="sm" placeholder="Маленький" sans />
							</div>
							<div className={s.block}>
								<div className={s.label}>Size: default</div>
								<Input placeholder="Обычный" sans />
							</div>
							<div className={s.block}>
								<div className={s.label}>Size: md</div>
								<Input size="md" placeholder="Большой" sans />
							</div>
						</div>
					</div>
				</section>

				{/* ─── Textarea ─── */}
				<section className={s.section}>
					<h2 className={s.sectionTitle}>Textarea</h2>
					<div className={s.grid}>
						<div className={s.row}>
							<div className={s.block}>
								<div className={s.label}>Default (mono)</div>
								<Textarea
									value={desc}
									onChange={(e) => setDesc(e.target.value)}
									placeholder='{"email": "{{EMAIL}}", "password": "{{PASS}}"}'
								/>
							</div>
							<div className={s.block}>
								<div className={s.label}>Sans · Error</div>
								<Textarea
									sans
									error
									defaultValue="Слишком короткое описание"
								/>
							</div>
						</div>
						<div className={s.block}>
							<div className={s.label}>Disabled</div>
							<Textarea
								sans
								disabled
								value="Поле недоступно для редактирования"
							/>
						</div>
					</div>
				</section>

				{/* ─── Select ─── */}
				<section className={s.section}>
					<h2 className={s.sectionTitle}>Select</h2>
					<div className={s.grid}>
						<div className={s.row}>
							<div className={s.block}>
								<div className={s.label}>HTTP Method</div>
								<Select
									value={method}
									onChange={(e) => setMethod(e.target.value)}
									options={[
										{ value: "GET", label: "GET" },
										{ value: "POST", label: "POST" },
										{ value: "PUT", label: "PUT" },
										{ value: "PATCH", label: "PATCH" },
										{ value: "DELETE", label: "DELETE" },
									]}
								/>
							</div>
							<div className={s.block}>
								<div className={s.label}>Environment</div>
								<Select
									value={env}
									onChange={(e) => setEnv(e.target.value)}
									options={[
										{ value: "dev", label: "Dev" },
										{ value: "staging", label: "Staging" },
										{ value: "prod", label: "Production" },
									]}
								/>
							</div>
						</div>
						<div className={s.row}>
							<div className={s.block}>
								<div className={s.label}>С placeholder</div>
								<Select
									placeholder="Выберите тип…"
									options={[
										{ value: "string", label: "string" },
										{ value: "number", label: "number" },
										{ value: "boolean", label: "boolean" },
									]}
								/>
							</div>
							<div className={s.block}>
								<div className={s.label}>Disabled</div>
								<Select
									disabled
									value="prod"
									options={[{ value: "prod", label: "Production" }]}
								/>
							</div>
						</div>
					</div>
				</section>

				{/* ─── Checkbox ─── */}
				<section className={s.section}>
					<h2 className={s.sectionTitle}>Checkbox</h2>
					<div className={s.grid}>
						<div className={s.row}>
							<div className={s.block}>
								<div className={s.label}>Варианты</div>
								<Checkbox
									label="Авторизация"
									hint="добавить Bearer токен"
									checked={checks.auth}
									onChange={() => toggle("auth")}
								/>
								<Checkbox
									label="Обязательное поле"
									checked={checks.required}
									onChange={() => toggle("required")}
								/>
								<Checkbox
									label="Синхронизировать"
									hint="между устройствами"
									checked={checks.sync}
									onChange={() => toggle("sync")}
								/>
							</div>
							<div className={s.block}>
								<div className={s.label}>Состояния</div>
								<Checkbox label="Снято" checked={false} readOnly />
								<Checkbox label="Выбрано" checked={true} readOnly />
								<Checkbox label="Disabled off" disabled checked={false} readOnly />
								<Checkbox label="Disabled on" disabled checked={true} readOnly />
							</div>
						</div>
					</div>
				</section>

				{/* ─── Toggle ─── */}
				<section className={s.section}>
					<h2 className={s.sectionTitle}>Toggle</h2>
					<div className={s.grid}>
						<div className={s.row}>
							<div className={s.block}>
								<div className={s.label}>Интерактивные</div>
								<Toggle
									label="Уведомления"
									hint="push при изменениях"
									checked={toggles.notify}
									onChange={() => tog("notify")}
								/>
								<Toggle
									label="Тёмная тема"
									checked={toggles.dark}
									onChange={() => tog("dark")}
								/>
								<Toggle
									label="Авто-сохранение"
									checked={toggles.auto}
									onChange={() => tog("auto")}
								/>
							</div>
							<div className={s.block}>
								<div className={s.label}>Состояния</div>
								<Toggle label="Off" checked={false} readOnly />
								<Toggle label="On" checked={true} readOnly />
								<Toggle label="Disabled off" disabled checked={false} readOnly />
								<Toggle label="Disabled on" disabled checked={true} readOnly />
							</div>
						</div>
					</div>
				</section>

				{/* ─── RadioGroup ─── */}
				<section className={s.section}>
					<h2 className={s.sectionTitle}>RadioGroup</h2>
					<div className={s.grid}>
						<div className={s.row}>
							<div className={s.block}>
								<div className={s.label}>Вертикально</div>
								<RadioGroup
									name="var-type"
									value={radio}
									onChange={setRadio}
									options={[
										{ value: "string", label: "string", hint: "текстовое значение" },
										{ value: "number", label: "number", hint: "целое или дробное" },
										{ value: "secret", label: "secret", hint: "скрывается в UI" },
									]}
								/>
							</div>
							<div className={s.block}>
								<div className={s.label}>Горизонтально</div>
								<RadioGroup
									name="method-demo"
									value="POST"
									inline
									options={[
										{ value: "GET", label: "GET" },
										{ value: "POST", label: "POST" },
										{ value: "PUT", label: "PUT" },
										{ value: "DELETE", label: "DELETE", disabled: true },
									]}
								/>
							</div>
						</div>
					</div>
				</section>

				{/* ─── Field wrapper ─── */}
				<section className={s.section}>
					<h2 className={s.sectionTitle}>Field — обёртка с меткой</h2>
					<div className={s.grid}>
						<Field label="Название" hint="короткое читаемое имя" required>
							<Input sans placeholder="Production" />
						</Field>
						<Field label="Base URL" hint="базовый адрес без завершающего слэша">
							<Input value="http://localhost:8080/api/v1" readOnly />
						</Field>
						<Field label="Описание" error="Описание не может быть пустым">
							<Textarea sans error placeholder="Опишите назначение…" />
						</Field>
						<Field label="Тип переменной">
							<Select
								placeholder="Выберите тип…"
								options={[
									{ value: "string", label: "string" },
									{ value: "number", label: "number" },
									{ value: "secret", label: "secret" },
								]}
							/>
						</Field>

						<div className={s.divider} />

						<div className={s.label}>layout="row" (горизонтальный)</div>
						<Field label="Название" hint="отображается в сайдбаре" layout="row" required>
							<Input sans placeholder="Production" />
						</Field>
						<Field label="Тег" hint="нельзя менять" layout="row">
							<Input value="prod" readOnly disabled />
						</Field>
						<Field label="Авторизация" layout="row">
							<Toggle label="включить Bearer токен" />
						</Field>
					</div>
				</section>
			</div>
		</div>
	);
};
