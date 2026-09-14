-- Тело тестового запроса переезжает в один JSON-документ на набор.
--
-- До этой миграции тело хранилось двумя несвязанными способами: плоскими
-- парами в request_param_values (kind = 'body') для режима «fields» и строкой
-- raw_body для режима «raw». Оба лежали одновременно, расходились после
-- переключения режима, а вложенные объекты в режиме «fields» были невыразимы.
-- Теперь тело всегда одно — колонка `body`, а `body_mode` остаётся настройкой
-- редактора (форма или JSON), а не признаком того, где искать данные.
--
-- request_param_values остаётся для path и query — они по природе плоские
-- строки. Значение 'body' у kind после этой миграции не пишет никто; CHECK
-- намеренно не пересобирается, потому что перестройка таблицы требует
-- PRAGMA foreign_keys = OFF, а он работает только вне транзакции — цена
-- атомарности здесь выше пользы от ужесточения проверки.
ALTER TABLE endpoint_requests ADD COLUMN body TEXT NOT NULL DEFAULT '';

-- Режим raw: тело уже лежит готовой строкой.
UPDATE endpoint_requests SET body = raw_body WHERE body_mode = 'raw';

-- Режим fields: собираем JSON из плоских пар, применяя тип из схемы эндпоинта.
-- Приведение повторяет coerceParamValue из виджета try-it, чтобы после
-- миграции на сервер уходило ровно то же, что уходило до неё:
--   * ссылки на переменные ({{VAR}}) остаются строками — их подставляют при
--     отправке, а не сейчас;
--   * числовым параметрам соответствует JSON-число, если текст похож на число
--     (включая "007" -> 7, как это делает Number() в JS);
--   * булевым — true/false для "true"/"1" и "false"/"0";
--   * всё остальное, включая нечисловой текст в числовом поле, остаётся
--     строкой — ровно так ведёт себя coerceParamValue при неудачном разборе.
-- JOIN по имени отбрасывает значения параметров, которых больше нет в схеме;
-- их и раньше игнорировали при отправке, так что тело не меняется.
UPDATE endpoint_requests
SET body = COALESCE(NULLIF((
    SELECT json_group_object(v.name,
      CASE
        WHEN instr(v.value, '{{') > 0 THEN v.value
        WHEN lower(p.type) IN ('integer','int','long','number','float','double')
             AND trim(v.value) GLOB '*[0-9]*'
             AND trim(v.value) NOT GLOB '*[^0-9eE.+-]*'
          THEN json_quote(CASE
                 WHEN instr(v.value, '.') = 0 AND instr(lower(v.value), 'e') = 0
                   THEN CAST(trim(v.value) AS INTEGER)
                 ELSE CAST(trim(v.value) AS REAL)
               END)
        WHEN lower(p.type) IN ('boolean','bool')
             AND lower(trim(v.value)) IN ('true','1')  THEN json('true')
        WHEN lower(p.type) IN ('boolean','bool')
             AND lower(trim(v.value)) IN ('false','0') THEN json('false')
        ELSE v.value
      END)
    FROM request_param_values v
    JOIN param p
      ON p.endpoint_id = endpoint_requests.endpoint_id
     AND p.kind = 'body'
     AND p.name = v.name
    WHERE v.request_id = endpoint_requests.id AND v.kind = 'body'
  ), '{}'), '')
WHERE body_mode = 'fields';

-- Плоское тело больше не источник правды.
DELETE FROM request_param_values WHERE kind = 'body';

ALTER TABLE endpoint_requests DROP COLUMN raw_body;
