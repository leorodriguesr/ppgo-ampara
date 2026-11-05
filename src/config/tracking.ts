/** Deslocamento mínimo para gravar outro ponto do percurso. */
export const trackingConfig = {
  movementMeters: 40,
  /** A partir deste intervalo entre pontos, o relatório explica a parada. */
  stillGapMs: 2 * 60 * 1000,
  /**
   * A saída da área de atenção só é gravada se o ponto anterior ainda for
   * recente. Uma leitura bem depois, já longe, não é o momento da saída.
   */
  exitMaxGapMs: 15 * 60 * 1000,
} as const;
