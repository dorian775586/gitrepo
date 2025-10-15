// ===================================
// КОНФИГУРАЦИЯ И ДАННЫЕ ПОЛЬЗОВАТЕЛЕЙ
// ===================================
const API_BASE_URL = "https://readytoearn-4.onrender.com"; // Ваш URL
const DEFAULT_TABLE_IMAGE = "https://santarest.by/222.JPG"; // URL для фото столика

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
const dateInputGlobal = document.getElementById("dateInput"); // Переименовал, чтобы избежать конфликта
if (dateInputGlobal) {
    const today = new Date().toISOString().split('T')[0];
    dateInputGlobal.min = today;
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
    // ТЕРРАСА (Столы 1-10)
    '1': { title: 'Стол 1 (8 чел.)', desc: 'Просторный стол для большой компании у окна террасы.' },
    '2': { title: 'Стол 2 (8 чел.)', desc: 'Просторный стол для большой компании у окна террасы.' },
    '3': { title: 'Стол 3 (4 чел.)', desc: 'Прямоугольный стол у стены, подходит для семьи.' },
    '4': { title: 'Стол 4 (4 чел.)', desc: 'Прямоугольный стол у стены, подходит для семьи.' },
    '5': { title: 'Стол 5 (4 чел.)', desc: 'Прямоугольный стол у стены, подходит для семьи.' },
    '6': { title: 'Стол 6 (4 чел.)', desc: 'Прямоугольный стол у стены, подходит для семьи.' },
    '7': { title: 'Стол 7 (4 чел.)', desc: 'Прямоугольный стол в тихом углу.' },
    '8': { title: 'Стол 8 (4 чел.)', desc: 'Прямоугольный стол, ближе к выходу.' },
    '9': { title: 'Стол 9 (4 чел.)', desc: 'Прямоугольный стол в тихом углу.' },
    '10': { title: 'Стол 10 (4 чел.)', desc: 'Прямоугольный стол, ближе к выходу.' },
    // ОСНОВНОЙ ЗАЛ (Столы 11-20)
    '11': { title: 'Стол 11 (2-4 чел.)', desc: 'Уютный круглый стол у бара, идеален для небольшой компании.' },
    '12': { title: 'Стол 12 (2-4 чел.)', desc: 'Уютный круглый стол у бара с видом на зал.' },
    '13': { title: 'Стол 13 (6 чел.)', desc: 'Большой прямоугольный стол в центре зала, для компаний до 6 человек.' },
    '14': { title: 'Стол 14 (4 чел.)', desc: 'Круглый стол у колонны, создает атмосферу уединения.' },
    '15': { title: 'Стол 15 (4 чел.)', desc: 'Круглый стол у колонны, удобен для бесед.' },
    '16': { title: 'Стол 16 (4 чел.)', desc: 'Прямоугольный стол у стены с мягкими диванами.' },
    '17': { title: 'Стол 17 (4 чел.)', desc: 'Прямоугольный стол в середине зала, с хорошим обзором.' },
    '18': { title: 'Стол 18 (4 чел.)', desc: 'Прямоугольный стол у стены, идеально для небольшой группы.' },
    '19': { title: 'Стол 19 (6 чел.)', desc: 'Большой круглый стол в дальней части зала, подходит для семейного ужина.' },
    '20': { title: 'Стол 20 (6 чел.)', desc: 'Большой круглый стол, идеален для компании друзей.' },
};

/**
 * !!! НОВАЯ ФУНКЦИЯ !!!
 * Устанавливает класс занятости для конкретного стола.
 */
function applyTableStatus(tableId, isBooked) {
    const tableElement = document.querySelector(`[data-table="${tableId}"]`);
    if (tableElement) {
        if (isBooked) {
            tableElement.classList.add('table-booked'); // Красный
        } else {
            tableElement.classList.remove('table-booked'); // Свободный
        }
    }
}

