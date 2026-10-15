import { useMemo, useState } from 'react'
import { Car, Fuel, RotateCcw, Scale, Zap } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Stat } from '@/components/Field'
import { eur } from '@/lib/prices'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/lib/settings'
import { num } from '@/lib/storage'

export function CostCompare() {
  const { settings } = useSettings()
  // values start from the saved defaults; edits here only apply to this comparison
  const [efficiency, setEfficiency] = useState(settings.efficiency)
  const [kmPerL, setKmPerL] = useState(settings.kmPerL)
  const [petrolPrice, setPetrolPrice] = useState(settings.petrolPrice)
  const [kwhPrice, setKwhPrice] = useState(settings.kwhPrice)
  const [yearlyKm, setYearlyKm] = useState(settings.yearlyKm)
  const isAdjusted =
    efficiency !== settings.efficiency ||
    kmPerL !== settings.kmPerL ||
    petrolPrice !== settings.petrolPrice ||
    kwhPrice !== settings.kwhPrice ||
    yearlyKm !== settings.yearlyKm
  const resetToDefaults = () => {
    setEfficiency(settings.efficiency)
    setKmPerL(settings.kmPerL)
    setPetrolPrice(settings.petrolPrice)
    setKwhPrice(settings.kwhPrice)
    setYearlyKm(settings.yearlyKm)
  }

  const r = useMemo(() => {
    const kmKwh = num(efficiency)
    const kmL = num(kmPerL)
    const pL = num(petrolPrice)
    const pKwh = num(kwhPrice)
    if (!(kmKwh > 0 && kmL > 0 && pL > 0 && pKwh >= 0)) return null
    const evPerKm = pKwh / kmKwh
    const petrolPerKm = pL / kmL
    return {
      kmKwh,
      kmL,
      pL,
      pKwh,
      evPerKm,
      petrolPerKm,
      // price at which both cars cost the same per km
      breakEvenKwh: pL * (kmKwh / kmL),
      breakEvenPetrol: pKwh * (kmL / kmKwh),
    }
  }, [efficiency, kmPerL, petrolPrice, kwhPrice])

  const chart = useMemo(() => {
    if (!r) return []
    const max = Math.max(1, Math.ceil(r.breakEvenKwh * 1.4 * 10) / 10)
    const steps = 20
    return Array.from({ length: steps + 1 }, (_, i) => {
      const p = (max * i) / steps
      return { price: p, ev: (p / r.kmKwh) * 100, petrol: r.petrolPerKm * 100 }
    })
  }, [r])

  const yearly = num(yearlyKm) > 0 ? num(yearlyKm) : 0
  const evCheaper = r ? r.evPerKm < r.petrolPerKm : false

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-5" /> Your cars and prices
          </CardTitle>
          <CardDescription>Starts from your saved defaults. Changes here are not saved.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Field id="kmL" label={settings.petrolName} value={kmPerL} onChange={setKmPerL} suffix="km/L" />
          <Field id="pL" label="Petrol price" value={petrolPrice} onChange={setPetrolPrice} suffix="€/L" />
          <Field id="kmKwh" label={settings.evName} value={efficiency} onChange={setEfficiency} suffix="km/kWh" />
          <Field id="pKwh" label="Electricity price" value={kwhPrice} onChange={setKwhPrice} suffix="€/kWh" />
          <div className="col-span-2">
            <Field id="yearly" label="Kilometres per year (optional)" value={yearlyKm} onChange={setYearlyKm} suffix="km" />
          </div>
          {isAdjusted && (
            <Button variant="outline" className="col-span-2" onClick={resetToDefaults}>
              <RotateCcw /> Reset to defaults
            </Button>
          )}
        </CardContent>
      </Card>

      {r && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {evCheaper ? <Zap className="size-5" /> : <Fuel className="size-5" />}
                {r.evPerKm === r.petrolPerKm ? 'Both cost the same' : `${evCheaper ? settings.evName : settings.petrolName} is cheaper`}
              </CardTitle>
              <CardDescription>
                {Math.abs(1 - Math.min(r.evPerKm, r.petrolPerKm) / Math.max(r.evPerKm, r.petrolPerKm)) * 100 > 0 &&
                  `${(Math.abs(1 - Math.min(r.evPerKm, r.petrolPerKm) / Math.max(r.evPerKm, r.petrolPerKm)) * 100).toFixed(0)}% less per km`}
                {yearly > 0 && ` · saves ${eur(Math.abs(r.evPerKm - r.petrolPerKm) * yearly, 0)} per ${yearly.toLocaleString('nl-NL')} km`}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Stat label={`${settings.evName} per km`} value={eur(r.evPerKm, 3)} sub={`${eur(r.evPerKm * 100)} per 100 km`} />
                <Stat label={`${settings.petrolName} per km`} value={eur(r.petrolPerKm, 3)} sub={`${eur(r.petrolPerKm * 100)} per 100 km`} />
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="mb-1 font-semibold">Crossover point</div>
                <p>
                  With petrol at {eur(r.pL)}/L, electric is cheaper as long as electricity stays below{' '}
                  <strong>{eur(r.breakEvenKwh)}/kWh</strong>.
                </p>
                <p className="mt-1">
                  With electricity at {eur(r.pKwh)}/kWh, petrol only wins if it drops below{' '}
                  <strong>{eur(r.breakEvenPetrol)}/L</strong>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="size-5" /> Cost per 100 km vs electricity price
              </CardTitle>
              <CardDescription>The lines cross at the break-even electricity price.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full" role="img" aria-label="Cost per 100 km for electric and petrol against electricity price">
                <ResponsiveContainer>
                  <LineChart data={chart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="price"
                      type="number"
                      domain={[0, 'dataMax']}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickFormatter={(v: number) => `€${v.toFixed(2)}`}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickFormatter={(v: number) => `€${v.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--popover-foreground)',
                      }}
                      labelFormatter={(v) => `Electricity ${eur(Number(v))}/kWh`}
                      formatter={(v, name) => [`${eur(Number(v))} / 100 km`, name]}
                    />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                    <Line name={settings.evName} dataKey="ev" stroke="var(--series-1)" strokeWidth={2} dot={false} />
                    <Line name={settings.petrolName} dataKey="petrol" stroke="var(--series-2)" strokeWidth={2} dot={false} />
                    <ReferenceDot
                      x={r.breakEvenKwh}
                      y={r.petrolPerKm * 100}
                      r={5}
                      fill="var(--card)"
                      stroke="var(--foreground)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
