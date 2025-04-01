type Channel = "ATM" | "MOBILE" | "WEB" | "USSD" | "Branch" | "KIOSK" | "POS" | "Internet Banking" | "Corporate Ibank" | "Others"
type AuthenticatePayload = {
    username: string,
    password: string,
}

type AuthenticateResponse = {
    token: string,
    expires_in: string,
    statusCode: string,
    statusMessage: string,
}

type AddWarble = {
    account_number: string,
    history_enabled: string,
}

type IncomingCreditNotificaion = {
    sessionId: string,
    paymentRef: string,
    status: string,
    creditAccount: string,
    creditAccountName: string,
    senderName: string,
    senderBank: string,
    senderAccNo: string,
    narration: string,
    amount: number,
}



export  type PaginatedData<T> = {
    pagination:{
        totalPages: number;
        currentPage: number;
        nextPage: number | null;
        prevPage: number | null;
        total: number;
        perPage: number;
    }
    totalPages: number;
    currentPage: number;
    total: number;
    data: T[];
};
export interface PaginationOptions {
    page: number;
    pageSize: number;
}



export type POSSIBLE_ENV_VARIABLES = 
     "APP_PORT" | "APP_SECRET" | "DATABASE_NAME" | "DATABASE_USER" | "DATABASE_PASSWORD" | "DATABASE_HOST" | "DATABASE_PORT" | "INSTITUTIONID" | "PRIVATE_KEY_PATH" | "CORALPAY_PUBLIC_KEY_PATH" | "CORALPAY_SECRET" | "CORALPAY_ENVIRONMENT" | "PRIVATE_KEY_PASSPHRASE" |
     "CORALPAY_DEBUG" | "API_TOKEN_LIFETIME" | "APP_NAME" | "APP_LOG_LEVEL" | "APP_ENVIRONMENT" | "CBA_URL" | "PUBLIC_KEY_PATH" | "DB_MAX_POOL_SIZE" | "MAX_INFLOW_LIFE_TIME" | "LOG_DB_QUERY"
