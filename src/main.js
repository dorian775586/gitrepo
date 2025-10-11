// ===================================
// КОНФИГУРАЦИЯ И ДАННЫЕ ПОЛЬЗОВАТЕЙ
// ===================================
const API_BASE_URL = "https://readytoearn-4.onrender.com"; // Ваш URL
const DEFAULT_TABLE_IMAGE = "https://santarest.by/222.JPG"; // URL для фото столика

let user_id = null;
let user_name = "Неизвестный";
let selectedTableId = null; // Глобальное состояние для выбранного стола
let currentActiveHall = "Основной зал"; // Глобальное состояние для активного зала

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
}

// ===================================
// УТИЛИТА ДЛЯ ОТОБРАЖЕНИЯ СООБЩЕНИЙ
// ===================================
function safeShowAlert(message) {
    if (window.Telegram && Telegram.WebApp.isVersionAtLeast('6.1')) {
        Telegram.WebApp.showAlert(message);
    } else {
        alert(message);
    }
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

/** Статические данные по столам */
const TABLE_DETAILS = {
    '1': { title: 'Стол 1 (2-4 чел.)', desc: 'Уютный круглый стол у окна. Отлично для свидания.' },
    '2': { title: 'Стол 2 (2-4 чел.)', desc: 'Уютный круглый стол у окна. Отлично для свидания.' },
    '3': { title: 'Стол 3 (4 чел.)', desc: 'Прямоугольный стол у стены, подходит для семьи.' },
    '4': { title: 'Стол 4 (4 чел.)', desc: 'Прямоугольный стол у стены, подходит для семьи.' },
    '5': { title: 'Стол 5 (4-6 чел.)', desc: 'Центральный круглый стол в зале. Вид на барную стойку.' },
    '6': { title: 'Стол 6 (6-8 чел.)', desc: 'Банкетный стол, лучшее место для большой компании.' },
    '7': { title: 'Стол 7 (2-4 чел.)', desc: 'Прямоугольный стол в тихом углу террасы.' },
    '8': { title: 'Стол 8 (2-4 чел.)', desc: 'Прямоугольный стол на террасе, ближе к выходу.' },
    '9': { title: 'Стол 9 (2-4 чел.)', desc: 'Круглый столик на террасе, у перил.' },
    '10': { title: 'Стол 10 (2-4 чел.)', desc: 'Круглый столик на террасе, с видом на улицу.' },
};

/** Заполняет карточку деталей стола и сохраняет выбранный ID. */
function showTableDetails(tableId, isBooked = false) {
    const tableDetailsCard = document.getElementById('table-details-card');
    const confirmBtn = document.getElementById('confirm-btn');
    const tableTitle = document.getElementById('table-title');
    const tableDescription = document.getElementById('table-description');
    const tablePhoto = document.getElementById('table-photo');

    const info = TABLE_DETAILS[tableId] || { title: `Стол ${tableId}`, desc: 'Информация временно недоступна.' };

    tableTitle.textContent = info.title;
    tableDescription.textContent = info.desc;

    if (tablePhoto) {
        tablePhoto.src = DEFAULT_TABLE_IMAGE;
        tablePhoto.alt = info.title;
    }

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
    // Обновляем отображение выбранного стола в заголовке
    document.getElementById("current-table-value").textContent = `Стол ${tableId}`;
}

/**
 * Запрашивает у бэкенда занятые слоты для ВСЕХ столов в выбранном зале на выбранную дату
 * и обновляет состояние всех столов на карте.
 */
async function updateHallTableAvailability(hallName, dateStr) {
    const confirmBtn = document.getElementById('confirm-btn');
    const timeSelect = document.getElementById("timeSelect");
    const currentTimeValue = document.getElementById("current-time-value");

    // Сброс состояния кнопки
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Выберите стол';
        confirmBtn.style.backgroundColor = '#666';
    }
    document.getElementById('table-details-card').style.display = 'none'; // Скрываем детали, пока не выбран стол
    document.getElementById("current-table-value").textContent = 'Не выбран';
    timeSelect.innerHTML = '<option value="">Загрузка...</option>';
    currentTimeValue.textContent = '...';

    if (!hallName || !dateStr) {
        console.warn("Нет зала или даты для обновления доступности.");
        return;
    }

    try {
        // !!! API запрос теперь включает название зала !!!
        const url = `${API_BASE_URL}/get_booked_times?hall=${encodeURIComponent(hallName)}&date=${dateStr}`;
        const res = await fetch(url);
        const data = await res.json();

        // Очищаем классы бронирования со всех столов
        document.querySelectorAll('.table-element').forEach(el => {
            el.classList.remove('table-booked', 'table-selected');
        });

        if (data.status === "ok") {
            const bookedSlots = data.booked_slots; // { '1': ['18:00', '19:00'], '2': ['20:00'] }
            const allTablesInHall = data.all_tables; // [1, 2, 3, 4, 5, 6] или [7, 8, 9, 10]

            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Отметить столы как занятые
            allTablesInHall.forEach(tableId => {
                const tableElement = document.getElementById(`table-${tableId}`);
                if (tableElement) {
                    const bookedTimesForTable = bookedSlots[tableId] || [];
                    let isTableBookedForCurrentTime = false;

                    // Если был выбран какой-то стол, и у него нет свободных слотов на текущий момент
                    if (selectedTableId === String(tableId)) {
                        const availableTimes = filterPastTimes(bookedTimesForTable, dateStr, now);
                        if (availableTimes.length === 0) {
                             isTableBookedForCurrentTime = true;
                        }
                    } else if (bookedTimesForTable.length > 0) {
                        // Если на столе есть хоть одно бронирование в будущем (для простоты - всегда показывать как занятый)
                        // TODO: Можно усложнить и показывать как занятый, если все слоты заняты или прошедшие
                        let hasFutureBooking = false;
                        for (const time of bookedTimesForTable) {
                            const [hour, minute] = time.split(':').map(Number);
                            const slotDateTime = new Date(dateStr);
                            slotDateTime.setHours(hour, minute, 0, 0);

                            if (slotDateTime.getTime() > now.getTime()) {
                                hasFutureBooking = true;
                                break;
                            }
                        }
                        if (hasFutureBooking) {
                            tableElement.classList.add('table-booked');
                        }
                    }
                }
            });

            // Если ранее был выбран стол, обновим его состояние
            if (selectedTableId) {
                const selectedTableElement = document.getElementById(`table-${selectedTableId}`);
                if (selectedTableElement) {
                    selectedTableElement.classList.add('table-selected');
                    const bookedTimesForSelected = bookedSlots[selectedTableId] || [];
                    const availableTimesForSelected = filterPastTimes(bookedTimesForSelected, dateStr, now);

                    // Если у выбранного стола есть доступные слоты, заполняем timeSelect
                    if (availableTimesForSelected.length > 0) {
                        fillTimeSelectForTable(availableTimesForSelected, timeSelect, currentTimeValue);
                        showTableDetails(selectedTableId, false); // Стол свободен
                    } else {
                        fillTimeSelectForTable([], timeSelect, currentTimeValue); // Нет слотов
                        showTableDetails(selectedTableId, true); // Стол занят
                    }
                }
            }

        } else {
            safeShowAlert(data.message || "Ошибка при получении данных о доступности.");
        }
    } catch (err) {
        console.error("Ошибка при получении доступности:", err);
        safeShowAlert("Ошибка сети или сервера при загрузке столов.");
    }
}

