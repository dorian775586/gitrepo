// ===================================
// КОНФИГУРАЦИЯ И ДАННЫЕ ПОЛЬЗОВАТЕЛЕЙ
// ===================================
const API_BASE_URL = "https://readytoearn-4.onrender.com";
const DEFAULT_TABLE_IMAGE = "https://santarest.by/222.JPG";

let user_id = null;
let user_name = "Неизвестный";
let selectedTableId = null;

if (window.Telegram && Telegram.WebApp.initDataUnsafe) {
    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user) {
        user_id = user.id;
        user_name = user.first_name || '';
        if (user.last_name) user_name += ' ' + user.last_name;
    }
}

// ===================================
// МИНИМАЛЬНАЯ ДАТА (умная логика — после 22:30 брони переходят на завтра)
// ===================================
const dateInputGlobal = document.getElementById("dateInput");
if (dateInputGlobal) {
    const now = new Date();
    const today = new Date();

    const cutoffHour = 22;
    const cutoffMinute = 30;
    let minDate = today;

    // После 22:30 или если ночь (0:00–5:00) — автоматически завтра
    if (
        (now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() >= cutoffMinute)) ||
        (now.getHours() >= 0 && now.getHours() < 5)
    ) {
        minDate = new Date(today);
        minDate.setDate(minDate.getDate() + 1);
        console.log("[INFO] Cutoff или ночь: переключаемся на завтра");
    }

    const minDateStr = minDate.toISOString().split('T')[0];
    dateInputGlobal.min = minDateStr;
    dateInputGlobal.value = minDateStr;

    const currentDateDisplay = document.getElementById("current-date-value");
    if (currentDateDisplay) {
        currentDateDisplay.textContent = new Date(minDateStr).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short'
        });
    }

    dateInputGlobal.addEventListener("change", (e) => {
        const selectedDate = new Date(e.target.value);
        const nowCheck = new Date();

        if (
            selectedDate.toDateString() === nowCheck.toDateString() &&
            (nowCheck.getHours() > cutoffHour || (nowCheck.getHours() === cutoffHour && nowCheck.getMinutes() >= cutoffMinute))
        ) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split("T")[0];
            dateInputGlobal.value = tomorrowStr;
            if (currentDateDisplay) {
                currentDateDisplay.textContent = new Date(tomorrowStr).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short"
                });
            }
            safeShowAlert("⚠️ После 22:30 можно бронировать только на завтра.");
            initializeMapAvailability(tomorrowStr);
        } else {
            initializeMapAvailability(e.target.value);
        }
    });
}



// ===================================
// УТИЛИТА ДЛЯ СООБЩЕНИЙ
// ===================================
function safeShowAlert(message) {
    if (window.Telegram && Telegram.WebApp.isVersionAtLeast('6.1')) Telegram.WebApp.showAlert(message);
    else alert(message);
}

// ===================================
// ТЕМА И UI
// ===================================
function adaptToTheme() {
    const theme = window.Telegram.WebApp.themeParams;
    if (!theme) return;
    const style = document.documentElement.style;
    style.setProperty('--tg-theme-bg-color', theme.bg_color || '#1f1f1f');
    style.setProperty('--tg-theme-text-color', theme.text_color || '#ffffff');
    style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#252525');
    style.setProperty('--tg-theme-hint-color', theme.hint_color || '#aaaaaa');
    style.setProperty('--tg-theme-link-color', theme.link_color || '#007bff');
    style.setProperty('--tg-theme-button-color', theme.button_color || '#007bff');
    style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
}
if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    adaptToTheme();
    Telegram.WebApp.onEvent('themeChanged', adaptToTheme);
}

