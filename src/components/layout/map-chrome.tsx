"use client";

import { createContext, useContext } from "react";

const MapChromeContext = createContext<(() => void) | null>(null);

export function MapChromeProvider({
  openMenu,
  children,
}: {
  openMenu: () => void;
  children: React.ReactNode;
}) {
  return (
    <MapChromeContext.Provider value={openMenu}>
      {children}
    </MapChromeContext.Provider>
  );
}

export function useOpenMapMenu() {
  const openMenu = useContext(MapChromeContext);
  if (!openMenu) {
    throw new Error("Menu do mapa indisponível");
  }
  return openMenu;
}
