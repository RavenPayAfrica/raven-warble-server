import {Model, RelationMappings, RelationMappingsThunk } from "objection";
import ApiUser from "./ApiUser";
import BaseModel from "./BaseModel";

interface IApiKey {
    id?: number;
    token: string;
    user_id: number;
    user?: ApiUser;
    last_used_at: Date | null | string;
    expires_at: Date;
}

interface ApiKey extends IApiKey {}

class ApiKey extends BaseModel {
    static get tableName() {
        return 'api_tokens';
    }

    static relationMappings: RelationMappings | RelationMappingsThunk= {
        user: {
            relation: Model.BelongsToOneRelation,
            modelClass: "ApiUser",
            join: {
                from: 'api_tokens.user_id',
                to: 'api_users.id'
            }
        }
    }
}

export default ApiKey;