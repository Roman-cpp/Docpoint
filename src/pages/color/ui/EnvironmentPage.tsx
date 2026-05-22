import type { FC, ReactNode } from "react";
import s from "./EnvironmentPage.module.css";

type LabelOn = "light" | "dark";

const calloutVariant: Record<"success" | "warning" | "error" | "info", string> =
	{
		success: s.success,
		warning: s.warning,
		error: s.error,
		info: s.info,
	};

const badgeVariant = calloutVariant;

const btnVariant: Record<"primary" | "ghost" | "danger", string> = {
	primary: s.primary,
	ghost: s.ghost,
	danger: s.danger,
};

const methodVariant: Record<
	"get" | "post" | "put" | "patch" | "delete",
	string
> = {
	get: s.get,
	post: s.post,
	put: s.put,
	patch: s.patch,
	delete: s.delete,
};

type SwatchProps = {
	name: string;
	token: string;
	hex: string;
	desc?: string;
	labelOn?: LabelOn;
	height?: number;
};

const CsSwatch: FC<SwatchProps> = ({
	name,
	token,
	hex,
	desc,
	labelOn = "light",
	height = 96,
}) => (
	<div className={s.csSw}>
		<div className={s.csSwColor} style={{ background: hex, height }}>
			<span className={`${s.labelOn} ${labelOn === "dark" ? s.dark : ""}`}>
				{hex.toUpperCase()}
			</span>
		</div>
		<div className={s.csSwInfo}>
			<span className={s.csSwName}>{name}</span>
			<span className={s.csSwToken}>{token}</span>
			{desc && <span className={s.csSwDesc}>{desc}</span>}
		</div>
	</div>
);

type ScaleStep = { token: string; hex: string };

const CsScale: FC<{ steps: ScaleStep[] }> = ({ steps }) => (
	<div className={s.csScale}>
		{steps.map((step, i) => (
			<div key={step.token} className={s.csScaleStep}>
				<div
					className={s.csScaleBand}
					style={{ background: step.hex, minHeight: 140 }}
				/>
				<div className={s.csScaleInfo}>
					<span className={s.num}>шаг {String(i).padStart(2, "0")}</span>
					<span className={s.token}>{step.token}</span>
					<span className={s.hex}>{step.hex.toUpperCase()}</span>
				</div>
			</div>
		))}
	</div>
);

type MethodKey = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type MethodProps = {
	method: MethodKey;
	fg: string;
	bg: string;
	fgHex: string;
	bgHex: string;
	aka: string;
};

const CsMethod: FC<MethodProps> = ({ method, fgHex, bgHex, aka }) => {
	const variantKey = method.toLowerCase() as keyof typeof methodVariant;
	return (
		<div className={s.csMethodCard}>
			<span className={`${s.csMethodBadge} ${methodVariant[variantKey]}`}>
				{method}
			</span>
			<div className={s.csMethodInfo}>
				<span style={{ color: "var(--ink)", fontWeight: 600 }}>
					{fgHex.toUpperCase()}
				</span>
				<span style={{ color: "var(--ink-low)" }}>
					на {bgHex.toUpperCase()}
				</span>
			</div>
			<span className={s.csMethodAka}>{aka}</span>
		</div>
	);
};

function hexToRgb(hex: string): string {
	const v = hex.replace("#", "");
	const r = parseInt(v.slice(0, 2), 16);
	const g = parseInt(v.slice(2, 4), 16);
	const b = parseInt(v.slice(4, 6), 16);
	return `rgb(${r}, ${g}, ${b})`;
}

type TriadSample = {
	serif: string;
	chip: string;
	calloutTitle: string;
	calloutText: string;
};

type TriadProps = {
	name: string;
	aka: string;
	fg: string;
	bg: string;
	border: string;
	tokenPrefix: string;
	contrast: string;
	desc: string;
	sample: TriadSample;
};

