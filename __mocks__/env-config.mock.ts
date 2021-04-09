import { IConfig, NHPartitionFeatureFlag } from "../utils/config";
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { IntegerFromString } from "italia-ts-commons/lib/numbers";

export const envConfig: IConfig = {
  isProduction: false,
  APPINSIGHTS_INSTRUMENTATIONKEY: "Idontknow" as NonEmptyString,
  APPINSIGHTS_SAMPLING_PERCENTAGE: ("20" as unknown) as IntegerFromString,

  RETRY_ATTEMPT_NUMBER: ("1" as unknown) as IntegerFromString,

  AzureWebJobsStorage: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  AZURE_NH_ENDPOINT: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  AZURE_NH_HUB_NAME: "io-notification-hub-mock" as NonEmptyString,

  NOTIFICATIONS_STORAGE_CONNECTION_STRING: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,

  NH_PARTITION_FEATURE_FLAG: "all",
  BETA_USERS_STORAGE_CONNECTION_STRING: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  BETA_USERS_TABLE_NAME: "nhpartitiontestusers" as NonEmptyString
};
