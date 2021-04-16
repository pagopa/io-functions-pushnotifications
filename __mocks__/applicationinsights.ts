import * as ai from "applicationinsights";

export const defaultClient: ai.TelemetryClient = ({
  trackException: jest.fn()
} as unknown) as ai.TelemetryClient;
