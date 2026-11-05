/**
 * Falha de protocolo ou de conexão. A consulta pode ter rodado na sessão
 * errada do pool (prepared statement sem nome). Não é revogação de acesso.
 */
export function isTransientDatabaseError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const record = error as {
    code?: unknown;
    message?: unknown;
    meta?: { code?: unknown };
  };
  const code = typeof record.code === "string" ? record.code : "";
  const metaCode =
    record.meta && typeof record.meta.code === "string" ? record.meta.code : "";
  const message = typeof record.message === "string" ? record.message : "";

  return (
    code === "08P01" ||
    code === "26000" ||
    code === "42P05" ||
    code === "P2039" ||
    code === "P1001" ||
    code === "P1017" ||
    metaCode === "08P01" ||
    metaCode === "26000" ||
    metaCode === "42P05" ||
    /prepared statement/i.test(message) ||
    /bind message supplies/i.test(message)
  );
}
