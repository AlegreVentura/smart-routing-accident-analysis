/**
 * Routing controller.
 *
 * Capas de riesgo:
 *   1. CSV espacial  (riskService)  — datos históricos reales, 26,783 puntos
 *   2. ML en tiempo real (ml_service.py) — modelo Random Forest pkl, usa la
 *      hora actual para predicciones condicionadas al momento del día
 *
 * Si ml_service.py no está corriendo, la capa ML se omite silenciosamente
 * y se usa solo el riesgo del CSV.
 */

import { getRiskForRoute } from '../services/riskService.js'

const OSRM_API   = 'https://router.project-osrm.org/route/v1/driving'
const ML_SERVICE = 'http://localhost:5001'

// ── Helpers ──────────────────────────────────────────────────────────────────

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const perpWaypoint = (origin, destination, offsetKm, side = 1) => {
  const dLat = destination.lat - origin.lat
  const dLng = destination.lng - origin.lng
  const len  = Math.sqrt(dLat ** 2 + dLng ** 2) || 1
  const offsetDeg = offsetKm / 111

  return {
    lat: (origin.lat + destination.lat) / 2 + (-dLng / len) * offsetDeg * side,
    lng: (origin.lng + destination.lng) / 2 + ( dLat / len) * offsetDeg * side,
  }
}

const fetchHERETime = async (points) => {
  const key = process.env.HERE_API_KEY
  if (!key) return null
  try {
    const origin      = points[0]
    const destination = points[points.length - 1]
    const via         = points.slice(1, -1)
    const viaStr      = via.map(p => `&via=${p.lat},${p.lng}`).join('')
    const url = `https://router.hereapi.com/v8/routes?transportMode=car&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}${viaStr}&return=summary&apiKey=${key}`
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) })
    const data = await response.json()
    // Suma de duraciones de todas las secciones (una por tramo entre waypoints)
    const sections = data.routes?.[0]?.sections
    if (!sections?.length) return null
    const totalSec = sections.reduce((acc, s) => acc + (s.summary?.duration ?? 0), 0)
    return totalSec ? Math.round(totalSec / 60) : null
  } catch {
    return null
  }
}

/** Llama a OSRM y devuelve { coordinates:[lat,lng][], distance, duration } */
const fetchOSRM = async (points) => {
  const coordStr = points.map(p => `${p.lng},${p.lat}`).join(';')
  const url = `${OSRM_API}/${coordStr}?overview=full&geometries=geojson`

  const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
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

/**
 * Llama al microservicio Python para obtener las 3 rutas Dijkstra ponderadas por riesgo.
 * Devuelve el array de rutas [{type, name, color, coordinates, distance}] o null si el
 * servicio no está disponible o el grafo no ha sido generado aún.
 */
const fetchPythonRoutes = async (origin, destination) => {
  try {
    const response = await fetch(`${ML_SERVICE}/route`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ origin, destination }),
      signal:  AbortSignal.timeout(12000),
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.routes?.length > 0 ? data.routes : null
  } catch {
    return null
  }
}

/**
 * Consulta el microservicio Python para obtener riesgo ML en tiempo real.
 * Muestrea `maxPoints` puntos de la ruta y envía la hora actual.
 * Devuelve { avg_risk_ml, max_risk_ml } o null si el servicio no está disponible.
 */
const fetchMLRisk = async (coordinates, context = {}, maxPoints = 10) => {
  try {
    const step = Math.max(1, Math.floor(coordinates.length / maxPoints))
    const points = coordinates
      .filter((_, i) => i % step === 0)
      .map(([lat, lng]) => ({ lat, lng }))

    const hora     = context.hora     ?? new Date().getHours()
    const vehiculo = context.vehiculo ?? 'automovil'

    const response = await fetch(`${ML_SERVICE}/predict-route`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ hora, vehiculo, points }),
      signal:  AbortSignal.timeout(3000),
    })

    if (!response.ok) return null
    return await response.json()
  } catch {
    // ml_service.py no está corriendo — silencioso, seguimos con CSV solo
    return null
  }
}

/**
 * Combina riesgo del CSV y riesgo ML:
 *   - Si ambos disponibles: 0.65 × csv + 0.35 × ml
 *   - Si solo CSV:          csv
 *   - Si ninguno:           fallback por tipo de ruta
 *
 * El CSV ya incorpora histórico + clustering + ML estático.
 * El ML en tiempo real añade el efecto de la hora del día actual.
 */
