import "dotenv/config"
import type { Knex } from "knex";
import {config as DbConfig} from "./src/config/db"
// Update with your config settings.

const config: { [key: string]: Knex.Config } = {
  default: {
   ...DbConfig,
    migrations: {
      tableName: "migrations",
      directory: "./src/migrations"
    },
  },
};

module.exports = config;
