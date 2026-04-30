declare module "mjml" {
  export type MjmlError = {
    line?: number;
    message: string;
    tagName?: string;
    formattedMessage?: string;
  };

  export type MjmlOptions = {
    validationLevel?: "strict" | "soft" | "skip";
    keepComments?: boolean;
  };

  export type MjmlResult = {
    html: string;
    errors: MjmlError[];
  };

  export default function mjml2html(input: string, options?: MjmlOptions): Promise<MjmlResult>;
}
