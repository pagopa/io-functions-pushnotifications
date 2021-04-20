# IO Functions Push Notification

This Azure Function Project manages all the aspects related to the Push Notifications.

It uses the Azure Notification Hub to enable the push notifications and the device management.

## Sviluppo in locale

```shell
cp env.example .env
cp local.settings.json.example local.settings.json
yarn install --frozen-lockfile
yarn build
yarn start
open http://localhost/some/path/test
```

## Environment variables

Those are all Environment variables needed by the application:

| Variable name                    | Description                                                                                        | type   | Required |
|----------------------------------|----------------------------------------------------------------------------------------------------|--------| ---------|
| SLOT_TASK_HUBNAME                |  The unique slot task hubname                                                                      | string | true     |
| APPINSIGHTS_INSTRUMENTATIONKEY   |  A valid Application Insights instrumentation key                                                  | string | true     |
| AZURE_NH_HUB_NAME                |  The name of the Notification Hub                                                                  | string | true     |
| AZURE_NH_ENDPOINT                |  The endpoint of the Notification Hub Namespace                                                    | string | true     |
| STORAGE_CONN_STRING              |  The connection string of the Storage Account                                                      | string | true     |
| NOTIFICATIONS_QUEUE_NAME         |  The name of the queue that stores the Notification messages                                       | string | true     |
| NH_PARTITION_FEATURE_FLAG        |  The type of FF enabled fot NH partition. Possible values: "none" - "all" - "beta" - "canary"      | string | true     |
| CANARY_USERS_REGEX               |  The regex used to discriminate _canary users_                                                     | string | true     |


## Deploy

Deployment is automatized by a [pipeline](./.devops/deploy-pipelines.yml)
