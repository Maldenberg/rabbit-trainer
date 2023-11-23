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
const QUEUES = ["inbox_queue", "spam_queue", "important_queue"];

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
  });
}

startRabbitMQConnection();

app.post("/send", async (req, res) => {
  const { message } = req.body;
  let routingKey = "inbox"; // Default routing key if no keywords are found

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

  keywordsRouting.some((keywordRouting) => {
    if (message.toLowerCase().includes(keywordRouting.keyword)) {
      routingKey = keywordRouting.routingKey;
      return true;
    }
    return false;
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

    // Verify all queues exist before sending a message
    let queuesExist = true;
    let checkedQueues = 0;

    QUEUES.forEach((queue) => {
      channel.checkQueue(queue, (err, ok) => {
        checkedQueues++;
        if (err) {
          queuesExist = false;
          console.error(`[AMQP] queue ${queue} does not exist`, err.message);
        }
        if (checkedQueues === QUEUES.length) {
          if (!queuesExist) {
            channel.close();
            return res.status(500).json({ error: "Not all queues exist" });
          } else {
            // All queues exist, proceed with sending the message
            channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(message));
            console.log(
              `[AMQP] Message sent to exchange ${EXCHANGE_NAME} with routing key ${routingKey}`
            );
            res.json({ status: "Message sent!" });
            channel.close();
          }
        }
      });
    });
  });
});

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

    channel.checkQueue(queue, (err, ok) => {
      if (err) {
        console.error(`[AMQP] queue ${queue} does not exist`, err.message);
        return res.status(500).json({ error: `Queue ${queue} does not exist` });
      }

      // If queue exists, get the messages
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

      // Wait for a short time to receive messages from the queue
      setTimeout(() => {
        channel.close(() => console.log("Channel closed"));
        res.json({ messages: messages });
      }, 500);
    });
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/* const express = require("express");
const amqp = require("amqplib/callback_api");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public")); // Serve static files from the "public" directory

const RABBITMQ_URL = "amqp://rabbitmq"; // URL for Docker, change if necessary
let amqpConn = null;
const EXCHANGE_NAME = "mail_exchange";
const EXCHANGE_TYPE = "direct";

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
  });
}

startRabbitMQConnection();

app.post("/send", async (req, res) => {
  const { message } = req.body;
  let routingKey = "inbox"; // Default routing key if no keywords are found

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

  keywordsRouting.some((keywordRouting) => {
    if (message.toLowerCase().includes(keywordRouting.keyword)) {
      routingKey = keywordRouting.routingKey;
      return true;
    }
    return false;
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

    // Check if exchange exists
    channel.checkExchange(EXCHANGE_NAME, (err, ok) => {
      if (err) {
        console.error(
          `[AMQP] exchange ${EXCHANGE_NAME} does not exist`,
          err.message
        );
        return res
          .status(500)
          .json({ error: `Exchange ${EXCHANGE_NAME} does not exist` });
      }

      // If exchange exists, publish the message
      channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(message));
      console.log(
        `[AMQP] Message sent to exchange ${EXCHANGE_NAME} with routing key ${routingKey}`
      );
      res.json({ status: "Message sent!" });
      // Close the channel
      channel.close();
    });
  });
});

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

    channel.checkQueue(queue, (err, ok) => {
      if (err) {
        console.error(`[AMQP] queue ${queue} does not exist`, err.message);
        return res.status(500).json({ error: `Queue ${queue} does not exist` });
      }

      // If queue exists, get the messages
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

      // Wait for a short time to receive messages from the queue
      setTimeout(() => {
        channel.close(() => console.log("Channel closed"));
        res.json({ messages: messages });
      }, 500);
    });
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); */
