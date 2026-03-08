const KPICard = ({ value, label, subtitle, delta, color = 'primary' }) => {
  const borderClasses = {
    primary: 'border-t-4 border-primary-500',
    accent:  'border-t-4 border-accent-500',
    success: 'border-t-4 border-green-500',
    warning: 'border-t-4 border-orange-500'
  }

  const valueClasses = {
    primary: 'text-primary-600',
    accent:  'text-accent-600',
    success: 'text-green-600',
    warning: 'text-orange-600'
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 h-full flex flex-col justify-center ${borderClasses[color]}`}>
      <div className="text-center">
        <div className={`text-4xl font-bold mb-2 ${valueClasses[color]}`}>{value}</div>
        <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>

        {subtitle && (
          <div className="text-xs text-gray-500">{subtitle}</div>
        )}

        {delta !== undefined && (
          <div className={`text-sm font-semibold mt-2 ${delta < 0 ? 'text-green-600' : 'text-red-600'}`}>
            {delta < 0 ? '↓' : '↑'} {Math.abs(delta)}
          </div>
        )}
      </div>
    </div>
  )
}

export default KPICard
