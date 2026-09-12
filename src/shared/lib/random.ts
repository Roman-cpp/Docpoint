/**
 * Генерация паролей и идентификаторов.
 *
 * Единственный источник случайности здесь — `crypto.getRandomValues`.
 * `Math.random` не годится: его поток восстанавливается по нескольким выданным
 * значениям, а выдаём мы пароли и первичные ключи.
 */

/* ─── Общее ─── */

/**
 * Случайное целое в диапазоне `[0, max)`.
 *
 * Значения из последнего неполного периода отбрасываются: если взять остаток
 * от деления всего диапазона uint32 на `max`, младшие индексы выпадают чаще
 * остальных, и алфавит пароля перестаёт быть равномерным.
 */
const randomBelow = (max: number): number => {
	const limit = Math.floor(2 ** 32 / max) * max;
	const buffer = new Uint32Array(1);
	let value: number;
	do {
		crypto.getRandomValues(buffer);
		value = buffer[0];
	} while (value >= limit);
	return value % max;
};

/** Перемешивание Фишера—Йетса на том же источнике случайности */
const shuffle = <T>(items: T[]): T[] => {
	for (let i = items.length - 1; i > 0; i--) {
		const j = randomBelow(i + 1);
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
};

/* ─── Пароли ─── */

export type CharsetKey = "lower" | "upper" | "digits" | "symbols";

const CHARSET: Record<CharsetKey, string> = {
	lower: "abcdefghijklmnopqrstuvwxyz",
	upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
	digits: "0123456789",
	// Кавычек, обратной косой черты и пробела здесь нет намеренно: такой пароль
	// переживает вставку в JSON, YAML и командную строку без экранирования.
	symbols: "!#$%&()*+,-.:;<=>?@[]^_{|}~",
};

/** Порядок наборов в интерфейсе */
export const CHARSETS: { key: CharsetKey; label: string }[] = [
	{ key: "lower", label: "a–z" },
	{ key: "upper", label: "A–Z" },
	{ key: "digits", label: "0–9" },
	{ key: "symbols", label: "!#$%…" },
];

/** Знаки, которые путаются в шрифтах и при диктовке вслух */
const SIMILAR = "Il1|O0o";

export const PASSWORD_MIN = 4;
export const PASSWORD_MAX = 128;

export interface PasswordOptions {
	length: number;
	sets: Record<CharsetKey, boolean>;
	/** Убрать I l 1 | O 0 o */
	excludeSimilar: boolean;
	/** Каждый символ встречается не больше одного раза */
	noRepeat: boolean;
}

/** Выбранные наборы символов, каждый уже без отфильтрованных знаков */
const poolsFor = (options: PasswordOptions): string[][] =>
	CHARSETS.filter(({ key }) => options.sets[key])
		.map(({ key }) =>
			[...CHARSET[key]].filter(
				(char) => !options.excludeSimilar || !SIMILAR.includes(char),
			),
		)
		.filter((chars) => chars.length > 0);

/** Размер итогового алфавита — из него считается энтропия */
export const poolSize = (options: PasswordOptions): number =>
	poolsFor(options).reduce((sum, pool) => sum + pool.length, 0);

/** Причина, по которой пароль собрать нельзя; `null` — можно */
export const validatePasswordOptions = (
	options: PasswordOptions,
): string | null => {
	const size = poolSize(options);
	if (size === 0) return "Выберите хотя бы один набор символов";
	if (options.noRepeat && options.length > size)
		return `Без повторов доступно ${size} символов — уменьшите длину`;
	return null;
};

export const generatePassword = (options: PasswordOptions): string => {
	const pools = poolsFor(options);
	if (pools.length === 0) return "";

	const available = pools.flat();
	if (options.noRepeat && options.length > available.length) return "";

	const take = (from: string[]): string => {
		const char = from[randomBelow(from.length)];
		if (options.noRepeat) {
			const at = available.indexOf(char);
			if (at !== -1) available.splice(at, 1);
		}
		return char;
	};

	const chars: string[] = [];

	// Сначала по одному символу из каждого выбранного набора. Иначе пароль из
	// четырёх наборов может выйти без единой цифры — и его отвергнет проверка
	// на стороне сервиса, куда его несут.
	for (const pool of pools) {
		if (chars.length >= options.length) break;
		const usable = options.noRepeat
			? pool.filter((char) => available.includes(char))
			: pool;
		if (usable.length > 0) chars.push(take(usable));
	}

	while (chars.length < options.length && available.length > 0) {
		chars.push(take(available));
	}

	return shuffle(chars).join("");
};

/**
 * Оценка стойкости в битах: сколько вариантов пришлось бы перебрать.
 * Без повторов алфавит на каждом шаге короче, поэтому это сумма логарифмов,
 * а не произведение длины на логарифм.
 */
export const passwordEntropy = (options: PasswordOptions): number => {
	const size = poolSize(options);
	if (size === 0) return 0;
	if (!options.noRepeat) return options.length * Math.log2(size);

	let bits = 0;
	for (let i = 0; i < Math.min(options.length, size); i++) {
		bits += Math.log2(size - i);
	}
	return bits;
};

export type StrengthTone = "red" | "amber" | "green";

export interface PasswordStrength {
	label: string;
	tone: StrengthTone;
}

/** Словесная отметка к энтропии; границы взяты по запасу на перебор */
export const passwordStrength = (bits: number): PasswordStrength => {
	if (bits < 45) return { label: "слабый", tone: "red" };
	if (bits < 70) return { label: "средний", tone: "amber" };
	if (bits < 100) return { label: "хороший", tone: "green" };
	return { label: "отличный", tone: "green" };
};

/* ─── UUID ─── */

export type UuidVersion = "v4" | "v7";

export interface UuidFormat {
	upper: boolean;
	/** Без дефисов: 32 шестнадцатеричных знака подряд */
	compact: boolean;
	/** В фигурных скобках, как принято в .NET и реестре Windows */
	braces: boolean;
}

const toHex = (bytes: Uint8Array): string =>
	Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

/** UUID v4: 122 случайных бита, версия и вариант проставлены по RFC 9562 */
const uuidV4Bytes = (): Uint8Array => {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	return bytes;
};

/** Состояние счётчика для монотонности v7 внутри одной миллисекунды */
let lastMs = 0;
let counter = 0;

/** Ширина поля `rand_a`, отданного под счётчик: 12 бит */
const COUNTER_MAX = 0xfff;

/**
 * UUID v7: 48 бит времени в миллисекундах в старших байтах, дальше случайность.
 * Такие идентификаторы сортируются вместе со временем создания, поэтому их
 * берут первичными ключами там, где v4 разносит записи по индексу.
 *
 * Одного времени мало: пачка из десятка штук укладывается в ту же
 * миллисекунду, и порядок внутри неё задавала бы случайность. Поэтому поле
 * `rand_a` работает счётчиком — RFC 9562 отводит его ровно под это. Начальное
 * значение случайно и берётся из нижней половины диапазона, чтобы оставить
 * запас на рост и не выдавать номер следующего идентификатора.
 */
const uuidV7Bytes = (): Uint8Array => {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);

	let ms = Date.now();
	if (ms <= lastMs) {
		// Та же миллисекунда или часы перевели назад — продолжаем счёт.
		counter += 1;
		if (counter > COUNTER_MAX) {
			ms = lastMs + 1;
			counter = 0;
		} else {
			ms = lastMs;
		}
	} else {
		counter = randomBelow((COUNTER_MAX + 1) / 2);
	}
	lastMs = ms;

	// Старшие 16 бит метки не помещаются в 32-битный сдвиг — их делим явно.
	bytes[0] = Math.floor(ms / 2 ** 40) & 0xff;
	bytes[1] = Math.floor(ms / 2 ** 32) & 0xff;
	bytes[2] = (ms >>> 24) & 0xff;
	bytes[3] = (ms >>> 16) & 0xff;
	bytes[4] = (ms >>> 8) & 0xff;
	bytes[5] = ms & 0xff;

	bytes[6] = 0x70 | ((counter >>> 8) & 0x0f);
	bytes[7] = counter & 0xff;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	return bytes;
};

/**
 * Новый UUID в «сыром» виде — 32 шестнадцатеричных знака без разделителей.
 * Оформление отделено от генерации, чтобы смена формата перерисовывала уже
 * выданные значения, а не выдавала новые.
 */
export const generateUuid = (version: UuidVersion): string =>
	toHex(version === "v4" ? uuidV4Bytes() : uuidV7Bytes());

export const formatUuid = (plain: string, format: UuidFormat): string => {
	const dashed = `${plain.slice(0, 8)}-${plain.slice(8, 12)}-${plain.slice(12, 16)}-${plain.slice(16, 20)}-${plain.slice(20)}`;
	const body = format.compact ? plain : dashed;
	const cased = format.upper ? body.toUpperCase() : body;
	return format.braces ? `{${cased}}` : cased;
};
