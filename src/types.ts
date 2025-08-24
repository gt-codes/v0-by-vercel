export interface FindChatsResponse {
  object: "list";
  data: ChatSummary[];
}

export type ChatPrivacy = "public" | "private" | "team" | "team-edit" | "unlisted";

export interface ChatSummary {
  id: string;
  object: "chat";
  shareable: boolean;
  privacy: ChatPrivacy;
  name?: string;
  /** @deprecated */
  title?: string;
  createdAt: string;
  updatedAt?: string;
  favorite: boolean;
  authorId: string;
  projectId?: string;
  webUrl: string;
  apiUrl: string;
  latestVersion?: VersionSummary;
}

export interface FileDetail {
  object: "file";
  name: string;
  content: string;
  locked: boolean;
}

export interface FileSummary {
  object: "file";
  name: string;
}

export interface VersionDetail {
  id: string;
  object: "version";
  status: "pending" | "completed" | "failed";
  demoUrl?: string;
  createdAt: string;
  updatedAt?: string;
  files?: FileDetail[];
}

export interface VersionSummary {
  id: string;
  object: "version";
  status: "pending" | "completed" | "failed";
  demoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export type MessageSummary = {
  id: string;
  object: "message";
  content: string;
  experimental_content?: Array<
    | [0, unknown[]]
    | [
        1,
        {
          title?: string;
          [key: string]: unknown;
        },
      ]
  >;
  createdAt: string;
  updatedAt?: string;
  type:
    | "message"
    | "forked-block"
    | "forked-chat"
    | "open-in-v0"
    | "refinement"
    | "added-environment-variables"
    | "added-integration"
    | "deleted-file"
    | "moved-file"
    | "renamed-file"
    | "edited-file"
    | "replace-src"
    | "reverted-block"
    | "fix-with-v0"
    | "auto-fix-with-v0"
    | "sync-git";
  role: "user" | "assistant";
  finishReason?: "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other" | "unknown";
  apiUrl: string;
};

export type ChatDetail = {
  id: string;
  object: "chat";
  shareable: boolean;
  privacy: ChatPrivacy;
  name?: string;
  /** @deprecated */
  title?: string;
  createdAt: string;
  updatedAt?: string;
  favorite: boolean;
  authorId: string;
  projectId?: string;
  webUrl: string;
  apiUrl: string;
  latestVersion?: {
    id: string;
    object: "version";
    status: "pending" | "completed" | "failed";
    demoUrl?: string;
    createdAt: string;
    updatedAt?: string;
    files: FileDetail[];
  };
  /** @deprecated */
  url: string;
  messages: MessageSummary[];
  files?: {
    lang: string;
    meta: Record<string, unknown>;
    source: string;
  }[];
  /** @deprecated */
  demo?: string;
  text: string;
  modelConfiguration?: {
    modelId: V0Model;
    imageGenerations?: boolean;
    thinking?: boolean;
  };
};

export type ChatDetailResponse = ChatDetail;

export interface ChatMetadataResponse {
  git?: {
    branch?: string;
    commit?: string;
  };
  deployment?: {
    id?: string;
  };
  project?: {
    id?: string;
    name?: string;
    url?: string;
  };
}

export interface DeleteChatResponse {
  id: string;
  object: "chat";
  deleted: true;
}

export type ForkChatResponse = ChatDetail;

export type V0Model = "v0-1.5-sm" | "v0-1.5-md" | "v0-1.5-lg" | "v0-gpt-5";

export interface CreateChatRequest {
  message: string;
  attachments?: { url: string }[];
  system?: string;
  chatPrivacy?: ChatPrivacy;
  projectId?: string;
  modelConfiguration?: {
    modelId?: V0Model;
    imageGenerations?: boolean;
    thinking?: boolean;
  };
  responseMode?: "sync" | "async";
}

export type CreateChatResponse = ChatDetail;

export interface CreateProjectResponse {
  id: string;
  object: "project";
  name: string;
  vercelProjectId?: string;
}

export interface CreateMessageRequest {
  message: string;
  attachments?: Array<{
    url: string;
  }>;
  modelConfiguration?: {
    modelId?: V0Model;
    imageGenerations?: boolean;
    thinking?: boolean;
  };
  responseMode?: "sync" | "async";
}

export interface CreateMessageResponse {
  id: string;
  object: "message";
  chatId: string;
  url: string;
  files?: {
    lang: string;
    meta: Record<string, unknown>;
    source: string;
  }[];
  text: string;
  modelConfiguration: {
    modelId: V0Model;
    imageGenerations?: boolean;
    thinking?: boolean;
  };
}

export interface DeploymentDetail {
  id: string;
  object: "deployment";
  inspectorUrl: string;
  chatId: string;
  projectId: string;
  versionId: string;
  apiUrl: string;
  webUrl: string;
}

export interface DeploymentSummary {
  id: string;
  object: "deployment";
  inspectorUrl: string;
  chatId: string;
  projectId: string;
  versionId: string;
  apiUrl: string;
  webUrl: string;
}

export interface FindDeploymentsResponse {
  object: "list";
  data: DeploymentDetail[];
}

export interface InitializeChatResponse {
  id: string;
  object: "chat";
  shareable: boolean;
  privacy: ChatPrivacy;
  name?: string;
  updatedAt?: string;
  favorite: boolean;
  authorId: string;
  projectId?: string;
  latestVersion?: VersionDetail;
  url: string;
  messages: MessageSummary[];
  files?: {
    lang: string;
    meta: Record<string, unknown>;
    source: string;
  }[];
  text: string;
}

export type ProjectDetail = {
  id: string;
  object: "project";
  name: string;
  privacy: "private" | "team";
  vercelProjectId?: string;
  createdAt: string;
  updatedAt?: string;
  apiUrl: string;
  webUrl: string;
  description?: string;
  instructions?: string;
  chats: ChatSummary[];
};

export interface FindProjectsResponse {
  object: "list";
  data: ProjectDetail[];
}

export interface Project {
  id: string;
  object: "project";
  name: string;
  vercelProjectId?: string;
}

export interface Profile {
  id: string;
  name: string;
  apiKey: string;
  defaultScope?: string;
  defaultScopeName?: string;
}

export interface ActiveProfileId {
  id: string;
}

export interface ScopeSummary {
  id: string;
  object: "scope";
  name?: string;
}

export interface FindScopesResponse {
  object: "list";
  data: ScopeSummary[];
}

export interface ProjectChatsResponse {
  object: "project";
  id: string;
  name: string;
  description?: string;
  chats: ChatSummary[];
}

export enum ApiVersion {
  V1 = "v1",
}

export interface File {
  lang: string;
  meta: Record<string, unknown>;
  source: string;
}

export interface Chat {
  id: string;
  object: "chat";
  shareable: boolean;
  privacy: ChatPrivacy;
  name?: string;
  updatedAt: string;
  favorite: boolean;
  authorId: string;
  projectId?: string;
  latestVersion?: VersionDetail;
  url: string;
  messages: MessageSummary[];
  files?: File[];
  text: string;
}

export interface CompletionMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<string | { type: "image_url"; image_url: { url: string } }>;
}

