import fastify, { FastifyPluginCallback, RouteShorthandOptionsWithHandler } from "fastify";
import WarbleAccount from "../models/WarbleAccount";
import { IncomingCreditNotificaion } from "../@types/app";
import IncomingTransaction from "../models/IncomingTransaction";
import { auth } from "../middleware/auth";
import { randomBytes, randomInt } from "crypto";
import db from "../config/db";
import { format, parse } from "date-fns";
import { createWarbleTransaction } from "../utils/helpers";

const acceptNotification: RouteShorthandOptionsWithHandler = {
    schema: {
        body: {
            type: 'object',
            required: [
                "sessionId",
                "paymentRef",
                "status",
                "creditAccount",
                "creditAccountName",
                "senderName",
                "senderAccNo",
                "senderBank",
                "narration",
                'amount',
            ],
            properties: {
                sessionId: { type: 'string', },
                paymentRef: { type: 'string' },
                status: { type: 'string' },
                creditAccount: { type: 'string', pattern: "^[0-9]{10}$" },
                creditAccountName: { type: 'string' },
                senderName: { type: 'string' },
                senderBank: { type: 'string' },
                senderAccNo: { type: 'string', pattern: "^[0-9]{10}$" },
                narration: { type: 'string' },
                amount: {
                    type: 'string',
                    pattern: '^\\d+(\\.\\d{2})?$'
                }
            },
        }
    },
    handler: async function (request, reply) {
        const data = request.body as IncomingCreditNotificaion;
        const account = await (WarbleAccount.query().where('account_number', data.creditAccount)).first()
        if (!account) return reply.status(400).send({ message: "Warbles not enabled for account", code: 404, })
        if (account.history_enabled) {
            IncomingTransaction.query().where('sessionId', data.sessionId).first().then(async (transaction) => {
                const query = IncomingTransaction.query();

                try {
                    await (transaction ? transaction.$set({
                        status: data.status,
                    }).$query().patch() : query.insert(data))
                } catch (error) {
                    reply.log.error(error, "Failed to save incoming transaction")
                }
            }).catch((e) => {
                reply.log.error(e, e.message)
            })
        }


        this.io.of('/').to(`account:${data.creditAccount}`).emit("new_transaction", createWarbleTransaction({
            ...data,
            createdAt: new Date
        }))

        reply.resourceResponse({
            data: null,
            message: "Recieved"
        })
    }
}

const registerWarbleAccount: RouteShorthandOptionsWithHandler = {
    schema: {
        body: {
            type: "object",
            required: [
                "account_number",
                "history_enabled",
            ],
            properties: {
                account_number: { type: 'string', pattern: "^[0-9]{10}$" },
                history_enabled: { type: 'boolean' },
                use_key: { type: 'string', pattern: "^[0-9]{6}$" },
            }
        }
    },
    handler: async function (req, reply) {
        const body = req.body as { account_number: string, clear_keys?: boolean, expire_at: number, use_key: string }
        let key = body.use_key ?? randomInt(100000, 999999).toString()
        const expire_at = new Date(body.expire_at)

        if(`${body.expire_at ?? ''}`.length && !expire_at.getTime()) {
            reply.resourceResponse({
                statusCode: 422,
                message: "Invalid Expiration date passed",
                data: null,
            })
        }
        const keyWithExpiration = `${expire_at.getTime()?expire_at.getTime()+':':''}${key}`
        try {
            const warbleAccount = await WarbleAccount.query().where('account_number', (req.body as { account_number: string }).account_number).first()
            if (warbleAccount) {
                return reply.resourceResponse({
                    data: null,
                    statusCode: 400,
                    message: "Account already registered. kindly use the create new token endpoint"
                })
            }
            const body = req.body as any;
            const newAccount = await WarbleAccount.query().insert({
                account_number: body.account_number,
                stream_keys: [keyWithExpiration],
                history_enabled: body.history_enabled ?? false,
                user_id: req.user?.id,
            })
            return reply.resourceResponse({
                data: {
                    id: newAccount.id,
                    key
                },
                message: "Warble account created"
            })
        } catch (error) {
            req.log.error(error, "Failed to register warble account")
            reply.resourceResponse({
                data: null,
                statusCode: 400,
                message: "Failed to register warble account"
            })
        }

    }
}

