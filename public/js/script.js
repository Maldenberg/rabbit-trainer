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
      alert(data.status);
      document.getElementById("message").value = ""; // Очистить текстовое поле
    })
    .catch((error) => {
      console.error("Ошибка:", error);
    });
}

// Функция для получения сообщений из очереди и их отображения
function refreshMessages() {
  // Маппинг DOM id к названиям очередей в RabbitMQ
  const queueMapping = {
    inbox: "inbox_queue",
    important: "important_queue",
    spam: "spam_queue",
  };

  Object.keys(queueMapping).forEach((section) => {
    const queueName = queueMapping[section];
    fetch(`/receive/${queueName}`)
      .then((response) => response.json())
      .then((data) => {
        const messagesList = document.getElementById(section);
        messagesList.innerHTML = ""; // Очистить текущие сообщения
        if (data.messages && data.messages.length > 0) {
          // Отображаем каждое сообщение
          data.messages.forEach((message) => {
            const messageElement = document.createElement("div");
            messageElement.textContent = message;
            messagesList.appendChild(messageElement);
          });
        } else {
          messagesList.textContent = "Нет сообщений..."; // Показать, если сообщений нет
        }
      })
      .catch((error) => {
        console.error("Ошибка при получении сообщений:", error);
      });
  });
}

// Добавление обработчика событий на кнопку отправки и обновления
document.addEventListener("DOMContentLoaded", () => {
  const sendButton = document.getElementById("send");
  const refreshButton = document.getElementById("refresh");

  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", refreshMessages);
  }
});

/* // Функция для отправки сообщений
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
      alert(data.status);
      document.getElementById("message").value = ""; // Очистить текстовое поле
    })
    .catch((error) => {
      console.error("Ошибка:", error);
    });
}

// Добавление обработчика событий на кнопку отправки
document.getElementById("send").addEventListener("click", sendMessage);
 */
