import React, { createContext, useContext } from 'react';
import theme, { Theme } from './tokens';

const ThemeContext = createContext<Theme>(theme);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

export const useTheme = (): Theme => useContext(ThemeContext);
