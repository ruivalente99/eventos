import { randomBytes } from "crypto";

export function generateLoginToken(): string {
  return randomBytes(32).toString("hex");
}
