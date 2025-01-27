import { ta } from "date-fns/locale";
import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('api_users', function(table){
        table.bigIncrements('id')
        table.string('username').notNullable().unique()
        table.string('password').notNullable()
        table.timestamps(true,true)
    })
    .createTable('api_tokens', function(table){
        table.bigIncrements('id')
        table.string('token').unique().notNullable()
        table.bigInteger('user_id').unsigned().references('id').inTable('api_users').onDelete('CASCADE')
        table.timestamp('expires_at', {useTz: true}).nullable()
        table.timestamp('last_used_at',{useTz: true}).nullable()
        table.timestamps(true)
    })
    .createTable('warble_accounts', function(table){
        table.bigIncrements('id')
        table.string('account_number').unique()
        table.boolean('history_enabled')
        table.jsonb('stream_keys')
        table.bigInteger('user_id').unsigned().references('id').inTable('api_users').onDelete('set null').nullable()
        table.timestamps(true,true)
    })
    .createTable('incoming_transactions', function(table){
        table.bigIncrements('id')
        table.string('sessionId').notNullable().unique()
        table.string('paymentRef').unique()
        table.string('status').defaultTo('incomplete')
        table.string("creditAccount").index()
        table.string("creditAccountName")
        table.string("senderAccNo").index()
        table.string("senderName")
        table.string("senderBank")
        table.string('narration')
        table.decimal('amount',16,2).notNullable()
        table.bigInteger('user_id').unsigned().index().nullable()
        table.timestamps(true,true)
    })
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema
       .dropTableIfExists('incoming_transactions')
       .dropTableIfExists('api_tokens')
       .dropTableIfExists('api_users')
}