const createWarbleAccountKey: RouteShorthandOptionsWithHandler = {
    schema: {
        body: {
            type: "object",
            required: [
                "account_number"
            ],
            properties: {
                account_number: { type: 'string', pattern: "^[0-9]{10}$" },
                clear_keys: {type: 'boolean'},
                expire_at: { type: 'number' },
                use_key: { type: 'string', pattern: "^[0-9]{6}$" },
            }
        }
    },
    handler: async function (req, reply) {
        const transaction = await WarbleAccount.startTransaction()
        const body = req.body as { account_number: string, clear_keys?: boolean, expire_at: number, use_key: string }
        let key = body.use_key ?? randomInt(100000, 999999).toString()
        const expire_at = new Date(body.expire_at)

        if(`${body.expire_at ?? ''}`.length && !expire_at.getTime()) {
            reply.resourceResponse({
                statusCode: 422,
                message: "Invalid Expiration date passed",
                data: null,
            })
        }
        const keyWithExpiration = `${expire_at.getTime()?expire_at.getTime()+':':''}${key}`
        try {

            const warbleAccount = await WarbleAccount.query(transaction).where('account_number', body.account_number).first()
            if (!warbleAccount) {
                return reply.resourceResponse({
                    data: null,
                    statusCode: 400,
                    message: "Account not registered. Kindly register account for warble"
                })
            }

            await warbleAccount.$query(transaction).update({
                stream_keys: body.clear_keys ? [keyWithExpiration]: [...warbleAccount.stream_keys, keyWithExpiration],
                account_number: warbleAccount.account_number,
                history_enabled: Boolean(warbleAccount.history_enabled),
            })
            transaction.commit()
            return reply.resourceResponse({
                data: {
                    key,
                },
            })

        } catch (error) {
            transaction.rollback()
            req.log.error(error, "Failed to create new key")
            reply.resourceResponse({
                data: null,
                statusCode: 400,
                message: "Failed to create warble"
            })
        }

    }
}

const toggleHistory: RouteShorthandOptionsWithHandler = {
    schema: {
        body: {
            type: "object",
            required: [
                "account_number",
                "history_enabled"
            ],
            properties: {
                account_number: { type: 'string', pattern: "^[0-9]{10}$" },
                history_enabled: { type: 'boolean' },
            },
        }
    },
    handler: async function (req, reply) {
        const transaction = await WarbleAccount.startTransaction()
        const body = req.body as { account_number: string, history_enabled: boolean }

        try {

            const warbleAccount = await WarbleAccount.query(transaction).where('account_number', body.account_number).first()
            if (!warbleAccount) {
                return reply.resourceResponse({
                    data: null,
                    statusCode: 400,
                    message: "Account not registered. Kindly register account for warble"
                })
            }

            await warbleAccount.$query(transaction).update({
                history_enabled: body.history_enabled,
                account_number: body.account_number
            })
            transaction.commit()
            return reply.resourceResponse({
                data: {
                    history_enabled:  body.history_enabled,
                    message: `History status ${body.history_enabled? "Enabled":"Disabled"}`
                },
            })

        } catch (error) {
            transaction.rollback()
            req.log.error(error, "Failed to update warble")
            reply.resourceResponse({
                data: null,
                statusCode: 400,
                message: "Failed to Update History status"
            })
        }

    }
}


const deleteWarbleAccount: RouteShorthandOptionsWithHandler = {
    schema: {
        params: {
            type: "object",
            required: [
                "account_number"
            ],
            properties: {
                account_number: { type: 'string', pattern: "^[0-9]{10}$" }
            }
        }
    },
    handler: async function (req, reply) {
        const key = randomBytes(10).toString('base64')
        try {
            const warbleAccount = await WarbleAccount.query().where('account_number', (req.params as { account_number: string }).account_number).first()
            if (!warbleAccount) {
                return reply.status(404).send({
                    message: "Account not found"
                })
            }
            await WarbleAccount.query().where('id', warbleAccount!.id as number).delete()
            return reply.resourceResponse({
                statusCode: 200,
                data: null,
                message: "Account deleted"
            })
        } catch (error) {
            req.log.error(error, "Failed to delete")
            reply.resourceResponse({
                data: null,
                statusCode: 400,
                message: "Failed to delete"
            })
        }

    }
}


export const appRoutes: FastifyPluginCallback = function (fastify, options, done) {
    fastify.register(auth)
    fastify.post('/post-transaction', acceptNotification);
    fastify.post('/register-account', registerWarbleAccount);
    fastify.post('/create-new-key', createWarbleAccountKey);
    fastify.post('/toggle-history', toggleHistory);
    fastify.delete('/delete-warble-account/:account_number', deleteWarbleAccount);
    done()
}