// Проверка, что JS подключен
document.getElementById('app').textContent = 'WebApp готов к бронированию!';

// Функция для отправки брони на сервер
function sendBooking(table_id, time_slot, guests, phone) {
    fetch("https://readytoearn-4.onrender.com/book", {   // <- замени на реальный URL сервера (где lis.py)
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id, time_slot, guests, phone })
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
