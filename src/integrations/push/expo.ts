const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
  interruptionLevel?: "passive" | "active" | "timeSensitive" | "critical";
};

type ExpoTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

export async function sendExpoPushNotification(
  pushToken: string,
  payload: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  if (!pushToken.startsWith("ExponentPushToken[")) {
    console.warn("[push] token ignorado (não é Expo)", pushToken.slice(0, 24));
    return;
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: "default",
    priority: "high",
    channelId: "violations",
    interruptionLevel: "timeSensitive",
  };

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
  };

  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(message),
  });

  const body = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(
      `Falha ao enviar push Expo (${response.status})${body ? `: ${body}` : ""}`,
    );
  }

  let parsed: { data?: ExpoTicket | ExpoTicket[] } = {};
  try {
    parsed = JSON.parse(body) as { data?: ExpoTicket | ExpoTicket[] };
  } catch {
    return;
  }

  const tickets = Array.isArray(parsed.data)
    ? parsed.data
    : parsed.data
      ? [parsed.data]
      : [];

  const failed = tickets.filter((ticket) => ticket.status === "error");
  if (failed.length > 0) {
    const detail = failed
      .map((ticket) => ticket.details?.error ?? ticket.message ?? "error")
      .join("; ");
    throw new Error(`Expo push ticket error: ${detail}`);
  }
}
