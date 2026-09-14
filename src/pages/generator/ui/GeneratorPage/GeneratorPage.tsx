import {
	type FC,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cx } from "@/shared/lib/cx";
import {
	CHARSETS,
	type CharsetKey,
	formatUuid,
	generatePassword,
	generateUuid,
	PASSWORD_MAX,
	PASSWORD_MIN,
	type PasswordOptions,
	passwordEntropy,
	passwordStrength,
	poolSize,
	type StrengthTone,
	type UuidFormat,
	type UuidVersion,
	validatePasswordOptions,
} from "@/shared/lib/random";
import { CheckIcon, CopyIcon, RefreshIcon } from "@/shared/svg";
import { Button, Checkbox, Select } from "@/shared/ui-kit/controls";
import { Header } from "@/widgets/layout";
import s from "../GeneratorPage.module.css";

/** Сколько держится отметка «скопировано» */
const COPIED_MS = 1200;

const COUNT_OPTIONS = [1, 5, 10, 25].map((n) => ({
	value: String(n),
	label: `${n} шт.`,
}));

const STRENGTH_CLASS: Record<StrengthTone, string> = {
	red: s.toneRed,
	amber: s.toneAmber,
	green: s.toneGreen,
};

/**
 * Копирование с отметкой, которая гаснет сама. Ключ нужен, чтобы галочка
 * загоралась только у нажатой строки, а не у всех сразу.
 */
const useCopy = () => {
	const [copied, setCopied] = useState<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	const copy = useCallback((key: string, text: string) => {
		navigator.clipboard?.writeText(text).then(
			() => {
				setCopied(key);
				clearTimeout(timer.current);
				timer.current = setTimeout(() => setCopied(null), COPIED_MS);
			},
			() => {},
		);
	}, []);

	return { copied, copy };
};

