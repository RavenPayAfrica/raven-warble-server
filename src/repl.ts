import 'dotenv/config'
import repl, { REPLServer } from "node:repl"
import db from "./config/db"
import ApiToken from "./models/ApiToken"
import ApiUser from "./models/ApiUser"
import WarbleAccount from "./models/WarbleAccount"
import IncomingTransaction from "./models/IncomingTransaction"
import path from 'node:path'
import { tmpdir } from 'node:os'
import { readFileSync, writeFileSync } from 'node:fs'

const server = repl.start({
    prompt: "#wable> ",
    ignoreUndefined: true,
})
initContext(server.context)
server.on("reset", initContext)

server.defineCommand("clear", {
    help: "Clear the terminal output",
    action(name) {
        console.clear()
        this.displayPrompt(true)
    }
})

server.defineCommand("bye", function () {
        console.log("Bye");
        this.close()
    }
)


server.setupHistory(createTmpFile(),(err)=>{
    if(err) console.log("failed to create history file: ", err)
})


function createTmpFile (): string {
    const tempFile = path.join(tmpdir(), "warble-repl");

    try {
        readFileSync(tempFile)
    } catch (error) {
        writeFileSync(tempFile,'')
    }

    return tempFile
}


function initContext(context: typeof server.context) {
    context.db = db
    context.models = {
        ApiToken,
        ApiUser,
        WarbleAccount,
        IncomingTransaction
    }
}