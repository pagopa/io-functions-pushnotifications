import { IConfig } from "../utils/config";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { IntegerFromString } from "@pagopa/ts-commons/lib/numbers";

const aBlacklistedFiscalCode = "AAAAAA00A00H501I" as FiscalCode;

export const envConfig: IConfig = {
  isProduction: false,
  APPINSIGHTS_INSTRUMENTATIONKEY: "Idontknow" as NonEmptyString,
  APPINSIGHTS_SAMPLING_PERCENTAGE: ("20" as unknown) as IntegerFromString,

  RETRY_ATTEMPT_NUMBER: ("1" as unknown) as IntegerFromString,

  FISCAL_CODE_NOTIFICATION_BLACKLIST: [aBlacklistedFiscalCode],

  AzureWebJobsStorage: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  AZURE_NH_ENDPOINT: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  AZURE_NH_HUB_NAME: "partition-legacy" as NonEmptyString,

  AZURE_NOTIFICATION_HUB_PARTITIONS: [
    {
      partitionRegex: "^[0-3]" as NonEmptyString,
      name: "partition-1" as NonEmptyString,
      endpoint: "endpoint-partition-1" as NonEmptyString
    },
    {
      partitionRegex: "^[4-7]" as NonEmptyString,
      name: "partition-2" as NonEmptyString,
      endpoint: "endpoint-partition-2" as NonEmptyString
    },
    {
      partitionRegex: "^[8-b]" as NonEmptyString,
      name: "partition-3" as NonEmptyString,
      endpoint: "endpoint-partition-3" as NonEmptyString
    },
    {
      partitionRegex: "^[c-f]" as NonEmptyString,
      name: "partition-4" as NonEmptyString,
      endpoint: "endpoint-partition-4" as NonEmptyString
    }
  ] as any,

  NOTIFICATIONS_STORAGE_CONNECTION_STRING: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  NOTIFICATIONS_QUEUE_NAME: "notification-queue-name" as NonEmptyString,
  INTERNAL_STORAGE_CONNECTION_STRING: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  NOTIFY_MESSAGE_QUEUE_NAME: "notify-queue-name" as NonEmptyString,
  NH_PARTITION_FEATURE_FLAG: "all",
  BETA_USERS_STORAGE_CONNECTION_STRING: "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  BETA_USERS_TABLE_NAME: "nhpartitiontestusers" as NonEmptyString,
  CANARY_USERS_REGEX: "^([(0-9)|(a-f)|(A-F)]{63}0)|([(0-9)|(a-f)|(A-F)]{62}[(0-7)]{1}1)$" as NonEmptyString,
  NOTIFY_VIA_QUEUE_FEATURE_FLAG: "none"
};
