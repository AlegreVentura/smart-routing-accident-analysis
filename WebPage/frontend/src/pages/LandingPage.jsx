import { motion } from 'framer-motion'
import { FaRoute, FaHospital, FaArrowRight } from 'react-icons/fa'
import { Link } from 'react-router-dom'

const LandingPage = () => {
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-accent-900"></div>

      {/* Animated Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-8 py-6 gap-6 justify-center">

        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-2"
          >
            <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-md text-white rounded-full text-base font-medium">
              Proyecto Final de Minería de Datos
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold text-white mb-2"
          >
            Sistema de Análisis de Accidentes{' '}
            <span className="bg-gradient-to-r from-primary-300 to-accent-300 bg-clip-text text-transparent">
              CDMX
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-300 mx-auto"
          >
            Análisis integral usando Machine Learning y optimización espacial — ¿qué módulo quieres explorar?
          </motion.p>
        </div>

        {/* Module Selection Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Ruteo Seguro Card */}
          <Link to="/ruteo-seguro" className="block">
            <div className="bg-gradient-to-br from-primary-900/80 to-primary-800/80 backdrop-blur-xl rounded-2xl p-8 border border-primary-400/30 hover:border-primary-400/60 hover:scale-[1.01] transition-all duration-300 shadow-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center w-14 h-14 bg-primary-400/20 rounded-xl shrink-0">
                  <FaRoute className="text-3xl text-primary-200" />
                </div>
                <h3 className="text-2xl font-bold text-white">Ruteo Seguro CDMX</h3>
              </div>
              <p className="text-gray-200 mb-5 text-base">
                Encuentra las rutas más seguras evitando puntos negros de accidentes
              </p>
              <ul className="space-y-3 mb-6 text-gray-200 text-base">
                <li className="flex items-center gap-2"><span className="text-primary-300 font-bold">▸</span>78K+ accidentes analizados (2019-2023)</li>
                <li className="flex items-center gap-2"><span className="text-primary-300 font-bold">▸</span>299 clusters identificados</li>
                <li className="flex items-center gap-2"><span className="text-primary-300 font-bold">▸</span>Heatmaps temporales interactivos</li>
                <li className="flex items-center gap-2"><span className="text-primary-300 font-bold">▸</span>Rutas alternativas optimizadas</li>
              </ul>
              <div className="flex items-center text-primary-200 font-semibold text-base">
                Explorar módulo <FaArrowRight className="ml-2" />
              </div>
            </div>
          </Link>

          {/* Hospitales Card */}
          <Link to="/hospitales" className="block">
            <div className="bg-gradient-to-br from-accent-900/80 to-accent-800/80 backdrop-blur-xl rounded-2xl p-8 border border-accent-400/30 hover:border-accent-400/60 hover:scale-[1.01] transition-all duration-300 shadow-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center w-14 h-14 bg-accent-400/20 rounded-xl shrink-0">
                  <FaHospital className="text-3xl text-accent-200" />
                </div>
                <h3 className="text-2xl font-bold text-white">Localización de Hospitales</h3>
              </div>
              <p className="text-gray-200 mb-5 text-base">
                Optimiza la ubicación de nuevos hospitales mediante análisis espacial
              </p>
              <ul className="space-y-3 mb-6 text-gray-200 text-base">
                <li className="flex items-center gap-2"><span className="text-accent-300 font-bold">▸</span>Clusters de accidentes desatendidos</li>
                <li className="flex items-center gap-2"><span className="text-accent-300 font-bold">▸</span>Análisis de cobertura nacional</li>
                <li className="flex items-center gap-2"><span className="text-accent-300 font-bold">▸</span>10 hospitales propuestos</li>
                <li className="flex items-center gap-2"><span className="text-accent-300 font-bold">▸</span>Mejora en tiempos de respuesta</li>
              </ul>
              <div className="flex items-center text-accent-200 font-semibold text-base">
                Explorar módulo <FaArrowRight className="ml-2" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center text-gray-500 text-sm"
        >
          <p>Roberto Jhoshua Alegre Ventura · UNAM · IIMAS · 2025</p>
        </motion.div>
      </div>
    </div>
  )
}

export default LandingPage
