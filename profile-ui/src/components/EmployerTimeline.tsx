interface EmployerRole {
  year: string;
  title: string;
  company: string;
}

interface EmployerTimelineProps {
  items: EmployerRole[];
}

/** "Financial Information Services Agency (FISA-OPA)" -> "FISA-OPA" */
const shortCompany = (company: string) =>
  company.match(/\(([^)]+)\)\s*$/)?.[1] ?? company.replace(/\s+LLC$/, "");

/** Compact, newest-first employer list. Facts come from the experience data. */
export default function EmployerTimeline({ items }: EmployerTimelineProps) {
  return (
    <ol className="employer-timeline">
      {items.map((item) => (
        <li key={`${item.company}-${item.year}`}>
          <span className="employer-dates">{item.year}</span>
          <strong className="employer-name">
            {shortCompany(item.company)}
          </strong>
          <span className="employer-title">{item.title}</span>
        </li>
      ))}
    </ol>
  );
}
