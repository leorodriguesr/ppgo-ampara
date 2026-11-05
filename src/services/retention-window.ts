import { retentionConfig } from "@/config/retention";

export function victimLocationCutoff(now: Date, hours = retentionConfig.victimLocationHours) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}
