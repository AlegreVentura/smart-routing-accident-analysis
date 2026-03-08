/**
 * Servicio de riesgo vial usando datos reales del análisis CDMX 2019-2023.
 * Carga SCORING_RIESGO_COMPUESTO.csv al inicio y expone un lookup espacial
 * basado en cuadrícula para obtener el riesgo de cualquier coordenada.
 *
 * Columnas CSV: id, riesgo_cluster, riesgo_ml, indice_riesgo_compuesto, latitud, longitud
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Parámetros del índice espacial ──────────────────────────────────────────
const CELL_SIZE = 0.01        // ~1.1 km por celda
const LOOKUP_RADIUS = 0.005   // ~550 m radio de búsqueda

// ── Estado del módulo ────────────────────────────────────────────────────────
let grid = {}          // Índice cuadrícula: "row_col" -> array de puntos
let pointCount = 0
let loaded = false

// ── Carga del CSV ────────────────────────────────────────────────────────────
const loadRiskData = () => {
  try {
    const csvPath = join(
      __dirname,
      '../../../ProyectoMineria/Datos combinados CDMX/SCORING_RIESGO_COMPUESTO.csv'
    )
    const lines = readFileSync(csvPath, 'utf-8').trim().split('\n')

    // Saltar encabezado
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      const lat  = parseFloat(parts[4])
      const lng  = parseFloat(parts[5])
      const risk = parseFloat(parts[3])   // indice_riesgo_compuesto

      if (isNaN(lat) || isNaN(lng) || isNaN(risk)) continue

      const key = cellKey(lat, lng)
      if (!grid[key]) grid[key] = []
      grid[key].push({ lat, lng, risk })
      pointCount++
    }

    loaded = true
    console.log(`✅ [riskService] ${pointCount} puntos de riesgo cargados`)
  } catch (err) {
    console.error('[riskService] Error cargando CSV de riesgo:', err.message)
  }
}

const cellKey = (lat, lng) =>
  `${Math.floor(lat / CELL_SIZE)}_${Math.floor(lng / CELL_SIZE)}`

// ── Lookup espacial ──────────────────────────────────────────────────────────

/**
 * Devuelve el riesgo promedio dentro de LOOKUP_RADIUS grados de (lat, lng).
 * Si no hay puntos cercanos devuelve null.
 * @param {number} lat
 * @param {number} lng
 * @returns {number|null}
 */
export const getRiskForPoint = (lat, lng) => {
  if (!loaded) return null

  const row = Math.floor(lat / CELL_SIZE)
  const col = Math.floor(lng / CELL_SIZE)

  let sum = 0
  let count = 0

  // Revisar la celda y sus 8 vecinas
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const key = `${row + dr}_${col + dc}`
      const cell = grid[key]
      if (!cell) continue

      for (const p of cell) {
        if (Math.abs(p.lat - lat) <= LOOKUP_RADIUS &&
            Math.abs(p.lng - lng) <= LOOKUP_RADIUS) {
          sum += p.risk
          count++
        }
      }
    }
  }

  return count > 0 ? sum / count : null
}

/**
 * Devuelve { avg, max } de riesgo para un array de [lat, lng].
 * Muestra cada `sampleEvery` puntos para eficiencia.
 * @param {Array<[number, number]>} coordinates  - pares [lat, lng]
 * @param {number} sampleEvery
 * @returns {{ avg: number, max: number }|null}
 */
export const getRiskForRoute = (coordinates, sampleEvery = 5) => {
  if (!loaded || coordinates.length === 0) return null

  const sampled = coordinates.filter((_, i) => i % sampleEvery === 0)
  if (sampled.length === 0) sampled.push(coordinates[0])

  const risks = sampled
    .map(([lat, lng]) => getRiskForPoint(lat, lng))
    .filter(r => r !== null)

  if (risks.length === 0) return null

  const avg = risks.reduce((a, b) => a + b, 0) / risks.length
  const max = Math.max(...risks)
  return { avg, max }
}

export const getStatus = () => ({ loaded, points: pointCount })

// Cargar al importar el módulo
loadRiskData()
