import { type FC, useEffect, useMemo, useState } from "react";
import {
	dayOfYear,
	formatDateTime,
	formatLocalIso,
	formatOffset,
	formatRelative,
	formatWeekday,
	fromDatetimeLocalValue,
	isoWeek,
	msToUnit,
	parseUnixInput,
	toDatetimeLocalValue,
	UNIT_LABEL,
	type UnixUnit,
} from "@/shared/lib/unix-time";
import { CopyIcon } from "@/shared/svg";
import { Header } from "@/widgets/layout";
import s from "../UnixTimePage.module.css";

/** Как часто обновляются «часы» текущего времени */
const TICK_MS = 1000;

const UNIT_OPTIONS: { value: UnixUnit | "auto"; label: string }[] = [
	{ value: "auto", label: "Авто" },
	{ value: "s", label: "Секунды" },
	{ value: "ms", label: "Миллисекунды" },
	{ value: "us", label: "Микросекунды" },
	{ value: "ns", label: "Наносекунды" },
];

const TIMEZONE =
	Intl.DateTimeFormat().resolvedOptions().timeZone ?? "локальная зона";

const copy = (text: string) => {
	navigator.clipboard?.writeText(text).catch(() => {});
};

/** Строка результата: подпись, моноширинное значение и кнопка копирования */
const Row: FC<{ label: string; value: string; strong?: boolean }> = ({
	label,
	value,
	strong,
}) => (
	<div className={s.row}>
		<span className={s.rowLabel}>{label}</span>
		<span className={`${s.rowValue} ${strong ? s.rowValueStrong : ""}`}>
			{value}
		</span>
		<button
			type="button"
			className={s.copyBtn}
			title="Скопировать"
			aria-label={`Скопировать: ${label}`}
			onClick={() => copy(value)}
		>
			<CopyIcon size={12} />
		</button>
	</div>
);

