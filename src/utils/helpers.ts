import { IncomingCreditNotificaion, PaginatedData, POSSIBLE_ENV_VARIABLES } from '../@types/app';
import fp from "fastify-plugin";
import { FastifyReply } from 'fastify';
import pino from "pino";
import { format } from 'date-fns';
import { parse } from 'date-fns/parse';
const packageJson = require('../../package.json');

export const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    }
  }
})

export const appVersion = packageJson.version;


export class Env {
  static get<T>(name: POSSIBLE_ENV_VARIABLES, defaultValue: T | null = null): T {
    const value = process.env[name];

    switch (typeof defaultValue) {
      case 'string':
        return String(value) as T;
      case 'number':
        return Number(value ?? defaultValue) as T;
      case 'object':
        try {
          return Array.isArray(defaultValue) && value != undefined ?
            JSON.parse(value.toString()) : value as T;
        } catch {
          throw new Error(`Invalid value for ${name}`);
        }
      default:
        return value as T;
    }
  }

  static string(name: POSSIBLE_ENV_VARIABLES, defaultValue: string | null = null): string {
    return this.get<string>(name, defaultValue);
  }

  static number(name: POSSIBLE_ENV_VARIABLES, defaultValue: number | null = null): number {
    return this.get<number>(name, defaultValue);
  }

  static array<T>(name: POSSIBLE_ENV_VARIABLES, defaultValue: T[] = []): T[] {
    return this.get<T[]>(name, defaultValue);
  }

  static boolean(name: POSSIBLE_ENV_VARIABLES, defaultValue: boolean = false): boolean {
    const readValue = this.get<any>(name, defaultValue);
    if (readValue === undefined || readValue == null) return defaultValue;
    return {
      "1": true,
      "0": false,
      "true": true,
      "false": false
    }[readValue as string] || false;
  }
}


export const paginate = async <T>(model: any, query: any, page: number, pageSize: number): Promise<PaginatedData<T>> => {
  const offset = (page - 1) * pageSize;
  const paginatedPosts = await model.findMany({
    ...query,
    skip: offset,
    take: pageSize,
  });
  const total = await model.count({
    ...query,
    skip: offset,
    take: pageSize,
  });
  const totalPages = (total % pageSize ? 1 : 0) + Math.floor(total / pageSize)
  return {
    pagination: {
      perPage: pageSize,
      totalPages,
      total,
      currentPage: page,
      prevPage: page == 1 ? null : page,
      nextPage: page == totalPages ? null : page + 1,
    },
    totalPages,
    total,
    currentPage: page,
    data: paginatedPosts,
  };
}

export const generateRandomNumeric = (length: number): string => {
  const arr = shuffleArray((new Array(36)).fill(null).map(() => Math.random().toString().substring(2))).join('');
  return arr.substring(2, length + 2);
}

function shuffleArray<T extends unknown>(array: T[]): T[] {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

type ResourceResponse = {
  data: any,
  statusCode?: number;
  message?: string | null;
}

declare module 'fastify' {
  interface FastifyReply {
    resourceResponse(response: ResourceResponse): FastifyReply;
    respondCoralPayRequest(response: any): FastifyReply;
  }
}

export const generateTransId = (): string => {
  return process.env.INSTITUTIONID + format(new Date(), "yyMMddHHmmss") + generateRandomNumeric(12)
}


export const utilityFunctions = fp((fastify, opt, done) => {
  fastify.decorateReply('resourceResponse',
    function ({ data, statusCode = 200, message = null }: ResourceResponse): FastifyReply {
      const response = {
        status: statusCode === 200,
        message,
        data
      }
      return this.status(statusCode).send(response);
    }
  )
  done();
})

export const createWarbleTransaction = (data: IncomingCreditNotificaion)=>{
  let parsedDate = parse(data.sessionId.substring(6, 18), "yyMMddHHmmss", new Date);
  if(!parsedDate?.getTime()) {
    parsedDate = new Date;
  }

  return {
    sender: data.senderName,
    senderBank: data.senderBank,
    senderAcc: data.senderAccNo.substring(0,2) + "*****" + data.senderAccNo.substring(data.senderAccNo.length -4),
    senderBankCode: data.sessionId.substring(0, 6),
    sessionId: data.sessionId,
    amount: data.amount,
    narration: data.narration,
    status: data.status,
    accountName: data.creditAccountName,
    accountNumber: data.creditAccount,
    transactionTime: format(parsedDate, "MMM do y hh:mm:ss b"),
    notificationTime: `${parsedDate.getTime()}`,
    transactionTimeISO: parsedDate.toISOString()
  }
}