/** Строка результата: моноширинное значение и кнопка копирования */
const ResultRow: FC<{
	value: string;
	copied: boolean;
	onCopy: () => void;
}> = ({ value, copied, onCopy }) => (
	<div className={s.row}>
		<span className={s.rowValue}>{value}</span>
		<button
			type="button"
			className={cx(s.copyBtn, copied && s.copyBtnDone)}
			title="Скопировать"
			aria-label={`Скопировать: ${value}`}
			onClick={onCopy}
		>
			{copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
		</button>
	</div>
);

export const GeneratorPage: FC = () => {
	const { copied, copy } = useCopy();

	/* ─── Пароли ─── */

	const [options, setOptions] = useState<PasswordOptions>({
		length: 20,
		sets: { lower: true, upper: true, digits: true, symbols: true },
		excludeSimilar: false,
		noRepeat: false,
	});
	const [passwordCount, setPasswordCount] = useState(1);
	const [passwords, setPasswords] = useState<string[]>([]);

	const passwordError = validatePasswordOptions(options);
	const bits = useMemo(() => passwordEntropy(options), [options]);
	const strength = passwordStrength(bits);

	// Пароли пересобираются на любую правку настроек: ползунок длины и галочки
	// набора сразу показывают, что получится, без отдельного нажатия.
	const regeneratePasswords = useCallback(() => {
		setPasswords(
			validatePasswordOptions(options)
				? []
				: Array.from({ length: passwordCount }, () =>
						generatePassword(options),
					),
		);
	}, [options, passwordCount]);

	useEffect(regeneratePasswords, [regeneratePasswords]);

	const setLength = (raw: string) => {
		const value = Number(raw);
		if (!Number.isFinite(value)) return;
		const length = Math.min(
			PASSWORD_MAX,
			Math.max(PASSWORD_MIN, Math.round(value)),
		);
		setOptions((prev) => ({ ...prev, length }));
	};

	const toggleSet = (key: CharsetKey) =>
		setOptions((prev) => ({
			...prev,
			sets: { ...prev.sets, [key]: !prev.sets[key] },
		}));

	/* ─── UUID ─── */

	const [version, setVersion] = useState<UuidVersion>("v4");
	const [uuidCount, setUuidCount] = useState(5);
	const [format, setFormat] = useState<UuidFormat>({
		upper: false,
		compact: false,
		braces: false,
	});
	const [uuidSeeds, setUuidSeeds] = useState<string[]>([]);

	const regenerateUuids = useCallback(() => {
		setUuidSeeds(
			Array.from({ length: uuidCount }, () => generateUuid(version)),
		);
	}, [uuidCount, version]);

	useEffect(regenerateUuids, [regenerateUuids]);

	// Формат применяется к уже выданным значениям: смена регистра или дефисов
	// не должна подменять идентификатор, который пользователь уже куда-то вписал.
	const uuids = useMemo(
		() => uuidSeeds.map((seed) => formatUuid(seed, format)),
		[uuidSeeds, format],
	);

	const toggleFormat = (key: keyof UuidFormat) =>
		setFormat((prev) => ({ ...prev, [key]: !prev[key] }));

	return (
		<div className={s.frame}>
			<Header section="Инструменты / Generator" />

			<div className={s.scroll}>
				<div className={s.page}>
					{/* ─── Пароль ─── */}
					<section className={s.card}>
						<div className={s.cardHead}>
							<h2 className={s.cardTitle}>Пароль</h2>
							<div className={s.cardActions}>
								<Select
									options={COUNT_OPTIONS}
									value={String(passwordCount)}
									onChange={(e) => setPasswordCount(Number(e.target.value))}
									aria-label="Сколько паролей сгенерировать"
								/>
								<Button
									variant="primary"
									size="sm"
									icon={<RefreshIcon size={12} />}
									onClick={regeneratePasswords}
									disabled={passwordError !== null}
								>
									Сгенерировать
								</Button>
							</div>
						</div>

						<div className={s.lengthRow}>
							<span className={s.optionLabel}>Длина</span>
							<input
								type="range"
								className={s.range}
								min={PASSWORD_MIN}
								max={PASSWORD_MAX}
								value={options.length}
								onChange={(e) => setLength(e.target.value)}
								aria-label="Длина пароля"
							/>
							<input
								type="number"
								className={s.number}
								min={PASSWORD_MIN}
								max={PASSWORD_MAX}
								value={options.length}
								onChange={(e) => setLength(e.target.value)}
								aria-label="Длина пароля числом"
							/>
						</div>

						<div className={s.checks}>
							{CHARSETS.map(({ key, label }) => (
								<Checkbox
									key={key}
									label={label}
									checked={options.sets[key]}
									onChange={() => toggleSet(key)}
								/>
							))}
							<span className={s.checksSep} />
							<Checkbox
								label="Без похожих"
								checked={options.excludeSimilar}
								onChange={() =>
									setOptions((prev) => ({
										...prev,
										excludeSimilar: !prev.excludeSimilar,
									}))
								}
							/>
							<Checkbox
								label="Без повторов"
								checked={options.noRepeat}
								onChange={() =>
									setOptions((prev) => ({ ...prev, noRepeat: !prev.noRepeat }))
								}
							/>
						</div>

						<div className={s.hint}>
							{passwordError ? (
								<span className={s.hintError}>{passwordError}</span>
							) : (
								<>
									Алфавит <b>{poolSize(options)}</b> символов · энтропия{" "}
									<b>{Math.round(bits)}</b> бит · стойкость{" "}
									<span className={STRENGTH_CLASS[strength.tone]}>
										{strength.label}
									</span>
								</>
							)}
						</div>

						{passwords.length > 0 && (
							<div className={s.rows}>
								{passwords.map((value, index) => (
									<ResultRow
										key={index}
										value={value}
										copied={copied === `pwd-${index}`}
										onCopy={() => copy(`pwd-${index}`, value)}
									/>
								))}
							</div>
						)}

						{passwords.length > 1 && (
							<Button
								variant="subtle"
								size="sm"
								className={s.copyAll}
								icon={
									copied === "pwd-all" ? (
										<CheckIcon size={12} />
									) : (
										<CopyIcon size={12} />
									)
								}
								onClick={() => copy("pwd-all", passwords.join("\n"))}
							>
								Копировать все
							</Button>
						)}
					</section>

					{/* ─── UUID ─── */}
					<section className={s.card}>
						<div className={s.cardHead}>
							<h2 className={s.cardTitle}>UUID</h2>
							<div className={s.cardActions}>
								<div className={s.toggle}>
									<button
										type="button"
										className={cx(
											s.toggleBtn,
											version === "v4" && s.toggleActive,
										)}
										onClick={() => setVersion("v4")}
									>
										v4
									</button>
									<button
										type="button"
										className={cx(
											s.toggleBtn,
											version === "v7" && s.toggleActive,
										)}
										onClick={() => setVersion("v7")}
									>
										v7
									</button>
								</div>
								<Select
									options={COUNT_OPTIONS}
									value={String(uuidCount)}
									onChange={(e) => setUuidCount(Number(e.target.value))}
									aria-label="Сколько идентификаторов сгенерировать"
								/>
								<Button
									variant="primary"
									size="sm"
									icon={<RefreshIcon size={12} />}
									onClick={regenerateUuids}
								>
									Сгенерировать
								</Button>
							</div>
						</div>

						<div className={s.checks}>
							<Checkbox
								label="Верхний регистр"
								checked={format.upper}
								onChange={() => toggleFormat("upper")}
							/>
							<Checkbox
								label="Без дефисов"
								checked={format.compact}
								onChange={() => toggleFormat("compact")}
							/>
							<Checkbox
								label="В скобках"
								checked={format.braces}
								onChange={() => toggleFormat("braces")}
							/>
						</div>

						<div className={s.hint}>
							{version === "v4"
								? "122 случайных бита. Подходит везде, где идентификатор не должен ничего сообщать о времени создания."
								: "48 бит времени в старших байтах и случайность дальше. Такие идентификаторы сортируются по возрастанию вместе со временем создания."}
						</div>

						{uuids.length > 0 && (
							<div className={s.rows}>
								{uuids.map((value, index) => (
									<ResultRow
										key={index}
										value={value}
										copied={copied === `uuid-${index}`}
										onCopy={() => copy(`uuid-${index}`, value)}
									/>
								))}
							</div>
						)}

						{uuids.length > 1 && (
							<Button
								variant="subtle"
								size="sm"
								className={s.copyAll}
								icon={
									copied === "uuid-all" ? (
										<CheckIcon size={12} />
									) : (
										<CopyIcon size={12} />
									)
								}
								onClick={() => copy("uuid-all", uuids.join("\n"))}
							>
								Копировать все
							</Button>
						)}
					</section>
				</div>
			</div>
		</div>
	);
};
