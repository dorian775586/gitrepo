// ===================================
// КОНФИГУРАЦИЯ И ДАННЫЕ ПОЛЬЗОВАТЕЙ
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
    // ОСНОВНОЙ ЗАЛ (Столы 11-20) - ОБНОВЛЕНО С ОПИСАНИЯМИ
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

/** Заполняет карточку деталей стола и сохраняет выбранный ID. */
function showTableDetails(tableId, isBooked = false) {
    const tableDetailsCard = document.getElementById('table-details-card');
    const confirmBtn = document.getElementById('confirm-btn');
    const tableTitle = document.getElementById('table-title');
    const tableDescription = document.getElementById('table-description');
    const tablePhoto = document.getElementById('table-photo'); 

    const info = TABLE_DETAILS[tableId] || { 
        title: `Стол ${tableId}`, 
        desc: 'Информация временно недоступна.'
    };

    tableTitle.textContent = info.title;
    tableDescription.textContent = info.desc;
    
    // !!! ВОССТАНОВЛЕНО ПРЕДЫДУЩЕЕ ПОВЕДЕНИЕ !!!
    // Установка фото столика: всегда используется DEFAULT_TABLE_IMAGE
    if (tablePhoto) {
        tablePhoto.src = DEFAULT_TABLE_IMAGE; 
        tablePhoto.alt = info.title;
    }
    
    tableDetailsCard.style.display = 'block';
    selectedTableId = tableId;

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
            let availableTimes = data.free_times;
            
            // ЛОГИКА: ФИЛЬТРАЦИЯ ПРОШЕДШЕГО ВРЕМЕНИ СЕГОДНЯ
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            if (dateStr === todayStr) {
                availableTimes = data.free_times.filter(time => {
                    const [hour, minute] = time.split(':').map(Number);
                    
                    // Создаем объект Date для слота на сегодня, используя текущий день
                    const slotDateTime = new Date(now);
                    slotDateTime.setHours(hour, minute, 0, 0);

                    // Слот считается доступным, если его время строго больше текущего
                    return now.getTime() < slotDateTime.getTime(); 
                });
            }

            if (availableTimes.length > 0) {
                availableTimes.forEach(time => {
                    const option = document.createElement('option');
                    option.value = time;
                    option.textContent = time;
                    timeSelect.appendChild(option);
                });
                
                const firstSlot = availableTimes[0]; // Берем первый доступный слот
                timeSelect.options[0].selected = true; 
                currentTimeValue.textContent = firstSlot;
                
                return true;
            } else {
                timeSelect.innerHTML = '<option value="">Нет свободных слотов</option>';
                currentTimeValue.textContent = 'Занято';
                return false;
            }
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

/** Главный обработчик, вызываемый при выборе стола или изменении даты. */
async function updateTableAvailability(tableId) {
    const dateInput = document.getElementById("dateInput");
    const dateStr = dateInput ? dateInput.value : null;
    const confirmBtn = document.getElementById('confirm-btn');

    // Оптимизация: Сразу показываем, что идет проверка (решает проблему "серой кнопки")
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Проверка доступности...';
        confirmBtn.style.backgroundColor = '#666'; // Временно серый цвет
    }

    if (tableId && dateStr) {
        const hasFreeSlots = await fillTimeSelect(tableId, dateStr);
        showTableDetails(tableId, !hasFreeSlots); // Показываем детали и обновляем кнопку
    } else if (tableId) {
        // Если даты нет, но стол выбран, показываем детали, предполагая доступность
        // (дата будет выбрана позже в модальном окне)
        showTableDetails(tableId, false);
    }
}

// ===================================
// ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ЗОН (ДОБАВЛЕНО)
// ===================================

