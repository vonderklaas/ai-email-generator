export type PreviewMode = "rendered" | "html" | "mjml";

export type CurrentEmail = {
  subject: string;
  preheader: string;
  mjml: string;
  html: string | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: "streaming" | "complete" | "error";
};

export type RateLimitState = {
  generatesToday: number;
  generatesThisHour: number;
  refinesToday: number;
} | null;

export type RateLimitBlock = {
  action: "generate" | "refine" | "compile";
  type: "daily" | "hourly";
  resetAt: string;
  remaining?: RateLimitState;
};

export type AppError = {
  title: string;
  message: string;
  retryable?: boolean;
};

export type AIEmailState = {
  prompt: string;
  companyUrl: string;
  logoUrl: string;
  originalPrompt: string;
  generating: boolean;
  refining: boolean;
  messages: ChatMessage[];
  currentEmail: CurrentEmail | null;
  error: AppError | null;
  rateLimit: RateLimitState;
  rateLimitBlock: RateLimitBlock | null;
  previewMode: PreviewMode;
};

export type GenerateResponse = CurrentEmail & {
  compileError?: string;
  usage?: {
    remaining?: RateLimitState;
  };
};

export type RefineCompleteResponse = GenerateResponse;
