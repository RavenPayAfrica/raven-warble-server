import 'dotenv/config'
import fastify from "fastify";
import { fastifySchedule } from '@fastify/schedule';
import { utilityFunctions } from './utils/helpers';
import { authRoutes } from './controllers/auth.controller';
import appConfig from "./config/app"
import fastifySocketIO, { registerSocketEventsAndHandlers } from './plugins/socketio';
import { appRoutes } from './controllers/inflow.controller';
import { CleanUpOldTransactionsJob } from './cronTasks';

//@ts-ignore
BigInt.prototype.toJSON = function() { return this.toString() }

const app = fastify({
    logger: {
        redact: ['req.headers.authorization'],
        // level: appConfig.logLevel,
        
    },
})

app.register(fastifySchedule)
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
        message: "healthy",
        activeSockets: app.io.sockets.sockets.size
    })
})

app.ready((err)=>{
    if (err) throw err
    app.scheduler.addSimpleIntervalJob(CleanUpOldTransactionsJob)
    registerSocketEventsAndHandlers(app);
})

app.addHook('onClose', (intance)=>{
    intance.scheduler.stop()
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

process.on('SIGTERM', ()=>{
    app.scheduler.stop()
})