export const UnixTimePage: FC = () => {
	// Текущее время тикает раз в секунду: нужно и для часов сверху, и для
	// относительной подписи («3 часа назад») у разбираемой метки.
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(id);
	}, []);

	// ─── Unix → дата ───
	const [raw, setRaw] = useState(() => String(Math.floor(Date.now() / 1000)));
	const [unit, setUnit] = useState<UnixUnit | "auto">("auto");
	const parsed = useMemo(() => parseUnixInput(raw, unit), [raw, unit]);

	// ─── Дата → unix ───
	const [asUtc, setAsUtc] = useState(false);
	const [dateValue, setDateValue] = useState(() =>
		toDatetimeLocalValue(Date.now(), false),
	);
	// Смена зоны не должна двигать момент времени: пересобираем строку так,
	// чтобы она описывала ту же метку в новой зоне.
	const switchZone = (utc: boolean) => {
		const ms = fromDatetimeLocalValue(dateValue, asUtc);
		setAsUtc(utc);
		if (ms !== null) setDateValue(toDatetimeLocalValue(ms, utc));
	};
	const dateMs = useMemo(
		() => fromDatetimeLocalValue(dateValue, asUtc),
		[dateValue, asUtc],
	);

	const ms = parsed.ms;

	return (
		<div className={s.frame}>
			<Header section="Инструменты / Unix time" />

			<div className={s.scroll}>
				<div className={s.page}>
					{/* ─── Часы ─── */}
					<section className={s.clock}>
						<div className={s.clockMain}>
							<span className={s.clockLabel}>Сейчас</span>
							<span className={s.clockValue}>{Math.floor(now / 1000)}</span>
							<span className={s.clockUnit}>секунд с 1 января 1970 UTC</span>
						</div>
						<div className={s.clockSide}>
							<span className={s.clockSideValue}>
								{formatDateTime(now, false)}
							</span>
							<span className={s.clockSideLabel}>
								{TIMEZONE} · UTC{formatOffset(now)}
							</span>
						</div>
						<div className={s.clockActions}>
							<button
								type="button"
								className={s.btn}
								onClick={() => copy(String(Math.floor(now / 1000)))}
							>
								Копировать сек
							</button>
							<button
								type="button"
								className={s.btn}
								onClick={() => copy(String(now))}
							>
								Копировать мс
							</button>
						</div>
					</section>

					{/* ─── Unix → дата ─── */}
					<section className={s.card}>
						<div className={s.cardHead}>
							<h2 className={s.cardTitle}>Unix → дата</h2>
							<div className={s.cardActions}>
								<select
									className={s.select}
									value={unit}
									onChange={(e) => setUnit(e.target.value as UnixUnit | "auto")}
									aria-label="Единица метки времени"
								>
									{UNIT_OPTIONS.map((o) => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
								<button
									type="button"
									className={s.btn}
									onClick={() => setRaw(String(Math.floor(Date.now() / 1000)))}
								>
									Сейчас
								</button>
								<button
									type="button"
									className={s.btn}
									onClick={() => setRaw("")}
									disabled={!raw}
								>
									Очистить
								</button>
							</div>
						</div>

						<input
							className={`${s.bigInput} ${parsed.error ? s.bigInputError : ""}`}
							value={raw}
							onChange={(e) => setRaw(e.target.value)}
							placeholder="1756713600"
							spellCheck={false}
							inputMode="numeric"
							aria-label="Метка unix-времени"
						/>

						<div className={s.hint}>
							{parsed.error ? (
								<span className={s.hintError}>{parsed.error}</span>
							) : ms !== null ? (
								<>
									Прочитано как <b>{UNIT_LABEL[parsed.unit]}</b>
									{unit === "auto" && " (определено по разрядности)"} ·{" "}
									{formatRelative(ms, now)}
								</>
							) : (
								"Введите метку времени — дата появится ниже"
							)}
						</div>

						{ms !== null && (
							<div className={s.rows}>
								<Row
									label="Локальное время"
									value={formatDateTime(ms, false)}
									strong
								/>
								<Row label="UTC" value={`${formatDateTime(ms, true)}Z`} />
								<Row label="ISO 8601 (локальный)" value={formatLocalIso(ms)} />
								<Row
									label="ISO 8601 (UTC)"
									value={new Date(ms).toISOString()}
								/>
								<Row label="День недели" value={formatWeekday(ms)} />
								<Row
									label="Неделя и день года"
									value={`${isoWeek(ms).week}-я неделя ${isoWeek(ms).year} · день ${dayOfYear(ms)}`}
								/>
								<Row label="Секунды" value={msToUnit(ms, "s")} />
								<Row label="Миллисекунды" value={msToUnit(ms, "ms")} />
							</div>
						)}
					</section>

					{/* ─── Дата → unix ─── */}
					<section className={s.card}>
						<div className={s.cardHead}>
							<h2 className={s.cardTitle}>Дата → Unix</h2>
							<div className={s.cardActions}>
								<div className={s.toggle}>
									<button
										type="button"
										className={`${s.toggleBtn} ${asUtc ? "" : s.toggleActive}`}
										onClick={() => switchZone(false)}
									>
										Локальная
									</button>
									<button
										type="button"
										className={`${s.toggleBtn} ${asUtc ? s.toggleActive : ""}`}
										onClick={() => switchZone(true)}
									>
										UTC
									</button>
								</div>
								<button
									type="button"
									className={s.btn}
									onClick={() =>
										setDateValue(toDatetimeLocalValue(Date.now(), asUtc))
									}
								>
									Сейчас
								</button>
							</div>
						</div>

						<input
							type="datetime-local"
							step="1"
							className={`${s.bigInput} ${dateMs === null ? s.bigInputError : ""}`}
							value={dateValue}
							onChange={(e) => setDateValue(e.target.value)}
							aria-label="Дата и время"
						/>

						<div className={s.hint}>
							{dateMs === null
								? "Укажите дату и время"
								: `Введённое время трактуется как ${asUtc ? "UTC" : `${TIMEZONE} · UTC${formatOffset(dateMs)}`}`}
						</div>

						{dateMs !== null && (
							<div className={s.rows}>
								<Row label="Секунды" value={msToUnit(dateMs, "s")} strong />
								<Row label="Миллисекунды" value={msToUnit(dateMs, "ms")} />
								<Row label="Микросекунды" value={msToUnit(dateMs, "us")} />
								<Row label="Наносекунды" value={msToUnit(dateMs, "ns")} />
								<Row
									label="ISO 8601 (UTC)"
									value={new Date(dateMs).toISOString()}
								/>
								<Row
									label="Относительно сейчас"
									value={formatRelative(dateMs, now)}
								/>
							</div>
						)}

						<button
							type="button"
							className={`${s.btn} ${s.btnWide}`}
							onClick={() => {
								if (dateMs === null) return;
								setUnit("s");
								setRaw(msToUnit(dateMs, "s"));
							}}
							disabled={dateMs === null}
						>
							Перенести в «Unix → дата»
						</button>
					</section>
				</div>
			</div>
		</div>
	);
};
