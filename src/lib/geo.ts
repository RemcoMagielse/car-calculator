export interface Place {
  label: string
  lat: number
  lon: number
  /** PDOK result type: 'adres' is a full address; 'weg', 'woonplaats', etc. are less precise */
  type?: string
}

export async function geocode(query: string): Promise<Place> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', 'accept-language': 'nl' }).toString()
  const res = await fetch(url)
  if (!res.ok) throw new Error('Address lookup failed')
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[]
  if (!data.length) throw new Error(`Address not found: "${query}"`)
  return { label: data[0].display_name, lat: Number(data[0].lat), lon: Number(data[0].lon) }
}

// two free OSRM servers; the demo one sometimes stalls for seconds, so ask both and take the fastest
const ROUTERS = [
  'https://router.project-osrm.org/route/v1/driving',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving',
]

/** Driving distance (km) and duration (min) between two places. */
export async function route(from: Place, to: Place) {
  const ctrl = new AbortController()
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`
  const attempt = async (base: string) => {
    const res = await fetch(`${base}/${coords}?overview=false`, { signal: ctrl.signal })
    if (!res.ok) throw new Error('Route lookup failed')
    const data = (await res.json()) as { code: string; routes: { distance: number; duration: number }[] }
    if (data.code !== 'Ok' || !data.routes.length) throw new Error('No route found')
    return { km: data.routes[0].distance / 1000, minutes: data.routes[0].duration / 60 }
  }
  try {
    return await Promise.any(ROUTERS.map(attempt))
  } catch {
    throw new Error('No route found')
  } finally {
    ctrl.abort()
  }
}

/** Search-as-you-type for Dutch addresses and places (PDOK Locatieserver, no key needed). */
export async function suggest(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, rows: '6', fl: 'id,weergavenaam,type,centroide_ll' })
  const res = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?${params}`, { signal })
  if (!res.ok) throw new Error('Address suggestions failed')
  const data = (await res.json()) as { response: { docs: { weergavenaam: string; type: string; centroide_ll: string }[] } }
  return data.response.docs.flatMap((d) => {
    const m = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(d.centroide_ll)
    return m ? [{ label: d.weergavenaam, lat: Number(m[2]), lon: Number(m[1]), type: d.type }] : []
  })
}
