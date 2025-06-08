import { instrument } from '@socket.io/admin-ui'
import config from '../config/app'
import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { Server, ServerOptions } from 'socket.io'

import IncomingTransaction from '../models/IncomingTransaction'
import WarbleAccount from '../models/WarbleAccount'
import { createWarbleTransaction } from '../utils/helpers'
import { parse } from 'date-fns/parse'

export type FastifySocketioOptions = Partial<ServerOptions> & {
  preClose?: (done: Function) => void
}

export type SocketEvents = {
  new_transaction: string,
  [k:string]: string
}

const fastifySocketIO: FastifyPluginAsync<FastifySocketioOptions> = fp(
  async function (fastify, opts: FastifySocketioOptions) {
    function defaultPreClose(done: Function) {
      (fastify as any).io.local.disconnectSockets(true)
      done()
    }
    const io = new Server(fastify.server, opts);
    if(['local','development'].includes(config.environment)){
      instrument(io,{
        auth: false,
        mode: 'development'
      })
    }
    fastify.decorate('io', io)
    fastify.addHook('preClose', (done) => {
      if (opts.preClose) {
        return opts.preClose(done)
      }
      return defaultPreClose(done)
    })
    fastify.addHook('onClose', (fastify: FastifyInstance, done) => {
      (fastify as any).io.close()
      done()
    })
  },
  { fastify: '>=4.x.x', name: 'fastify-socket.io' },
)

export const authWarbleAccount = async (acc: string, key: string)=>{
  const warbleAccount = await WarbleAccount.query().where('account_number', acc).first();
  if(
    !warbleAccount || 
    !warbleAccount.stream_keys.filter(item=>{
      const componentKey = item.split(':')
      const expiresAt = componentKey.length > 1? componentKey[0]: null;
      const storedKey = componentKey.length === 1? componentKey[0]: componentKey[1]
      if(storedKey === key && (expiresAt &&  Date.now() > (new Date(expiresAt)).getTime()) ) return false;
      return storedKey === key;
    }).length
  ) {
    
      return null;
  }

  return warbleAccount
}
export const getAccount = async (acc: string)=> WarbleAccount.query().where('account_number', acc).first()

export const registerSocketEventsAndHandlers = (app: FastifyInstance)=> {
  app.io.use( async (socket, next)=>{
      const {acc, key} = socket.handshake.auth;
      if(!acc?.length || !key?.length) {
          return next( new Error("Authentication Required"));
      }
    
      const warbleAccount = await authWarbleAccount(acc, key)
      if(!warbleAccount) {
          return next( new Error("Authentication Failed! Can't listen to stream"));
      }
      socket.acc = warbleAccount.account_number;
      next() 
  })

  // this is a server event when a socket joins a room
  app.io.of('/').adapter.on("join-room",(room: string, id: string)=>{
    if(!room.startsWith('account')) return;
    const socket = app.io.sockets.sockets.get(id)
    if(!socket) return;
    const acc = room.split(':')[1];

    socket.emit('new-active-stream', acc)

    getAccount(room.split(':')[1]).then(async (acc)=>{
      if(acc === undefined || !acc?.history_enabled) return;
      const history = await IncomingTransaction.query().limit(30).where('creditAccount', acc.account_number).orderBy('id', 'DESC');
      try {
        socket.emit("stream-history", history.map((item)=>createWarbleTransaction({
          ...item,
          createdAt: item.created_at || parse(item.sessionId.substring(6, 18), "yyMMddHHmmss", new Date)
        })))
      } catch (error) {
        console.error(error)
      }
    })
  })

  app.io.of('/').adapter.on("leave-room",(room: string, id: string)=>{
    if(!room.startsWith('account')) return;
    const socket = app.io.sockets.sockets.get(id)
    if(!socket) return;
    const acc = room.split(':')[1];
    socket.emit('leave:room', acc)
  })

  app.io.on('connection', (socket) =>{
    app.log.info('Socket connected! ' +socket.id);
    if(socket.acc?.length){
        const roomID = `account:${socket?.acc}`;
        socket.join(roomID)
    }

    // @ts-ignore
    socket.on("join:room",(payload:{acc: string, key: string})=>{
        authWarbleAccount(payload.acc, payload.key).then((acc)=>{
            if(!acc) {
              throw new Error("Failed authentication.")
            }
            socket.join(`account:${payload.acc}`)
        }).catch(err=>{
            socket.emit('error', err.message)
        })
    });
    // @ts-ignore
    socket.on("leave:room", (payload: {acc:string})=>{
        socket.leave(`account:${payload}`)
    })

    // @ts-ignore
    socket.on("get-history", (payload: {acc:string})=>{
        getAccount(payload.acc).then(
            async (warbleAcc)=>{
                if(!warbleAcc) return;
                const history = await IncomingTransaction.query().limit(30).where('creditAccount', payload.acc);
                socket.emit("warble-history", history)
            }
        ).catch(err=>{
            app.log.error(err,err.message)
        })
    })
})
}
declare module 'fastify' {
  interface FastifyInstance {
    io: Server<SocketEvents, any>
  }
}

declare module 'socket.io' {
  interface Socket {
    acc?: string
  }
}

export default fastifySocketIO