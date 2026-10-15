import { createContext, useContext, type ReactNode } from 'react'
import type { Place } from '@/lib/geo'
import { useStoredState } from '@/lib/storage'

export interface Settings {
  home: Place | null
  evName: string
  efficiency: string // km/kWh
  batteryKwh: string // usable capacity
  chargerKw: string
  bufferPct: string
  petrolName: string
  kmPerL: string
  petrolPrice: string // €/L
  kwhPrice: string // €/kWh
  markup: string // €/kWh added to market prices
  yearlyKm: string
}

export const DEFAULT_SETTINGS: Settings = {
  home: null,
  evName: 'Electric car',
  efficiency: '6',
  batteryKwh: '50',
  chargerKw: '11',
  bufferPct: '10',
  petrolName: 'Petrol car',
  kmPerL: '15',
  petrolPrice: '2.00',
  kwhPrice: '0.40',
  markup: '0',
  yearlyKm: '12000',
}

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useStoredState<Settings>('settings', DEFAULT_SETTINGS)
  const settings = { ...DEFAULT_SETTINGS, ...stored }
  const update = (patch: Partial<Settings>) => setStored((s) => ({ ...DEFAULT_SETTINGS, ...s, ...patch }))
  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