/** Заполняет карточку деталей стола и сохраняет выбранный ID. */
function showTableDetails(tableId, isBooked = false) {
    const tableDetailsCard = document.getElementById('table-details-card');
    const confirmBtn = document.getElementById('confirm-btn');
    const tableTitle = document.getElementById('table-title');
    const tableDescription = document.getElementById('table-description');
    const tablePhoto = document.getElementById('table-photo'); 

    if (!tableDetailsCard || !confirmBtn || !tableTitle || !tableDescription) return;

    const info = TABLE_DETAILS[tableId] || { 
        title: `Стол ${tableId}`, 
        desc: 'Информация временно недоступна.'
    };

    tableTitle.textContent = info.title;
    tableDescription.textContent = info.desc;
    
    if (tablePhoto) {
        tablePhoto.src = DEFAULT_TABLE_IMAGE; 
        tablePhoto.alt = info.title;
    }
    
    tableDetailsCard.style.display = 'block';
    selectedTableId = tableId;

    // !!! ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ ДЛЯ ВИЗУАЛЬНОГО СТАТУСА НА КАРТЕ !!!
    applyTableStatus(tableId, isBooked);

    // Обновление состояния кнопки
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

/** Запрашивает свободные слоты у бэкенда и заполняет select. */
async function fillTimeSelect(tableId, dateStr) {
    const timeSelect = document.getElementById("timeSelect");
    const currentTimeValue = document.getElementById("current-time-value");
    
    if (!timeSelect) return false;

    timeSelect.innerHTML = '<option value="">Загрузка...</option>';
    if (currentTimeValue) currentTimeValue.textContent = '...';

    if (!tableId || !dateStr) {
        timeSelect.innerHTML = '<option value="">Выберите стол и дату</option>';
        if (currentTimeValue) currentTimeValue.textContent = '...';
        return false;
    }

    try {
        const url = `${API_BASE_URL}/get_booked_times?table=${tableId}&date=${dateStr}`;
        const res = await fetch(url);
        const data = await res.json();
        
        timeSelect.innerHTML = '';

        if (data.status === "ok" && data.free_times && data.free_times.length > 0) {
            let availableTimes = data.free_times;
            
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Фильтрация прошедшего времени только для сегодняшней даты
            if (dateStr === todayStr) {
                const minTime = now.getTime() + (10 * 60 * 1000); // +10 минут
                availableTimes = availableTimes.filter(time => {
                    const [hour, minute] = time.split(':').map(Number);
                    const slotDateTime = new Date(now);
                    slotDateTime.setHours(hour, minute, 0, 0);
                    return minTime < slotDateTime.getTime();
                });
            }

            if (availableTimes.length > 0) {
                availableTimes.forEach(time => {
                    const option = document.createElement('option');
                    option.value = time;
                    option.textContent = time;
                    timeSelect.appendChild(option);
                });
                
                const firstSlot = availableTimes[0];
                timeSelect.value = firstSlot;
                if (currentTimeValue) currentTimeValue.textContent = firstSlot;
                
                return true;
            } else {
                timeSelect.innerHTML = '<option value="">Нет свободных слотов</option>';
                if (currentTimeValue) currentTimeValue.textContent = 'Занято';
                return false;
            }
        } else {
            timeSelect.innerHTML = '<option value="">Нет свободных слотов</option>';
            if (currentTimeValue) currentTimeValue.textContent = 'Занято';
            return false;
        }

    } catch (err) {
        console.error("Ошибка при получении времени:", err);
        timeSelect.innerHTML = '<option value="">Ошибка загрузки времени</option>';
        if (currentTimeValue) currentTimeValue.textContent = 'Ошибка';
        return false;
    }
}

/** Главный обработчик, вызываемый при выборе стола или изменении даты. */
async function updateTableAvailability(tableId) {
    const dateInput = document.getElementById("dateInput");
    const dateStr = dateInput ? dateInput.value : null;
    const confirmBtn = document.getElementById('confirm-btn');

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Проверка доступности...';
        confirmBtn.style.backgroundColor = '#666';
    }

    if (tableId && dateStr) {
        const hasFreeSlots = await fillTimeSelect(tableId, dateStr);
        showTableDetails(tableId, !hasFreeSlots);
    } else if (tableId) {
        showTableDetails(tableId, false);
    }
}

/**
 * !!! НОВАЯ ФУНКЦИЯ !!!
 * Проверяет все столы на текущей активной карте и помечает их как занятые
 */
async function initializeMapAvailability(dateStr) {
    const activeMap = document.querySelector('.map-area.active');
    if (!activeMap || !dateStr) return;

    const tableElements = activeMap.querySelectorAll('.table-element');
    
    tableElements.forEach(el => el.classList.remove('table-booked'));

    const checks = Array.from(tableElements).map(async (tableElement) => {
        const tableId = tableElement.getAttribute('data-table');
        if (!tableId) return;

        try {
            const url = `${API_BASE_URL}/get_booked_times?table=${tableId}&date=${dateStr}`;
            const res = await fetch(url);
            const data = await res.json();
            
            const isFullyBooked = !(data.status === "ok" && data.free_times && data.free_times.length > 0);
            
            if (isFullyBooked) {
                tableElement.classList.add('table-booked');
            } else {
                tableElement.classList.remove('table-booked');
            }
        } catch (err) {
            console.error(`Ошибка при проверке стола ${tableId} в initializeMap:`, err);
            tableElement.classList.remove('table-booked'); 
        }
    });

    await Promise.all(checks);
    
    if (selectedTableId) {
        if (activeMap.querySelector(`[data-table="${selectedTableId}"]`)) {
            await updateTableAvailability(selectedTableId);
        }
    }
}

