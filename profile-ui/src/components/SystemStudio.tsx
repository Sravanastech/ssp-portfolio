import { useState } from "react";
import {
  Blocks,
  PenTool,
  ListChecks,
  Code2,
  Rocket,
  PanelsTopLeft,
  Database,
  Users,
  Workflow,
  Target,
} from "lucide-react";

const systems = [
  [
    { name: "Structure", icon: Blocks },
    { name: "Services", icon: Code2 },
    { name: "Data", icon: Database },
  ],
  [
    { name: "People", icon: Users },
    { name: "UI", icon: PanelsTopLeft },
    { name: "Workflow", icon: Workflow },
  ],
  [
    { name: "Priorities", icon: Target },
    { name: "Tasks", icon: ListChecks },
    { name: "Team", icon: Users },
  ],
  [
    { name: "UI", icon: PanelsTopLeft },
    { name: "API", icon: Code2 },
    { name: "Database", icon: Database },
  ],
  [
    { name: "UI", icon: PanelsTopLeft },
    { name: "API", icon: Code2 },
    { name: "Database", icon: Database },
    { name: "Production", icon: Rocket },
  ],
];

const systemDescriptions = [
  "Conceptual architecture: Structure connects Services and Data.",
  "Conceptual design: People inform the UI and Workflow.",
  "Conceptual planning: Priorities become Tasks owned by the Team.",
  "Conceptual system: UI exchanges data with API and Database.",
  "Conceptual delivery: UI, API, and Database connect to Production.",
];

const stages = [
  {
    name: "Architect",
    icon: Blocks,
    output: "Systems",
    title: "Give the system a clear foundation.",
    detail:
      "Shape system structure, application boundaries, and integrations around the problem the product needs to solve.",
    tools: "Architecture · Integrations · Technical direction",
  },
  {
    name: "Design",
    icon: PenTool,
    output: "Experience",
    title: "Make complex work feel clear.",
    detail:
      "Turn user needs into accessible interfaces, practical workflows, and reusable design patterns.",
    tools: "User experience · Accessible UI · Reusable patterns",
  },
  {
    name: "Plan",
    icon: ListChecks,
    output: "Roadmap",
    title: "Turn direction into actionable work.",
    detail:
      "Break requirements into tasks, prioritize project and portfolio work, assign ownership, and coordinate the team.",
    tools: "Prioritization · Task ownership · Team coordination",
  },
  {
    name: "Develop",
    icon: Code2,
    output: "UI + API",
    title: "Build the complete experience.",
    detail:
      "Connect React and TypeScript interfaces with Java and Spring Boot services, supported by shared engineering patterns and code reviews.",
    tools: "React · TypeScript · Java · Spring Boot",
  },
  {
    name: "Deliver",
    icon: Rocket,
    output: "Production",
    title: "Bring the work into production.",
    detail:
      "Guide implementation through release, align engineering and business teams, and support the people who maintain the result.",
    tools: "Release readiness · Delivery ownership · Shared tooling",
  },
];

/** A conceptual workflow showing the scope of my engineering responsibilities. */
export default function SystemStudio() {
  const [active, setActive] = useState(0);
  const [pulse, setPulse] = useState(0);
  const stage = stages[active];
  const nodes = systems[active];
  return (
    <section
      className="system-studio engineering-workflow"
      aria-label="My engineering workflow"
    >
      <div className="workflow-intro">
        <h2>From idea to production.</h2>
        <p>Architecture. Execution. Ownership.</p>
      </div>
      <div className="system-model workflow-model" data-layer={active}>
        <svg
          key={`desktop-${pulse}`}
          className="workflow-connections"
          viewBox="0 0 500 100"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <path d="M50 50H450" pathLength="600" />
          <path
            className="workflow-signal"
            d={`M0 50H${50 + active * 100}`}
            pathLength="100"
          />
        </svg>
        <svg
          key={`mobile-${pulse}`}
          className="workflow-connections-mobile"
          viewBox="0 0 2 100"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <path d="M1 8.5V91.5" />
          <path
            className="workflow-signal"
            d={`M1 0V${8.5 + active * 20.75}`}
            pathLength="100"
          />
        </svg>
        <ol className="workflow-stages" aria-label="Explore the five stages">
          {stages.map(({ name, icon: Icon, output }, index) => (
            <li key={name}>
              <button
                type="button"
                className="workflow-stage"
                aria-pressed={active === index}
                aria-controls="workflow-detail"
                onClick={() => {
                  setActive(index);
                  setPulse((value) => value + 1);
                }}
              >
                <span className="workflow-number" aria-hidden="true">
                  0{index + 1}
                </span>
                <span className="workflow-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="workflow-name">{name}</span>
                <span className="workflow-output">{output}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div
        id="workflow-detail"
        className="workflow-detail"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="workflow-position">
          {stage.name} <span>{String(active + 1).padStart(2, "0")} / 05</span>
        </span>
        <h3>{stage.title}</h3>
        <p>{stage.detail}</p>
        <span className="workflow-tools">{stage.tools}</span>
        <div
          className="workflow-system"
          role="img"
          aria-label={systemDescriptions[active]}
        >
          <svg
            key={pulse}
            className="workflow-system-connections"
            viewBox={`0 0 ${nodes.length * 100} 100`}
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            {nodes.slice(1).map((node, index) => {
              const start = index * 100 + 76;
              const end = index * 100 + 124;
              return (
                <g key={node.name}>
                  <path d={`M${start} 50H${end}m-5-4 5 4-5 4`} />
                  <path
                    className="workflow-signal"
                    d={`M${start} 50H${end}`}
                    pathLength="100"
                  />
                  {active === 3 && (
                    <>
                      <path d={`M${end} 60H${start}m5-4-5 4 5 4`} />
                      <path
                        className="workflow-signal workflow-signal-return"
                        d={`M${end} 60H${start}`}
                        pathLength="100"
                      />
                    </>
                  )}
                </g>
              );
            })}
          </svg>
          <div
            className="workflow-system-nodes"
            style={{
              gridTemplateColumns: `repeat(${nodes.length}, minmax(0, 1fr))`,
            }}
          >
            {nodes.map(({ name, icon: Icon }) => (
              <div className="workflow-system-node" key={name}>
                <span
                  className={`workflow-system-icon ${name === "Production" ? "is-production" : ""}`}
                >
                  <Icon aria-hidden="true" />
                </span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="workflow-caption">Select a stage to explore my approach.</p>
    </section>
  );
}
