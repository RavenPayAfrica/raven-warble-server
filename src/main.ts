import 'dotenv/config'
import fastify, { FastifyRequest } from "fastify";
import { utilityFunctions } from './utils/helpers';
import { authRoutes } from './controllers/auth.controller';
import appConfig from "./config/app"
import fastifySocketIO from './plugins/socketio';
import WarbleAccount from './models/WarbleAccount';
import { appRoutes } from './controllers/inflow.controller';
import { ref } from 'objection';

//@ts-ignore
BigInt.prototype.toJSON = function() { return this.toString() }

const app = fastify({
    logger: {
        redact: ['req.headers.authorization'],
        // level: appConfig.logLevel,
        
    },
})

app.register(utilityFunctions)
app.register(fastifySocketIO)
app.register(authRoutes, {prefix: 'auth'})
app.register(appRoutes);

app.get('/', (req,res)=>{
    res.send({
        message: "Welcome to Raven Streams"
    })
})

app.get('/healthy', (req,res)=>{
    res.send({
        message: "healthy"
    })
})

app.ready((err)=>{
    if (err) throw err
    app.io.use( async (socket, next)=>{
        const {acc, key} = socket.handshake.auth;
        if(!acc?.length || !key?.length) {
            return next( new Error("Authentication Required"));
        }
       
        const warbleAccount = await WarbleAccount.query().where('account_number', acc).first()
        if(!warbleAccount || !warbleAccount.stream_keys.includes(key)) {
            return next( new Error("Authentication Failed! Can't listen to stream"));
        }
        socket.acc = warbleAccount.account_number;
        next() 
    })
    app.io.on('connection', (socket) =>{
        app.log.info('Socket connected! ' +socket.id);
        if(socket.acc?.length){
            const roomID = `account:${socket?.acc}`;
            socket.join(roomID)
        }
    })
})


const start = async () => {
    try {
        await app.listen({ port: appConfig.appPort, host:  "0.0.0.0"})
    } catch (error) {
        app.log.error(error, "Server failed to start")
        process.exit(1)
    }
}

start()