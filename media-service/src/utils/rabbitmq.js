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


async function publishEvent(routingKey, message){
    if(!channel){
        await connectToRabbitMQ()
    }

    channel.publish(EXCHANGE_NAME,routingKey, Buffer.from(JSON.stringify(message)))
    logger.info('Event published: ${routingKey}')
}


async function consumeEvent(routingKey,callback){
    if(!channel){
        await connectToRabbitMQ()
    } 
    const q = await channel.assertQueue("",{exclusive:true});
    await channel.bindQueue(q.queue,EXCHANGE_NAME,routingKey)
    channel.consume(q.queue,(msg)=>{
        if(msg!==null){
            const content = JSON.parse(msg.content.toString());
            callback(content)
            channel.ack(msg)
        }
    })
    logger.info('subscribed to event ',routingKey)
}

module.exports = {connectToRabbitMQ, publishEvent, consumeEvent};