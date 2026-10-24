export interface ProjectOutcome {
  label: string;
}

export interface WorkProject {
  id: string;
  /** URL slug of the dedicated project page; absent when there is none. */
  slug?: string;
  domain: string;
  technologies: string[];
  description: string;
  outcomes: ProjectOutcome[];
}

export const workProjects: WorkProject[] = [
  {
    id: "application-modernization",
    slug: "enterprise-application-modernization",
    domain: "Full stack",
    technologies: [
      "React",
      "TypeScript",
      "Java",
      "Spring Boot",
      "Storybook",
      "Jest",
      "Docker",
    ],
    description:
      "Contribute to enterprise application modernization at Fifth Third Bank through React and TypeScript interfaces, Java/Spring Boot integration, a shared component library built from scratch for multiple applications, automated quality checks, and release tooling.",
    outcomes: [
      {
        label:
          "React component library and Storybook built from scratch for reuse across applications",
      },
      { label: "Data tables, reporting, and document workflows" },
      { label: "Automated tests, quality checks, and container packaging" },
      { label: "Release tooling and engineering documentation" },
    ],
  },
  {
    id: "quality-inspection",
    slug: "produce-specifications-inspections",
    domain: "Frontend",
    technologies: ["React", "Next.js", "TypeScript", "Java", "Spring Boot"],
    description:
      "Led UI development for produce specifications and produce quality inspection workflows at Kroger. Built React and Next.js interfaces and integrated Spring Boot services.",
    outcomes: [
      {
        label:
          "UI development for produce specifications and produce quality inspection workflows",
      },
      { label: "Integration of produce inspection data with web interfaces" },
      { label: "Performance optimization using Dynatrace" },
      { label: "Team mentorship on UI/UX principles and architecture" },
    ],
  },
  {
    id: "workforce-modernization",
    slug: "employee-timekeeping-leave",
    domain: "Frontend",
    technologies: [
      "React",
      "TypeScript",
      "Redux",
      "HTML5",
      "CSS3",
      "Bootstrap",
      "Figma",
    ],
    description:
      "Led the React UI redesign of timekeeping workflows at FISA-OPA. Analyzed requirements, trained UI team on React and Sencha products, and collaborated with business teams to resolve production issues.",
    outcomes: [
      { label: "React UI development for legacy timekeeping workflows" },
      { label: "Training and mentorship for UI development team" },
      { label: "RESTful API integration with responsive design" },
      { label: "User accessibility considered in release planning" },
    ],
  },
  {
    id: "ecommerce-shopify-vue",
    slug: "retail-ecommerce-storefront",
    domain: "Frontend",
    technologies: ["Vue 3", "Shopify", "Liquid", "TypeScript", "SCSS", "APIs"],
    description:
      "Led development of multiple eCommerce websites using Vue3 and Shopify Liquid at ICF Next Global. Directed creation of e-commerce platform for a retail client. Built core pages (Account, Profile, Product, Cart, Checkout) using Shopify Liquid and reusable Vue components.",
    outcomes: [
      { label: "Core shopping and account experiences for a retail client" },
      { label: "Shopify REST API integration for dynamic content" },
      { label: "Vue 3 composition API for reusable components" },
      { label: "Team training on Liquid, Vue, and eCommerce best practices" },
    ],
  },
  {
    id: "payroll-systems-ui",
    domain: "Frontend",
    technologies: [
      "ExtJS",
      "JavaScript",
      "jQuery",
      "Java",
      "HTML5",
      "CSS",
      "Selenium",
    ],
    description:
      "Enhanced timekeeping interfaces at FISA-OPA through Struts and Java enhancements. Redesigned client-facing pages, developed system enhancements and defect fixes, and performed testing. Collaborated with Business Analysts and Release Management Team.",
    outcomes: [
      { label: "Java application maintenance and framework upgrades" },
      { label: "ExtJS and jQuery components for complex UI functionality" },
      { label: "Selenium WebDriver testing" },
      { label: "Production maintenance and issue resolution" },
    ],
  },
  {
    id: "business-web-applications",
    slug: "business-commerce-web-applications",
    domain: "Full stack",
    technologies: [
      "JSF",
      "JavaScript",
      "AngularJS",
      "Java",
      "JAX-RS",
      "JUnit",
      "Cucumber",
    ],
    description:
      "Contributed to business and consumer-facing web applications at Earth7 Consulting LLC. Developed User Interfaces using JSF and AngularJS with automated testing through JUnit and Cucumber. Implemented JAX-RS RESTful APIs and integrated web services.",
    outcomes: [
      { label: "AngularJS controllers, views, services, and custom filters" },
      { label: "JAX-RS RESTful API implementation" },
      { label: "Automated testing with JUnit and Cucumber" },
      { label: "Cross-browser compatible pages with HTML5, CSS3, JavaScript" },
    ],
  },
];
