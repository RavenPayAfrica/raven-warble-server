import { Model, RelationMappings, RelationMappingsThunk } from "objection";
import ApiUser from "./ApiUser";
import BaseModel from "./BaseModel";

interface IWarbleAccount {
    id?: number,
    account_number: string,
    history_enabled: boolean,
    stream_keys: string[],
    user?: ApiUser,
    user_id?: BigInt | number | null
}

interface WarbleAccount extends IWarbleAccount{}

class WarbleAccount extends BaseModel {
    static get tableName() {
        return 'warble_accounts';
    }
    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                "account_number",
                "history_enabled",
            ],
            properties: {
                account_number: { type: 'string', pattern: "^[0-9]{10}$"  },
                history_enabled: { type: 'boolean' },
                stream_keys: { type: 'array', items: {type: 'string'} },
            },
        }
    }
    static relationMappings: RelationMappings | RelationMappingsThunk= {
        user: {
            relation: Model.BelongsToOneRelation,
            modelClass: "ApiUser",
            join: {
                from: 'warble_accounts.user_id',
                to: 'api_users.id'
            }
        }
    }
}

export default WarbleAccount;