/** Переключает видимую карту столов и активную кнопку */
function switchArea(area) {
    const terraceMap = document.getElementById('terrace-map');
    const hallMap = document.getElementById('main-hall-map');
    const toggleTerrace = document.getElementById('toggle-terrace');
    const toggleHall = document.getElementById('toggle-hall');
    
    // Снимаем выделение со всех столов
    document.querySelectorAll('.table-element').forEach(el => el.classList.remove('table-selected'));
    
    // Сбрасываем выбранный стол и карточку деталей
    selectedTableId = null;
    document.getElementById('table-details-card').style.display = 'none';
    
    const confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Подтвердить бронь'; // Сбрасываем текст
        confirmBtn.style.backgroundColor = 'var(--primary-color)';
    }

    document.getElementById('current-table-value').textContent = 'Не выбран';
    document.getElementById('current-time-value').textContent = '...';
    
    // Переключаем активную карту и кнопку
    if (area === 'terrace') {
        terraceMap.classList.add('active');
        hallMap.classList.remove('active');
        toggleTerrace.classList.add('active');
        toggleHall.classList.remove('active');
    } else if (area === 'hall') {
        terraceMap.classList.remove('active');
        hallMap.classList.add('active');
        toggleTerrace.classList.remove('active');
        toggleHall.classList.add('active');
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
        // Успех: переключаем кнопку обратно (хотя окно закроется)
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
        
        safeShowAlert("✅ Бронь успешно создана! Вы получите подтверждение в чате.");
        updateTableAvailability(selectedTableId);
        Telegram.WebApp.close(); 
    })
    .catch(err => {
        // Ошибка: переключаем кнопку обратно
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
        updateTableAvailability(selectedTableId);
    });
}

// ===================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ===================================

document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("dateInput");
    const confirmBtn = document.getElementById("confirm-btn");
    // ВАЖНО: Выбираем ВСЕ столы (и с террасы, и из зала)
    const tableElements = document.querySelectorAll('.table-element');
    const bookingOverlay = document.getElementById('booking-overlay');
    const bookingForm = document.getElementById("booking-form");
    const timeSelect = document.getElementById("timeSelect");
    
    const timeValueDisplay = document.getElementById("current-time-value");
    const tableValueDisplay = document.getElementById("current-table-value");
    
    // Новые элементы для переключения зон
    const toggleTerrace = document.getElementById('toggle-terrace');
    const toggleHall = document.getElementById('toggle-hall');

    // 0. Инициализация времени 
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
            if (selectedTableId) {
                updateTableAvailability(selectedTableId);
            }
        });
    }
    
    // 1.1. Обработчики переключателя зон
    if (toggleTerrace) {
        toggleTerrace.addEventListener('click', () => {
            switchArea('terrace');
        });
    }
    if (toggleHall) {
        toggleHall.addEventListener('click', () => {
            switchArea('hall');
        });
    }


    // 2. Обработчик кликов по столам (общий для обеих карт)
    tableElements.forEach(table => {
        table.addEventListener('click', (event) => {
            const tableId = event.currentTarget.getAttribute('data-table');
            
            // Сбрасываем выделение со ВСЕХ столов на ОБЕИХ картах
            document.querySelectorAll('.table-element').forEach(el => el.classList.remove('table-selected'));
            
            if (tableId) {
                event.currentTarget.classList.add('table-selected');
                updateTableAvailability(tableId); // Запускаем проверку доступности

                // Обновление статуса стола в заголовке
                if (tableValueDisplay) {
                    tableValueDisplay.textContent = `Стол ${tableId}`;
                }
            }
        });
    });

    // 3. Обработчик кнопки подтверждения (открывает модальное окно)
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
            // Установка времени и даты в модальное окно
            document.getElementById('timeSelect').value = document.getElementById('current-time-value').textContent; 
            document.getElementById('dateInput').value = dateInput.value;
            
            bookingOverlay.style.display = 'flex';
        });
    }

    // 4. Обработчик отправки формы бронирования (внутри модального окна)
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
            
            // НЕМЕДЛЕННОЕ ОТКЛЮЧЕНИЕ КНОПКИ
            submitButton.disabled = true;
            submitButton.textContent = 'Обработка...';

            sendBooking(table_id, time_slot, guests, phone, date_str, submitButton, originalButtonText);
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

    // ИНИЦИАЛИЗАЦИЯ: Убеждаемся, что Терраса активна при загрузке
    // Этот вызов должен быть в конце DOMContentLoaded, чтобы все элементы уже существовали
    switchArea('terrace'); 
});