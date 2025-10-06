// Проверка, что JS подключен (убираем лишнюю проверку, т.к. DOMContentLoaded важнее)
// const appElement = document.getElementById('app');
// if (appElement) {
//     appElement.textContent = 'WebApp готов к бронированию!';
// }

// ===================================
// КОНФИГУРАЦИЯ И ДАННЫЕ ПОЛЬЗОВАТЕЙ
// ===================================
const API_BASE_URL = "https://readytoearn-4.onrender.com"; // Ваш URL
let user_id = null;
let user_name = "Неизвестный";
let selectedTableId = null; // Глобальное состояние для выбранного стола

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
    // dateInput.value устанавливается в DOMContentLoaded
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
 * Статические данные по столам
 */
const TABLE_DETAILS = {
    '1': { title: 'Стол 1 (2-4 чел.)', desc: 'Уютный круглый стол у окна. Отлично для свидания.' },
    '2': { title: 'Стол 2 (2-4 чел.)', desc: 'Уютный круглый стол у окна. Отлично для свидания.' },
    '3': { title: 'Стол 3 (4 чел.)', desc: 'Прямоугольный стол у стены, подходит для семьи.' },
    '4': { title: 'Стол 4 (4 чел.)', desc: 'Прямоугольный стол у стены, подходит для семьи.' },
    '5': { title: 'Стол 5 (4-6 чел.)', desc: 'Центральный круглый стол в зале. Вид на барную стойку.' },
    '6': { title: 'Стол 6 (6-8 чел.)', desc: 'Банкетный стол, лучшее место для большой компании.' },
    '7': { title: 'Стол 7 (2-4 чел.)', desc: 'Прямоугольный стол в тихом углу.' },
    '8': { title: 'Стол 8 (2-4 чел.)', desc: 'Прямоугольный стол, ближе к выходу.' },
};

/**
 * Заполняет карточку деталей стола и сохраняет выбранный ID.
 * @param {string} tableId - ID выбранного стола.
 * @param {boolean} isBooked - Флаг, указывающий, занят ли стол на выбранное время.
 */
function showTableDetails(tableId, isBooked = false) {
    const tableDetailsCard = document.getElementById('table-details-card');
    const confirmBtn = document.getElementById('confirm-btn');
    const tableTitle = document.getElementById('table-title');
    const tableDescription = document.getElementById('table-description');

    const info = TABLE_DETAILS[tableId] || { title: `Стол ${tableId}`, desc: 'Информация временно недоступна.' };

    tableTitle.textContent = info.title;
    tableDescription.textContent = info.desc;
    tableDetailsCard.style.display = 'block';

    selectedTableId = tableId;

    if (isBooked) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = `Стол ${tableId} занят на это время`;
        confirmBtn.style.backgroundColor = 'var(--table-booked)';
    } else {
        confirmBtn.disabled = false;
        confirmBtn.textContent = `Забронировать стол ${tableId}`;
        confirmBtn.style.backgroundColor = 'var(--primary-color)';
    }
}


/**
 * Запрашивает свободные слоты у бэкенда и заполняет <select id="timeSelect">.
 * @param {string} tableId - ID выбранного стола.
 * @param {string} dateStr - Дата в формате YYYY-MM-DD.
 * @returns {Promise<boolean>} True, если есть свободные слоты.
 */
async function fillTimeSelect(tableId, dateStr) {
    const timeSelect = document.getElementById("timeSelect");
    const currentTimeValue = document.getElementById("current-time-value");
    
    if (!timeSelect) return false;

    timeSelect.innerHTML = '<option value="">Загрузка...</option>';

    if (!tableId || !dateStr) {
        timeSelect.innerHTML = '<option value="">Выберите стол и дату</option>';
        currentTimeValue.textContent = '...';
        return false;
    }

    try {
        const url = `${API_BASE_URL}/get_booked_times?table=${tableId}&date=${dateStr}`;
        const res = await fetch(url);
        const data = await res.json();
        
        timeSelect.innerHTML = '';

        if (data.status === "ok" && data.free_times && data.free_times.length > 0) {
            data.free_times.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                timeSelect.appendChild(option);
            });
            
            // Устанавливаем и показываем первый доступный слот
            const firstSlot = timeSelect.options[0].value;
            timeSelect.options[0].selected = true; 
            currentTimeValue.textContent = firstSlot;
            
            return true;
        } else {
            timeSelect.innerHTML = '<option value="">Нет свободных слотов</option>';
            currentTimeValue.textContent = 'Занято';
            return false;
        }

    } catch (err) {
        console.error("Ошибка при получении времени:", err);
        timeSelect.innerHTML = '<option value="">Ошибка загрузки времени</option>';
        currentTimeValue.textContent = 'Ошибка';
        return false;
    }
}

/**
 * Главный обработчик, вызываемый при выборе стола или изменении даты.
 * Обновляет доступность времени.
 * @param {string} tableId - ID выбранного стола.
 */
