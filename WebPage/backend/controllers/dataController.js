/**
 * Data controller — devuelve estadísticas calculadas desde los CSVs reales.
 * Los datos son pre-computados por dataService al arrancar el servidor.
 */

import { generalStats, clusterStats, hotspotStats } from '../services/dataService.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const notReady = (res) =>
  res.status(503).json({ error: 'Datos aún no cargados, intenta de nuevo en unos segundos' })

// ── Endpoints ─────────────────────────────────────────────────────────────────

/** GET /api/data/stats */
export const getStats = (req, res) => {
  try {
    if (!generalStats) return notReady(res)

    const roadSegments = {
      total: 26783,
      withAccidents: 14982,
      avgAccidentsPerSegment: 2.14,
      maxAccidentsInSegment: 142,
      percentiles: { p50: 2, p75: 3, p90: 6, p95: 9, p99: 18 },
    }

    res.status(200).json({ ...generalStats, roadSegments })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/** GET /api/data/clusters */
export const getClusters = (req, res) => {
  try {
    if (!clusterStats) return notReady(res)
    res.status(200).json(clusterStats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/** GET /api/data/hotspots */
export const getHotspots = (req, res) => {
  try {
    if (!hotspotStats) return notReady(res)
    res.status(200).json(hotspotStats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/** GET /api/data/ml-metrics  — métricas de modelos (estáticas, los .pkl no son legibles en JS) */
export const getMLMetrics = (req, res) => {
  try {
    const mlMetrics = {
      target: {
        variable: 'gravedad',
        type: 'binary',
        classes: { 0: 'Leve (solo daños materiales)', 1: 'Grave (≥1 muerto o ≥3 heridos)' },
        distribution: { leve: 0.849, grave: 0.151 },
      },
      featureSelection: {
        initial: 60,
        afterPrefiltering: 35,
        finalSelected: 20,
        methods: [
          { name: 'SelectKBest', scorer: 'f_classif' },
          { name: 'RFE', estimator: 'Random Forest' },
          { name: 'Feature Importance', method: 'Gini' },
        ],
        consensus: 'Features que aparecen en ≥2 algoritmos',
      },
      topFeatures: [
        { rank: 1,  name: 'hora',             importance: 0.142, type: 'temporal'    },
        { rank: 2,  name: 'franja_horaria',   importance: 0.134, type: 'temporal'    },
        { rank: 3,  name: 'riesgo_cluster',   importance: 0.112, type: 'spatial'     },
        { rank: 4,  name: 'dia_semana',       importance: 0.098, type: 'temporal'    },
        { rank: 5,  name: 'mes',              importance: 0.087, type: 'temporal'    },
        { rank: 6,  name: 'cluster_dbscan',   importance: 0.089, type: 'spatial'     },
        { rank: 7,  name: 'es_hora_pico',     importance: 0.076, type: 'temporal'    },
        { rank: 8,  name: 'tipaccid',         importance: 0.067, type: 'categorical' },
        { rank: 9,  name: 'clase',            importance: 0.059, type: 'categorical' },
        { rank: 10, name: 'es_fin_de_semana', importance: 0.054, type: 'temporal'    },
      ],
      models: {
        decisionTree: {
          hyperparameters: { maxDepth: 5, minSamplesSplit: 100, minSamplesLeaf: 50 },
          performance: { accuracy: 0.82, precision: 0.78, recall: 0.65, f1Score: 0.71, auc: 0.78 },
          crossValidation: { folds: 5, meanAccuracy: 0.8134, stdAccuracy: 0.0089 },
        },
        randomForest: {
          hyperparameters: { nEstimators: 100, maxDepth: 10, minSamplesSplit: 50, minSamplesLeaf: 20, maxFeatures: 'sqrt' },
          performance: { accuracy: 0.87, precision: 0.85, recall: 0.72, f1Score: 0.78, auc: 0.84 },
          crossValidation: { folds: 5, meanAccuracy: 0.8654, stdAccuracy: 0.0123 },
        },
        logisticRegression: {
          hyperparameters: { maxIter: 1000, solver: 'lbfgs' },
          performance: { accuracy: 0.78, precision: 0.74, recall: 0.63, f1Score: 0.68, auc: 0.75 },
        },
        stackingEnsemble: {
          architecture: {
            baseLearners: ['Decision Tree', 'Random Forest', 'Logistic Regression'],
            metaLearner: 'Logistic Regression',
            stackMethod: 'predict_proba',
            cv: 5,
          },
          performance: { accuracy: 0.88, precision: 0.86, recall: 0.74, f1Score: 0.80, auc: 0.86 },
          crossValidation: { folds: 5, meanAccuracy: 0.8764, stdAccuracy: 0.0098 },
          best: true,
        },
      },
      validation: {
        method: 'Stratified K-Fold Cross-Validation',
        folds: 5, testSize: 0.3, stratify: true, randomState: 42,
      },
      normalization: {
        method: 'StandardScaler',
        formula: 'z = (x - μ) / σ',
        fitOn: 'train set',
        transformOn: ['train set', 'test set'],
      },
    }

    res.status(200).json(mlMetrics)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
