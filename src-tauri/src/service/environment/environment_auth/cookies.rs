//! Куки сессии окружения.
//!
//! Единственный источник кук — ответ на запрос авторизации: что сервер прислал
//! в `Set-Cookie`, то и уходит дальше в HTTP-запросы ([`send_request`]) и в
//! WebSocket-рукопожатие ([`ws_connect`]) этого окружения. Свой jar у reqwest
//! отключён намеренно (см. [`http_client::build_client`]): он живёт на всё
//! приложение, а не на окружение, и подхватывает `Set-Cookie` из любого ответа —
//! то есть переключение окружения не сбрасывало бы чужую сессию.
//!
//! [`send_request`]: crate::service::request::send_request
//! [`ws_connect`]: crate::service::websocket::ws_connect
//! [`http_client::build_client`]: crate::infrastructure::http_client::build_client

use std::collections::{BTreeMap, HashMap};

/// Куки окружения: имя → значение. `BTreeMap` — чтобы порядок в заголовке
/// `Cookie` и в JSON-колонке был стабильным между запусками.
pub type CookieJar = BTreeMap<String, String>;

/// Применяет к `jar` заголовки `Set-Cookie` из ответа авторизации: одноимённые
/// куки перезаписываются, остальные сохраняются, удалённые сервером — исчезают.
pub fn merge_set_cookies(jar: &mut CookieJar, set_cookies: &[String]) {
    for raw in set_cookies {
        let Some(parsed) = parse_set_cookie(raw) else {
            continue;
        };
        if parsed.expired {
            jar.remove(&parsed.name);
        } else {
            jar.insert(parsed.name, parsed.value);
        }
    }
}

struct ParsedCookie {
    name: String,
    value: String,
    expired: bool,
}

/// Разбирает одну строку `Set-Cookie`. Берётся только пара `имя=значение` до
/// первой `;`; атрибуты (`Path`, `Domain`, `HttpOnly`, `SameSite`) нас не
/// касаются — область видимости кук задаётся хостом окружения, см.
/// [`host_matches`].
///
/// Признаком удаления считается `Max-Age` ≤ 0 или `Expires` в 1970-м — так куку
/// гасят на практике. Полный разбор дат не делается: в проекте нет зависимости
/// с календарём, а протухшую сессию всё равно чинит повторная авторизация.
fn parse_set_cookie(raw: &str) -> Option<ParsedCookie> {
    let mut parts = raw.split(';');
    let (name, value) = parts.next()?.split_once('=')?;
    let name = name.trim();
    if name.is_empty() {
        return None;
    }

    let expired = parts.any(|attr| {
        let attr = attr.trim();
        match attr.split_once('=') {
            Some((key, val)) if key.trim().eq_ignore_ascii_case("max-age") => {
                val.trim().parse::<i64>().map(|v| v <= 0).unwrap_or(false)
            }
            Some((key, val)) if key.trim().eq_ignore_ascii_case("expires") => val.contains("1970"),
            _ => false,
        }
    });

    Some(ParsedCookie {
        name: name.to_string(),
        value: value.trim().to_string(),
        expired,
    })
}

/// Домешивает куки окружения в заголовок `Cookie`.
///
/// Пара, которую пользователь задал сам (вкладка Headers), побеждает нашу
/// одноимённую: то, что он вписал руками, важнее сохранённой сессии. Остальные
/// его куки остаются нетронутыми.
pub fn apply(headers: &mut HashMap<String, String>, jar: &CookieJar) {
    if jar.is_empty() {
        return;
    }

    let existing_key = headers
        .keys()
        .find(|k| k.eq_ignore_ascii_case("cookie"))
        .cloned();
    let existing = existing_key
        .as_ref()
        .and_then(|k| headers.get(k))
        .cloned()
        .unwrap_or_default();

    let user_pairs: Vec<&str> = existing
        .split(';')
        .map(str::trim)
        .filter(|p| !p.is_empty())
        .collect();
    let user_names: Vec<&str> = user_pairs
        .iter()
        .map(|p| p.split_once('=').map_or(*p, |(n, _)| n))
        .collect();

    let mut pairs: Vec<String> = user_pairs.iter().map(|p| p.to_string()).collect();
    for (name, value) in jar {
        if user_names.contains(&name.as_str()) {
            continue;
        }
        pairs.push(format!("{name}={}", sanitize(value)));
    }

    if let Some(k) = existing_key {
        headers.remove(&k);
    }
    headers.insert("Cookie".to_string(), pairs.join("; "));
}

/// Вырезает `;` и управляющие символы: иначе значение куки молча расщепилось бы
/// на две пары (`a;role=admin`), а перевод строки уронил бы рукопожатие на
/// валидации заголовка.
fn sanitize(value: &str) -> String {
    value
        .chars()
        .filter(|c| *c != ';' && *c != ',' && !c.is_control())
        .collect()
}

