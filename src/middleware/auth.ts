import fp from "fastify-plugin"
import argon from "argon2"
import ApiUser from "../models/ApiUser";
import ApiKey from "../models/ApiToken";
import { logger } from "../utils/helpers";

export const auth = fp((app, opts, done) => {
  app.addHook("onRequest", async (request, reply) => {
    if (!request.headers["authorization"]?.startsWith("Bearer")) {
      return reply.resourceResponse({
        statusCode: 401,
        message: 'No Authorization header',
        data: null
      });
    }
    const apiKey = request.headers["authorization"]?.split(" ")[1] || "";
    if (!apiKey || apiKey === "") {
      return reply.resourceResponse({
        statusCode: 401,
        message: "Invalid Token",
        data: null
      })
    }
    const [id, key] = apiKey.split('|')
    if(Number.isNaN( Number.parseInt(id))) {
      return reply.resourceResponse({
        statusCode: 401,
        message: "Invalid Token",
        data: null
      })
    }
    const token = await ApiKey.query()
    .where("id", Number.parseInt(id))
    .where("expires_at", ">", new Date())
    .withGraphFetched('user')
    .first()
    if (!token) {
      return reply.resourceResponse({
        statusCode: 401,
        message: 'Invalid/Expired token',
        data: null
      })
    }

    if (!await argon.verify(token.token, key)) {
      return reply.resourceResponse({
        statusCode: 401,
        message: 'Invalid Token',
        data: null
      })
    }
    token.$query().patch({ last_used_at: new Date() }).catch(err=>{
      logger.error(err, "Failed to update last key used")
    })
    request.user = token.user;
  })
  done();
});

declare module "fastify" {
  interface FastifyRequest {
    user?: ApiUser;
  }
}