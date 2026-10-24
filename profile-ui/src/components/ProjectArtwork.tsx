import "@/styles/project-art.css";

/** Conceptual workflow diagrams built only from facts in the case studies; no client UI or data. */
type Diagram = { label: string; kicker: string; body: React.ReactNode };

const Chevron = ({
  x,
  y,
  dir = "right",
}: {
  x: number;
  y: number;
  dir?: "right" | "down";
}) => (
  <path
    className="pa-flow"
    d={
      dir === "right"
        ? `m${x - 8} ${y - 6} 8 6-8 6`
        : `m${x - 6} ${y - 8} 6 8 6-8`
    }
  />
);

const diagrams: Record<string, Diagram> = {
  "application-modernization": {
    kicker: "SHARED COMPONENT LIBRARY",
    label:
      "Diagram: one shared React component library with Storybook documentation feeding multiple applications.",
    body: (
      <>
        <rect
          className="pa-blue"
          x="20"
          y="104"
          width="136"
          height="64"
          rx="8"
        />
        <text className="pa-on-blue" x="88" y="132" textAnchor="middle">
          Shared React
        </text>
        <text className="pa-on-blue" x="88" y="152" textAnchor="middle">
          component library
        </text>
        <path className="pa-line" d="M88 168v18" />
        <rect
          className="pa-lime"
          x="20"
          y="186"
          width="136"
          height="36"
          rx="8"
        />
        <text className="pa-on-lime" x="88" y="209" textAnchor="middle">
          Storybook docs
        </text>
        <path
          className="pa-flow pa-route"
          d="M156 136H196M196 84V188M196 84H236M196 136H236M196 188H236"
        />
        {[62, 114, 166].map((y) => (
          <g key={y}>
            <rect
              className="pa-card"
              x="236"
              y={y}
              width="104"
              height="44"
              rx="6"
            />
            <path
              className="pa-line"
              d={`M236 ${y + 12}H340M250 ${y + 24}H300M250 ${y + 34}H322`}
            />
          </g>
        ))}
        <text className="pa-muted" x="340" y="240" textAnchor="end">
          Multiple applications
        </text>
      </>
    ),
  },
  "quality-inspection": {
    kicker: "PRODUCE INSPECTION",
    label:
      "Diagram: produce specifications feed an inspection checklist, which produces inspection details.",
    body: (
      <>
        <rect
          className="pa-card"
          x="20"
          y="64"
          width="92"
          height="150"
          rx="8"
        />
        <path
          className="pa-line"
          d="M34 90h64M34 110h48M34 130h58M34 150h40M34 170h54"
        />
        <Chevron x={134} y={139} />
        <path className="pa-flow pa-route" d="M112 139H134" />
        <rect
          className="pa-card"
          x="134"
          y="64"
          width="100"
          height="150"
          rx="8"
        />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect
              className={i < 2 ? "pa-lime" : "pa-card"}
              x="148"
              y={84 + i * 42}
              width="22"
              height="22"
              rx="4"
            />
            {i < 2 && (
              <path className="pa-tick" d={`m153 ${95 + i * 42} 4 4 8-9`} />
            )}
            <path className="pa-line" d={`M180 ${95 + i * 42}H220`} />
          </g>
        ))}
        <path className="pa-flow pa-route" d="M234 139H256" />
        <Chevron x={256} y={139} />
        <rect
          className="pa-blue"
          x="256"
          y="64"
          width="84"
          height="150"
          rx="8"
        />
        <circle className="pa-lime" cx="298" cy="108" r="20" />
        <path className="pa-tick" d="m288 108 7 7 13-15" />
        <path
          className="pa-on-blue-line"
          d="M270 154h56M270 174h40M270 194h48"
        />
        <text className="pa-text" x="66" y="238" textAnchor="middle">
          Specifications
        </text>
        <text className="pa-text" x="184" y="238" textAnchor="middle">
          Inspection
        </text>
        <text className="pa-text" x="298" y="238" textAnchor="middle">
          Details
        </text>
      </>
    ),
  },
  "workforce-modernization": {
    kicker: "TIMEKEEPING AND LEAVE",
    label:
      "Diagram: a calendar grid of time entries and leave days feeding a timekeeping record.",
    body: (
      <>
        <rect
          className="pa-card"
          x="20"
          y="60"
          width="208"
          height="148"
          rx="8"
        />
        <path
          className="pa-line"
          d="M20 90H228M72 60V208M124 60V208M176 60V208M20 124H228M20 158H228M20 184H228"
        />
        {[0, 1, 2, 3].map((c) => (
          <circle key={c} className="pa-dot" cx={46 + c * 52} cy="75" r="4" />
        ))}
        {[0, 1, 2, 3].map((c) => (
          <rect
            key={`a${c}`}
            className="pa-blue"
            x={28 + c * 52}
            y="98"
            width="36"
            height="18"
            rx="4"
          />
        ))}
        <rect
          className="pa-blue"
          x="28"
          y="132"
          width="36"
          height="18"
          rx="4"
        />
        <rect
          className="pa-blue"
          x="80"
          y="132"
          width="36"
          height="18"
          rx="4"
        />
        <rect
          className="pa-lime"
          x="132"
          y="130"
          width="88"
          height="22"
          rx="4"
        />
        <rect
          className="pa-blue"
          x="28"
          y="162"
          width="36"
          height="14"
          rx="4"
        />
        <path className="pa-flow pa-route" d="M228 134H258" />
        <Chevron x={258} y={134} />
        <rect
          className="pa-card"
          x="258"
          y="86"
          width="82"
          height="96"
          rx="8"
        />
        <path className="pa-line" d="M270 108h58M270 126h58M270 144h40" />
        <circle className="pa-lime" cx="320" cy="162" r="9" />
        <text className="pa-text" x="299" y="204" textAnchor="middle">
          Timekeeping
        </text>
        <rect
          className="pa-blue"
          x="20"
          y="226"
          width="14"
          height="14"
          rx="3"
        />
        <text className="pa-muted" x="40" y="238">
          Time
        </text>
        <rect
          className="pa-lime"
          x="92"
          y="226"
          width="14"
          height="14"
          rx="3"
        />
        <text className="pa-muted" x="112" y="238">
          Leave
        </text>
      </>
    ),
  },
  "ecommerce-shopify-vue": {
    kicker: "DISCOVERY TO CHECKOUT",
    label:
      "Diagram: a narrowing funnel from product discovery to product and cart to Shopify checkout.",
    body: (
      <>
        <rect
          className="pa-card"
          x="20"
          y="56"
          width="320"
          height="48"
          rx="8"
        />
        <text className="pa-text" x="36" y="85">
          Product discovery
        </text>
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            className="pa-dot"
            x={226 + i * 28}
            y="68"
            width="20"
            height="24"
            rx="3"
          />
        ))}
        <path className="pa-flow pa-route" d="M180 104V124" />
        <Chevron x={180} y={124} dir="down" />
        <rect
          className="pa-card"
          x="70"
          y="132"
          width="220"
          height="48"
          rx="8"
        />
        <text className="pa-text" x="86" y="161">
          Product &amp; cart
        </text>
        <circle className="pa-dot" cx="256" cy="156" r="10" />
        <path className="pa-flow pa-route" d="M180 180V200" />
        <Chevron x={180} y={200} dir="down" />
        <rect
          className="pa-blue"
          x="110"
          y="208"
          width="140"
          height="48"
          rx="8"
        />
        <text className="pa-on-blue" x="180" y="237" textAnchor="middle">
          Shopify checkout
        </text>
      </>
    ),
  },
  "business-web-applications": {
    kicker: "INTERFACE, API AND TESTS",
    label:
      "Diagram: AngularJS and JSF interfaces and JAX-RS Java APIs, both covered by JUnit and Cucumber tests.",
    body: (
      <>
        <rect
          className="pa-card"
          x="20"
          y="60"
          width="132"
          height="86"
          rx="8"
        />
        <path className="pa-line" d="M20 80H152" />
        <circle className="pa-dot" cx="32" cy="70" r="3" />
        <circle className="pa-dot" cx="44" cy="70" r="3" />
        <text className="pa-text" x="86" y="120" textAnchor="middle">
          AngularJS · JSF
        </text>
        <rect
          className="pa-blue"
          x="208"
          y="60"
          width="132"
          height="86"
          rx="8"
        />
        <path className="pa-on-blue-line" d="M222 80H326" />
        <text className="pa-on-blue" x="274" y="120" textAnchor="middle">
          JAX-RS APIs
        </text>
        <path className="pa-flow pa-route" d="M152 92H208M152 112H208" />
        <Chevron x={208} y={92} />
        <path className="pa-line pa-dash" d="M86 146V186M274 146V186" />
        <rect
          className="pa-lime"
          x="20"
          y="186"
          width="320"
          height="44"
          rx="8"
        />
        <text className="pa-on-lime" x="180" y="213" textAnchor="middle">
          JUnit · Cucumber tests
        </text>
      </>
    ),
  },
};

export default function ProjectArtwork({ id }: { id: string }) {
  const d = diagrams[id] ?? diagrams["application-modernization"];
  return (
    <div className="project-art pa-art">
      <svg
        className="project-workflow pa"
        viewBox="0 0 360 290"
        fill="none"
        role="img"
        aria-label={d.label}
        data-art={id}
      >
        <title>{d.label}</title>
        <g aria-hidden="true">
          <text className="pa-muted pa-kicker" x="20" y="28">
            {d.kicker}
          </text>
          <path className="pa-rule" d="M20 40H340" />
          {d.body}
          <text className="pa-muted pa-caption" x="20" y="278">
            CONCEPTUAL WORKFLOW
          </text>
        </g>
      </svg>
    </div>
  );
}
