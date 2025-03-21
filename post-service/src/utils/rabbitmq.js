const amqp = require('amqplib')
const logger = require('./logger')


let connection = null;
let channel = null;

const EXCHANGE_NAME = "socialmedia_events";


async function connectToRabbitMQ(){
    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertExchange(EXCHANGE_NAME, 'topic',{durable:false});
        logger.info('Connected to RabbitMQ');
        return channel;
        
    } catch (error) {
        logger.error('Error connecting to RabbitMQ', error)
        
    }
}


module.exports = {connectToRabbitMQ}