import { Model, RelationMappings, RelationMappingsThunk } from "objection";
import BaseModel from "./BaseModel";

interface IIncomingTransaction {
    id?: number,
    sessionId: string,
    paymentRef: string,
    status: string,
    creditAccount: string,
    creditAccountName: string,
    senderName: string,
    senderBank: string,
    senderAccNo: string,
    narration: string,
    amount: number,
}

interface IncomingTransaction extends IIncomingTransaction {}

class IncomingTransaction extends BaseModel {
    static get tableName() {
        return 'incoming_transactions';
    }

    static get jsonSchema() {
        return {
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
                creditAccount: { type: 'string', pattern: "^[0-9]{10}$"  },
                creditAccountName: { type: 'string' },
                senderName: { type: 'string' },
                senderBank: { type: 'string' },
                senderAccNo: { type: 'string', pattern: "^[0-9]{10}$"},
                narration: { type: 'string' },
                amount: {
                    type: 'string',
                    pattern: '^\\d+(\\.\\d{2})?$'
                }
            },
        }
    }

    static relationMappings: RelationMappings | RelationMappingsThunk= {
        user: {
            relation: Model.BelongsToOneRelation,
            modelClass: "ApiUser",
            join: {
                from: 'incoming_transactions.user_id',
                to: 'api_users.id'
            }
        }
    }
}

export default IncomingTransaction;