// ===================================
// ДАННЫЕ ПО СТОЛАМ
// ===================================
const TABLE_DETAILS = {
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

// ===================================
// ФУНКЦИИ ПО СТАТУСУ СТОЛОВ
// ===================================
function applyTableStatus(tableId, isBooked) {
    const el = document.querySelector(`[data-table="${tableId}"]`);
    if (!el) return;
    if (isBooked) el.classList.add('table-booked');
    else el.classList.remove('table-booked');
}

function showTableDetails(tableId, isBooked=false){
    const card = document.getElementById('table-details-card');
    const confirmBtn = document.getElementById('confirm-btn');
    const title = document.getElementById('table-title');
    const desc = document.getElementById('table-description');
    const photo = document.getElementById('table-photo');
    if(!card || !confirmBtn || !title || !desc) return;

    const info = TABLE_DETAILS[tableId] || {title:`Стол ${tableId}`, desc:'Информация недоступна.'};
    title.textContent = info.title;
    desc.textContent = info.desc;
    if(photo){ photo.src=DEFAULT_TABLE_IMAGE; photo.alt=info.title; }

    card.style.display='block';
    selectedTableId = tableId;
    applyTableStatus(tableId, isBooked);

    if(isBooked){
        confirmBtn.disabled=true;
        confirmBtn.textContent=`Стол ${tableId} занят`;
        confirmBtn.style.backgroundColor='var(--table-booked)';
    }else{
        confirmBtn.disabled=false;
        confirmBtn.textContent=`Забронировать стол ${tableId}`;
        confirmBtn.style.backgroundColor='var(--primary-color)';
    }
}

// ===================================
// ЗАПОЛНЕНИЕ ВРЕМЕНИ
// ===================================
async function fillTimeSelect(tableId,dateStr){
    const timeSelect = document.getElementById("timeSelect");
    const currentTimeValue = document.getElementById("current-time-value");
    if(!timeSelect) return false;
    timeSelect.innerHTML='<option value="">Загрузка...</option>';
    if(currentTimeValue) currentTimeValue.textContent='...';
    if(!tableId || !dateStr){ timeSelect.innerHTML='<option value="">Выберите стол и дату</option>'; if(currentTimeValue) currentTimeValue.textContent='...'; return false; }

    try{
        const res = await fetch(`${API_BASE_URL}/get_booked_times?table=${tableId}&date=${dateStr}`);
        const data = await res.json();
        timeSelect.innerHTML='';
        if(data.status==="ok" && data.free_times && data.free_times.length>0){
            let availableTimes = data.free_times;
            const now=new Date();
            const todayStr=now.toISOString().split('T')[0];
            if(dateStr===todayStr){
                const minTime=now.getTime()+10*60*1000;
                availableTimes=availableTimes.filter(t=>{
                    const [h,m]=t.split(':').map(Number);
                    const dt=new Date(now); dt.setHours(h,m,0,0);
                    return dt.getTime()>minTime;
                });
            }
            if(availableTimes.length>0){
                availableTimes.forEach(t=>{ const opt=document.createElement('option'); opt.value=t; opt.textContent=t; timeSelect.appendChild(opt); });
                const firstSlot=availableTimes[0];
                timeSelect.value=firstSlot;
                if(currentTimeValue) currentTimeValue.textContent=firstSlot;
                return true;
            }else{ timeSelect.innerHTML='<option value="">Нет свободных слотов</option>'; if(currentTimeValue) currentTimeValue.textContent='Занято'; return false; }
        }else{ timeSelect.innerHTML='<option value="">Нет свободных слотов</option>'; if(currentTimeValue) currentTimeValue.textContent='Занято'; return false; }
    }catch(err){ console.error(err); timeSelect.innerHTML='<option value="">Ошибка</option>'; if(currentTimeValue) currentTimeValue.textContent='Ошибка'; return false; }
}

// ===================================
// ОБНОВЛЕНИЕ ДАННЫХ ПО СТОЛУ
// ===================================
async function updateTableAvailability(tableId){
    const dateInput = document.getElementById("dateInput");
    const dateStr = dateInput ? dateInput.value : null;

    if(!dateStr){
        showTableDetails(tableId, false);
        return;
    }

    const confirmBtn = document.getElementById('confirm-btn');
    if(confirmBtn){ 
        confirmBtn.disabled=true; 
        confirmBtn.textContent='Проверка...'; 
        confirmBtn.style.backgroundColor='#666'; 
    }

    const hasFree = await fillTimeSelect(tableId,dateStr);
    showTableDetails(tableId,!hasFree);
}

// ===================================
// ОБНОВЛЕНИЕ КАРТЫ СТОЛОВ
// ===================================
async function initializeMapAvailability(dateStr){
    const activeMap=document.querySelector('.map-area.active');
    if(!activeMap || !dateStr) return;
    const tables=activeMap.querySelectorAll('.table-element');
    tables.forEach(t=>t.classList.remove('table-booked'));

    await Promise.all(Array.from(tables).map(async t=>{
        const id=t.getAttribute('data-table');
        if(!id) return;
        try{
            const res = await fetch(`${API_BASE_URL}/get_booked_times?table=${id}&date=${dateStr}`);
            const data = await res.json();
            const isBooked=!(data.status==='ok' && data.free_times && data.free_times.length>0);
            if(isBooked) t.classList.add('table-booked');
        }catch(e){ t.classList.remove('table-booked'); }
    }));

    if(selectedTableId && activeMap.querySelector(`[data-table="${selectedTableId}"]`)) await updateTableAvailability(selectedTableId);
}

// ===================================
// ПЕРЕКЛЮЧЕНИЕ ЗОН
// ===================================
function switchArea(area){
    const terraceMap=document.getElementById('terrace-map');
    const hallMap=document.getElementById('main-hall-map');
    const toggleTerrace=document.getElementById('toggle-terrace');
    const toggleHall=document.getElementById('toggle-hall');

    document.querySelectorAll('.table-element').forEach(el=>el.classList.remove('table-selected'));
    selectedTableId=null;
    const card=document.getElementById('table-details-card'); if(card) card.style.display='none';
    const confirmBtn=document.getElementById('confirm-btn'); if(confirmBtn){ confirmBtn.disabled=true; confirmBtn.textContent='Подтвердить'; confirmBtn.style.backgroundColor='var(--primary-color)'; }

    if(area==='terrace'){ if(terraceMap) terraceMap.classList.add('active'); if(hallMap) hallMap.classList.remove('active'); if(toggleTerrace) toggleTerrace.classList.add('active'); if(toggleHall) toggleHall.classList.remove('active'); }
    else if(area==='hall'){ if(terraceMap) terraceMap.classList.remove('active'); if(hallMap) hallMap.classList.add('active'); if(toggleTerrace) toggleTerrace.classList.remove('active'); if(toggleHall) toggleHall.classList.add('active'); }

    const dateInput=document.getElementById('dateInput'); if(dateInput && dateInput.value) initializeMapAvailability(dateInput.value);
}

// ===================================
// ОТПРАВКА БРОНИ С УВЕДОМЛЕНИЕМ И МОЯ БРОНЬ
// ===================================
function sendBooking(table_id, time_slot, guests, phone, date_str, submitButton, originalButtonText){
    const data={ table:table_id,time:time_slot,guests,phone,user_id,user_name,date:date_str };
    fetch(`${API_BASE_URL}/book`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
    }).then(res=>{
        if(!res.ok) return res.json().then(errData=>{ throw new Error(errData.message || 'Ошибка'); });
        return res.json();
    }).then(data=>{
        if(submitButton){ submitButton.disabled=false; submitButton.textContent=originalButtonText; }
        safeShowAlert('✅ Бронь успешно создана!');

        initializeMapAvailability(date_str);
        document.querySelectorAll('.table-element').forEach(el=>el.classList.remove('table-selected'));
        selectedTableId=null;
        document.getElementById('table-details-card').style.display='none';
        if(document.getElementById('booking-overlay')) document.getElementById('booking-overlay').style.display='none';

        fetch(`${API_BASE_URL}/notify_admin`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify(data)
        });

        fetch(`${API_BASE_URL}/my_bookings`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify(data)
        });

        Telegram.WebApp.close();
    }).catch(err=>{
        if(submitButton){ submitButton.disabled=false; submitButton.textContent=originalButtonText; }
        console.error(err);
        safeShowAlert(`❌ ${err.message || 'Ошибка сети. Попробуйте позже.'}`);
        if(document.getElementById('booking-overlay')) document.getElementById('booking-overlay').style.display='none';
        initializeMapAvailability(date_str);
    });
}

