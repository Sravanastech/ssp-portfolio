interface MetricItem {
  value: string;
  label: string;
}

interface MetricGridProps {
  metrics: MetricItem[];
}

const MetricGrid = ({ metrics }: MetricGridProps) => {
  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {metrics.map((metric, index) => (
          <div key={index} className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {metric.value}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricGrid;
