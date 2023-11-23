// Функции открытия и закрытия попапа об успешной отправке сообщения
function showPopup() {
  document.getElementById("popupFrame").style.display = "block";
  document.getElementById("popupFrame").src = "popup.html"; // Указываем источник контента для iframe
}

function closePopup() {
  var popupFrame = document.getElementById("popupFrame");
  popupFrame.style.display = "none";
  popupFrame.src = ""; // Очищаем источник контента для iframe
}

window.closePopup = closePopup; // Делаем функцию закрытия доступной глобально

// Функция для отображения попапа с ошибкой
function showAlertPopup() {
  document.getElementById("popupFrame").style.display = "block";
  document.getElementById("popupFrame").src = "popup-error.html"; // Указываем источник контента для iframe с ошибкой
}

// Функция для отправки сообщений
function sendMessage() {
  var messageText = document.getElementById("message").value;
  fetch("/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: messageText }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        showAlertPopup(); // Показываем попап с ошибкой
      } else {
        showPopup(); // Показываем попап об успешной отправке
        document.getElementById("message").value = ""; // Очистить текстовое поле после отправки
      }
    })
    .catch((error) => {
      console.error("Ошибка:", error);
      showAlertPopup(); // Показываем попап с ошибкой при любой ошибке запроса
    });
}

// Функция для обновления сообщений
function refreshMessages() {
  const queueMapping = {
    inbox: "inbox_queue",
    important: "important_queue",
    spam: "spam_queue",
  };

  Object.keys(queueMapping).forEach((section) => {
    const queueName = queueMapping[section];
    const storedMessages = JSON.parse(localStorage.getItem(queueName)) || [];

    fetch(`/receive/${queueName}`)
      .then((response) => response.json())
      .then((data) => {
        const messagesList = document.getElementById(section);
        messagesList.innerHTML = ""; // Очистить текущие сообщения

        const newMessages = data.messages || [];
        const allMessages = storedMessages.concat(newMessages);

        if (allMessages.length > 0) {
          allMessages.forEach((message) => {
            const messageElement = document.createElement("div");
            messageElement.className = "message";
            const iconElement = document.createElement("i");
            iconElement.classList.add("message-icon");
            iconElement.innerHTML = "&#9993;"; // Иконка письма

            messageElement.appendChild(iconElement);
            messageElement.appendChild(document.createTextNode(message));
            messagesList.appendChild(messageElement);
          });

          localStorage.setItem(queueName, JSON.stringify(allMessages));
        } else {
          messagesList.textContent = "Нет сообщений...";
        }
      })
      .catch((error) => {
        console.error("Ошибка при получении сообщений:", error);
      });
  });
}

// Функция для очистки сообщений из LocalStorage
function clearMessages() {
  const queueMapping = {
    inbox: "inbox_queue",
    important: "important_queue",
    spam: "spam_queue",
  };

  Object.keys(queueMapping).forEach((section) => {
    localStorage.removeItem(queueMapping[section]);
    const messagesList = document.getElementById(section);
    messagesList.textContent = "Нет сообщений...";
  });
}

// Добавление обработчиков событий
document.addEventListener("DOMContentLoaded", () => {
  const sendButton = document.getElementById("send");
  const refreshButton = document.getElementById("refresh");
  const clearStorageButton = document.getElementById("clearStorage");

  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", refreshMessages);
  }

  if (clearStorageButton) {
    clearStorageButton.addEventListener("click", clearMessages);
  }
});
