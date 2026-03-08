/**
 * Servicio de routing.
 *
 * Estrategia:
 *   1. Llama al backend /api/routing/all-routes, que usa OSRM para geometría
 *      real y el CSV de 26,783 puntos para calcular el riesgo compuesto real.
 *   2. Si el backend no está disponible (desarrollo sin servidor), cae a OSRM
 *      directo + riesgo aproximado por hora del día.
 */

// Las llamadas a OSRM van siempre a través del proxy backend para evitar
// exponer la URL pública y poder controlar rate-limiting desde el servidor.
const OSRM_PROXY = '/api/routing/osrm'

// ── Llamada al backend ────────────────────────────────────────────────────────

/**
 * Calcula las 3 rutas llamando al backend con riesgo real del CSV.
 * @param {Object} origin      - { lat, lng, name }
 * @param {Object} destination - { lat, lng, name }
 * @returns {Promise<Array>}   - Array de rutas con riesgo real
 */
export const calculateMultipleRoutes = async (origin, destination, context = {}) => {
  try {
    const response = await fetch('/api/routing/all-routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, context }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) throw new Error(`Backend respondió ${response.status}`)

    const data = await response.json()

    if (!data.routes?.length) throw new Error('El backend no devolvió rutas')

    return data.routes
  } catch (error) {
    console.warn('[routingService] Backend no disponible, usando fallback OSRM:', error.message)
    return calculateRoutesViaOSRM(origin, destination)
  }
}

// ── Fallback: OSRM directo + riesgo aproximado ───────────────────────────────

/**
 * Fallback cuando el backend no está corriendo.
 * Obtiene geometría real de OSRM y aproxima el riesgo por hora del día
 * usando multiplicadores derivados del análisis CDMX 2019-2023.
 */
const calculateRoutesViaOSRM = async (origin, destination) => {
  try {
    const directRoute = await fetchOSRM([origin, destination])

    const midLat = (origin.lat + destination.lat) / 2
    const midLng = (origin.lng + destination.lng) / 2

    let balancedRoute, safeRoute

    try {
      balancedRoute = await fetchOSRM([
        origin,
        { lat: midLat + 0.01, lng: midLng },
        destination,
      ])
    } catch { balancedRoute = directRoute }

    try {
      safeRoute = await fetchOSRM([
        origin,
        { lat: midLat - 0.015, lng: midLng },
        destination,
      ])
    } catch { safeRoute = directRoute }

    const now = new Date()

    return [
      formatRoute('short',    'Más Corta',  '#3b82f6', directRoute,   now, false),
      formatRoute('balanced', 'Balanceada', '#f59e0b', balancedRoute, now, false),
      formatRoute('safe',     'Más Segura', '#10b981', safeRoute,     now, true),
    ]
  } catch (error) {
    console.error('[routingService] Error en fallback OSRM:', error.message)
    return getLinearFallback(origin, destination)
  }
}

const fetchOSRM = async (points) => {
  const coordStr = points.map(p => `${p.lng},${p.lat}`).join(';')
  const url = `${OSRM_PROXY}/${coordStr}`

  const response = await fetch(url)
  const data = await response.json()

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('OSRM no pudo calcular la ruta')
  }

  const route = data.routes[0]
  return {
    coordinates: route.geometry.coordinates.map(c => [c[1], c[0]]),
    distance:    (route.distance / 1000).toFixed(2),
    duration:    Math.round(route.duration / 60),
  }
}

const formatRoute = (type, name, color, osrm, time, recommended) => {
  const risk   = approximateRisk(osrm.distance, type, time)
  const safety = (100 - parseFloat(risk)).toFixed(1)
  return {
    type, name, color,
    coordinates: osrm.coordinates,
    distance:    osrm.distance,
    duration:    osrm.duration,
    risk,
    safety,
    dataSource: 'fallback',
    recommended,
  }
}

// ── Aproximación de riesgo por hora del día (solo fallback) ──────────────────
// Multiplicadores derivados de datos reales CDMX 2019-2023 (proceso.ipynb)

const getTimeMultiplier = (time = new Date()) => {
  const h = time.getHours()
  const d = time.getDay()   // 0=Dom, 6=Sáb

  if (h >= 0 && h <= 5) {
    if (d === 0) return 1.8   // Dom madrugada: mortalidad 3.62%
    if (d === 6) return 1.6   // Sáb madrugada: mortalidad 2.68%
    return 1.5
  }
  if (h >= 7 && h <= 9) return d === 2 ? 1.4 : 1.35  // Rush matutino
  if (h >= 12 && h <= 14) return 1.25
  if (h >= 15 && h <= 17) return 1.2
  if (h === 6 || (h >= 10 && h <= 11)) return 1.1
  if (h >= 18 && h <= 23) return 1.05
  return 1.0
}

const approximateRisk = (distance, type, time = new Date()) => {
  const base = 25 + parseFloat(distance) * 1.5
  const typeMultiplier = { short: 1.6, balanced: 1.3, safe: 1.0 }
  return (base * (typeMultiplier[type] || 1.0) * getTimeMultiplier(time)).toFixed(1)
}

// ── Fallback mínimo: línea recta si OSRM también falla ───────────────────────

const haversineKm = (o, d) => {
  const R = 6371
  const dLat = (d.lat - o.lat) * Math.PI / 180
  const dLng = (d.lng - o.lng) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(o.lat * Math.PI / 180) * Math.cos(d.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const getLinearFallback = (origin, destination) => {
  const dist = haversineKm(origin, destination)
  const now  = new Date()
  const line = [[origin.lat, origin.lng], [destination.lat, destination.lng]]

  return [
    { type: 'short',    name: 'Más Corta',  color: '#3b82f6', coordinates: line, distance: dist.toFixed(2),         duration: Math.round(dist * 3),   risk: approximateRisk(dist,       'short',    now), safety: (100 - parseFloat(approximateRisk(dist,       'short',    now))).toFixed(1), dataSource: 'fallback', recommended: false },
    { type: 'balanced', name: 'Balanceada', color: '#f59e0b', coordinates: line, distance: (dist*1.1).toFixed(2),   duration: Math.round(dist * 3.3), risk: approximateRisk(dist * 1.1, 'balanced', now), safety: (100 - parseFloat(approximateRisk(dist * 1.1, 'balanced', now))).toFixed(1), dataSource: 'fallback', recommended: false },
    { type: 'safe',     name: 'Más Segura', color: '#10b981', coordinates: line, distance: (dist*1.2).toFixed(2),   duration: Math.round(dist * 3.6), risk: approximateRisk(dist * 1.2, 'safe',     now), safety: (100 - parseFloat(approximateRisk(dist * 1.2, 'safe',     now))).toFixed(1), dataSource: 'fallback', recommended: true  },
  ]
}
