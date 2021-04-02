import { IConfig } from "../utils/config";

export const envConfig = {
  RETRY_ATTEMPT_NUMBER: 1,
  APPINSIGHTS_INSTRUMENTATIONKEY: "Idontknow",
  AZURE_NH_ENDPOINT:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",
  AZURE_NH_HUB_NAME: "io-notification-hub-mock"
} as IConfig;
