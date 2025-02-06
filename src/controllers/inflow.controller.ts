import fastify, { FastifyPluginCallback, RouteShorthandOptionsWithHandler } from "fastify";
import WarbleAccount from "../models/WarbleAccount";
import { IncomingCreditNotificaion } from "../@types/app";
import IncomingTransaction from "../models/IncomingTransaction";
import { auth } from "../middleware/auth";
import { randomBytes, randomInt } from "crypto";
import db from "../config/db";
import { format, parse } from "date-fns";

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

        const parsedDate = parse(data.sessionId.substring(6, 18), "yyMMddHHmmss", new Date) ?? new Date;

        this.io.of('/').to(`account:${data.creditAccount}`).emit("new_transaction", {
            sender: data.senderName,
            senderBank: data.senderBank,
            senderBankCode: data.sessionId.substring(0, 6),
            sessionId: data.sessionId,
            amount: data.amount,
            narration: data.narration,
            status: data.status,
            accountName: data.creditAccountName,
            accountNumber: data.creditAccount,
            transactionTime: format(parsedDate, "MMM do y hh:mm:ss b"),
            notificationTime: `${Date.now()}`
        })

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
                history_enabled: { type: 'boolean' }
            }
        }
    },
    handler: async function (req, reply) {
        const key = randomInt(100000, 999999).toString()
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
                stream_keys: [key],
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
                account_number: { type: 'string', pattern: "^[0-9]{10}$" }
            }
        }
    },
    handler: async function (req, reply) {
        const key = randomInt(100000, 999999).toString()
        const transaction = await WarbleAccount.startTransaction()
        try {

            const warbleAccount = await WarbleAccount.query(transaction).where('account_number', (req.body as { account_number: string }).account_number).first()
            if (!warbleAccount) {
                return reply.resourceResponse({
                    data: null,
                    statusCode: 400,
                    message: "Account not registered. Kindly register account for warble"
                })
            }

            await warbleAccount.$query(transaction).update({
                stream_keys: [...warbleAccount.stream_keys, key],
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
                statusCode: 400,
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
    fastify.delete('/delete-warble-account/:account_number', deleteWarbleAccount);
    done()
}