const CsSemTriad: FC<TriadProps> = ({
	name,
	aka,
	fg,
	bg,
	border,
	tokenPrefix,
	contrast,
	desc,
	sample,
}) => {
	const tokens = [
		{ suffix: "-fg", hex: fg },
		{ suffix: "-bg", hex: bg },
		{ suffix: "-border", hex: border },
	];
	return (
		<div className={s.csSemTriad}>
			<div
				className={s.csTriadPreview}
				style={{ background: bg, borderBottomColor: border, color: fg }}
			>
				<span className={s.sample}>{sample.serif}</span>
				<span
					className={s.sampleChip}
					style={{ borderColor: border, background: bg, color: fg }}
				>
					{sample.chip}
				</span>
				<div
					className={s.sampleCallout}
					style={{ borderLeftColor: fg, background: bg, color: fg }}
				>
					<b>{sample.calloutTitle}.</b> {sample.calloutText}
				</div>
			</div>
			<div className={s.csTriadInfo}>
				<h3 className={s.csTriadName}>{name}</h3>
				<p className={s.csTriadAka}>{aka}</p>
				<div className={s.csTriadRows}>
					{tokens.map((t) => (
						<div className={s.csTriadRow} key={t.suffix}>
							<span className={s.csTriadChip} style={{ background: t.hex }} />
							<span className={s.csTriadToken}>
								{tokenPrefix}
								{t.suffix}
							</span>
							<span className={s.csTriadRgb}>{hexToRgb(t.hex)}</span>
							<span className={s.csTriadHex}>{t.hex.toUpperCase()}</span>
						</div>
					))}
				</div>
				<div className={s.csTriadMeta}>
					<span className={s.ratio}>{contrast}</span>
					<span>контраст fg на bg — AA для крупного текста</span>
				</div>
				<p className={s.csTriadDesc}>{desc}</p>
			</div>
		</div>
	);
};

const BrandCard: FC<{
	name: ReactNode;
	hex: string;
	token: string;
	rgb: string;
	desc: string;
	dark?: boolean;
}> = ({ name, hex, token, rgb, desc, dark }) => (
	<div className={s.csBrandCard}>
		<div
			className={`${s.csBrandCardColor} ${dark ? s.dark : ""}`}
			style={{ background: hex }}
		>
			<span className={s.badge}>{hex}</span>
		</div>
		<div className={s.csBrandCardInfo}>
			<h4 className={s.csBrandCardName}>{name}</h4>
			<div className={s.csBrandCardVals}>
				<span className={s.csBrandCardVal}>{token}</span>
				<span className={`${s.csBrandCardVal} ${s.muted}`}>{hex}</span>
				<span className={`${s.csBrandCardVal} ${s.muted}`}>{rgb}</span>
			</div>
			<p className={s.csBrandCardDesc}>{desc}</p>
		</div>
	</div>
);

