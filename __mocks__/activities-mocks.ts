import { CallableActivity } from "../utils/durable/orchestrators";

import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  ActivityResultSuccessWithValue as IsUserInActiveSubsetActivityResultSuccess
} from "../IsUserInActiveSubsetActivity";

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
