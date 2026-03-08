# Notebooks del Sistema de Ruteo Seguro CDMX

## Flujo de ejecución

```
01_preparacion_datos.ipynb         (ejecutar primero)
    │
    ├─► Datos limpios/ (por año, local, no en git)
    ├─► Datos combinados CDMX/ACCIDENTES_COMBINADO_CDMX_2019_2023.csv
    ├─► Datos combinados CDMX/ACCIDENTES_CON_TRAMOS_2019_2023.csv
    └─► Red vial/red_vial_cdmx.graphml
    │
    ▼
02_analisis_y_modelado.ipynb
    │
    ├─► Datos combinados CDMX/ACCIDENTES_CON_CLUSTERING.csv
    ├─► Datos combinados CDMX/GRID_HOTSPOTS.csv
    ├─► Datos combinados CDMX/EDGE_RISK_SCORES.csv
    ├─► Datos combinados CDMX/SCORING_RIESGO_COMPUESTO.csv
    └─► modelos/ (modelo_riesgo_rf.pkl, scaler.pkl, feature_names.pkl)
    │
    ▼
03_sistema_ruteo.ipynb
    │
    └─► Red vial/red_vial_con_riesgo.pkl   (grafo con riesgo, ~93 MB)
        mapas/mapa_rutas_zocalo_polanco.html
```

---

## Notebook 01 — Preparación de Datos
**Archivo:** `01_preparacion_datos.ipynb`

**Objetivo:** Limpieza, consolidación y matching con red vial OSM.

**Flujo:**
1. Carga CSVs crudos de `Datos raw/` (2019-2023)
2. Limpieza: nulos, coordenadas inválidas, duplicados
3. Filtrado CDMX (edo == 9)
4. Feature engineering: `franja_horaria`, `es_fin_de_semana`, `es_hora_pico`, `gravedad`
5. Matching de accidentes a edges del grafo OSM (nearest neighbor)
6. Descarga red vial CDMX con OSMnx (si no existe)

**Salidas:**
- `Datos limpios/YYYY/ACCIDENTES_LIMPIO_YYYY.csv` — por año (generado local, no en git)
- `Datos combinados CDMX/ACCIDENTES_COMBINADO_CDMX_2019_2023.csv` — ~78,366 registros
- `Datos combinados CDMX/ACCIDENTES_CON_TRAMOS_2019_2023.csv` — con IDs de edges OSM
- `Red vial/red_vial_cdmx.graphml` — grafo OSM (99,728 nodos, 234,532 aristas)

**Tiempo estimado:** 20-30 min (primera vez descarga OSMnx)

---

## Notebook 02 — Análisis Espacial y Modelado ML
**Archivo:** `02_analisis_y_modelado.ipynb`

**Objetivo:** Identificar patrones espaciales y entrenar modelo predictivo de gravedad.

### Análisis Espacial

**DBSCAN:**
- `eps=300m`, `min_samples=20`
- 299 clusters, 17,178 puntos agrupados (53.4%)
- Índice de riesgo: `riesgo_cluster = 50 + 50 × (tamaño - min) / (max - min)`

**Getis-Ord Gi\*:**
- Cuadrícula 0.01° (~1.1 km)
- 13 hot spots al 99%, 17 al 95%

**Moran's I:**
- I = 0.6837 (p < 0.001) — clustering espacial altamente significativo

### Modelado ML

**Feature selection:**
- 60+ columnas disponibles → ~20 seleccionadas
- 3 algoritmos con votación por consenso: SelectKBest, RFE, Feature Importance

**Modelos entrenados:**

| Modelo | Accuracy | F1 |
|--------|----------|----|
| Decision Tree | ~82% | 0.76 |
| Random Forest | ~87% | 0.83 |
| Logistic Regression | ~78% | 0.72 |
| Stacking Ensemble | ~88% | 0.85 |

