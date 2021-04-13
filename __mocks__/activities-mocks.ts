import { CallableActivity } from "../utils/durable/orchestrators";

import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  ActivityResultSuccessWithValue as IsUserInActiveSubsetActivityResultSuccess
} from "../IsUserInActiveSubsetActivity";

import {
  ActivityInput as DeleteInstallationActivityInput,
  ActivityResultSuccess as DeleteInstallationActivityResultSuccess
} from "../HandleNHDeleteInstallationCallActivity";

import {
  ActivityInput as NotifyMessageActivityInput,
  ActivityResultSuccess as NotifyMessageActivityResultSuccess
} from "../HandleNHNotifyMessageCallActivity";

type CallableIsUserInActiveSubsetActivity = CallableActivity<
  IsUserInActiveSubsetActivityInput,
  IsUserInActiveSubsetActivityResultSuccess
>;

export const getMockIsUserATestUserActivity = (res: boolean): any =>
  jest.fn<
    ReturnType<CallableIsUserInActiveSubsetActivity>,
    Parameters<CallableIsUserInActiveSubsetActivity>
  >(function*() {
    return { kind: "SUCCESS", value: res };
  });

type CallableDeleteInstallationActivity = CallableActivity<
  DeleteInstallationActivityInput,
  DeleteInstallationActivityResultSuccess
>;
export const getMockDeleteInstallationActivity = (
  result: DeleteInstallationActivityResultSuccess
): any =>
  jest.fn<
    ReturnType<CallableDeleteInstallationActivity>,
    Parameters<CallableDeleteInstallationActivity>
  >(function*(_) {
    return result;
  });

type CallableNotifyInstallationActivity = CallableActivity<
  NotifyMessageActivityInput,
  NotifyMessageActivityResultSuccess
>;
export const getMockNotifyMessageInstallationActivity = (
  result: NotifyMessageActivityResultSuccess
): any =>
  jest.fn<
    ReturnType<CallableNotifyInstallationActivity>,
    Parameters<CallableNotifyInstallationActivity>
  >(function*(_) {
    return result;
  });
