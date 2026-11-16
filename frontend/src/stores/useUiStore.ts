import { create } from 'zustand';

export type ActiveModuleTab =
  | 'orders'
  | 'inventory'
  | 'production'
  | 'revenue_report'
  | 'customer_debts';

interface UiState {
  activeTab: ActiveModuleTab;
  isSidebarCollapsed: boolean;
  setActiveTab: (tab: ActiveModuleTab) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'revenue_report',
  isSidebarCollapsed: false,
  setActiveTab: (activeTab) => set({ activeTab }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}));