**Salidas:**
- `Datos combinados CDMX/ACCIDENTES_CON_CLUSTERING.csv` — cluster DBSCAN + riesgo_cluster
- `Datos combinados CDMX/GRID_HOTSPOTS.csv` — 755 celdas con gi_score y clasificación
- `Datos combinados CDMX/EDGE_RISK_SCORES.csv` — riesgo asignado por arista del grafo
- `Datos combinados CDMX/SCORING_RIESGO_COMPUESTO.csv` — riesgo ML + compuesto por punto
- `modelos/modelo_riesgo_rf.pkl` — Random Forest entrenado
- `modelos/scaler.pkl` — StandardScaler
- `modelos/feature_names.pkl` — lista de features del modelo
- `mapas/mapa_clusters_dbscan.html` — visualización interactiva

**Tiempo estimado:** 10-20 min

---

## Notebook 03 — Sistema de Ruteo
**Archivo:** `03_sistema_ruteo.ipynb`

**Objetivo:** Construir el grafo de riesgo e integrar las 3 capas para calcular rutas seguras.

**Caso de uso:** Zócalo → Polanco (Museo Soumaya)

**Flujo:**
1. Carga el grafo `red_vial_cdmx.graphml`
2. Asigna riesgo compuesto a cada arista:
   ```
   riesgo_compuesto = 0.6 × riesgo_histórico + 0.1 × riesgo_clustering + 0.3 × riesgo_ml
   ```
3. Calcula 3 rutas con Dijkstra:
   - Más corta: `peso = longitud`
   - Balanceada: `peso = longitud × (1 + riesgo/100)`
   - Más segura: `peso = longitud × (1 + 2×riesgo/100)`
4. Genera mapa comparativo con leyenda, perfiles de riesgo y radar chart

**Salidas:**
- `Red vial/red_vial_con_riesgo.pkl` — grafo con pesos de riesgo (~93 MB, en git)
- `mapas/mapa_rutas_zocalo_polanco.html` — mapa comparativo de 3 rutas
- `mapas/comparacion_google_maps.html` — comparativa con Google Maps

**Tiempo estimado:** 5-10 min

> **Nota:** `red_vial_con_riesgo.pkl` es necesario para que el backend de la aplicación web funcione. Si no existe, ejecuta este notebook primero.

---

## Orden de ejecución

```bash
# 1. Preparar datos (~20-30 min)
jupyter notebook 01_preparacion_datos.ipynb

# 2. Análisis espacial + ML (~10-20 min)
jupyter notebook 02_analisis_y_modelado.ipynb

# 3. Ruteo (~5-10 min)
jupyter notebook 03_sistema_ruteo.ipynb
```

**Tiempo total:** ~40-60 min

---

## Archivos generados por notebook

| Archivo | Generado por |
|---------|-------------|
| `ACCIDENTES_COMBINADO_CDMX_2019_2023.csv` | 01_preparacion_datos |
| `ACCIDENTES_CON_TRAMOS_2019_2023.csv` | 01_preparacion_datos |
| `red_vial_cdmx.graphml` | 01_preparacion_datos |
| `ACCIDENTES_CON_CLUSTERING.csv` | 02_analisis_y_modelado |
| `GRID_HOTSPOTS.csv` | 02_analisis_y_modelado |
| `EDGE_RISK_SCORES.csv` | 02_analisis_y_modelado |
| `SCORING_RIESGO_COMPUESTO.csv` | 02_analisis_y_modelado |
| `modelos/` | 02_analisis_y_modelado |
| `red_vial_con_riesgo.pkl` | 03_sistema_ruteo |
| `mapas/mapa_rutas_zocalo_polanco.html` | 03_sistema_ruteo |
| `mapas/mapa_clusters_dbscan.html` | 02_analisis_y_modelado |

---

## Recursos adicionales

- [README_DATOS.md](README_DATOS.md) — explicación detallada de cada CSV
- [README_FORMULAS.ipynb](README_FORMULAS.ipynb) — fórmulas con LaTeX
- [ARQUITECTURA_WEB.md](ARQUITECTURA_WEB.md) — arquitectura de la aplicación web
