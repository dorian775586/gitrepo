// =======================================================
// КОНСТАНТЫ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// =======================================================
const API_BASE_URL = window.location.origin; // Используем текущий домен для API запросов
const DEFAULT_TABLE_IMAGE = 'https://gitrepo-drab.vercel.app/images/default_table.jpg';

let selectedTableId = null; // ID выбранного стола
let selectedDate = null;    // Выбранная дата (YYYY-MM-DD)
let selectedTime = null;    // Выбранное время (HH:MM)

// Детали столов (можно загружать по API или хранить здесь)
const TABLE_DETAILS = {
    '1': { title: 'Стол 1 (Терраса)', desc: 'Уютный стол для двоих на террасе с видом.', photo: 'https://gitrepo-drab.vercel.app/images/table1.jpg' },
    '2': { title: 'Стол 2 (Терраса)', desc: 'Большой стол для компании на террасе.', photo: 'https://gitrepo-drab.vercel.app/images/table2.jpg' },
    '3': { title: 'Стол 3 (Терраса)', desc: 'Угловой стол, подходит для небольших групп.', photo: 'https://gitrepo-drab.vercel.app/images/table3.jpg' },
    '4': { title: 'Стол 4 (Терраса)', desc: 'Стол у окна, идеально для свидания.', photo: 'https://gitrepo-drab.vercel.app/images/table4.jpg' },
    '5': { title: 'Стол 5 (Терраса)', desc: 'Прямоугольный стол для 4-х человек.', photo: 'https://gitrepo-drab.vercel.app/images/table5.jpg' },
    '6': { title: 'Стол 6 (Терраса)', desc: 'Круглый стол для непринужденной беседы.', photo: 'https://gitrepo-drab.vercel.app/images/table6.jpg' },
    '7': { title: 'Стол 7 (Терраса)', desc: 'Стол в тени, прохладно в летний зной.', photo: 'https://gitrepo-drab.vercel.app/images/table7.jpg' },
    '8': { title: 'Стол 8 (Терраса)', desc: 'Видовой стол с панорамой города.', photo: 'https://gitrepo-drab.vercel.app/images/table8.jpg' },
    '9': { title: 'Стол 9 (Терраса)', desc: 'Изолированный стол для деловой встречи.', photo: 'https://gitrepo-drab.vercel.app/images/table9.jpg' },
    '10': { title: 'Стол 10 (Терраса)', desc: 'Последний стол на террасе, всегда пользуется спросом.', photo: 'https://gitrepo-drab.vercel.app/images/table10.jpg' },
    '11': { title: 'Стол 11 (Зал)', desc: 'Стол в центре зала, для тех, кто любит быть в гуще событий.', photo: 'https://gitrepo-drab.vercel.app/images/table11.jpg' },
    '12': { title: 'Стол 12 (Зал)', desc: 'Большой стол для больших компаний в основном зале.', photo: 'https://gitrepo-drab.vercel.app/images/table12.jpg' },
    '13': { title: 'Стол 13 (Зал)', desc: 'Уединенный стол для спокойного ужина.', photo: 'https://gitrepo-drab.vercel.app/images/table13.jpg' },
    '14': { title: 'Стол 14 (Зал)', desc: 'Стол у сцены, идеально для просмотра шоу.', photo: 'https://gitrepo-drab.vercel.app/images/table14.jpg' },
    '15': { title: 'Стол 15 (Зал)', desc: 'Прямоугольный стол у бара.', photo: 'https://gitrepo-drab.vercel.app/images/table15.jpg' },
    '16': { title: 'Стол 16 (Зал)', desc: 'Круглый стол для 6-8 человек.', photo: 'https://gitrepo-drab.vercel.app/images/table16.jpg' },
    '17': { title: 'Стол 17 (Зал)', desc: 'Стол с мягкими диванами.', photo: 'https://gitrepo-drab.vercel.app/images/table17.jpg' },
    '18': { title: 'Стол 18 (Зал)', desc: 'VIP-стол с эксклюзивным обслуживанием.', photo: 'https://gitrepo-drab.vercel.app/images/table18.jpg' },
    '19': { title: 'Стол 19 (Зал)', desc: 'Стол для больших торжеств.', photo: 'https://gitrepo-drab.vercel.app/images/table19.jpg' },
    '20': { title: 'Стол 20 (Зал)', desc: 'Стол у входа, для быстрых встреч.', photo: 'https://gitrepo-drab.vercel.app/images/table20.jpg' },
};


// =======================================================
// ФУНКЦИИ
// =======================================================

/**
 * Переключает активную область (терраса или зал) и обновляет отображение карты.
 * @param {string} areaId - ID области ('terrace' или 'main-hall').
 */
