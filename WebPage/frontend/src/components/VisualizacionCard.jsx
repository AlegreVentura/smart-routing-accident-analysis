import { useState } from 'react'
import { FaExternalLinkAlt, FaSpinner, FaExclamationTriangle } from 'react-icons/fa'

const VisualizacionCard = ({ title, description, src }) => {
  const [iframeState, setIframeState] = useState('loading')

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300 flex flex-col">
      {/* Iframe preview — renderiza al doble y escala a 50% para evitar texto ilegible */}
      <div className="relative w-full overflow-hidden" style={{ height: '300px' }}>
        {iframeState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 z-10">
            <div className="text-center">
              <FaSpinner className="text-3xl text-primary-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">Cargando visualización...</p>
            </div>
          </div>
        )}

        {iframeState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-center text-gray-400">
              <FaExclamationTriangle className="text-3xl mx-auto mb-2" />
              <p className="text-sm">Vista previa no disponible</p>
            </div>
          </div>
        )}

        <iframe
          src={src}
          title={title}
          style={{
            width: '200%',
            height: '200%',
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
            pointerEvents: 'none',
            border: 'none',
          }}
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => setIframeState('ready')}
          onError={() => setIframeState('error')}
        />
      </div>

      {/* Contenido */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4 flex-1 text-sm">{description}</p>

        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex items-center justify-center space-x-2 text-center"
        >
          <span>Abrir interactivo</span>
          <FaExternalLinkAlt className="text-sm" />
        </a>
      </div>
    </div>
  )
}

export default VisualizacionCard
