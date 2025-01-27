import { instrument } from '@socket.io/admin-ui'
import config from '../config/app'
import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { Server, ServerOptions } from 'socket.io'

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