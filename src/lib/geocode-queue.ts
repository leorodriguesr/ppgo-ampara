const GAP_MS = 1_100;

let chain: Promise<unknown> = Promise.resolve();

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Uma consulta por vez, com folga, para o geocódigo não atrasar o alerta. */
export function enqueueGeocode<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => wait(GAP_MS),
    () => wait(GAP_MS),
  );
  return run;
}
