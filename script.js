const tg = window.Telegram.WebApp;

tg.expand(); // развернуть окно на весь экран

// Получаем данные пользователя
if (tg.initDataUnsafe?.user) {
  const user = tg.initDataUnsafe.user;
  document.getElementById("title").innerText = `Привет, ${user.first_name}!`;
}

// Кнопка закрытия
document.getElementById("close").addEventListener("click", () => {
  tg.close();
});
