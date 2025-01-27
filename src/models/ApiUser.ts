import { Model, RelationMappings, RelationMappingsThunk } from "objection";
import ApiToken from "./ApiToken";
import BaseModel from "./BaseModel";

interface IApiUser {
    id?: number
    username: string
    password: string
    apiKeys?: ApiToken[]
}

interface ApiUser extends IApiUser {}

class ApiUser extends BaseModel {
    static get tableName() {
        return 'api_users';
    }

    static relationMappings: RelationMappings | RelationMappingsThunk= {
        apiKeys: {
            relation: Model.HasManyRelation,
            modelClass: "ApiToken",
            join: {
                from: 'api_users.id',
                to: 'api_tokens.user_id'
            }
        },
        outwardTransfers: {
            relation: Model.HasManyRelation,
            modelClass: "OutwardTransfer",
            join: {
                from: 'api_users.id',
                to: 'outward_transactions.user_id'
             }
        }
    }
}

export default ApiUser;