// ===================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ===================================
document.addEventListener('DOMContentLoaded',()=>{
    const dateInput=document.getElementById('dateInput');
    const confirmBtn=document.getElementById('confirm-btn');
    const tableElements=document.querySelectorAll('.table-element');
    const bookingOverlay=document.getElementById('booking-overlay');
    const bookingForm=document.getElementById('booking-form');
    const timeSelect=document.getElementById('timeSelect');
    const timeValueDisplay=document.getElementById('current-time-value');
    const tableValueDisplay=document.getElementById('current-table-value');
    const toggleTerrace=document.getElementById('toggle-terrace');
    const toggleHall=document.getElementById('toggle-hall');

    // Заполнение селекта гостей
    const guestsSelect = document.getElementById('guestsSelect');
    if (guestsSelect) {
        for (let i = 1; i <= 20; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i + (i === 1 ? " гость" : " гостей");
            guestsSelect.appendChild(option);
        }
    }

    if(timeValueDisplay){ const now=new Date(); timeValueDisplay.textContent=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; }

    if(dateInput){
        dateInput.addEventListener('change',(e)=>{
            const newDate=e.target.value;
            document.getElementById("current-date-value").textContent=new Date(newDate).toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
            initializeMapAvailability(newDate);
            if(selectedTableId) updateTableAvailability(selectedTableId);
            else if(confirmBtn){ confirmBtn.disabled=true; }
        });
    }

    if(toggleTerrace) toggleTerrace.addEventListener('click',()=>switchArea('terrace'));
    if(toggleHall) toggleHall.addEventListener('click',()=>switchArea('hall'));

    tableElements.forEach(t=>{
        t.addEventListener('click', e=>{
            const id = e.currentTarget.getAttribute('data-table');
            if(!id) return;
            document.querySelectorAll('.table-element').forEach(el=>el.classList.remove('table-selected'));
            e.currentTarget.classList.add('table-selected');
            selectedTableId = id;

            if(dateInput && dateInput.value){
                updateTableAvailability(id);
            } else {
                showTableDetails(id, false);
            }

            if(tableValueDisplay) tableValueDisplay.textContent = `Стол ${id}`;
        });
    });

    if(confirmBtn){
        confirmBtn.addEventListener('click',()=>{
            if(!selectedTableId){ safeShowAlert('⚠️ Выберите стол'); return; }
            const ts = timeSelect ? timeSelect.value : null;
            if(!ts || ts.includes('Нет')){ safeShowAlert('⚠️ Нет свободных слотов'); return; }
            document.getElementById('selected-table-modal').textContent=`(Стол ${selectedTableId})`;
            if(bookingOverlay) bookingOverlay.style.display='flex';
        });
    }

    const phoneInput = document.getElementById('phoneInput');

if (phoneInput) {
    // При фокусе вставляем +375 если поле пустое
    phoneInput.addEventListener('focus', () => {
        if (!phoneInput.value.startsWith('+375')) phoneInput.value = '+375 ';
    });

    // Запрет удаления кода страны
    phoneInput.addEventListener('keydown', (e) => {
        if (phoneInput.selectionStart <= 5 && (e.key === 'Backspace' || e.key === 'Delete')) e.preventDefault();
    });

    // Форматирование номера в реальном времени
    phoneInput.addEventListener('input', () => {
        let val = phoneInput.value.replace(/\D/g, ''); // оставляем только цифры
        if (!val.startsWith('375')) val = '375' + val; // гарантируем код страны

        // Форматируем в +375 (XX) XXX XX XX
        let formatted = '+375';
        if (val.length > 3) {
            formatted += ' (' + val.substr(3,2) + ')';
        }
        if (val.length > 5) {
            formatted += ' ' + val.substr(5,3);
        }
        if (val.length > 8) {
            formatted += ' ' + val.substr(8,2);
        }
        if (val.length > 10) {
            formatted += ' ' + val.substr(10,2);
        }

        phoneInput.value = formatted;
    });
}


    if(bookingForm){
    bookingForm.addEventListener('submit', e => {
        e.preventDefault();

        const guestsInput = document.getElementById('guestsInput');
        const phoneInput = document.getElementById('phoneInput');
        const table_id = selectedTableId;
        const time_slot = timeSelect ? timeSelect.value : null;
        const guests = guestsInput ? guestsInput.value : null;
        const phone = phoneInput ? phoneInput.value : null;
        const date_str = dateInput ? dateInput.value : null;
        const submitButton = bookingForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;

        // Проверка телефона
        const phoneDigits = phone.replace(/\D/g, ''); // оставляем только цифры
        if (!/^(375)(25|29|33|44)\d{7}$/.test(phoneDigits)) {
            safeShowAlert('❌ Введите корректный номер в формате +375 (25|29|33|44) XXX XX XX');
            return;
        }

        // Проверяем остальные поля
        if (!table_id || !time_slot || !guests || !date_str) {
            safeShowAlert('⚠️ Заполните все поля');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Обработка...';
        sendBooking(table_id, time_slot, guests, phone, date_str, submitButton, originalButtonText);
    });
}


    const closeBtn=document.getElementById('closeBookingForm');
    if(closeBtn) closeBtn.addEventListener('click',()=>{ if(bookingOverlay) bookingOverlay.style.display='none'; });

    if(confirmBtn) confirmBtn.disabled=true;
    if(dateInput) switchArea('terrace');
});