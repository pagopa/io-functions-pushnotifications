import { IConfig } from "../utils/config";
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

  AZURE_NOTIFICATION_HUB_PARTITIONS: JSON.stringify([
    { partitionRegex: "^[0-3]", envVariablePrefix: "AZURE_NH_PARTITION_1" },
    { partitionRegex: "^[4-7]", envVariablePrefix: "AZURE_NH_PARTITION_2" },
    { partitionRegex: "^[8-b]", envVariablePrefix: "AZURE_NH_PARTITION_3" },
    { partitionRegex: "^[c-f]", envVariablePrefix: "AZURE_NH_PARTITION_4" }
  ]) as any,

  AZURE_NH_PARTITION_1_ENDPOINT: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  AZURE_NH_PARTITION_1_HUB_NAME: "io-notification-hub-mock" as NonEmptyString,

  AZURE_NH_PARTITION_2_ENDPOINT: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  AZURE_NH_PARTITION_2_HUB_NAME: "io-notification-hub-mock" as NonEmptyString,

  AZURE_NH_PARTITION_3_ENDPOINT: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  AZURE_NH_PARTITION_3_HUB_NAME: "io-notification-hub-mock" as NonEmptyString,

  AZURE_NH_PARTITION_4_ENDPOINT: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  AZURE_NH_PARTITION_4_HUB_NAME: "io-notification-hub-mock" as NonEmptyString,

  NOTIFICATIONS_STORAGE_CONNECTION_STRING: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,

  NH_PARTITION_FEATURE_FLAG: "all",
  BETA_USERS_STORAGE_CONNECTION_STRING: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  BETA_USERS_TABLE_NAME: "nhpartitiontestusers" as NonEmptyString,
  CANARY_USERS_REGEX: "^([(0-9)|(a-f)|(A-F)]{63}0)|([(0-9)|(a-f)|(A-F)]{62}[(0-7)]{1}1)$" as NonEmptyString
};