async function updateTableAvailability(tableId) {
    const dateInput = document.getElementById("dateInput");
    const dateStr = dateInput ? dateInput.value : null;

    if (tableId && dateStr) {
        const hasFreeSlots = await fillTimeSelect(tableId, dateStr);
        showTableDetails(tableId, !hasFreeSlots); // Показываем детали, отмечая, занят ли стол
    } else if (tableId) {
        // Если дата не выбрана, но стол выбран (чего не должно быть, т.к. дата устанавливается по умолчанию)
        showTableDetails(tableId, false);
    }
}


// ===================================
// ОТПРАВКА БРОНИ
// ===================================

/**
 * Функция для отправки брони на сервер
 */
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
            // Если статус 409 (Conflict) или другая ошибка, парсим JSON
            return res.json().then(errorData => { 
                const statusCode = res.status;
                const message = errorData.message || "Ошибка бронирования";
                // Специальная обработка для 409 Conflict
                if (statusCode === 409) {
                    throw new Error(`409: ${message}`);
                }
                throw new Error(message); 
            });
        }
        return res.json();
    })
    .then(data => {
        // Успешный ответ
        Telegram.WebApp.showAlert("✅ Бронь успешно создана! Вы получите подтверждение в чате.");
        // Обновляем доступность стола (чтобы он был помечен как занятый, если пользователь захочет перебронировать)
        updateTableAvailability(selectedTableId);
        // Закрываем WebApp после успешного бронирования
        Telegram.WebApp.close(); 
    })
    .catch(err => {
        // Обработка всех ошибок
        console.error("Ошибка бронирования/сети:", err);
        const message = err.message.includes("409:") ? 
                        err.message.replace("409: ", "") : 
                        "⚠️ Ошибка сети. Попробуйте позже.";
        Telegram.WebApp.showAlert(`❌ ${message}`);
        // Закрываем модальное окно после неудачной попытки
        document.getElementById('booking-overlay').style.display = 'none';
        
        // Повторно проверяем доступность, чтобы обновить UI карты
        updateTableAvailability(selectedTableId);
    });
}

// ===================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ===================================

document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("dateInput");
    const confirmBtn = document.getElementById("confirm-btn");
    const tableElements = document.querySelectorAll('.table-element');
    const bookingOverlay = document.getElementById('booking-overlay');
    const bookingForm = document.getElementById("booking-form");
    const timeSelect = document.getElementById("timeSelect");

    // 1. Инициализация даты и отображение
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        document.getElementById("current-date-value").textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        
        // При изменении даты, обновляем доступность для текущего выбранного стола
        dateInput.addEventListener("change", (e) => {
            document.getElementById("current-date-value").textContent = new Date(e.target.value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            if (selectedTableId) {
                updateTableAvailability(selectedTableId);
            }
        });
    }

    // 2. Обработчик кликов по столам
    tableElements.forEach(table => {
        table.addEventListener('click', (event) => {
            const tableId = event.currentTarget.getAttribute('data-table');
            
            // Сбрасываем класс "table-selected" со всех столов
            tableElements.forEach(el => el.classList.remove('table-selected'));
            
            // Устанавливаем класс "table-selected" на выбранный стол
            if (tableId) {
                event.currentTarget.classList.add('table-selected');
                updateTableAvailability(tableId); // Запускаем проверку доступности
            }
        });
    });

    // 3. Обработчик кнопки подтверждения (открывает модальное окно)
    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            if (!selectedTableId) {
                Telegram.WebApp.showAlert("⚠️ Пожалуйста, выберите столик на карте!");
                return;
            }
            
            // Проверяем, есть ли слоты
            if (!timeSelect || timeSelect.value === '' || timeSelect.value.includes('Нет свободных')) {
                Telegram.WebApp.showAlert("⚠️ На выбранную дату нет свободных слотов для этого стола.");
                return;
            }
            
            // Устанавливаем выбранный стол в модальном окне
            document.getElementById('selected-table-modal').textContent = `(Стол ${selectedTableId})`;
            // Устанавливаем текущее время и дату в поля модального окна
            document.getElementById('timeSelect').value = document.getElementById('current-time-value').textContent;
            document.getElementById('dateInput').value = dateInput.value;
            
            // Показываем модальное окно
            bookingOverlay.style.display = 'flex';
        });
    }

    // 4. Обработчик отправки формы бронирования (внутри модального окна)
    if (bookingForm) {
        bookingForm.addEventListener("submit", (e) => {
            e.preventDefault(); 
            
            const guestsInput = document.getElementById("guestsInput");
            const phoneInput = document.getElementById("phoneInput");
            
            const table_id = selectedTableId; // Берем из глобального состояния
            const time_slot = timeSelect ? timeSelect.value : null;
            const guests = guestsInput ? guestsInput.value : null;
            const phone = phoneInput ? phoneInput.value : null;
            const date_str = dateInput ? dateInput.value : null;

            if (!table_id || !time_slot || !guests || !phone || !date_str) {
                Telegram.WebApp.showAlert("⚠️ Пожалуйста, заполните все поля формы!");
                return;
            }

            // Отправка брони
            sendBooking(table_id, time_slot, guests, phone, date_str);
        });
    }
    
    // 5. Обработчик закрытия модального окна
    const closeBtn = document.getElementById('closeBookingForm');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            bookingOverlay.style.display = 'none';
        });
    }
    
    // Изначально кнопку делаем неактивной
    if (confirmBtn) {
        confirmBtn.disabled = true;
    }
});