// ===================================
// ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ЗОН
// ===================================
function switchArea(area) {
    const terraceMap = document.getElementById('terrace-map');
    const hallMap = document.getElementById('main-hall-map');
    const toggleTerrace = document.getElementById('toggle-terrace');
    const toggleHall = document.getElementById('toggle-hall');
    
    document.querySelectorAll('.table-element').forEach(el => el.classList.remove('table-selected'));
    
    selectedTableId = null;
    const tableDetailsCard = document.getElementById('table-details-card');
    if (tableDetailsCard) tableDetailsCard.style.display = 'none';
    
    const confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Подтвердить бронь';
        confirmBtn.style.backgroundColor = 'var(--primary-color)';
    }

    const tableValueDisplay = document.getElementById('current-table-value');
    const timeValueDisplay = document.getElementById('current-time-value');
    if (tableValueDisplay) tableValueDisplay.textContent = 'Не выбран';
    if (timeValueDisplay) timeValueDisplay.textContent = '...';
    
    if (area === 'terrace') {
        if (terraceMap) terraceMap.classList.add('active');
        if (hallMap) hallMap.classList.remove('active');
        if (toggleTerrace) toggleTerrace.classList.add('active');
        if (toggleHall) toggleHall.classList.remove('active');
    } else if (area === 'hall') {
        if (terraceMap) terraceMap.classList.remove('active');
        if (hallMap) hallMap.classList.add('active');
        if (toggleTerrace) toggleTerrace.classList.remove('active');
        if (toggleHall) toggleHall.classList.add('active');
    }
    
    const dateInput = document.getElementById("dateInput");
    if (dateInput && dateInput.value) {
        initializeMapAvailability(dateInput.value);
    }
}

// ===================================
// ОТПРАВКА БРОНИ
// ===================================
function sendBooking(table_id, time_slot, guests, phone, date_str, submitButton, originalButtonText) {
    const data = { table: table_id, time: time_slot, guests, phone, user_id, user_name, date: date_str };

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
                if (statusCode === 409) throw new Error(`409: ${message}`);
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
        initializeMapAvailability(date_str); 
        document.querySelectorAll('.table-element').forEach(el => el.classList.remove('table-selected'));
        selectedTableId = null;
        document.getElementById('table-details-card').style.display = 'none';

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
        initializeMapAvailability(date_str);
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
    
    const timeValueDisplay = document.getElementById("current-time-value");
    const tableValueDisplay = document.getElementById("current-table-value");
    
    const toggleTerrace = document.getElementById('toggle-terrace');
    const toggleHall = document.getElementById('toggle-hall');

    if (timeValueDisplay) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeValueDisplay.textContent = `${hours}:${minutes}`;
    }

    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        document.getElementById("current-date-value").textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        
        dateInput.addEventListener("change", (e) => {
            const newDate = e.target.value;
            document.getElementById("current-date-value").textContent = new Date(newDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            initializeMapAvailability(newDate); 
            if (selectedTableId) updateTableAvailability(selectedTableId);
            else {
                document.getElementById('table-details-card').style.display = 'none';
                if (confirmBtn) confirmBtn.disabled = true;
            }
        });
    }
    
    if (toggleTerrace) toggleTerrace.addEventListener('click', () => switchArea('terrace'));
    if (toggleHall) toggleHall.addEventListener('click', () => switchArea('hall'));

    tableElements.forEach(table => {
        table.addEventListener('click', (event) => {
            const tableId = event.currentTarget.getAttribute('data-table');
            document.querySelectorAll('.table-element').forEach(el => el.classList.remove('table-selected'));
            if (tableId) {
                event.currentTarget.classList.add('table-selected');
                updateTableAvailability(tableId);
                if (tableValueDisplay) tableValueDisplay.textContent = `Стол ${tableId}`;
            }
        });
    });

    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            if (!selectedTableId) {
                safeShowAlert("⚠️ Пожалуйста, выберите столик на карте!");
                return;
            }
            if (!timeSelect || timeSelect.value === '' || timeSelect.value.includes('Нет свободных')) {
                safeShowAlert("⚠️ На выбранную дату нет свободных слотов для этого стола.");
                return;
            }
            document.getElementById('selected-table-modal').textContent = `(Стол ${selectedTableId})`;
            document.getElementById('dateInput').value = dateInput.value;
            if (bookingOverlay) bookingOverlay.style.display = 'flex';
        });
    }

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
    
    const closeBtn = document.getElementById('closeBookingForm');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        if (bookingOverlay) bookingOverlay.style.display = 'none';
    });
    
    if (confirmBtn) confirmBtn.disabled = true;
    if (dateInput) switchArea('terrace'); 
});