export interface ChatCompletionRequest {
  model: V0Model;
  messages: CompletionMessage[];
  stream?: boolean;
  tools?: Array<Record<string, unknown>>;
  tool_choice?: string | Record<string, unknown>;
  max_completion_tokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: V0Model;
  object: "chat.completion" | "chat.completion.chunk";
  created: number;
  choices: Array<{
    index: number;
    message?: CompletionMessage;
    delta?: CompletionMessage;
    finish_reason: string | null;
  }>;
}

export interface AssignProjectResponse {
  object: string;
  id: string;
  assigned: boolean;
}

// Additional API Schemas (not all currently used by the UI but kept for completeness)

export interface MessageDetail extends MessageSummary {
  chatId: string;
}

export type MessageSummaryList = {
  object: "list";
  data: MessageSummary[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    nextUrl?: string;
  };
};

export interface ProductDetailSchema {
  object: "product";
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl: string;
  iconBackgroundColor?: string;
}

export interface ProductListSchema {
  object: "list";
  data: {
    object: "product";
    id: string;
    slug: string;
    name: string;
    description: string;
    iconUrl: string;
  }[];
}

export interface ProductSummarySchema {
  object: "product";
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl: string;
}

export type ProjectSummary = {
  id: string;
  object: "project";
  name: string;
  privacy: "private" | "team";
  vercelProjectId?: string;
  createdAt: string;
  updatedAt?: string;
  apiUrl: string;
  webUrl: string;
};

