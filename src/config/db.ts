import Knex, { Knex as KnexType } from 'knex';
import { Env } from '../utils/helpers';


export const config: KnexType.Config = {
    client: "mysql2",
    debug: Env.boolean("LOG_DB_QUERY", false),
    connection: {
        database: Env.string("DATABASE_NAME", "myapp_development"),
        user: Env.string("DATABASE_USER" , "root"),
        password: Env.string("DATABASE_PASSWORD", ""),
        host: Env.string("DATABASE_HOST", 'localhost'),
        port: Env.number("DATABASE_PORT" , 3306),
    },
    pool: {
        min: 2,
        max: Env.number("DB_MAX_POOL_SIZE", 10)
    }
}

export const db = Knex(config);

export default db;