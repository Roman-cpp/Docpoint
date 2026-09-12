/**
 * Разбор и форматирование unix-времени.
 *
 * Метка времени внутри всегда хранится в миллисекундах — это то, чем оперирует
 * `Date`. Единица ввода (секунды/мс/мкс/нс) только переводит число в мс на
 * входе и обратно на выходе.
 */

export type UnixUnit = "s" | "ms" | "us" | "ns";

/** Во сколько раз единица мельче миллисекунды */
const PER_MS: Record<UnixUnit, number> = {
	s: 1e-3,
	ms: 1,
	us: 1e3,
	ns: 1e6,
};

export const UNIT_LABEL: Record<UnixUnit, string> = {
	s: "секунды",
	ms: "миллисекунды",
	us: "микросекунды",
	ns: "наносекунды",
};

/**
 * Угадывает единицу по разрядности числа. Опорная точка — «сейчас»: секунды
 * сегодня десятизначны, миллисекунды тринадцатизначны и так далее. Границы
 * взяты с запасом, чтобы даты 1970-х и 2200-х попадали в ту же единицу.
 */
export const detectUnixUnit = (value: number): UnixUnit => {
	const digits = Math.abs(Math.trunc(value)).toString().length;
	if (digits <= 11) return "s";
	if (digits <= 14) return "ms";
	if (digits <= 17) return "us";
	return "ns";
};

/** Диапазон, который выдерживает `Date`: ±8.64e15 мс от эпохи */
const MAX_MS = 8.64e15;

export interface UnixParseResult {
	/** Метка времени в миллисекундах; null — разобрать не удалось */
	ms: number | null;
	/** Единица, в которой было прочитано число (важно для режима «авто») */
	unit: UnixUnit;
	error: string | null;
}

/**
 * Читает строку с меткой времени.
 * `unit === "auto"` — единица определяется по разрядности числа.
 */
export const parseUnixInput = (
	raw: string,
	unit: UnixUnit | "auto",
): UnixParseResult => {
	const trimmed = raw.trim().replace(/[\s_]/g, "");
	if (!trimmed)
		return { ms: null, unit: unit === "auto" ? "s" : unit, error: null };

	if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
		return {
			ms: null,
			unit: unit === "auto" ? "s" : unit,
			error: "Ожидается целое или дробное число",
		};
	}

	const value = Number(trimmed);
	const resolved = unit === "auto" ? detectUnixUnit(value) : unit;
	const ms = value / PER_MS[resolved];

	if (!Number.isFinite(ms) || Math.abs(ms) > MAX_MS) {
		return {
			ms: null,
			unit: resolved,
			error: "Дата вне допустимого диапазона",
		};
	}

	return { ms, unit: resolved, error: null };
};

/** Переводит миллисекунды в выбранную единицу (для вывода «дата → unix») */
export const msToUnit = (ms: number, unit: UnixUnit): string => {
	const value = ms * PER_MS[unit];
	// Дробная часть осмысленна только для секунд с миллисекундной точностью.
	return unit === "s"
		? String(Math.round(value * 1000) / 1000)
		: String(Math.round(value));
};

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** `2026-09-01 14:23:45.120` в зоне пользователя или в UTC */
export const formatDateTime = (ms: number, utc: boolean): string => {
	const d = new Date(ms);
	const [y, mo, day, h, mi, sec, msec] = utc
		? [
				d.getUTCFullYear(),
				d.getUTCMonth() + 1,
				d.getUTCDate(),
				d.getUTCHours(),
				d.getUTCMinutes(),
				d.getUTCSeconds(),
				d.getUTCMilliseconds(),
			]
		: [
				d.getFullYear(),
				d.getMonth() + 1,
				d.getDate(),
				d.getHours(),
				d.getMinutes(),
				d.getSeconds(),
				d.getMilliseconds(),
			];
	return `${pad(y, 4)}-${pad(mo)}-${pad(day)} ${pad(h)}:${pad(mi)}:${pad(sec)}.${pad(msec, 3)}`;
};

/** Смещение зоны пользователя в формате `+03:00` */
export const formatOffset = (ms: number): string => {
	// getTimezoneOffset положителен западнее Гринвича — знак инвертируем.
	const minutes = -new Date(ms).getTimezoneOffset();
	const sign = minutes < 0 ? "-" : "+";
	const abs = Math.abs(minutes);
	return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};

/** ISO 8601 в зоне пользователя: `2026-09-01T14:23:45.120+03:00` */
export const formatLocalIso = (ms: number): string =>
	`${formatDateTime(ms, false).replace(" ", "T")}${formatOffset(ms)}`;

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 365 * 24 * 3600_000],
	["month", 30 * 24 * 3600_000],
	["day", 24 * 3600_000],
	["hour", 3600_000],
	["minute", 60_000],
	["second", 1000],
];

const relativeFormat = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });

/** «3 часа назад» / «через 2 дня» относительно `now` */
export const formatRelative = (ms: number, now: number): string => {
	const diff = ms - now;
	for (const [unit, step] of RELATIVE_STEPS) {
		if (Math.abs(diff) >= step) {
			return relativeFormat.format(Math.round(diff / step), unit);
		}
	}
	return "только что";
};

const weekdayFormat = new Intl.DateTimeFormat("ru-RU", { weekday: "long" });

/** День недели с заглавной буквы */
export const formatWeekday = (ms: number): string => {
	const name = weekdayFormat.format(new Date(ms));
	return name.charAt(0).toUpperCase() + name.slice(1);
};

/** Номер недели по ISO 8601 и год, к которому она относится */
export const isoWeek = (ms: number): { week: number; year: number } => {
	// Сдвигаемся к четвергу той же недели: год этого четверга и есть ISO-год.
	const d = new Date(ms);
	const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
	const thursday = new Date(utc);
	thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
	const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
	const week = Math.ceil(
		(thursday.getTime() - yearStart) / (24 * 3600_000) / 7,
	);
	return { week, year: thursday.getUTCFullYear() };
};

/** Порядковый номер дня в году */
export const dayOfYear = (ms: number): number => {
	const d = new Date(ms);
	const start = new Date(d.getFullYear(), 0, 1);
	return Math.floor((d.getTime() - start.getTime()) / (24 * 3600_000)) + 1;
};

/** Значение для `<input type="datetime-local">` c точностью до секунд */
export const toDatetimeLocalValue = (ms: number, utc: boolean): string =>
	formatDateTime(ms, utc).replace(" ", "T").slice(0, 19);

/**
 * Обратное преобразование: строка из `datetime-local` → миллисекунды.
 * `utc` — трактовать введённое время как UTC, а не как зону пользователя.
 */
export const fromDatetimeLocalValue = (
	value: string,
	utc: boolean,
): number | null => {
	const m = value.match(
		/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/,
	);
	if (!m) return null;
	const [y, mo, day, h, mi] = m.slice(1, 6).map(Number);
	const sec = Number(m[6] ?? 0);
	const msec = Number((m[7] ?? "0").padEnd(3, "0"));
	const ms = utc
		? Date.UTC(y, mo - 1, day, h, mi, sec, msec)
		: new Date(y, mo - 1, day, h, mi, sec, msec).getTime();
	return Number.isFinite(ms) ? ms : null;
};
