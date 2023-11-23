// Функции открытия и закрытия попапа об успешной отправке сообщения

function showPopup() {
  document.getElementById("popupFrame").style.display = "block";
}

function closePopup() {
  document.getElementById("popupFrame").style.display = "none";
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
      showPopup();
      document.getElementById("message").value = ""; // Очистить текстовое поле
    })
    .catch((error) => {
      console.error("Ошибка:", error);
    });
}

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
  const clearStorageButton = document.getElementById("clearStorage"); // Получаем кнопку для очистки

  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", refreshMessages);
  }

  if (clearStorageButton) {
    clearStorageButton.addEventListener("click", clearMessages); // Добавляем обработчик для очистки
  }
});
