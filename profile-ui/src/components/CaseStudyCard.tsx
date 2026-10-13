import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import MetricCallout from "./MetricCallout";
import EvidenceBadge from "./EvidenceBadge";

interface Metric {
  label: string;
  value: string;
}

interface CaseStudyCardProps {
  image: string;
  company: string;
  role: string;
  metrics: {
    metric1: Metric;
    metric2: Metric;
    metric3: Metric;
  };
  challenge: string;
  solution: string;
  impact: string[];
  technologies: string[];
  expanded?: boolean;
}

const CaseStudyCard = ({
  image,
  company,
  role,
  metrics,
  challenge,
  solution,
  impact,
  technologies,
  expanded: initialExpanded = false,
}: CaseStudyCardProps) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      {/* Card Face */}
      <div>
        {/* Image Section */}
        <div className="relative">
          <img
            src={image}
            alt={`${company} case study`}
            className="w-full h-48 object-cover"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Company and Role Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="text-lg font-bold">{company}</h3>
            <p className="text-sm text-gray-200">{role}</p>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="p-4">
          <MetricCallout
            metric1={metrics.metric1}
            metric2={metrics.metric2}
            metric3={metrics.metric3}
          />
        </div>

        {/* Expand Button */}
        <div className="px-4 pb-4">
          <button
            onClick={toggleExpand}
            className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {isExpanded ? "Hide Details" : "View Details"}
            <ChevronDown
              size={16}
              className={`transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Expanded Section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 dark:border-gray-800"
          >
            <div className="p-4 space-y-4">
              {/* Challenge Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Challenge
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {challenge}
                </p>
              </div>

              {/* Solution Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Solution
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {solution}
                </p>
              </div>

              {/* Impact Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Impact
                </h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {impact.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Technologies Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Technologies
                </h4>
                <div className="flex flex-wrap gap-2">
                  {technologies.map((tech, idx) => (
                    <EvidenceBadge key={idx} label={tech} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CaseStudyCard;
