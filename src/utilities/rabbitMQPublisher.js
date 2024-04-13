// rabbitMQPublisher.js
const amqp = require('amqplib');

async function publishMessage(queue, message) {
    const connection = await amqp.connect('amqp://localhost'); 
    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: false });
    channel.sendToQueue(queue, Buffer.from(message));
    console.log(" [x] Sent %s to %s", message, queue);
    await channel.close();
    await connection.close();
}

module.exports = publishMessage;