/** Фильтрует прошедшие слоты времени для текущей даты */
function filterPastTimes(bookedTimes, dateStr, now) {
    // Генерируем все возможные слоты (например, с 10:00 до 22:00 каждые 30 минут)
    const ALL_TIME_SLOTS = [];
    for (let h = 10; h <= 22; h++) {
        for (const m of ['00', '30']) {
            if (h === 22 && m === '30') continue; // Не включаем 22:30, если ресторан закрывается в 23:00
            ALL_TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${m}`);
        }
    }

    // Определяем доступные слоты (все - занятые)
    const availableSlots = ALL_TIME_SLOTS.filter(slot => !bookedTimes.includes(slot));

    // Фильтруем прошедшее время, если это сегодня
    const todayStr = now.toISOString().split('T')[0];
    if (dateStr === todayStr) {
        return availableSlots.filter(time => {
            const [hour, minute] = time.split(':').map(Number);
            const slotDateTime = new Date(now);
            slotDateTime.setHours(hour, minute, 0, 0);
            return now.getTime() < slotDateTime.getTime();
        });
    }
    return availableSlots;
}

/** Заполняет select времени на основе массива доступных слотов */
function fillTimeSelectForTable(availableTimes, timeSelect, currentTimeValue) {
    timeSelect.innerHTML = '';
    if (availableTimes.length > 0) {
        availableTimes.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeSelect.appendChild(option);
        });
        timeSelect.options[0].selected = true;
        currentTimeValue.textContent = availableTimes[0];
    } else {
        timeSelect.innerHTML = '<option value="">Нет свободных слотов</option>';
        currentTimeValue.textContent = 'Занято';
    }
}


// ===================================
// ОТПРАВКА БРОНИ
// ===================================

/** Функция для отправки брони на сервер */
function sendBooking(table_id, time_slot, guests, phone, date_str, submitButton, originalButtonText) {
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
            return res.json().then(errorData => {
                const statusCode = res.status;
                const message = errorData.message || "Ошибка бронирования";
                if (statusCode === 409) {
                    throw new Error(`409: ${message}`);
                }
                throw new Error(message);
            });
        }
        return res.json();
    })
    .then(data => {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }

        safeShowAlert("✅ Бронь успешно создана! Вы получите подтверждение в чате.");
        // После успешной брони нужно обновить доступность для текущего зала
        updateHallTableAvailability(currentActiveHall, document.getElementById("dateInput").value);
        Telegram.WebApp.close();
    })
    .catch(err => {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }

        console.error("Ошибка бронирования/сети:", err);
        const message = err.message.includes("409:") ?
                            err.message.replace("409: ", "") :
                            "⚠️ Ошибка сети. Попробуйте позже.";
        safeShowAlert(`❌ ${message}`);
        document.getElementById('booking-overlay').style.display = 'none';
        // При ошибке также нужно обновить доступность
        updateHallTableAvailability(currentActiveHall, document.getElementById("dateInput").value);
    });
}

// ===================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ===================================

document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("dateInput");
    const confirmBtn = document.getElementById("confirm-btn");
    const tableElements = document.querySelectorAll('.table-element'); // Все столы
    const bookingOverlay = document.getElementById('booking-overlay');
    const bookingForm = document.getElementById("booking-form");
    const timeSelect = document.getElementById("timeSelect");

    const timeValueDisplay = document.getElementById("current-time-value");
    const tableValueDisplay = document.getElementById("current-table-value");
    const hallSelect = document.getElementById("hall-select"); // Селектор зала
    const mapMainHall = document.getElementById("map-main-hall");
    const mapTerrace = document.getElementById("map-terrace");

    // 0. Инициализация времени (НОВАЯ ЛОГИКА)
    if (timeValueDisplay) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeValueDisplay.textContent = `${hours}:${minutes}`;
    }

    // 1. Инициализация даты и отображение
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        document.getElementById("current-date-value").textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

        dateInput.addEventListener("change", (e) => {
            document.getElementById("current-date-value").textContent = new Date(e.target.value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            // При изменении даты всегда обновляем доступность для текущего активного зала
            updateHallTableAvailability(currentActiveHall, e.target.value);
        });
    }

    // 2. Обработчик выбора зала
    if (hallSelect) {
        hallSelect.addEventListener('change', (e) => {
            currentActiveHall = e.target.value;
            selectedTableId = null; // Сброс выбранного стола при смене зала
            
            // Скрываем все карты
            mapMainHall.style.display = 'none';
            mapTerrace.style.display = 'none';

            // Показываем только выбранную
            if (currentActiveHall === "Основной зал") {
                mapMainHall.style.display = 'block';
            } else if (currentActiveHall === "Терраса") {
                mapTerrace.style.display = 'block';
            }
            // Обновляем доступность для нового зала
            updateHallTableAvailability(currentActiveHall, dateInput.value);
        });
    }

    // 3. Обработчик кликов по столам
    tableElements.forEach(table => {
        table.addEventListener('click', (event) => {
            const tableId = event.currentTarget.getAttribute('data-table');

            // Снимаем выделение со всех столов
            document.querySelectorAll('.table-element').forEach(el => el.classList.remove('table-selected'));

            if (tableId) {
                event.currentTarget.classList.add('table-selected');
                selectedTableId = tableId; // Обновляем выбранный стол

                // Проверяем, свободен ли стол для текущей даты и зала
                // Вместо updateTableAvailability(tableId) используем данные из last updateHallTableAvailability
                const currentTableElement = event.currentTarget;
                const isBooked = currentTableElement.classList.contains('table-booked');
                
                // Отображаем детали стола и обновляем кнопку подтверждения
                showTableDetails(tableId, isBooked);

                // Обновляем timeSelect только для выбранного стола
                const dateStr = dateInput.value;
                if (dateStr) {
                    // Нужно получить список занятых слотов конкретно для этого стола
                    // (Предполагаем, что updateHallTableAvailability уже загрузил эти данные)
                    // Для реальной работы потребуется либо сохранять эти данные, либо делать ещё один запрос
                    // Для простоты, пока будем использовать старый способ загрузки времени
                    // TODO: Оптимизировать: использовать кэшированные данные из updateHallTableAvailability
                    fetch(`${API_BASE_URL}/get_booked_times?hall=${encodeURIComponent(currentActiveHall)}&date=${dateStr}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.status === 'ok') {
                                const bookedTimesForSelected = data.booked_slots[selectedTableId] || [];
                                const availableTimesForSelected = filterPastTimes(bookedTimesForSelected, dateStr, new Date());
                                fillTimeSelectForTable(availableTimesForSelected, timeSelect, timeValueDisplay);
                                showTableDetails(selectedTableId, availableTimesForSelected.length === 0);
                            }
                        })
                        .catch(err => {
                            console.error("Ошибка при получении времени для выбранного стола:", err);
                            safeShowAlert("Ошибка загрузки времени для стола.");
                        });
                }
            }
        });
    });

    // 4. Обработчик кнопки подтверждения (открывает модальное окно)
    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            if (!selectedTableId) {
                safeShowAlert("⚠️ Пожалуйста, выберите столик на карте!");
                return;
            }

            if (!timeSelect || timeSelect.value === '' || timeSelect.value.includes('Нет свободных')) {
                safeShowAlert("⚠️ На выбранную дату и время нет свободных слотов для этого стола.");
                return;
            }

            document.getElementById('selected-table-modal').textContent = `(Стол ${selectedTableId})`;
            // Убеждаемся, что dateInput.value и timeSelect.value актуальны перед открытием
            document.getElementById('dateInput').value = dateInput.value;
            // timeSelect уже должен быть заполнен актуальным временем
            
            bookingOverlay.style.display = 'flex';
        });
    }

    // 5. Обработчик отправки формы бронирования (внутри модального окна)
    if (bookingForm) {
        bookingForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const guestsInput = document.getElementById("guestsInput");
            const phoneInput = document.getElementById("phoneInput");

            const table_id = selectedTableId;
            const time_slot = timeSelect ? timeSelect.value : null;
            const guests = guestsInput ? guestsInput.value : null;
            const phone = phoneInput ? phoneInput.value : null;
            const date_str = dateInput ? dateInput.value : null;

            const submitButton = bookingForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;

            if (!table_id || !time_slot || !guests || !phone || !date_str) {
                safeShowAlert("⚠️ Пожалуйста, заполните все поля формы!");
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Обработка...';

            sendBooking(table_id, time_slot, guests, phone, date_str, submitButton, originalButtonText);
        });
    }

    // 6. Обработчик закрытия модального окна
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

    // Инициализация при загрузке страницы:
    // Устанавливаем текущий зал и обновляем его доступность
    if (hallSelect) {
        hallSelect.value = currentActiveHall; // Убеждаемся, что селектор соответствует начальному состоянию
        // После загрузки DOM сразу обновляем доступность столов для активного зала и текущей даты
        updateHallTableAvailability(currentActiveHall, dateInput.value);
    }
});