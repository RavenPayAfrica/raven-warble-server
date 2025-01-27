import { appVersion, Env } from "../utils/helpers";

type IAppConfig = {
    appName: string;
    appVersion: string;
    apiTokenLifeTime: number;
    appPort: number;
    logLevel: string;
    cba_url: string;
    environment: string;
}

export const config: IAppConfig = {
    appName: Env.string("APP_NAME", "app"),
    appVersion: appVersion,
    apiTokenLifeTime: Env.number("API_TOKEN_LIFETIME", 3600), // 1 hour
    appPort: Env.number("APP_PORT", 4565),
    logLevel: Env.string("APP_LOG_LEVEL", Env.string("APP_ENVIRONMENT","local") === "local"? "debug": "info"),
    cba_url: Env.string("CBA_URL", ""),
    environment: Env.string("APP_ENVIRONMENT","local"),
}

export default config;