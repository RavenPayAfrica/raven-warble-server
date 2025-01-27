import { Model, ModelOptions, QueryContext } from "objection";
import db from "../config/db";
interface IBaseModel {
    created_at?: string | Date;
    updated_at?: string | Date;
}

interface BaseModel extends IBaseModel{}

abstract class BaseModel extends Model {
    static get tableName(): string{
        return "base_model";
    }
    static get modelPaths() {
        return [__dirname];
    }

    $beforeUpdate(opt: ModelOptions, queryContext: QueryContext): Promise<any> | void {
        this.updated_at = new Date()
    }
}

BaseModel.knex(db);

export default BaseModel;