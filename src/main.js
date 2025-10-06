// Проверка, что JS подключен
const appElement = document.getElementById('app');
if (appElement) {
    appElement.textContent = 'WebApp готов к бронированию!';
}

// ===================================
// КОНФИГУРАЦИЯ И ДАННЫЕ ПОЛЬЗОВАТЕЙ
// ===================================
const API_BASE_URL = "https://readytoearn-4.onrender.com"; // Ваш URL
let user_id = null;
let user_name = "Неизвестный";

if (window.Telegram && Telegram.WebApp.initDataUnsafe) {
    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user) {
        user_id = user.id;
        user_name = user.first_name || '';
        if (user.last_name) {
            user_name += ' ' + user.last_name;
        }
    }
}

// Устанавливаем минимальную дату сегодня
const dateInput = document.getElementById("dateInput");
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today; // Устанавливаем сегодняшнюю дату по умолчанию
}


// ===================================
// ТЕМА И UI
// ===================================
function adaptToTheme() {
    const themeParams = window.Telegram.WebApp.themeParams;
    if (themeParams) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color || '#1f1f1f');
        document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color || '#252525');
        document.documentElement.style.setProperty('--tg-theme-hint-color', themeParams.hint_color || '#aaaaaa');
        document.documentElement.style.setProperty('--tg-theme-link-color', themeParams.link_color || '#007bff');
        document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color || '#007bff');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color || '#ffffff');
    }
}

if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    adaptToTheme();
    Telegram.WebApp.onEvent('themeChanged', adaptToTheme);
}


// ===================================
// ФУНКЦИИ БРОНИРОВАНИЯ И ДОСТУПНОСТИ
// ===================================

/**
 * Функция, которая вызывалась в ошибке, теперь определена.
 */
function showTableDetails(tableId) {
    console.log(`Выбран стол: ${tableId}`);
}


/**
 * Запрашивает свободные слоты у бэкенда и заполняет <select id="timeSelect">.
 * @param {string} tableId - ID выбранного стола.
 * @param {string} dateStr - Дата в формате YYYY-MM-DD.
 */
async function fillTimeSelect(tableId, dateStr) {
    const timeSelect = document.getElementById("timeSelect");
    if (!timeSelect) return;

    timeSelect.innerHTML = '<option value="">Загрузка...</option>'; // Очищаем и показываем загрузку

    if (!tableId || !dateStr) {
        timeSelect.innerHTML = '<option value="">Выберите стол и дату</option>';
        return;
    }

    try {
        const url = `${API_BASE_URL}/get_booked_times?table=${tableId}&date=${dateStr}`;
        const res = await fetch(url);
        const data = await res.json();
        
        timeSelect.innerHTML = ''; // Очищаем
        
        if (data.status === "ok" && data.free_times && data.free_times.length > 0) {
            data.free_times.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                timeSelect.appendChild(option);
            });
            // Выбираем первый слот, если они есть
            if (timeSelect.options.length > 0) {
                timeSelect.options[0].selected = true; 
            }
        } else {
            timeSelect.innerHTML = '<option value="">Нет свободных слотов</option>';
        }

        // Вызываем showTableDetails, чтобы устранить ошибку (если она вызывалась в другом месте)
        showTableDetails(tableId); 

    } catch (err) {
        console.error("Ошибка при получении времени:", err);
        timeSelect.innerHTML = '<option value="">Ошибка загрузки времени</option>';
    }
}

/**
 * Главный обработчик, вызываемый при изменении даты или стола.
 */
function updateTableAvailability() {
    const tableSelect = document.getElementById("tableSelect");
    const dateInput = document.getElementById("dateInput");

    if (!tableSelect || !dateInput) return;

    const tableId = tableSelect.value;
    const dateStr = dateInput.value;

    if (tableId && dateStr) {
        fillTimeSelect(tableId, dateStr);
    } else {
        const timeSelect = document.getElementById("timeSelect");
        if (timeSelect) {
            timeSelect.innerHTML = '<option value="">Выберите стол и дату</option>';
        }
    }
    
    // Вызываем showTableDetails, чтобы устранить ошибку ReferenceError
    showTableDetails(tableId); 
}


// ===================================
// ОТПРАВКА БРОНИ
// ===================================

// Функция для отправки брони на сервер
function sendBooking(table_id, time_slot, guests, phone, date_str) {
    const data = {
        table: table_id,
        time: time_slot,
        guests: guests,
        phone: phone,
        user_id: user_id,
        user_name: user_name,
        date: date_str
    };

    fetch(`${API_BASE_URL}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(res => {
        if (!res.ok) {
            // Если статус 409 или другая ошибка, парсим JSON и передаем дальше
            return res.json().then(errorData => { throw new Error(errorData.message || "Ошибка бронирования"); });
        }
        return res.json();
    })
    .then(data => {
        // Успешный ответ
        Telegram.WebApp.showAlert("✅ Бронь успешно создана!");
        // Закрываем WebApp после успешного бронирования
        Telegram.WebApp.close(); 
    })
    .catch(err => {
        // Обработка всех ошибок, включая 409 Conflict
        console.error("Ошибка бронирования/сети:", err);
        const message = err.message.includes("Ошибка бронирования") ? 
                        err.message.replace("Ошибка бронирования: ", "") : 
                        "⚠️ Ошибка сети. Попробуйте позже.";
        Telegram.WebApp.showAlert(`❌ ${message}`);
    });
}

// ===================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ===================================

document.addEventListener("DOMContentLoaded", () => {
    const tableSelect = document.getElementById("tableSelect");
    const dateInput = document.getElementById("dateInput");
    const bookBtn = document.getElementById("bookBtn");

    if (tableSelect) {
        tableSelect.addEventListener("change", updateTableAvailability);
    }

    if (dateInput) {
        dateInput.addEventListener("change", updateTableAvailability);
        // Запускаем первоначальную проверку доступности
        updateTableAvailability(); 
    }

    if (bookBtn) {
        bookBtn.addEventListener("click", () => {
            const timeSelect = document.getElementById("timeSelect");
            const guestsInput = document.getElementById("guestsInput");
            const phoneInput = document.getElementById("phoneInput");
            
            const table_id = tableSelect ? tableSelect.value : null;
            const time_slot = timeSelect ? timeSelect.value : null;
            const guests = guestsInput ? guestsInput.value : null;
            const phone = phoneInput ? phoneInput.value : null;
            const date_str = dateInput ? dateInput.value : null;

            // Простейшая проверка заполнения
            if (!table_id || !time_slot || !guests || !phone || !date_str) {
                Telegram.WebApp.showAlert("⚠️ Пожалуйста, заполните все поля!");
                return;
            }

            sendBooking(table_id, time_slot, guests, phone, date_str);
        });
    } else {
        console.error("Кнопка 'bookBtn' не найдена. Проверьте index.html.");
    }
});