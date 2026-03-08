import express from 'express'
import { calculateRoute, getAllRoutes, getRouteComparison, proxyOSRM, getGoogleMapsRoute } from '../controllers/routingController.js'

const router = express.Router()

// POST /api/routing/calculate - Calcula una sola ruta
router.post('/calculate', calculateRoute)

// POST /api/routing/all-routes - Calcula las 3 rutas con riesgo real
router.post('/all-routes', getAllRoutes)

// POST /api/routing/compare - Alias de all-routes (compatibilidad)
router.post('/compare', getRouteComparison)

// POST /api/routing/gmaps - Ruta de Google Maps (requiere GOOGLE_MAPS_API_KEY en .env)
router.post('/gmaps', getGoogleMapsRoute)

// GET /api/routing/osrm/* - Proxy hacia router.project-osrm.org
router.get('/osrm/*', proxyOSRM)

export default router
