const express = require("express");
const amqp = require("amqplib/callback_api");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public")); // Serve static files from the "public" directory

const RABBITMQ_URL = "amqp://rabbitmq"; // URL for Docker, change if necessary
let amqpConn = null;
const EXCHANGE_NAME = "mail_exchange";
const EXCHANGE_TYPE = "direct";

function setupExchanges(conn) {
  conn.createChannel((err, channel) => {
    if (err) throw err;
    channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
    const queues = ["inbox_queue", "spam_queue", "important_queue"];
    const routingKeys = ["inbox", "spam", "important"];

    queues.forEach((queue, index) => {
      channel.assertQueue(queue, { durable: true });
      channel.bindQueue(queue, EXCHANGE_NAME, routingKeys[index]);
    });
  });
}

function startRabbitMQConnection() {
  amqp.connect(RABBITMQ_URL, (err, conn) => {
    if (err) {
      console.error("[AMQP]", err.message);
      return setTimeout(startRabbitMQConnection, 1000);
    }
    conn.on("error", (err) => {
      if (err.message !== "Connection closing") {
        console.error("[AMQP] conn error", err.message);
      }
    });
    conn.on("close", () => {
      console.error("[AMQP] reconnecting");
      return setTimeout(startRabbitMQConnection, 1000);
    });

    console.log("[AMQP] connected");
    amqpConn = conn;
    setupExchanges(conn);
  });
}

startRabbitMQConnection();

app.post("/send", async (req, res) => {
  const { message } = req.body;
  let routingKey = "inbox"; // Значение по умолчанию, если никакие другие ключевые слова не найдены

  // Массив ключевых слов и соответствующих им ключей маршрутизации
  const keywordsRouting = [
    { keyword: "важно", routingKey: "important" },
    { keyword: "внимание", routingKey: "important" },
    { keyword: "срочно", routingKey: "important" },
    { keyword: "приоритет", routingKey: "important" },
    { keyword: "немедленно", routingKey: "important" },
    { keyword: "необходимо ответить", routingKey: "important" },
    { keyword: "важное уведомление", routingKey: "important" },
    { keyword: "акция", routingKey: "spam" },
    { keyword: "реклама", routingKey: "spam" },
    { keyword: "распродажа", routingKey: "spam" },
    { keyword: "бесплатно", routingKey: "spam" },
    { keyword: "скидка", routingKey: "spam" },
  ];

  // Проверка каждого ключевого слова на вхождение в сообщение
  keywordsRouting.some((keywordRouting) => {
    if (message.toLowerCase().includes(keywordRouting.keyword)) {
      routingKey = keywordRouting.routingKey;
      return true; // Прекращаем выполнение цикла, если нашли совпадение
    }
    return false; // Продолжаем проверку, если текущее ключевое слово не найдено
  });

  if (!amqpConn) {
    return res
      .status(500)
      .json({ error: "RabbitMQ connection not established" });
  }

  amqpConn.createChannel((err, channel) => {
    if (err) {
      console.error("[AMQP] channel error", err.message);
      return res.status(500).json({ error: "RabbitMQ channel error" });
    }

    channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(message));
    console.log(
      `[AMQP] Message sent to exchange ${EXCHANGE_NAME} with routing key ${routingKey}`
    );

    res.json({ status: "Сообщение отправлено!" });
  });
});

// Modified endpoint to get all messages from a queue
app.get("/receive/:queue", (req, res) => {
  const queue = req.params.queue;

  if (!amqpConn) {
    return res
      .status(500)
      .json({ error: "RabbitMQ connection not established" });
  }

  amqpConn.createChannel((err, channel) => {
    if (err) {
      console.error("[AMQP] channel error", err.message);
      return res.status(500).json({ error: "RabbitMQ channel error" });
    }

    // Соответствие параметра durable при объявлении очереди
    channel.assertQueue(queue, { durable: true });
    let messages = [];

    channel.consume(
      queue,
      (msg) => {
        if (msg) {
          messages.push(msg.content.toString());
          channel.ack(msg);
        }
      },
      { noAck: false }
    );

    // Ждем небольшое время для получения сообщений из очереди
    // Затем закрываем канал и отправляем полученные сообщения
    setTimeout(() => {
      channel.close(() => console.log("Channel closed"));
      res.json({ messages: messages });
    }, 500);
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
