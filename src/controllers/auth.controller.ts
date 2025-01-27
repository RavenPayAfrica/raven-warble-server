import { FastifyPluginCallback, RouteShorthandOptionsWithHandler } from "fastify";
import { randomBytes } from "crypto";
import argon from "argon2"
import { addHours, differenceInSeconds } from "date-fns";
import ApiKey from "../models/ApiToken";
import ApiUser from "../models/ApiUser";

export const login: RouteShorthandOptionsWithHandler = {
    schema: {
        body: {
            type: "object",
            required: [
                'username',
                'password'
            ],
            properties: {
                username: { type: 'string' },
                password: { type: 'string' }
            }
        },
    }
    ,
    handler: async (request, reply) => {
        const { username, password } = request.body as { username: string, password: string };
        const user = await ApiUser.query()
                        .where('username', username)
                        .first();
        if (!user) {
            reply.resourceResponse({
                statusCode: 422,
                message: 'Invalid credentials',
                data: null
            });
            throw new Error("Invalid credentials")
        }

        if (!await argon.verify(user.password, password)) {
            return reply.resourceResponse({
                message: 'Invalid credentials',
                statusCode: 422,
                data: null
            })
        }
        
        const plainKey = randomBytes(30).toString('base64')
        const expiresAt = addHours(new Date(), 24)
        await ApiKey.query().where('user_id','=', user.id!).delete()
        const storedKey = await ApiKey.query().insert({
            token: await argon.hash(plainKey),
            user_id: user.id,
            expires_at: expiresAt,
        })

        return reply.resourceResponse({
            message: 'success',
            statusCode: 200,
            data: {
                token: `${storedKey.id}|${plainKey}`,
                expiresIn: differenceInSeconds(expiresAt, new Date()),
                durationIn: "seconds"
            }
        })
    }
}


export const authRoutes: FastifyPluginCallback = function (app, options, done) {
    app.post('/login', login);
    done();
}