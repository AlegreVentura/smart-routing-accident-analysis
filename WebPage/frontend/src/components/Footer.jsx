import { FaCar } from 'react-icons/fa'

const Footer = () => {
  const footerLinks = [
    {
      title: 'Proyecto',
      links: [
        { name: 'Sobre el Proyecto', href: '#about' },
        { name: 'Metodología', href: '#methodology' },
        { name: 'Resultados', href: '#results' },
        { name: 'Conclusiones', href: '#conclusions' },
      ]
    },
    {
      title: 'Recursos',
      links: [
        { name: 'Demo Interactiva', href: '#demo' },
        { name: 'Documentación', href: '#' },
        { name: 'Notebooks', href: '#' },
        { name: 'GitHub', href: '#' },
      ]
    },
  ]

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-custom py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
                <FaCar className="text-white text-xl" />
              </div>
              <span className="text-xl font-bold text-white">Ruteo Seguro CDMX</span>
            </div>
            <p className="text-sm text-gray-400">
              Sistema integral de análisis de accidentes de tránsito para mejorar la seguridad vial en la Ciudad de México.
            </p>
          </div>

          {/* Footer Links */}
          {footerLinks.map((section, index) => (
            <div key={index}>
              <h4 className="text-white font-bold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, idx) => (
                  <li key={idx}>
                    <a href={link.href} className="text-sm hover:text-primary-400 transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default Footer
