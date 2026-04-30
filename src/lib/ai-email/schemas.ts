import { z } from "zod";

export const emailOutputSchema = z.object({
  subject: z.string().min(1).max(120),
  preheader: z.string().min(1).max(200),
  mjml: z.string().min(20),
});

export const generatedEmailSchema = emailOutputSchema.extend({
  html: z.string().min(100),
});

export const generateRequestSchema = z.object({
  prompt: z.string().trim().min(10).max(2000),
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const refineRequestSchema = z.object({
  originalPrompt: z.string().trim().min(10).max(2000),
  currentEmail: z.object({
    subject: z.string().min(1).max(120),
    preheader: z.string().min(1).max(200),
    mjml: z.string().min(20).max(30000),
  }),
  messages: z.array(chatMessageSchema).max(20).default([]),
  newMessage: z.string().trim().min(2).max(1000),
});

export const compileRequestSchema = z.object({
  mjml: z.string().min(20).max(30000),
});

export type EmailOutput = z.infer<typeof emailOutputSchema>;
export type GeneratedEmail = z.infer<typeof generatedEmailSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type RefineRequest = z.infer<typeof refineRequestSchema>;
export type CompileRequest = z.infer<typeof compileRequestSchema>;

export const openAIJsonSchema = {
  name: "email_output",
  strict: true,
  schema: {
    type: "object",
    properties: {
      subject: { type: "string", maxLength: 120 },
      preheader: { type: "string", maxLength: 200 },
      mjml: { type: "string" },
    },
    required: ["subject", "preheader", "mjml"],
    additionalProperties: false,
  },
} as const;
