/** Conceptual workflow diagrams; no private client UI or operational data. */
export default function ProjectArtwork({ id }: { id: string }) {
  const inspection = id === "quality-inspection";
  const workforce = id === "workforce-modernization";
  const commerce = id === "ecommerce-shopify-vue";
  const labels = inspection
    ? ["Produce specs", "Inspection", "Quality details"]
    : workforce
      ? ["Time & leave", "Employee UI", "Timekeeping"]
      : commerce
        ? ["Discovery", "Product & cart", "Checkout"]
        : ["Requirements", "Web application", "Review"];
  return (
    <div className="project-art" aria-hidden="true">
      <svg className="project-workflow" viewBox="0 0 420 290" fill="none">
        <path d="M32 42H388M32 248H388" stroke="#bcc8e0" />
        <text x="32" y="30" fill="#52617c" fontSize="11">
          {inspection
            ? "PRODUCE SPECIFICATIONS"
            : workforce
              ? "EMPLOYEE TIMEKEEPING"
              : commerce
                ? "CONNECTED COMMERCE"
                : "APPLICATION DEVELOPMENT"}
        </text>
        <path className="workflow-route" d="M100 106H210V180H320" />
        <path d="m311 174 9 6-9 6" stroke="#244ce4" strokeWidth="3" />
        <rect x="40" y="72" width="120" height="68" rx="8" fill="#17243c" />
        {inspection ? (
          <g stroke="#dce99b" strokeWidth="3">
            <path d="m60 91 4 4 8-9m-12 24 4 4 8-9M82 92h54M82 111h36" />
          </g>
        ) : workforce ? (
          <g stroke="#dce99b" strokeWidth="2">
            <rect x="71" y="83" width="58" height="44" rx="3" />
            <path d="M71 95h58M85 80v10m29-10v10M82 106h7m10 0h7m10 0h7m-41 10h7m10 0h7" />
          </g>
        ) : (
          <g stroke="#dce99b" strokeWidth="2">
            <path d="M63 87h28v37H63zM104 87h33v15h-33zM104 111h33m-33 9h24" />
          </g>
        )}
        <rect x="168" y="145" width="84" height="68" rx="8" fill="#244ce4" />
        <path
          d="m193 168-9 11 9 11m34-22 9 11-9 11m-11-27-10 32"
          stroke="#fff"
          strokeWidth="3"
        />
        <circle
          cx="326"
          cy="180"
          r="31"
          fill="#dce99b"
          stroke="#17243c"
          strokeWidth="2"
        />
        <path d="m312 180 10 10 19-22" stroke="#17243c" strokeWidth="3" />
        <text x="100" y="160" textAnchor="middle" fill="#17243c" fontSize="12">
          {labels[0]}
        </text>
        <text x="210" y="233" textAnchor="middle" fill="#17243c" fontSize="12">
          {labels[1]}
        </text>
        <text x="326" y="233" textAnchor="middle" fill="#17243c" fontSize="12">
          {labels[2]}
        </text>
        <text x="32" y="270" fill="#52617c" fontSize="10">
          CONCEPTUAL WORKFLOW
        </text>
      </svg>
    </div>
  );
}
