/**
 * Carga y cachea estadísticas reales derivadas de los CSVs de análisis CDMX.
 *
 * Archivos leídos al inicio:
 *   - ACCIDENTES_COMBINADO_CDMX_2019_2023.csv  (78,366 accidentes 2019-2023)
 *   - ACCIDENTES_CON_CLUSTERING.csv            (32,139 filas, asignación DBSCAN)
 *   - GRID_HOTSPOTS.csv                        (755 celdas, análisis Getis-Ord Gi*)
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '../../../ProyectoMineria/Datos combinados CDMX')

// ── Resultado exportado ───────────────────────────────────────────────────────
export let generalStats   = null
export let clusterStats   = null
export let hotspotStats   = null

// ── Helper: leer CSV línea a línea ───────────────────────────────────────────
const readLines = (filename) =>
  readFileSync(join(DATA_DIR, filename), 'utf-8').trim().split('\n')

// ── 1. Estadísticas generales de accidentes ───────────────────────────────────
const computeGeneralStats = () => {
  const lines = readLines('ACCIDENTES_COMBINADO_CDMX_2019_2023.csv')
  // Encabezado: id(0),edo(1),mes(2),anio(3),mpio(4),hora(5),minutos(6),
  //             dia(7),diasemana(8),...,severidad_cat(NF-2),franja_horaria(NF-1)

  const gravity   = {}   // { leve: N, moderada: N, ... }
  const hourCount = {}   // { 0: N, 1: N, ..., 23: N }
  const dayCount  = {}   // { 1: N, ..., 7: N }
  const yearCount = {}

  let total = 0

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    const len   = parts.length

    if (len < 10) continue   // fila vacía o malformada

    const hora         = parseInt(parts[5])
    const diasemana    = parseInt(parts[8])
    const anio         = parseInt(parts[3])
    const severidad    = parts[len - 2]?.trim()   // severidad_cat (penúltima)

    if (!isNaN(hora))      hourCount[hora]      = (hourCount[hora]      || 0) + 1
    if (!isNaN(diasemana)) dayCount[diasemana]  = (dayCount[diasemana]  || 0) + 1
    if (!isNaN(anio))      yearCount[anio]      = (yearCount[anio]      || 0) + 1
    if (severidad)         gravity[severidad]   = (gravity[severidad]   || 0) + 1
    total++
  }

  // Distribución de gravedad con colores
  const gravityColors = {
    leve:      '#10b981',
    moderada:  '#f59e0b',
    grave:     '#ef4444',
    'muy grave': '#991b1b',
  }
  const gravityDistribution = Object.entries(gravity).map(([level, count]) => ({
    level,
    count,
    percentage: parseFloat(((count / total) * 100).toFixed(1)),
    color: gravityColors[level] || '#9ca3af',
  }))

  // Horas pico (top 5 por accidentes)
  const peakHours = Object.entries(hourCount)
    .map(([hour, accidents]) => ({ hour: parseInt(hour), accidents }))
    .sort((a, b) => b.accidents - a.accidents)
    .slice(0, 5)
    .sort((a, b) => a.hour - b.hour)

  // Distribución por día (1=Lunes ... 7=Domingo)
  const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const weekdayDistribution = [1, 2, 3, 4, 5, 6, 7]
    .filter(d => dayCount[d])
    .map(d => ({ day: dayNames[d], accidents: dayCount[d] }))

  // Distribución por año
  const yearDistribution = Object.entries(yearCount)
    .map(([year, count]) => ({ year: parseInt(year), accidents: count }))
    .sort((a, b) => a.year - b.year)

  generalStats = {
    dataset: {
      totalAccidents: total,
      period: `${Math.min(...Object.keys(yearCount).map(Number))}-${Math.max(...Object.keys(yearCount).map(Number))}`,
      years: yearDistribution.map(y => y.year),
      cdmxOnly: true,
    },
    gravityDistribution,
    temporalPatterns: {
      peakHours,
      weekdayDistribution,
      yearDistribution,
      hourDistribution: Object.entries(hourCount)
        .map(([h, c]) => ({ hour: parseInt(h), accidents: c }))
        .sort((a, b) => a.hour - b.hour),
    },
    coordinates: {
      bbox: { latMin: 19.0, latMax: 19.6, lonMin: -99.4, lonMax: -98.9 },
      crs: 'EPSG:4326 (WGS84)',
    },
  }

  console.log(`✅ [dataService] Stats generales: ${total} accidentes procesados`)
}

// ── 2. Estadísticas de clustering DBSCAN ─────────────────────────────────────
const computeClusterStats = () => {
  // Columnas: id(0), latitud(1), longitud(2), cluster_dbscan(3), riesgo_cluster(4)
  const lines = readLines('ACCIDENTES_CON_CLUSTERING.csv')

  const clusterMap = {}   // { clusterId: { size, sumLat, sumLng, sumRisk } }
  let noisePoints = 0
  let total = 0

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    if (parts.length < 5) continue

    const clusterId = parseInt(parts[3])
    const lat       = parseFloat(parts[1])
    const lng       = parseFloat(parts[2])
    const risk      = parseFloat(parts[4])
    total++

    if (clusterId === -1) {
      noisePoints++
      continue
    }

    if (!clusterMap[clusterId]) {
      clusterMap[clusterId] = { size: 0, sumLat: 0, sumLng: 0, sumRisk: 0 }
    }
    clusterMap[clusterId].size++
    clusterMap[clusterId].sumLat  += lat
    clusterMap[clusterId].sumLng  += lng
    clusterMap[clusterId].sumRisk += risk
  }

  const clusters = Object.entries(clusterMap).map(([id, d]) => ({
    id:      parseInt(id),
    size:    d.size,
    centLat: parseFloat((d.sumLat  / d.size).toFixed(5)),
    centLng: parseFloat((d.sumLng  / d.size).toFixed(5)),
    avgRisk: parseFloat((d.sumRisk / d.size).toFixed(1)),
  }))

  const totalClusters    = clusters.length
  const pointsInClusters = total - noisePoints
  const sizes            = clusters.map(c => c.size)
  const minSize          = Math.min(...sizes)
  const maxSize          = Math.max(...sizes)
  const avgSize          = parseFloat((pointsInClusters / totalClusters).toFixed(1))

  // Top 5 clusters por tamaño
  const topClusters = clusters
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map(c => ({
      id:      c.id,
      size:    c.size,
      avgRisk: c.avgRisk,
      centLat: c.centLat,
      centLng: c.centLng,
    }))

  clusterStats = {
    algorithm: 'DBSCAN',
    parameters: { eps: 200, minSamples: 20, metric: 'euclidean', crs: 'EPSG:32614 (UTM Zone 14N)' },
    results: {
      totalClusters,
      pointsInClusters,
      percentageInClusters: parseFloat(((pointsInClusters / total) * 100).toFixed(1)),
      noisePoints,
      percentageNoise: parseFloat(((noisePoints / total) * 100).toFixed(1)),
      avgClusterSize: avgSize,
      largestCluster: maxSize,
      smallestCluster: minSize,
    },
    riskCalculation: {
      formula: 'riesgo_cluster = 50 + 50 × (size - min_size) / (max_size - min_size)',
      scale: '0-100',
      interpretation: { 0: 'Ruido (accidente aislado)', 50: 'Cluster pequeño', 100: 'Cluster más grande (punto negro crítico)' },
    },
    topClusters,
  }

  console.log(`✅ [dataService] Clustering: ${totalClusters} clusters, ${noisePoints} ruido`)
}

// ── 3. Estadísticas de hotspots Getis-Ord ────────────────────────────────────
const computeHotspotStats = () => {
  // Columnas: centroid_lat(0), centroid_lon(1), n_accidentes(2), gi_score(3), hot_spot(4), riesgo_hotspot(5)
  const lines = readLines('GRID_HOTSPOTS.csv')

  const classification = {}
  const allSpots = []

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    if (parts.length < 6) continue

    const lat       = parseFloat(parts[0])
    const lng       = parseFloat(parts[1])
    const accidents = parseInt(parts[2])
    const giScore   = parseFloat(parts[3])
    const category  = parts[4]?.trim()

    classification[category] = (classification[category] || 0) + 1
    if (!isNaN(giScore)) allSpots.push({ lat, lng, accidents, giScore, category })
  }

  const totalCells = allSpots.length

  const topHotspots = allSpots
    .filter(s => s.category !== 'No significativo')
    .sort((a, b) => b.giScore - a.giScore)
    .slice(0, 5)
    .map((s, idx) => ({
      id:        idx + 1,
      lat:       parseFloat(s.lat.toFixed(5)),
      lon:       parseFloat(s.lng.toFixed(5)),
      giScore:   parseFloat(s.giScore.toFixed(4)),
      accidents: s.accidents,
      category:  s.category,
    }))

  hotspotStats = {
    method: 'Getis-Ord Gi* (Local Spatial Autocorrelation)',
    gridSetup: {
      cellSize:           0.01,
      cellSizeMeters:     '~1.1 km',
      totalCells,
      cellsWithAccidents: totalCells,
    },
    spatialWeights: { method: 'Distance Band', threshold: 0.02, thresholdMeters: '~2.2 km', binary: true },
    classification: [
      { category: 'Hot Spot (99% confianza)', count: classification['Hot Spot (99%)'] || 0, zScoreThreshold: 2.58, pValue: '<0.01', color: '#991b1b' },
      { category: 'Hot Spot (95% confianza)', count: classification['Hot Spot (95%)'] || 0, zScoreThreshold: 1.96, pValue: '<0.05', color: '#dc2626' },
      { category: 'No significativo',         count: classification['No significativo'] || 0, zScoreRange: '-1.96 to 1.96',          color: '#9ca3af' },
    ],
    moranI: {
      global: { value: 0.6837, pValue: '<0.001', interpretation: 'Clustering espacial altamente significativo', expectedValue: -0.0013, zScore: 27.34 },
    },
    topHotspots,
  }

  console.log(`✅ [dataService] Hotspots: ${totalCells} celdas, ${classification['Hot Spot (99%)'] || 0} hot spots (99%)`)
}

// ── Carga inicial ─────────────────────────────────────────────────────────────
const loadAll = () => {
  try { computeGeneralStats()  } catch (e) { console.error('[dataService] Error en stats generales:', e.message) }
  try { computeClusterStats()  } catch (e) { console.error('[dataService] Error en clustering:',      e.message) }
  try { computeHotspotStats()  } catch (e) { console.error('[dataService] Error en hotspots:',        e.message) }
}

loadAll()