const blendRisk = (csvRisk, mlRisk, type) => {
  const fallbacks = { short: 42.3, balanced: 35.8, safe: 28.5 }

  if (csvRisk !== null && mlRisk !== null) {
    return {
      avg: csvRisk.avg * 0.65 + mlRisk.avg_risk_ml * 0.35,
      max: Math.max(csvRisk.max, mlRisk.max_risk_ml),
      source: 'csv+ml',
    }
  }
  if (csvRisk !== null) {
    return { avg: csvRisk.avg, max: csvRisk.max, source: 'csv' }
  }
  if (mlRisk !== null) {
    return { avg: mlRisk.avg_risk_ml, max: mlRisk.max_risk_ml, source: 'ml' }
  }
  const base = fallbacks[type]
  return { avg: base, max: base + 12, source: 'fallback' }
}

/** Construye el objeto de ruta completo */
const buildRoute = async (type, name, color, points, recommended = false, context = {}) => {
  const osrm = await fetchOSRM(points)

  const [csvRisk, mlRisk, hereMinutes] = await Promise.all([
    Promise.resolve(getRiskForRoute(osrm.coordinates)),
    fetchMLRisk(osrm.coordinates, context),
    fetchHERETime(points),
  ])

  const risk     = blendRisk(csvRisk, mlRisk, type)
  const safety   = Math.max(0, 100 - risk.avg)
  const duration = hereMinutes ?? osrm.duration

  return {
    type,
    name,
    color,
    coordinates: osrm.coordinates,
    distance:    osrm.distance,
    duration,
    risk:        risk.avg.toFixed(1),
    safety:      safety.toFixed(1),
    maxRisk:     risk.max.toFixed(1),
    segments:    osrm.coordinates.length,
    recommended,
    dataSource:  risk.source,
  }
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * POST /api/routing/calculate
 * Body: { origin:{lat,lng}, destination:{lat,lng}, routeType:'short'|'balanced'|'safe' }
 */
export const calculateRoute = async (req, res) => {
  try {
    const { origin, destination, routeType = 'safe' } = req.body

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return res.status(400).json({
        error: 'Se requieren origin y destination con propiedades lat y lng'
      })
    }

    const dist     = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng)
    const offsetKm = Math.max(0.5, dist * 0.15)

    const pointsByType = {
      short:    [origin, destination],
      balanced: [origin, perpWaypoint(origin, destination, offsetKm, +1), destination],
      safe:     [origin, perpWaypoint(origin, destination, offsetKm, -1), destination],
    }
    const labels = {
      short:    { name: 'Más Corta',  color: '#3b82f6' },
      balanced: { name: 'Balanceada', color: '#f59e0b' },
      safe:     { name: 'Más Segura', color: '#10b981' },
    }

    const { name, color } = labels[routeType] || labels.safe
    const route = await buildRoute(
      routeType, name, color,
      pointsByType[routeType] || pointsByType.safe,
      routeType === 'safe'
    )

    res.status(200).json({
      origin, destination, route,
      metadata: {
        algorithm:   'OSRM + CSV + ML Random Forest',
        riskSources: { csv: '26,783 puntos reales', ml: 'modelo pkl tiempo real' },
        calculatedAt: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Error en calculateRoute:', error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * POST /api/routing/all-routes
 * Body: { origin:{lat,lng}, destination:{lat,lng} }
 * Devuelve las 3 rutas en paralelo.
 */
export const getAllRoutes = async (req, res) => {
  try {
    const { origin, destination, context = {} } = req.body

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return res.status(400).json({
        error: 'Se requieren origin y destination con propiedades lat y lng'
      })
    }

    // Fuente primaria: Dijkstra ponderado por riesgo vial (Python/NetworkX)
    const [pythonRoutes, hereTime] = await Promise.all([
      fetchPythonRoutes(origin, destination),
      fetchHERETime([origin, destination]),
    ])

    if (pythonRoutes) {
      const baseDistance = parseFloat(pythonRoutes[0]?.distance || '8')

      const routes = await Promise.all(pythonRoutes.map(async (pr) => {
        const [csvRisk, mlRisk] = await Promise.all([
          Promise.resolve(getRiskForRoute(pr.coordinates)),
          fetchMLRisk(pr.coordinates, context),
        ])
        const risk   = blendRisk(csvRisk, mlRisk, pr.type)
        const safety = Math.max(0, 100 - risk.avg)
        const routeDist = parseFloat(pr.distance)
        const duration = hereTime
          ? Math.round(hereTime * routeDist / baseDistance)
          : Math.round(routeDist / 0.5)  // ~30 km/h si HERE no disponible

        return {
          type:        pr.type,
          name:        pr.name,
          color:       pr.color,
          coordinates: pr.coordinates,
          distance:    pr.distance,
          duration,
          risk:        risk.avg.toFixed(1),
          safety:      safety.toFixed(1),
          maxRisk:     risk.max.toFixed(1),
          segments:    pr.coordinates.length,
          recommended: pr.type === 'safe',
          dataSource:  risk.source,
        }
      }))

      const mlActive = routes.some(r => r.dataSource?.includes('ml'))
      return res.status(200).json({
        origin, destination, routes,
        metadata: {
          algorithm:   'Dijkstra ponderado por riesgo vial (NetworkX)',
          mlService:   mlActive ? 'activo' : 'inactivo (solo CSV)',
          riskFormula: mlActive
            ? '0.65×riesgo_csv + 0.35×riesgo_ml_live'
            : 'riesgo_csv (histórico + clustering + ML estático)',
          calculatedAt: new Date().toISOString(),
        }
      })
    }

    // El servicio Dijkstra no está disponible
    console.error('[getAllRoutes] ml_service.py no disponible o grafo no generado')
    res.status(503).json({
      error: 'El servicio de ruteo no está disponible. Asegúrate de que ml_service.py esté corriendo y de haber ejecutado el notebook 03 para generar el grafo vial.',
    })
  } catch (error) {
    console.error('Error en getAllRoutes:', error.message)
    res.status(500).json({ error: error.message })
  }
}

/** POST /api/routing/compare — alias de all-routes */
export const getRouteComparison = getAllRoutes

/**
 * Decodifica un polyline codificado de Google Maps a array de [lat, lng].
 */
const decodePolyline = (encoded) => {
  const points = []
  let index = 0, lat = 0, lng = 0
  while (index < encoded.length) {
    let shift = 0, result = 0, b
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

/**
 * POST /api/routing/gmaps
 * Body: { origin:{lat,lng}, destination:{lat,lng} }
 * Devuelve la ruta de Google Maps con coordenadas decodificadas.
 * Requiere GOOGLE_MAPS_API_KEY en .env.
 */
export const getGoogleMapsRoute = async (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    return res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY no configurada' })
  }

  const { origin, destination } = req.body
  if (!origin?.lat || !destination?.lat) {
    return res.status(400).json({ error: 'Se requieren origin y destination con lat y lng' })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=driving&departure_time=now&key=${key}`
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) })
    const data = await response.json()

    if (data.status !== 'OK' || !data.routes?.length) {
      return res.status(502).json({ error: `Google Maps: ${data.status}` })
    }

    const leg = data.routes[0].legs[0]
    const coordinates = decodePolyline(data.routes[0].overview_polyline.points)
    const durationSec = leg.duration_in_traffic?.value ?? leg.duration.value

    res.json({
      coordinates,
      distance: (leg.distance.value / 1000).toFixed(2),
      duration: Math.round(durationSec / 60),
    })
  } catch (error) {
    res.status(502).json({ error: `Google Maps error: ${error.message}` })
  }
}

/**
 * GET /api/routing/osrm/:coords
 * Proxy transparente hacia router.project-osrm.org.
 * El frontend usa este endpoint en lugar de llamar directamente a la API pública,
 * lo que permite controlar rate-limiting y evitar exponer la URL externa.
 */
export const proxyOSRM = async (req, res) => {
  try {
    const coords = req.params[0]  // captura el wildcard completo
    const url = `${OSRM_API}/${coords}?overview=full&geometries=geojson`

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await response.json()

    res.status(response.ok ? 200 : 502).json(data)
  } catch (error) {
    res.status(502).json({ error: `OSRM proxy error: ${error.message}` })
  }
}
