// ---------------------------------------------------------------------------
// X API v2 — barrel export
// ---------------------------------------------------------------------------

export { X_API_BASE, xApiHeaders, xUserHeaders } from "./client";
export { XApiError } from "./errors";
export { fetchWithRetry } from "./fetch-with-retry";
export { fetchXProfile, fetchUserById, fetchUsersBatch, fetchFollowers, fetchFollowing } from "./user";
export { fetchUserTimeline } from "./timeline";
export { fetchPost } from "./post";
export { fetchApiUsage } from "./usage";
export { subscribeCreatorToWebhook, unsubscribeCreator } from "./webhook-subscriptions";
export type {
  XUser,
  XPost,
  XMedia,
  XUserResponse,
  XUsersResponse,
  XTimelineResponse,
  XPostResponse,
  XApiErrorObject,
  XWebhookEvent,
  XWebhookPost,
  XWebhookUser,
} from "./types";