function switchArea(areaId) {
    document.querySelectorAll('.map-area').forEach(area => {
        area.style.display = 'none';
    });
    document.querySelectorAll('.area-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(areaId).style.display = 'block';
    document.getElementById(`${areaId}-btn`).classList.add('active');
    
    // После переключения области, обновляем доступность всех столов для новой карты
    // Если есть выбранная дата
    const dateInput = document.getElementById("dateInput");
    if (dateInput && dateInput.value) {
        initializeMapAvailability(dateInput.value);
    }
}

/**
 * Заполняет выпадающий список времени для выбранного стола на выбранную дату.
 * Возвращает true, если есть свободные слоты, иначе false.
 * @param {string} tableId - ID стола.
 * @param {string} dateStr - Дата в формате 'YYYY-MM-DD'.
 * @returns {Promise<boolean>} - Promise, который разрешается в true, если есть свободные слоты, иначе false.
 */
async function fillTimeSelect(tableId, dateStr) {
    const timeSelect = document.getElementById("timeSelect");
    const currentTimeValue = document.getElementById("current-time-value");
    
    if (!timeSelect) return false;

    timeSelect.innerHTML = '<option value="">Загрузка...</option>';
    currentTimeValue.textContent = '...';

    if (!tableId || !dateStr) {
        timeSelect.innerHTML = '<option value="">Выберите стол и дату</option>';
        currentTimeValue.textContent = '...';
        return false;
    }

    try {
        const url = `${API_BASE_URL}/get_booked_times?table=${tableId}&date=${dateStr}`;
        const res = await fetch(url);
        const data = await res.json();
        
        timeSelect.innerHTML = ''; // Очищаем список перед заполнением

        if (data.status === "ok" && data.free_times && data.free_times.length > 0) {
            let availableTimes = data.free_times; 
            
            if (availableTimes.length > 0) {
                availableTimes.forEach(time => {
                    const option = document.createElement('option');
                    option.value = time;
                    option.textContent = time;
                    timeSelect.appendChild(option);
                });
                
                // Выбираем первый доступный слот по умолчанию
                selectedTime = availableTimes[0];
                timeSelect.value = selectedTime; 
                currentTimeValue.textContent = selectedTime;
                
                return true; // Есть свободные слоты
            } else {
                timeSelect.innerHTML = '<option value="">Нет свободных слотов</option>';
                currentTimeValue.textContent = 'Занято';
                selectedTime = null;
                return false; // Нет свободных слотов
            }
        } else {
            timeSelect.innerHTML = '<option value="">Нет свободных слотов</option>';
            currentTimeValue.textContent = 'Занято';
            selectedTime = null;
            return false; // Нет свободных слотов
        }

    } catch (err) {
        console.error("Ошибка при получении времени:", err);
        timeSelect.innerHTML = '<option value="">Ошибка загрузки времени</option>';
        currentTimeValue.textContent = 'Ошибка';
        selectedTime = null;
        return false; // Ошибка, нет свободных слотов
    }
}

/**
 * Заполняет карточку деталей стола и сохраняет выбранный ID.
 * Также обновляет визуальное состояние стола на карте.
 * @param {string} tableId - ID выбранного стола.
 * @param {boolean} isBooked - true, если стол полностью занят на выбранное время/дату, иначе false.
 */
function showTableDetails(tableId, isBooked = false) {
    const tableDetailsCard = document.getElementById('table-details-card');
    const confirmBtn = document.getElementById('confirm-btn');
    const tableTitle = document.getElementById('table-title');
    const tableDescription = document.getElementById('table-description');
    const tablePhoto = document.getElementById('table-photo'); 
    
    // Получаем сам элемент стола на карте, чтобы обновить его класс
    const tableElement = document.querySelector(`[data-table="${tableId}"]`);
    if (!tableElement) return; // Защита от ошибок, если стол не найден

    const info = TABLE_DETAILS[tableId] || { 
        title: `Стол ${tableId}`, 
        desc: 'Информация временно недоступна.',
        photo: DEFAULT_TABLE_IMAGE
    };

    // Сбрасываем все визуальные состояния со ВСЕХ столов перед применением нового
    document.querySelectorAll('.table-element').forEach(el => {
        el.classList.remove('table-selected', 'table-booked');
    });
    
    // Обновляем детали карточки
    tableTitle.textContent = info.title;
    tableDescription.textContent = info.desc;
    
    if (tablePhoto) {
        tablePhoto.src = info.photo || DEFAULT_TABLE_IMAGE; 
        tablePhoto.alt = info.title;
    }
    
    tableDetailsCard.style.display = 'block';
    selectedTableId = tableId;

    // Обновление состояния кнопки бронирования И ВИЗУАЛЬНОГО СОСТОЯНИЯ СТОЛА
    if (isBooked) {
        tableElement.classList.add('table-booked'); // Стол становится красным
        confirmBtn.disabled = true;
        confirmBtn.textContent = `Стол ${tableId} занят на это время`;
        confirmBtn.style.backgroundColor = 'var(--table-booked)'; // Красный для кнопки
    } else {
        tableElement.classList.add('table-selected'); // Стол становится золотым
        confirmBtn.disabled = false;
        confirmBtn.textContent = `Забронировать стол ${tableId}`;
        confirmBtn.style.backgroundColor = 'var(--primary-color)'; // Основной цвет для кнопки
    }
}

/**
 * Обновляет доступность конкретного стола и отображает его детали.
 * Используется при клике на стол или изменении даты.
 * @param {string} tableId - ID стола.
 */
async function updateTableAvailability(tableId) {
    const dateInput = document.getElementById("dateInput");
    const dateStr = dateInput ? dateInput.value : null;

    if (tableId && dateStr) {
        selectedDate = dateStr; // Обновляем глобальную выбранную дату
        const hasFreeSlots = await fillTimeSelect(tableId, dateStr);
        // showTableDetails вызывается с !hasFreeSlots:
        // - если hasFreeSlots = true (есть слоты), то !hasFreeSlots = false (стол не занят)
        // - если hasFreeSlots = false (нет слотов), то !hasFreeSlots = true (стол занят)
        showTableDetails(tableId, !hasFreeSlots); 
    } else {
        // Если нет даты или стола, скрываем детали или отображаем сообщение
        document.getElementById('table-details-card').style.display = 'none';
        // Также очищаем выделение со всех столов
        document.querySelectorAll('.table-element').forEach(el => el.classList.remove('table-selected', 'table-booked'));
        selectedTableId = null;
    }
}

/**
 * Инициализирует визуальное состояние всех столов на карте
 * для выбранной даты (по умолчанию - текущая дата).
 * @param {string} dateStr - Дата в формате 'YYYY-MM-DD'.
 */
async function initializeMapAvailability(dateStr) {
    if (!dateStr) {
        const dateInput = document.getElementById("dateInput");
        dateStr = dateInput ? dateInput.value : null;
    }
    if (!dateStr) return; // Не продолжаем, если дата не установлена

    const allTables = document.querySelectorAll('.table-element');
    
    // Сбрасываем все классы занятости перед новой инициализацией
    allTables.forEach(tableElement => {
        tableElement.classList.remove('table-booked', 'table-selected');
    });

    const availabilityChecks = Array.from(allTables).map(async (tableElement) => {
        const tableId = tableElement.getAttribute('data-table');
        if (!tableId) return;

        try {
            const url = `${API_BASE_URL}/get_booked_times?table=${tableId}&date=${dateStr}`;
            const res = await fetch(url);
            const data = await res.json();
            
            // Если нет свободных слотов, стол занят
            const isFullyBooked = !(data.status === "ok" && data.free_times && data.free_times.length > 0);
            
            if (isFullyBooked) {
                tableElement.classList.add('table-booked'); // Красим в красный
            } else {
                // Если есть свободные слоты, убеждаемся, что класс 'table-booked' отсутствует
                tableElement.classList.remove('table-booked');
            }
        } catch (err) {
            console.error(`Ошибка при проверке доступности стола ${tableId}:`, err);
            // Если произошла ошибка, оставляем стол как свободный (не красным)
            tableElement.classList.remove('table-booked');
        }
    });

    await Promise.all(availabilityChecks);

    // После инициализации всей карты, если был выбран какой-то стол,
    // убеждаемся, что его детали и выделение актуальны
    if (selectedTableId) {
        // Здесь важно не просто вызвать updateTableAvailability, 
        // а повторно отобразить детали и состояние для selectedTableId,
        // учитывая, что initializeMapAvailability уже сбросила его состояние.
        // Вызовем showTableDetails напрямую, чтобы оно переопределило цвет для выбранного стола.
        const dateInput = document.getElementById("dateInput");
        const dateStrForSelected = dateInput ? dateInput.value : null;
        if (dateStrForSelected) {
            const hasFreeSlotsForSelected = await fillTimeSelect(selectedTableId, dateStrForSelected);
            showTableDetails(selectedTableId, !hasFreeSlotsForSelected);
        }
    }
}


// =======================================================
// ОБРАБОТЧИКИ СОБЫТИЙ (DOMContentLoaded)
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("dateInput");
    const guestsInput = document.getElementById("guestsInput");
    const phoneInput = document.getElementById("phoneInput");
    const confirmBtn = document.getElementById("confirm-btn");
    const timeSelect = document.getElementById("timeSelect");
    const currentTimeValue = document.getElementById("current-time-value");
    const tableValueDisplay = document.getElementById("table-value-display");

    // 1. Установка текущей даты и инициализация min/max для dateInput
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0]; // YYYY-MM-DD
    dateInput.value = formattedToday;
    dateInput.min = formattedToday;

    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30); // Бронирование на 30 дней вперед
    dateInput.max = maxDate.toISOString().split('T')[0];

    selectedDate = formattedToday; // Инициализируем глобальную переменную

    // 2. Обработчики для кнопок переключения областей
    document.getElementById('terrace-btn').addEventListener('click', () => switchArea('terrace'));
    document.getElementById('main-hall-btn').addEventListener('click', () => switchArea('main-hall'));

    // ИНИЦИАЛИЗАЦИЯ: Убеждаемся, что Терраса активна при загрузке и обновляем карту
    switchArea('terrace'); 
    // initializeMapAvailability(formattedToday); // Эта строка вызывается внутри switchArea('terrace')

    // 3. Обработчик изменения даты
    dateInput.addEventListener('change', async (event) => {
        selectedDate = event.target.value;
        // Обновляем всю карту, а затем, если был выбран стол, его детали
        await initializeMapAvailability(selectedDate); 
        if (selectedTableId) {
            await updateTableAvailability(selectedTableId); 
        } else {
            // Если столик не был выбран, но дата изменилась, скрываем карточку деталей.
            document.getElementById('table-details-card').style.display = 'none';
        }
    });

    // 4. Обработчик кликов по столам (общий для обеих карт)
    const tableElements = document.querySelectorAll('.table-element');
    tableElements.forEach(table => {
        table.addEventListener('click', (event) => {
            const tableId = event.currentTarget.getAttribute('data-table');
            if (tableId) {
                // Вызываем updateTableAvailability, которая обновит карточку деталей
                // и установит правильные классы (selected/booked) на КЛИКНУТЫЙ стол.
                updateTableAvailability(tableId); 
                if (tableValueDisplay) {
                    tableValueDisplay.textContent = `Стол ${tableId}`;
                }
            }
        });
    });

    // 5. Обработчик изменения выбора времени
    timeSelect.addEventListener('change', (event) => {
        selectedTime = event.target.value;
        currentTimeValue.textContent = selectedTime || '...';
    });

    // 6. Обработчик кнопки подтверждения бронирования
    confirmBtn.addEventListener('click', async () => {
        if (!selectedTableId || !selectedDate || !selectedTime) {
            alert("Пожалуйста, выберите стол, дату и время.");
            return;
        }

        const guests = guestsInput.value;
        const phone = phoneInput.value;

        if (!guests || guests < 1) {
            alert("Пожалуйста, укажите количество гостей.");
            return;
        }
        if (!phone || phone.length < 5) { // Простейшая валидация номера
            alert("Пожалуйста, введите корректный номер телефона.");
            return;
        }

        const telegramWebApp = window.Telegram?.WebApp;
        let userId = 'unknown';
        let userName = 'unknown';
        let botUrl = '';

        if (telegramWebApp) {
            userId = telegramWebApp.initDataUnsafe?.user?.id || 'unknown';
            userName = telegramWebApp.initDataUnsafe?.user?.full_name || 'unknown';
            const initDataParams = new URLSearchParams(telegramWebApp.initData);
            botUrl = initDataParams.get('bot_url') || '';
        }

        const bookingData = {
            user_id: userId,
            user_name: userName,
            phone: phone,
            guests: parseInt(guests),
            table: selectedTableId,
            time: selectedTime,
            date: selectedDate
        };

        try {
            const response = await fetch(`${API_BASE_URL}/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                if (telegramWebApp) {
                    telegramWebApp.sendData(JSON.stringify({
                        type: 'booking_success',
                        table: selectedTableId,
                        date: selectedDate,
                        time: selectedTime
                    }));
                    telegramWebApp.close(); 
                }
                // После успешной брони, обновить состояние карты
                // Сначала обновим текущий выбранный стол
                await updateTableAvailability(selectedTableId);
                // Затем обновим всю карту для текущей даты
                await initializeMapAvailability(selectedDate);

            } else {
                alert(`Ошибка бронирования: ${result.message}`);
                // После неудачной брони (например, дубликат), также обновить состояние,
                // чтобы убедиться, что пользователь видит актуальную информацию
                await updateTableAvailability(selectedTableId);
                await initializeMapAvailability(selectedDate);
            }
        } catch (error) {
            console.error('Ошибка сети или сервера при бронировании:', error);
            alert("Произошла ошибка при попытке бронирования. Попробуйте снова.");
        }
    });

    // Если WebApp запущен из Telegram, можно добавить начальные параметры
    const telegramWebApp = window.Telegram?.WebApp;
    if (telegramWebApp) {
        telegramWebApp.setHeaderColor('#333'); 
        telegramWebApp.setBackgroundColor('#1c1c1c');

        console.log('Telegram User ID:', telegramWebApp.initDataUnsafe?.user?.id);
        console.log('Telegram User Name:', telegramWebApp.initDataUnsafe?.user?.full_name);
    }
});