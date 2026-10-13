interface Metric {
  label: string;
  value: string;
}

interface MetricCalloutProps {
  metric1: Metric;
  metric2: Metric;
  metric3: Metric;
}

const MetricCallout = ({ metric1, metric2, metric3 }: MetricCalloutProps) => {
  const metrics = [metric1, metric2, metric3];

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {metrics.map((metric, idx) => (
        <div key={idx} className="flex-1">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {metric.label}
          </div>
          <div className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricCallout;
