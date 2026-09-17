/** Contrato da API externa de tornozeleira (mock ou live). */
export type LocalizarRequest = {
  idDetento: string;
  latitude: number;
  longitude: number;
  /** true = mock/simulador; false = Guardião (posição real). */
  isSimulation?: boolean;
};

export type LocalizarResponse = {
  distanciaMetros: number;
  latitudePreso: number;
  longitudePreso: number;
  timestamp: string;
};
