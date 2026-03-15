<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=210&section=header&text=Sistema%20de%20Ruteo%20Seguro%20CDMX&fontSize=38&fontColor=fff&animation=fadeIn&fontAlignY=40&desc=Minería%20de%20Datos%20%7C%20Análisis%20Integral%20de%20Accidentes%202019-2023&descAlignY=62&descSize=16" width="100%"/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=19&pause=1000&color=E05252&center=true&vCenter=true&random=false&width=720&lines=78%2C366+accidentes+analizados+en+CDMX;Clustering+DBSCAN+%2B+Hot+Spots+Getis-Ord+Gi*;Stacking+Ensemble+F1%3D0.84+en+clase+grave;Ruteo+seguro+con+Dijkstra+ponderado+por+riesgo)](https://git.io/typing-svg)

<br/>

![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)
![INEGI](https://img.shields.io/badge/Datos-INEGI_RAAT-CC0000?style=for-the-badge)

</div>

---

## Demo

https://github.com/user-attachments/assets/4200c5d8-9b6b-4bed-8bcc-d69f955c02a5

---

## Impacto

Identifiqué 13 zonas críticas de alta concentración de accidentes con 99% de confianza estadística, según análisis Getis-Ord Gi*, sobre 78,366 registros históricos.

Para ello, desarrollé un sistema completo de análisis de accidentes viales en CDMX procesando datos de 2019 a 2023, que revelaron concentraciones geográficas de riesgo, variables que determinan si un accidente resulta en heridos o muertos, y patrones temporales de accidentabilidad, integrando análisis espacial estadístico, modelos predictivos y ruteo óptimo en Python.

---

## Descripción

Sistema completo de análisis de accidentes de tránsito en la Ciudad de México que integra cinco componentes:

| # | Componente | Descripción |
|---|-----------|-------------|
| 1 | **Procesamiento de Datos** | Limpieza y consolidación de 78,366 accidentes CDMX (2019-2023) |
| 2 | **Análisis Espacial** | Clustering DBSCAN, Hot Spots (Getis-Ord Gi\*), Autocorrelación (Moran's I) |
| 3 | **Machine Learning** | Predicción de gravedad — Stacking Ensemble con SMOTE |
| 4 | **Sistema de Ruteo** | Rutas seguras con Dijkstra ponderado por 3 capas de riesgo |
| 5 | **Aplicación Web** | Demo interactivo React + Node.js + Python, rutas por vehículo y hora |

---

## Características principales

<div align="center">

| Métrica | Valor |
|---------|-------|
| Accidentes analizados | **78,366** (CDMX 2019-2023) |
| Clusters DBSCAN | **299** (eps=300m, min\_samples=20) |
| Hot Spots 99% confianza | **13** (Getis-Ord Gi\*) |
| Moran's I | **0.6837** — clustering espacial significativo |
| F1 clase grave (ML) | **0.84** (Stacking Ensemble + SMOTE) |
| Nodos del grafo vial | **99,728** nodos · 234,532 aristas |

</div>

### Fórmula de Riesgo Compuesto

```
riesgo_compuesto = 0.6 × riesgo_histórico + 0.1 × riesgo_clustering + 0.3 × riesgo_ml
```

### Modelos evaluados

| Modelo | ROC-AUC | F1 (grave) | F1 macro |
|--------|---------|------------|----------|
| Decision Tree | 0.9855 | 0.47 | 0.72 |
| Logistic Regression | 0.9869 | 0.35 | 0.65 |
| Random Forest | 0.9904 | 0.76 | 0.88 |
| **Stacking Ensemble** | **0.9849** | **0.84** | **0.92** |

---

## Estructura

```
Proyecto Final Minería/
├── ProyectoMineria/    ← Notebooks, datos, modelos y documentación
└── WebPage/            ← Aplicación web (React + Node.js + Python)
```

---

## Documentación

- [ProyectoMineria/README.md](ProyectoMineria/README.md) — Descripción técnica completa, flujo de datos y reproducibilidad
- [WebPage/README.md](WebPage/README.md) — Instalación y uso de la aplicación web
- [ProyectoMineria/tecnico/README_NOTEBOOKS.md](ProyectoMineria/tecnico/README_NOTEBOOKS.md) — Detalle de cada notebook
- [ProyectoMineria/tecnico/README_FORMULAS.md](ProyectoMineria/tecnico/README_FORMULAS.md) — Fórmulas, pesos y decisiones técnicas

---

## Autor

**Roberto Jhoshua Alegre Ventura** — Proyecto Final de Minería de Datos · UNAM · IIMAS · 2025

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=100&section=footer" width="100%"/>
