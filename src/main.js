// Проверка, что JS подключен
document.getElementById('app').textContent = 'WebApp готов к бронированию!';

// ✅ НОВОЕ: Получаем данные пользователя из Telegram Web App
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

// Функция для отправки брони на сервер
function sendBooking(table_id, time_slot, guests, phone) {
    // ✅ ИЗМЕНЕНО: теперь отправляем user_id и user_name
    const data = {
        table: table_id,
        time: time_slot,
        guests: guests,
        phone: phone,
        user_id: user_id,
        user_name: user_name,
        date: new Date().toISOString().split('T')[0] // Добавляем текущую дату для простоты
    };

    fetch("https://readytoearn-4.onrender.com/book", { // <- замените на реальный URL
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "ok") {
            alert("✅ Бронь успешно создана!");
        } else {
            alert("❌ Ошибка бронирования: " + data.message);
        }
    })
    .catch(err => {
        console.error("Ошибка сети:", err);
        alert("⚠️ Ошибка сети. Попробуйте позже.");
    });
}

// Обработчик клика по кнопке "Забронировать"
document.getElementById("bookBtn").addEventListener("click", () => {
    const table_id = document.getElementById("tableSelect").value;
    const time_slot = document.getElementById("timeSelect").value;
    const guests = document.getElementById("guestsInput").value;
    const phone = document.getElementById("phoneInput").value;

    // Простейшая проверка заполнения
    if (!table_id || !time_slot || !guests || !phone) {
        alert("⚠️ Пожалуйста, заполните все поля!");
        return;
    }

    sendBooking(table_id, time_slot, guests, phone);
});