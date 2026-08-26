import { create } from 'zustand';

interface ThemeStore {
  isDayMode: boolean;
  toggleDayMode: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDayMode: false,
  toggleDayMode: () => set((state) => ({ isDayMode: !state.isDayMode })),
}));