export const EnvironmentPage: FC = () => (
	<div className={s.csFrame}>
		<div className={s.csPage}>
			{/* ─── Header ─── */}
			<div className={s.csEyebrow}>
				<span>Docpoint · цветовая система</span>
			</div>

			<h1 className={s.csH1}>
				Тёплая <span className={s.accent}>бумажная</span> палитра.
			</h1>

			<p className={s.csLede}>
				Цвета подобраны как чернила и охра на кремовой бумаге. Никаких
				градиентов, ярких заливок и неона — только сепия, песочные нейтрали и
				приглушённые акценты для семантики HTTP.
			</p>

			<div className={s.csMeta}>
				<span>v1.4 · май 2026</span>
				<span className={s.sep}>·</span>
				<span>1 бренд-тройка</span>
				<span className={s.sep}>·</span>
				<span>17 базовых токенов</span>
				<span className={s.sep}>·</span>
				<span>4 семантических цвета × 3 токена</span>
				<span className={s.sep}>·</span>
				<span>5 HTTP-методов</span>
				<span style={{ marginLeft: "auto" }}>основа — colors_and_type.css</span>
			</div>

			{/* ─── 00 · Brand ─── */}
			<section className={s.csSection}>
				<div className={s.csSectionHdr}>
					<h2 className={s.csSectionH}>
						<span className={s.num}>00</span>Бренд
					</h2>
					<div className={s.csSectionSub}>
						Три цвета формируют идентичность Docpoint: бумага, тёплый кремовый
						фон и чернила. Никаких других «фирменных» цветов нет.
					</div>
				</div>

				<div className={s.csBrand}>
					<div className={s.csBrandHero}>
						<div className={s.csBrandHeroLeft}>
							<h3 className={s.csBrandMark}>
								Docpoint<span className={s.dot}>.</span>
							</h3>
							<p className={s.csBrandTag}>
								API-документация и HTTP-клиент для инженеров, которые ценят
								тишину в инструментах.
							</p>
						</div>
						<div className={s.csBrandHeroRight}>
							<div className={s.lbl}>Wordmark</div>
							<div>
								Lora <b>400</b>
							</div>
							<div>
								letter-spacing <b>−0.2px</b>
							</div>
							<div style={{ marginTop: 12 }} className={s.lbl}>
								Контраст
							</div>
							<div>
								<b>Ink</b> / Paper · 16.5:1
							</div>
						</div>
					</div>

					<div className={s.csBrandRow}>
						<BrandCard
							dark
							name={
								<>
									Белый <span className={s.en}>/ Paper</span>
								</>
							}
							hex="#FFFFFF"
							token="--surface"
							rgb="rgb(255, 255, 255)"
							desc="Бумага — самый светлый слой. Карточки, модалки, sidebar, nav. Лежит поверх кремового фона и читается как «свежий лист»."
						/>
						<BrandCard
							dark
							name={
								<>
									Кремовый <span className={s.en}>/ Cream</span>
								</>
							}
							hex="#FAF7F2"
							token="--bg"
							rgb="rgb(250, 247, 242)"
							desc="Тёплый фон страницы — мелованная кремовая бумага. Создаёт общий тон продукта и отличает его от стерильных SaaS-белых интерфейсов."
						/>
						<BrandCard
							name={
								<>
									Чернильный <span className={s.en}>/ Ink</span>
								</>
							}
							hex="#1A1A1A"
							token="--ink"
							rgb="rgb(26, 26, 26)"
							desc="Чернила — на них держится продукт: заголовки, wordmark, primary-кнопки. Тёмно-серые (не чистый чёрный) — мягче и более «бумажно»."
						/>
					</div>
				</div>
			</section>

			{/* ─── 01 · Neutrals ─── */}
			<section className={s.csSection}>
				<div className={s.csSectionHdr}>
					<h2 className={s.csSectionH}>
						<span className={s.num}>01</span>Нейтральные оттенки
					</h2>
					<div className={s.csSectionSub}>
						Тёплый кремовый фон, бумажно-белые карточки, чернильные тексты,
						песочные хайр-лайны.
					</div>
				</div>

				<div style={{ marginBottom: 24 }}>
					<CsScale
						steps={[
							{ token: "--bg", hex: "#faf7f2" },
							{ token: "--cat-bg", hex: "#f0ede8" },
							{ token: "--code-bg", hex: "#f4f1ec" },
							{ token: "--border", hex: "#e8e2d9" },
							{ token: "--border-h", hex: "#c8c0b4" },
						]}
					/>
				</div>

				<div className={s.csSwatches}>
					<CsSwatch
						name="Бумага"
						token="--bg"
						hex="#faf7f2"
						labelOn="dark"
						desc="Фон страницы — тёплый кремовый, как мелованная бумага."
					/>
					<CsSwatch
						name="Поверхность"
						token="--surface"
						hex="#ffffff"
						labelOn="dark"
						desc="Карточки, модалки, nav, sidebar. Лежит поверх бумаги."
					/>
					<CsSwatch
						name="Чип"
						token="--cat-bg"
						hex="#f0ede8"
						labelOn="dark"
						desc="Фон бэйджей, hover-состояний, шапок секций."
					/>
					<CsSwatch
						name="Код"
						token="--code-bg"
						hex="#f4f1ec"
						labelOn="dark"
						desc="Фон inline-кода, блоков с JSON, кодовых редакторов."
					/>
					<CsSwatch
						name="Граница"
						token="--border"
						hex="#e8e2d9"
						labelOn="dark"
						desc="Тонкие хайр-лайны между секциями, рамки карточек."
					/>
					<CsSwatch
						name="Граница hover"
						token="--border-h"
						hex="#c8c0b4"
						labelOn="dark"
						desc="Активные / hover-границы инпутов и кнопок."
					/>
				</div>
			</section>

			{/* ─── 02 · Ink ─── */}
			<section className={s.csSection}>
				<div className={s.csSectionHdr}>
					<h2 className={s.csSectionH}>
						<span className={s.num}>02</span>Чернила
					</h2>
					<div className={s.csSectionSub}>
						Три уровня насыщенности текста — заголовки, основной набор, метки.
					</div>
				</div>

				<div className={`${s.csSwatches} ${s.wide}`}>
					<div className={s.csSw}>
						<div className={s.csSwColor} style={{ background: "#1a1a1a" }}>
							<span className={s.labelOn}>#1A1A1A</span>
						</div>
						<div className={s.csSwInfo}>
							<span className={s.csSwName}>Ink — основной</span>
							<span className={s.csSwToken}>--ink</span>
							<span className={s.csSwDesc}>
								Заголовки, важные числа, активные элементы навигации.
							</span>
						</div>
					</div>
					<div className={s.csSw}>
						<div className={s.csSwColor} style={{ background: "#555555" }}>
							<span className={s.labelOn}>#555555</span>
						</div>
						<div className={s.csSwInfo}>
							<span className={s.csSwName}>Ink — средний</span>
							<span className={s.csSwToken}>--ink-mid</span>
							<span className={s.csSwDesc}>
								Основной набор, описания, body-текст. ~7:1 контраст.
							</span>
						</div>
					</div>
					<div className={s.csSw}>
						<div className={s.csSwColor} style={{ background: "#888888" }}>
							<span className={s.labelOn}>#888888</span>
						</div>
						<div className={s.csSwInfo}>
							<span className={s.csSwName}>Ink — низкий</span>
							<span className={s.csSwToken}>--ink-low</span>
							<span className={s.csSwDesc}>
								Лейблы UPPERCASE, placeholder, meta. Низкий контраст —
								используйте экономно.
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* ─── 03 · Semantic ─── */}
			<section className={s.csSection}>
				<div className={s.csSectionHdr}>
					<h2 className={s.csSectionH}>
						<span className={s.num}>03</span>Семантические цвета
					</h2>
					<div className={s.csSectionSub}>
						Каждый семантический цвет — тройка fg · bg · border. Контраст fg на
						своём bg — 5,3–6,2:1 (AA для крупного текста).
					</div>
				</div>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 16,
					}}
				>
					<CsSemTriad
						name="Success"
						aka="приглушённый шалфейный · sage"
						fg="#3F6B4A"
						bg="#EAF0E9"
						border="#C9D8C7"
						tokenPrefix="--success"
						contrast="5.3:1"
						desc="Глубокий зелёный с серым подтоном — спокойный, «архивный». Для GET-запросов, 2xx-ответов, успешных действий и активных статусов."
						sample={{
							serif: "200 OK",
							chip: "Активный токен · через 32 дн",
							calloutTitle: "Сохранено",
							calloutText: "Запрос успешно добавлен в коллекцию «Платежи».",
						}}
					/>
					<CsSemTriad
						name="Warning"
						aka="охра · песочный"
						fg="#75591A"
						bg="#F5EDD9"
						border="#E2D2A6"
						tokenPrefix="--warning"
						contrast="5.6:1"
						desc="Тёмная охра вместо «дорожно-жёлтого». Подложка почти продолжает кремовый фон системы. Для 4xx-ответов, истекающих токенов и несохранённых изменений."
						sample={{
							serif: "409",
							chip: "Истекает токен · через 3 дн",
							calloutTitle: "Внимание",
							calloutText:
								"Production-токен истекает через 3 дня. Обновите в настройках.",
						}}
					/>
					<CsSemTriad
						name="Error / Danger"
						aka="терракотовый · terracotta"
						fg="#9B3B36"
						bg="#F4E4E2"
						border="#E3C3BF"
						tokenPrefix="--error"
						contrast="5.6:1"
						desc="Кирпично-красный, не алый. Достаточно тревожный, но не кричащий. Для DELETE-запросов, 5xx-ошибок, разрушительных действий и истёкших сессий."
						sample={{
							serif: "404",
							chip: "Сессия истекла",
							calloutTitle: "Ошибка",
							calloutText:
								"401 Unauthorized — проверьте токен в текущем окружении.",
						}}
					/>
					<CsSemTriad
						name="Info"
						aka="приглушённый синий · muted blue"
						fg="#3A5A78"
						bg="#E6ECF1"
						border="#C4D2DE"
						tokenPrefix="--info"
						contrast="6.2:1"
						desc="Синий сдвинут в сторону выцветшей сепии. Подходит рядом с кремовым фоном. Для POST-запросов, информационных нотификаций, ссылок и синих подсказок."
						sample={{
							serif: "201",
							chip: "Подключено к staging",
							calloutTitle: "Подсказка",
							calloutText:
								"Окружение можно дублировать — переменные и настройки скопируются.",
						}}
					/>
				</div>
			</section>

			{/* ─── 04 · Usage ─── */}
			<section className={s.csSection}>
				<div className={s.csSectionHdr}>
					<h2 className={s.csSectionH}>
						<span className={s.num}>04</span>Применение в компонентах
					</h2>
					<div className={s.csSectionSub}>
						Как палитра ведёт себя в живых элементах интерфейса.
					</div>
				</div>

				<div className={s.csUsageGrid}>
					<div className={s.csUsageCard}>
						<h4 className={s.csUsageH}>Кнопки</h4>
						<p className={s.csUsageSub}>
							Иерархия действий: primary (ink), ghost (border), danger
							(терракота).
						</p>
						<div className={s.csUsageRow}>
							<span className={s.lbl}>primary</span>
							<button
								type="button"
								className={`${s.csSampleBtn} ${btnVariant.primary}`}
							>
								Сохранить изменения
							</button>
						</div>
						<div className={s.csUsageRow}>
							<span className={s.lbl}>ghost</span>
							<button
								type="button"
								className={`${s.csSampleBtn} ${btnVariant.ghost}`}
							>
								Отмена
							</button>
						</div>
						<div className={s.csUsageRow}>
							<span className={s.lbl}>danger</span>
							<button
								type="button"
								className={`${s.csSampleBtn} ${btnVariant.danger}`}
							>
								Удалить пользователя
							</button>
						</div>
					</div>

					<div className={s.csUsageCard}>
						<h4 className={s.csUsageH}>Бэйджи</h4>
						<p className={s.csUsageSub}>
							Семантическая тройка fg + bg + border в форме pill.
						</p>
						<div className={s.csUsageRow}>
							<span className={s.lbl}>статусы</span>
							<span className={`${s.csSampleBadge} ${badgeVariant.success}`}>
								<span className={s.dot} />
								active
							</span>
							<span className={`${s.csSampleBadge} ${badgeVariant.warning}`}>
								<span className={s.dot} />
								invited
							</span>
							<span className={`${s.csSampleBadge} ${badgeVariant.error}`}>
								<span className={s.dot} />
								disabled
							</span>
						</div>
						<div className={s.csUsageRow}>
							<span className={s.lbl}>роли</span>
							<span className={`${s.csSampleBadge} ${badgeVariant.error}`}>
								owner
							</span>
							<span className={`${s.csSampleBadge} ${badgeVariant.warning}`}>
								admin
							</span>
							<span className={`${s.csSampleBadge} ${badgeVariant.info}`}>
								editor
							</span>
							<span className={`${s.csSampleBadge} ${badgeVariant.success}`}>
								viewer
							</span>
						</div>
						<div className={s.csUsageRow}>
							<span className={s.lbl}>прочее</span>
							<span className={`${s.csSampleBadge} ${badgeVariant.info}`}>
								staging
							</span>
							<span
								className={s.csSampleBadge}
								style={{
									background: "var(--cat-bg)",
									color: "var(--cat-ink)",
									borderColor: "var(--border)",
								}}
							>
								v1.4.2
							</span>
						</div>
					</div>

					<div className={s.csUsageCard} style={{ gridColumn: "1 / -1" }}>
						<h4 className={s.csUsageH}>Callout-блоки</h4>
						<p className={s.csUsageSub}>
							Лево-акцент 3px в семантическом fg цвете + заливка bg.
						</p>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 10,
								marginTop: 14,
							}}
						>
							<div className={`${s.csSampleCallout} ${calloutVariant.success}`}>
								<b>Совет.</b> Используйте{" "}
								<code
									style={{
										fontFamily: "var(--font-mono)",
										background: "rgba(255,255,255,0.5)",
										padding: "1px 5px",
										borderRadius: 3,
									}}
								>
									{"{{auth_token}}"}
								</code>{" "}
								для подстановки токена авторизации в заголовок Authorization.
							</div>
							<div className={`${s.csSampleCallout} ${calloutVariant.info}`}>
								<b>Подсказка.</b> Окружение можно дублировать — все переменные и
								настройки авторизации скопируются.
							</div>
							<div className={`${s.csSampleCallout} ${calloutVariant.warning}`}>
								<b>Внимание.</b> Production-токен истекает через 3 дня. Обновите
								его в настройках окружения.
							</div>
							<div className={`${s.csSampleCallout} ${calloutVariant.error}`}>
								<b>Ошибка.</b> 401 Unauthorized — проверьте токен в текущем
								окружении.
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ─── 06 · Principles ─── */}
			<section className={s.csSection}>
				<div className={s.csSectionHdr}>
					<h2 className={s.csSectionH}>
						<span className={s.num}>06</span>Принципы
					</h2>
					<div className={s.csSectionSub}>
						Что мы делаем — и чего сознательно избегаем.
					</div>
				</div>

				<div className={s.csPrinciples}>
					<div className={s.csPrinciple}>
						<div className={s.csPrincipleNo}>№ 01</div>
						<h3 className={s.csPrincipleT}>Никаких градиентов</h3>
						<p className={s.csPrincipleP}>
							Только плоские цвета. Градиент сразу выдаёт SaaS-инструмент; мы —
							техническая бумага, не маркетинговая брошюра.
						</p>
					</div>
					<div className={s.csPrinciple}>
						<div className={s.csPrincipleNo}>№ 02</div>
						<h3 className={s.csPrincipleT}>
							Цвет вторичен, типографика первична
						</h3>
						<p className={s.csPrincipleP}>
							Серифные заголовки и моно-код несут больше смысла, чем цвет.
							Семантика — это маркер, а не главный канал коммуникации.
						</p>
					</div>
					<div className={s.csPrinciple}>
						<div className={s.csPrincipleNo}>№ 03</div>
						<h3 className={s.csPrincipleT}>Семантика — пара, не один цвет</h3>
						<p className={s.csPrincipleP}>
							Каждый смысловой цвет идёт парой text + bg. Никогда не используйте
							text-цвет на чистом белом — теряется паркетный ритм страницы.
						</p>
					</div>
					<div className={s.csPrinciple}>
						<div className={s.csPrincipleNo}>№ 04</div>
						<h3 className={s.csPrincipleT}>Тёплая, не холодная</h3>
						<p className={s.csPrincipleP}>
							Все нейтрали — сепия и охра. Синий и фиолетовый сдвинуты в сторону
							тёплого спектра, чтобы не разрушать общую палитру.
						</p>
					</div>
					<div className={s.csPrinciple}>
						<div className={s.csPrincipleNo}>№ 05</div>
						<h3 className={s.csPrincipleT}>Земляная семантика</h3>
						<p className={s.csPrincipleP}>
							Зелёный — лес, не неон. Красный — терракота, не алый. Это цвета
							чернил и охры, а не сигнальных огней.
						</p>
					</div>
					<div className={s.csPrinciple}>
						<div className={s.csPrincipleNo}>№ 06</div>
						<h3 className={s.csPrincipleT}>Тёмная тема — opt-in</h3>
						<p className={s.csPrincipleP}>
							По умолчанию интерфейс светлый. Тёмная схема существует, но
							включается явно — не «по системе». Бренд — это свет.
						</p>
					</div>
				</div>
			</section>

			<footer className={s.csFoot}>
				<span>Docpoint · цветовая система v1.4 · обновлено 21 мая 2026</span>
			</footer>
		</div>
	</div>
);
