# Sistema de Ruteo Seguro para CDMX

## Análisis Integral de Accidentes de Tránsito (2019-2023)

**Proyecto Final de Minería de Datos**

---

## Descripción del Proyecto

Sistema completo de análisis de accidentes de tránsito en la Ciudad de México que integra:

1. **Procesamiento de Datos:** Limpieza y consolidación de 78,366 accidentes en CDMX (2019-2023)
2. **Análisis Espacial:** Clustering DBSCAN, Hot Spots (Getis-Ord Gi\*), Autocorrelación (Moran's I)
3. **Machine Learning:** Predicción de gravedad con Random Forest, Decision Tree, Stacking Ensemble y más
4. **Sistema de Ruteo:** Cálculo de rutas seguras usando 3 capas de riesgo (histórico + clustering + ML)
5. **Aplicación Web:** Demo interactivo con ruteo personalizable por vehículo y hora del día

---

## Estructura del Proyecto

```
ProyectoMineria/
│
├── NOTEBOOKS (ejecutar en orden)
│   ├── 01_preparacion_datos.ipynb         # Limpieza, filtrado CDMX, matching red vial
│   ├── 02_analisis_y_modelado.ipynb       # DBSCAN, Hot Spots, Aprendizaje de máquina
│   └── 03_sistema_ruteo.ipynb             # Grafo de riesgo + rutas Dijkstra
│
├── Datos raw/                             # CSV originales INEGI (ya en GitHub)
│   ├── 2019/ ... 2023/                    # Un CSV por año (~174 MB total)
│   └── documentacion/                     # Metadatos y diccionario de variables
│
├── Datos limpios/                         # Generado por notebook 01
│   └── 2019/ ... 2023/                    # CSV limpio por año
│
├── Datos combinados/                      # CSV nacionales intermedios
│   └── ACCIDENTES_COMBINADO_2019_2023.csv # Todos los estados (236 MB)
│
├── Datos combinados CDMX/                 # Generados por notebooks 01 y 02
│   ├── ACCIDENTES_COMBINADO_CDMX_2019_2023.csv  # Base limpia CDMX (~78K registros)
│   ├── ACCIDENTES_CON_TRAMOS_2019_2023.csv       # Con matching a red vial OSM
│   ├── ACCIDENTES_CON_CLUSTERING.csv             # Con cluster DBSCAN y riesgo
│   ├── GRID_HOTSPOTS.csv                         # 755 celdas, análisis Getis-Ord
│   ├── EDGE_RISK_SCORES.csv                      # Riesgo por arista del grafo
│   └── SCORING_RIESGO_COMPUESTO.csv              # Riesgo ML compuesto por punto
│
├── Red vial/
│   ├── red_vial_cdmx.graphml              # Grafo OSM (99,728 nodos, 234,532 aristas)
│   └── red_vial_con_riesgo.pkl            # Grafo con riesgo (generado por notebook 03, NO en git)
│
├── modelos/                               # Generados por notebook 02
│   ├── modelo_riesgo_stack.pkl            # Stacking Ensemble entrenado (modelo final)
│   ├── scaler.pkl                         # StandardScaler
│   └── feature_names.pkl                  # Nombres de features del modelo
│
├── mapas/                                 # Generados por notebooks 02 y 03
│   ├── mapa_clusters_dbscan.html          # Clusters DBSCAN + Hot Spots
│   └── mapa_rutas_zocalo_polanco.html     # 3 rutas comparativas
│
├── Documentos/
│   ├── plan de trabajo.pdf
│   ├── Reporte_minería.pdf
│   └── Presentación Exposición.pdf
│
└── docs/
    ├── README_DATOS.md                    # Explicación de carpetas de datos
    ├── README_NOTEBOOKS.md                # Flujo de ejecución detallado
    ├── README_FORMULAS.ipynb              # Fórmulas matemáticas con LaTeX
    └── ARQUITECTURA_WEB.md                # Arquitectura de la aplicación web
```

---

## Reproducibilidad — Cómo ejecutar el proyecto

### 1. Instalar dependencias

```bash
pip install pandas numpy geopandas networkx osmnx folium matplotlib seaborn \
            scikit-learn imbalanced-learn libpysal esda scipy
```

### 2. Ejecutar los notebooks en orden

```bash
# Paso 1 — Limpieza y preparación (~20-30 min)
jupyter notebook 01_preparacion_datos.ipynb
# Genera: Datos limpios/, ACCIDENTES_COMBINADO_CDMX_2019_2023.csv,
#         ACCIDENTES_CON_TRAMOS_2019_2023.csv, red_vial_cdmx.graphml

# Paso 2 — Análisis espacial y modelado ML (~10-20 min)
jupyter notebook 02_analisis_y_modelado.ipynb
# Genera: ACCIDENTES_CON_CLUSTERING.csv, GRID_HOTSPOTS.csv,
#         EDGE_RISK_SCORES.csv, SCORING_RIESGO_COMPUESTO.csv,
#         modelos/, mapas/mapa_clusters_dbscan.html

# Paso 3 — Sistema de ruteo (~5-10 min)
jupyter notebook 03_sistema_ruteo.ipynb
# Genera: red_vial_con_riesgo.pkl, mapas/mapa_rutas_zocalo_polanco.html
```

> **Nota:** `red_vial_con_riesgo.pkl` (~93 MB) no está en GitHub — se genera al correr el notebook 03. Es necesario para levantar el backend de la aplicación web.

**Tiempo total estimado:** 35-60 minutos

### 3. Levantar la aplicación web (opcional)

```bash
# Backend (requiere haber ejecutado el notebook 03 primero)
cd WebPage/backend
npm install
python ml_service.py &   # Servicio ML en puerto 5001
node server.js           # API en puerto 3000

# Frontend
cd WebPage/frontend
npm install
npm run dev              # Aplicación en http://localhost:5173
```

---

## Flujo de Datos

```
Datos raw/ (INEGI, 2019-2023)
         │
         ▼
  [01_preparacion_datos.ipynb]
         │
         ├─► Datos limpios/ (por año)
         ├─► ACCIDENTES_COMBINADO_CDMX_2019_2023.csv
         ├─► ACCIDENTES_CON_TRAMOS_2019_2023.csv
         └─► red_vial_cdmx.graphml
         │
         ▼
  [02_analisis_y_modelado.ipynb]
         │
         ├─► ACCIDENTES_CON_CLUSTERING.csv   (DBSCAN)
         ├─► GRID_HOTSPOTS.csv               (Getis-Ord Gi*)
         ├─► EDGE_RISK_SCORES.csv
         ├─► SCORING_RIESGO_COMPUESTO.csv    (riesgo ML)
         └─► modelos/ (Stacking, scaler, features)
         │
         ▼
  [03_sistema_ruteo.ipynb]
         │
         └─► red_vial_con_riesgo.pkl         (grafo con riesgo integrado)
                   │
                   ▼
            [Aplicación Web]
            Dijkstra ponderado por riesgo
            3 rutas: Más corta / Balanceada / Más segura
```

---

## Resultados Clave

### Análisis Espacial
- **299 clusters** identificados con DBSCAN (`eps=300m`, `min_samples=20`)
- **13 Hot Spots al 99%** de confianza (Getis-Ord Gi\*)
- **17 Hot Spots al 95%** de confianza
- **Moran's I = 0.6837** (p < 0.001) — clustering espacial altamente significativo

### Machine Learning

Dataset desbalanceado (~97% no grave, ~3% grave) — se usó SMOTE. La métrica relevante es ROC-AUC y F1 de la clase minoritaria (grave).

| Modelo | ROC-AUC | F1 (grave) | F1 macro |
|--------|---------|------------|---------|
| Decision Tree | 0.9855 | 0.47 | 0.72 |
| Logistic Regression | 0.9869 | 0.35 | 0.65 |
| Random Forest | 0.9904 | 0.76 | 0.88 |
| **Stacking Ensemble** | **0.9849** | **0.84** | **0.92** |

El Stacking usa RF tuneado + ExtraTrees + HistGradientBoosting + Logistic Regression como base estimators, con HistGradientBoosting como meta-learner y `passthrough=True`. El modelo guardado en producción es `modelo_riesgo_stack.pkl`.

### Fórmula de Riesgo Compuesto

```
riesgo_compuesto = 0.6 × riesgo_histórico + 0.1 × riesgo_clustering + 0.3 × riesgo_ml
```

---

## Requisitos del Sistema

- Python 3.8+
- Node.js 18+ (solo para la app web)
- RAM: mínimo 8 GB (recomendado 16 GB para notebook 01)
- Espacio en disco: ~2 GB (datos + modelos + grafo)
- Sistema operativo: Windows, Linux, macOS

---

## Fuente de Datos

Los datos crudos (`Datos raw/`) provienen del **INEGI** — Registro Administrativo de Accidentes de Tránsito Terrestre (RAAT), base georreferenciada municipal 2019-2023.

- Fuente oficial: https://www.inegi.org.mx/programas/accidentes/
- Los archivos ya están incluidos en este repositorio para facilitar la reproducibilidad.

---

## Documentación Adicional

- [`docs/README_FORMULAS.md`](docs/README_FORMULAS.md) — Fórmulas, pesos y decisiones técnicas
- [`docs/README_NOTEBOOKS.md`](docs/README_NOTEBOOKS.md) — Detalles técnicos de cada notebook
- [`Documentos/Reporte_minería.pdf`](Documentos/Reporte_minería.pdf) — Reporte final del proyecto
