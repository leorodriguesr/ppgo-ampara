function encodeUserInfo(value: string) {
  return encodeURIComponent(value);
}

/**
 * Desenvolvimento usa DATABASE_URL.
 * Homologação e produção usam BANCO, NOME, USUARIO e SENHA.
 */
export function resolveDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const direct = env.DATABASE_URL?.trim();
  if (direct) return direct;

  const banco = env.BANCO?.trim();
  const nome = env.NOME?.trim();
  const usuario = env.USUARIO?.trim();
  const senha = env.SENHA;
  if (!banco || !nome || !usuario || senha == null || senha === "") {
    return undefined;
  }

  if (banco.startsWith("postgres://") || banco.startsWith("postgresql://")) {
    return banco;
  }

  const host = banco.includes(":") ? banco : `${banco}:5432`;
  return `postgresql://${encodeUserInfo(usuario)}:${encodeUserInfo(senha)}@${host}/${nome}?schema=public&sslmode=disable`;
}
