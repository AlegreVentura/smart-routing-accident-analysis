# Fórmulas y Diseño Técnico

Decisiones metodológicas clave del Sistema de Ruteo Seguro para CDMX.

---

## 1. Índice de Riesgo Compuesto

La métrica central del sistema combina tres fuentes de información:

```
riesgo_compuesto = 0.6 × riesgo_histórico
                 + 0.1 × riesgo_cluster
                 + 0.3 × riesgo_ml
```

| Componente | Peso | Fuente | Justificación |
|------------|------|--------|---------------|
| Riesgo histórico | 60% | Accidentes reales por tramo (2019-2023) | Dato más confiable y directo |
| Riesgo ML | 30% | P(grave \| hora, vehículo, ubicación) × 100 | Agrega contexto situacional |
| Riesgo clustering | 10% | Tamaño del cluster DBSCAN normalizado | Complementa densidad local |

**Rango:** [0, 100] — 0 = mínimo riesgo, 100 = máximo riesgo en CDMX.

---

## 2. Pesos de Aristas para Ruteo (Dijkstra)

Se calculan tres funciones de costo para ofrecer rutas con distintos compromisos:

### Ruta Más Corta
```
peso_distancia = longitud  [metros]
```

### Ruta Balanceada
```
peso_balanceado = longitud × (1 + riesgo / 100)
```

Una calle de 1 km con riesgo=100 "pesa" el doble que una con riesgo=0.

### Ruta Más Segura
```
peso_seguro = longitud × (1 + 2 × riesgo / 100)
```

El factor 2 amplifica la penalización: una calle con riesgo=100 "pesa" el triple.

**Resultados del caso de prueba (Zócalo → Polanco):**

| Ruta | Distancia | Tiempo est. | Riesgo promedio | Reducción riesgo |
|------|-----------|-------------|-----------------|------------------|
| Más corta | 8.5 km | ~20 min | 45/100 | — |
| Balanceada | 9.2 km (+8%) | ~22 min | 32/100 | −29% |
| Más segura | 10.1 km (+19%) | ~24 min | 25/100 | −44% |

---

## 3. Índice de Riesgo por Clustering

Para cada punto del dataset, el riesgo derivado de DBSCAN se calcula así:

```
Si cluster_dbscan == -1 (ruido):
    riesgo_cluster = 0

Si cluster_dbscan ≥ 0:
    riesgo_cluster = 50 + 50 × (tamaño_cluster − min_tamaño)
                              ────────────────────────────────
                              (max_tamaño − min_tamaño)
```

- Cluster mínimo → riesgo = 50
- Cluster más grande de CDMX → riesgo = 100
- Puntos aislados (ruido) → riesgo = 0

---

## 4. Predicción de Gravedad (Modelo ML)

El riesgo ML es la probabilidad que el Stacking Ensemble asigna a que un accidente sea grave, escalada a [0, 100]:

```
riesgo_ml = P(grave | hora, latitud, longitud, tipo_vehículo, ...) × 100
```

**Arquitectura del Stacking:**
- Base: RF tuneado + ExtraTrees + HistGradientBoosting + Logistic Regression
- Meta-learner: HistGradientBoosting con `passthrough=True`, `cv=5`
- Clase desbalanceada (~97% leve / ~3% grave) → SMOTE + `class_weight='balanced'`
- Threshold óptimo buscado via curva precision-recall (en lugar del 0.5 por defecto)

**Métricas finales:**

| Modelo | ROC-AUC | F1 (grave) | F1 macro |
|--------|---------|------------|----------|
| Decision Tree | 0.9855 | 0.47 | 0.72 |
| Logistic Regression | 0.9869 | 0.35 | 0.65 |
| Random Forest | 0.9904 | 0.76 | 0.88 |
| **Stacking Ensemble** | **0.9849** | **0.84** | **0.92** |

---

## 5. Fórmulas de Análisis Espacial

### DBSCAN
Parámetros: `eps = 300 m`, `min_samples = 20` (distancia en UTM Zone 14N).
Resultado: 299 clusters, 46.6% de puntos clasificados como ruido.

### Getis-Ord Gi* (Hot Spots)

```
        Σⱼ wᵢⱼ xⱼ − X̄ · Σⱼ wᵢⱼ
Gᵢ* = ────────────────────────────────────────────
       S · √[ (n·Σwᵢⱼ² − (Σwᵢⱼ)²) / (n−1) ]
```

- `xⱼ` = accidentes en celda j
- `wᵢⱼ` = 1 si dist(i,j) ≤ 0.02° (~2.2 km), 0 si no
- Gi* > 2.58 → Hot Spot con 99% confianza

Resultado: 13 hot spots al 99%, 17 al 95%.

### Moran's I (Autocorrelación Espacial)

```
        n          Σᵢ Σⱼ wᵢⱼ (xᵢ − x̄)(xⱼ − x̄)
I = ─────────── × ─────────────────────────────────
     Σᵢ Σⱼ wᵢⱼ         Σᵢ (xᵢ − x̄)²
```

**Resultado:** I = 0.6837 (p < 0.001) — clustering espacial altamente significativo.

---

## 6. Normalización de Riesgo Histórico por Tramo

Para asignar riesgo a cada arista del grafo vial:

```
riesgo_histórico(tramo) = (accidentes_tramo / max_accidentes_CDMX) × 100
```

Si el tramo no tiene accidentes registrados se asigna riesgo = 25 (bajo-medio por defecto).

---

## 7. Score de Seguridad de Ruta

Para comparar rutas de forma intuitiva:

```
score_seguridad = 100 − riesgo_promedio_ruta

reducción_riesgo (%) = (riesgo_ruta_corta − riesgo_ruta_segura)
                       ──────────────────────────────────────── × 100
                                riesgo_ruta_corta
```

Criterio de recomendación:
- Riesgo se reduce >20% y distancia aumenta <25% → recomendar ruta segura
- Riesgo se reduce 10-20% → recomendar ruta balanceada
- Riesgo se reduce <10% → no hay ventaja significativa en seguridad
