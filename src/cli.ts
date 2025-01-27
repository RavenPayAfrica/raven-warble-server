import "dotenv/config"
import {program} from "commander"
import fs from 'node:fs'
import path from "node:path"
import prompt from 'prompts'
import { randomBytes } from "node:crypto"
import argon from "argon2"
import { addHours } from "date-fns"
import ApiUser from "./models/ApiUser"

const packageJson:{version: string} = JSON.parse(fs.readFileSync(
    path.join(process.cwd(),'package.json'), 
    'utf8')
)

program.version(packageJson.version)

program.command("create-user")
   .description("Create a user and api key")
   .action(async (str, opt) => {
        const {username, password} = await prompt([
            {
                type: 'text',
                name:'username',
                message:"Enter your username",
                validate:(input)=>{
                    if (input === "" || input.length < 4) return "Username cannot be empty/too short"
                    else return true;
                }
            },
            {
                type: 'password',
                name:'password',
                message:"Enter your password",
                validate:(input)=>{
                    if (input === "" || input.length < 8) return "Password cannot be empty/too short"
                    else return true;
                }
            }
        ]);

        if(!username?.length || !password?.length) {
            return;
        }

        const apiKey = randomBytes(32).toString('base64')
        const hashedApiKey = await argon.hash(apiKey)
        const expiresAt = addHours(new Date(), 24)
        const user = await ApiUser.query().insertGraph({
            username: username.toLowerCase(),
            password: await argon.hash(password),
            apiKeys:[{
                token: hashedApiKey,
                expires_at: expiresAt,
            }]
        })
        const token = user.apiKeys![0]
        console.log("User created",{
            username: user.username,
            password: password,
            apiKey: token.id+"|"+apiKey,
            tokenExpiresAt: expiresAt,
        })
    })

program.parse()