/// Задал ли пользователь свою версию хотя бы одной из наших кук.
///
/// Если да — авторизация в этом запросе его, а не наша: мы её не перетираем и
/// не обновляем при 401. Именно «одноимённую», а не любую куку: посторонний
/// `Cookie: theme=dark` не должен отключать сессию окружения.
pub fn user_overrides(headers: &HashMap<String, String>, jar: &CookieJar) -> bool {
    if jar.is_empty() {
        return false;
    }
    headers
        .iter()
        .filter(|(k, _)| k.eq_ignore_ascii_case("cookie"))
        .any(|(_, v)| {
            v.split(';').any(|pair| {
                let name = pair.trim().split_once('=').map_or(pair.trim(), |(n, _)| n);
                jar.contains_key(name)
            })
        })
}

/// Хост из URL — тот, кому куки принадлежат и кому их можно слать.
/// Работает и для `ws://`/`wss://`: они для парсера такие же спец-схемы.
pub fn host_of(url: &str) -> Option<String> {
    reqwest::Url::parse(url)
        .ok()?
        .host_str()
        .map(str::to_lowercase)
}

/// Можно ли слать куки окружения на этот URL: только выдавшему их хосту и его
/// поддоменам. Пустой `cookie_host` — куки сохранены до появления привязки,
/// тогда не ограничиваем.
pub fn host_matches(url: &str, cookie_host: &str) -> bool {
    let cookie_host = cookie_host.trim().to_lowercase();
    if cookie_host.is_empty() {
        return true;
    }
    let Some(host) = host_of(url) else {
        return false;
    };
    host == cookie_host || host.ends_with(&format!(".{cookie_host}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn jar(pairs: &[(&str, &str)]) -> CookieJar {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn merge_keeps_other_cookies_and_replaces_same_name() {
        let mut j = jar(&[("sid", "old"), ("csrf", "keep")]);
        merge_set_cookies(
            &mut j,
            &["sid=new; Path=/; HttpOnly; SameSite=Lax".to_string()],
        );
        assert_eq!(j.get("sid").unwrap(), "new");
        assert_eq!(j.get("csrf").unwrap(), "keep");
    }

    #[test]
    fn merge_drops_cookies_the_server_deleted() {
        let mut j = jar(&[("sid", "live"), ("legacy", "x")]);
        merge_set_cookies(
            &mut j,
            &[
                "sid=; Max-Age=0".to_string(),
                "legacy=; Expires=Thu, 01 Jan 1970 00:00:00 GMT".to_string(),
            ],
        );
        assert!(j.is_empty());
    }

    #[test]
    fn merge_ignores_malformed_headers() {
        let mut j = CookieJar::new();
        merge_set_cookies(
            &mut j,
            &["".to_string(), "novalue".to_string(), "=x".to_string()],
        );
        assert!(j.is_empty());
    }

    #[test]
    fn apply_merges_into_user_cookie_header() {
        let mut headers = HashMap::new();
        headers.insert("Cookie".to_string(), "theme=dark".to_string());

        apply(&mut headers, &jar(&[("sid", "abc")]));

        let cookie = headers.get("Cookie").unwrap();
        assert!(cookie.contains("theme=dark"));
        assert!(cookie.contains("sid=abc"));
    }

    #[test]
    fn user_pair_wins_over_stored_one() {
        let mut headers = HashMap::new();
        headers.insert("cookie".to_string(), "sid=mine".to_string());

        apply(&mut headers, &jar(&[("sid", "stored")]));

        assert_eq!(headers.get("Cookie").unwrap(), "sid=mine");
    }

    #[test]
    fn apply_strips_separators_from_values() {
        let mut headers = HashMap::new();
        apply(&mut headers, &jar(&[("sid", "a;role=admin")]));
        assert_eq!(headers.get("Cookie").unwrap(), "sid=arole=admin");
    }

    #[test]
    fn empty_jar_leaves_headers_alone() {
        let mut headers = HashMap::new();
        apply(&mut headers, &CookieJar::new());
        assert!(headers.is_empty());
    }

    #[test]
    fn only_a_same_named_cookie_counts_as_the_users_own_auth() {
        let j = jar(&[("sid", "stored")]);

        let mut unrelated = HashMap::new();
        unrelated.insert("Cookie".to_string(), "theme=dark".to_string());
        assert!(!user_overrides(&unrelated, &j));

        let mut own = HashMap::new();
        own.insert("cookie".to_string(), "theme=dark; sid=mine".to_string());
        assert!(user_overrides(&own, &j));

        assert!(!user_overrides(&own, &CookieJar::new()));
    }

    #[test]
    fn cookies_stay_on_their_host_and_subdomains() {
        assert!(host_matches(
            "https://api.example.com/v1",
            "api.example.com"
        ));
        assert!(host_matches("wss://api.example.com/ws", "api.example.com"));
        assert!(host_matches("https://a.example.com/x", "example.com"));
        assert!(!host_matches("https://evil.com/x", "example.com"));
        assert!(!host_matches("https://notexample.com/x", "example.com"));
        // Привязки ещё нет — не ограничиваем.
        assert!(host_matches("https://anything.dev", ""));
    }
}
