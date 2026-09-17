import { AppError } from "@/lib/errors";

export class AnkleMonitorApiError extends AppError {
  constructor(message = "Falha na API externa de localização", details?: unknown) {
    super("EXTERNAL_API_ERROR", message, 502, details);
    this.name = "AnkleMonitorApiError";
  }
}

export class AnkleMonitorTimeoutError extends AppError {
  constructor(message = "Timeout na API externa de localização") {
    super("EXTERNAL_API_TIMEOUT", message, 503);
    this.name = "AnkleMonitorTimeoutError";
  }
}
