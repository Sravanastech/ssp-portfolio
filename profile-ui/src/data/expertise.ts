export interface ExpertiseDomain {
  domain: string;
  skills: string[];
}

// Technologies supported by the supplied resume or current-role description.
// Listing a tool does not assert a proficiency score or certification.
export const expertiseData: ExpertiseDomain[] = [
  {
    domain: "Frontend",
    skills: [
      "React",
      "Next.js",
      "TypeScript",
      "JavaScript",
      "Redux",
      "Vue 3",
      "AngularJS",
      "ExtJS",
      "Sencha",
      "HTML",
      "CSS",
      "SCSS",
    ],
  },
  {
    domain: "UI libraries and tooling",
    skills: [
      "Material UI",
      "Tailwind CSS",
      "Vuetify",
      "Bootstrap",
      "Storybook",
      "Component libraries",
      "Application starters",
    ],
  },
  {
    domain: "Backend and integration",
    skills: [
      "Java",
      "Spring Boot",
      "REST APIs",
      "JAX-RS",
      "Struts",
      "Servlets",
      "Node.js",
    ],
  },
  {
    domain: "Cloud and diagnostics",
    skills: ["AWS", "Azure", "Dynatrace", "SonarQube"],
  },
  {
    domain: "Testing",
    skills: [
      "Jest",
      "JUnit",
      "Cucumber",
      "Selenium",
      "Unit testing",
      "Integration testing",
    ],
  },
  {
    domain: "Commerce",
    skills: ["Shopify", "Shopify Liquid", "Vue 3", "Shopify REST APIs"],
  },
  {
    domain: "Design and collaboration",
    skills: [
      "Figma",
      "Adobe XD",
      "Git",
      "Jira",
      "ClearCase",
      "ClearQuest",
      "Code reviews",
      "Team training",
    ],
  },
  {
    domain: "Working knowledge (resume)",
    skills: ["AWS Cognito", "AWS API Gateway"],
  },
];
