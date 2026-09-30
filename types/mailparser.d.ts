declare module "mailparser" {
  export function simpleParser(source: unknown): Promise<{
    subject?: string;
    from?: { text?: string };
    date?: Date;
    text?: string;
    html?: string;
  }>;
}
