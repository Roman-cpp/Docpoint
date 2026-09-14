//! Обходной путь для рендерера WebKitGTK на Linux.

/// Переменная, которой WebKitGTK отключает отрисовку через DMABUF. Читается
/// один раз при инициализации WebKit, поэтому выставлять её имеет смысл только
/// до старта Tauri.
#[cfg(target_os = "linux")]
const DISABLE_DMABUF: &str = "WEBKIT_DISABLE_DMABUF_RENDERER";

/// Отключает DMABUF-рендерер там, где он ломает отрисовку окна.
///
/// WebKitGTK отдаёт кадры через DMABUF, а проприетарный драйвер NVIDIA этот
/// путь не тянет: окно открывается пустым или с артефактами. Лечится
/// `WEBKIT_DISABLE_DMABUF_RENDERER=1`, но выставлять её всем нельзя — на Intel
/// и AMD DMABUF работает, и без него канвас ERD теряет аппаратное ускорение.
///
/// Возвращает `true`, если переменную выставили здесь.
#[cfg(target_os = "linux")]
pub fn disable_dmabuf_renderer_if_needed() -> bool {
    // Пользователь уже решил за нас. Пустое значение здесь — способ вернуть
    // DMABUF обратно, поэтому смотрим на наличие переменной, а не на её текст.
    if std::env::var_os(DISABLE_DMABUF).is_some() {
        return false;
    }

    if !nvidia_proprietary_driver() {
        return false;
    }

    // Вызывается первой строкой run(), до Tauri и до любых потоков: set_var
    // трогает окружение процесса целиком и с соседним потоком не дружит.
    std::env::set_var(DISABLE_DMABUF, "1");
    true
}

#[cfg(not(target_os = "linux"))]
pub fn disable_dmabuf_renderer_if_needed() -> bool {
    false
}

/// Каталог `/sys/module/nvidia` создаёт только проприетарный драйвер: nouveau
/// зовётся иначе и с DMABUF проблем не имеет. Вариант через `/proc/modules`
/// пропустил бы драйвер, вкомпилированный в ядро.
#[cfg(target_os = "linux")]
fn nvidia_proprietary_driver() -> bool {
    std::path::Path::new("/sys/module/nvidia").exists()
}