export type SearchResultItem = {
  id: string;
  object: "chat" | "project";
  name: string;
  createdAt: string;
  updatedAt?: string;
  apiUrl: string;
  webUrl: string;
};

export interface UserDetail {
  id: string;
  object: "user";
  name?: string;
  email: string;
  avatar: string;
}

export interface VercelProjectDetail {
  id: string;
  object: "vercel_project";
  name: string;
}

export interface VercelProjectSummary {
  id: string;
  object: "vercel_project";
  name: string;
}

export type VersionSummaryList = {
  object: "list";
  data: VersionSummary[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    nextUrl?: string;
  };
};

export interface EnvironmentVariableDetailSchema {
  id: string;
  object: "environment_variable";
  key: string;
  value: string;
  decrypted: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface EnvironmentVariableSummarySchema {
  id: string;
  object: "environment_variable";
  key: string;
  value: string;
  decrypted: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface EnvironmentVariablesListSchema {
  object: "list";
  data: {
    id: string;
    object: "environment_variable";
    key: string;
    value: string;
    decrypted: boolean;
    createdAt: number;
    updatedAt?: number;
  }[];
}

export type HookDetail = {
  id: string;
  object: "hook";
  name: string;
  events: Array<
    "chat.created" | "chat.updated" | "chat.deleted" | "message.created" | "message.updated" | "message.deleted"
  >;
  chatId?: string;
  url: string;
};

export type HookEventDetail = {
  id: string;
  object: "hook_event";
  event: "chat.created" | "chat.updated" | "chat.deleted" | "message.created" | "message.updated" | "message.deleted";
  status?: "pending" | "success" | "error";
  createdAt: string;
};

export interface HookSummary {
  id: string;
  object: "hook";
  name: string;
}

export interface IntegrationConnectionDetailSchema {
  object: "integration_connection";
  id: string;
  connected: boolean;
  integration: {
    id: string;
    object: "integration";
    slug: string;
    name: string;
  };
  metadata?: Record<string, unknown>;
}

export interface IntegrationConnectionListSchema {
  object: "list";
  data: {
    object: "integration_connection";
    id: string;
    connected: boolean;
    integration: {
      id: string;
      object: "integration";
      slug: string;
      name: string;
    };
  }[];
}

export interface IntegrationConnectionSummarySchema {
  object: "integration_connection";
  id: string;
  connected: boolean;
  integration: {
    id: string;
    object: "integration";
    slug: string;
    name: string;
  };
}

export interface IntegrationDetailSchema {
  id: string;
  object: "integration";
  slug: string;
  name: string;
  description: string;
  iconUrl: string;
}

export interface IntegrationListSchema {
  object: "list";
  data: {
    id: string;
    object: "integration";
    slug: string;
    name: string;
    description: string;
    iconUrl: string;
  }[];
}

export interface IntegrationSummarySchema {
  id: string;
  object: "integration";
  slug: string;
  name: string;
}

export interface RateLimitsFindResponse {
  remaining?: number;
  reset?: number;
  limit: number;
}

export type UserGetResponse = UserDetail;

export type UserGetBillingResponse =
  | {
      billingType: "token";
      data: {
        plan: string;
        billingMode?: "test";
        role: string;
        billingCycle: {
          start: number;
          end: number;
        };
        balance: {
          remaining: number;
          total: number;
        };
        onDemand: {
          balance: number;
          blocks?: {
            expirationDate?: number;
            effectiveDate: number;
            originalBalance: number;
            currentBalance: number;
          }[];
        };
      };
    }
  | {
      billingType: "legacy";
      data: {
        remaining?: number;
        reset?: number;
        limit: number;
      };
    };

export interface UserGetPlanResponse {
  object: "plan";
  plan: string;
  billingCycle: {
    start: number;
    end: number;
  };
  balance: {
    remaining: number;
    total: number;
  };
}

export interface UserGetScopesResponse {
  object: "list";
  data: ScopeSummary[];
}

export interface V0ClientConfig {
  apiKey?: string;
  baseUrl?: string;
}
