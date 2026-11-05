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

/** A lista veio válida e o preso desta medida não está nela. Não é falha nem distância segura. */
export class InmateOutOfWindowError extends Error {
  constructor() {
    super("Monitorado fora da janela do Guardião");
    this.name = "InmateOutOfWindowError";
  }
}
