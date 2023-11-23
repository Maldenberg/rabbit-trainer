#!/bin/bash
# Ожидаем запуск RabbitMQ
sleep 10

# Удаление очередей и обменников
# Удаление очередей
rabbitmqadmin -f tsv -q list queues name | while read -r queue; do
  rabbitmqadmin delete queue name="$queue"
done

# Удаление обменников
rabbitmqadmin -f tsv -q list exchanges name | while read -r exchange; do
  if [[ "$exchange" != "amq.*" && "$exchange" != "" ]]; then # Игнорировать предустановленные обменники
    rabbitmqadmin delete exchange name="$exchange"
  fi
done

# Запускаем сервер RabbitMQ в обычном режиме
exec rabbitmq-server
