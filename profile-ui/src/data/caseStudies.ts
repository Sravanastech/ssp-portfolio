import { workProjects } from "./workProjects";

// Contributions are owner/resume-reported; public sources verify context only.
const stories = [
  {
    id: "application-modernization",
    slug: "enterprise-application-modernization",
    name: "Enterprise application modernization",
    preview:
      "Built a shared React component library and Storybook documentation from scratch for reuse across multiple applications.",
    organization: "Fifth Third Bank",
    role: "Senior Software Engineer III",
    summary:
      "Modernizing banking operations interfaces and building shared UI tools for application teams.",
    problem:
      "Application modernization involves more than replacing individual screens. Business workflows need usable data interfaces, while engineering teams need shared components, repeatable quality checks, and clear delivery guidance. My work spans these application and development needs.",
    contribution:
      "Develop React and TypeScript interfaces and collaborate on Java/Spring Boot integration. Built a shared React component library and its Storybook documentation from scratch for reuse across multiple applications. The library includes data tables with filtering, inline editing, and configurable columns. Contribute reporting, spreadsheet export, document editing, and account interfaces. Improve automated tests, code-quality checks, and container packaging. Develop release tooling and engineering documentation to support test execution, review, and consistent delivery.",
    outcome:
      "Contributions include a reusable component library with Storybook documentation for multiple applications, business application interfaces, automated checks, and release-support tooling. Development is ongoing, with continued work on application modernization and reusable engineering foundations.",
    flow: ["Requirements", "Web application", "Review and iteration"],
    flowNote:
      "Conceptual development workflow; not a production architecture diagram.",
  },
  {
    id: "quality-inspection",
    slug: "produce-specifications-inspections",
    name: "Produce specifications and inspections",
    preview:
      "Led React and Next.js interface development for produce specifications and produce quality inspection workflows.",
    organization: "Kroger",
    role: "Technical Lead · UI",
    summary:
      "Web interfaces for produce specifications and produce quality inspections.",
    problem:
      "Produce inspection workflows need accessible product specifications and quality information. The work focused on bringing those details into web interfaces that support produce inspections.",
    contribution:
      "Led UI development with React, Next.js, and TypeScript. Integrated Java services and guided the team on UI development and usability.",
    outcome:
      "Delivered interfaces for produce specifications and quality inspection workflows. Used Dynatrace to investigate performance and mentored the team on UI/UX principles and architecture.",
    flow: [
      "Produce specifications",
      "Produce inspection",
      "Inspection details",
    ],
    flowNote:
      "Conceptual user workflow; not a production infrastructure diagram.",
  },
  {
    id: "workforce-modernization",
    slug: "employee-timekeeping-leave",
    name: "Employee timekeeping and leave",
    preview:
      "Led a React redesign of employee timekeeping interfaces, translated business requirements, and trained the team while supporting production operations.",
    organization: "FISA-OPA",
    role: "Senior Software Engineer",
    summary: "Modernizing employee timekeeping and leave interfaces.",
    problem:
      "Timekeeping workflows needed a modern UI while continuing to support existing business requirements and production operations.",
    contribution:
      "Alongside other payroll-related projects at FISA-OPA, led a React UI redesign for timekeeping workflows, analyzed requirements with business teams, integrated RESTful APIs, and trained the UI team on React and Sencha. Worked with UX designers on layouts and considered user accessibility in release planning.",
    outcome:
      "Developed React interfaces and supported the team with training and post-release maintenance. Continued collaborating with business teams to resolve production issues.",
    flow: [
      "Employee time and leave",
      "Responsive React interface",
      "Time and leave workflows",
    ],
    flowNote:
      "Conceptual timekeeping workflow; not a production architecture diagram.",
  },
  {
    id: "ecommerce-shopify-vue",
    slug: "retail-ecommerce-storefront",
    name: "Retail eCommerce storefront",
    preview:
      "Directed storefront development from account to checkout, built reusable Vue components, and trained the team on Vue and Liquid.",
    organization: "ICF Next Global",
    role: "Lead Frontend Developer",
    summary: "Connecting a retail storefront from discovery to checkout.",
    problem:
      "A retail client needed an eCommerce experience with consistent account, product, cart, and checkout pages and reusable components for ongoing development.",
    contribution:
      "Directed storefront development with Shopify Liquid and Vue 3. Built core shopping and account pages, connected Shopify REST APIs for dynamic content, and trained the team on Liquid and Vue development.",
    outcome:
      "Delivered core eCommerce journeys using reusable Vue components and Shopify integration, creating a shared component approach for the development team.",
    flow: ["Product discovery", "Product & cart", "Shopify checkout"],
    flowNote:
      "Conceptual shopping journey; this is not a screenshot of the client site.",
  },
  {
    id: "business-web-applications",
    slug: "business-commerce-web-applications",
    name: "Business and commerce web applications",
    preview:
      "Built web interfaces, integrated Java APIs, and contributed automated tests across client applications.",
    organization: "Earth7 Consulting LLC",
    role: "Frontend Developer",
    summary:
      "Interfaces and Java API integration for business and commerce applications.",
    problem:
      "Client application work included business and commerce interfaces, service integration, and testing.",
    contribution:
      "Developed interfaces with JSF and AngularJS, implemented JAX-RS APIs, and contributed JUnit and Cucumber tests. Worked with business analysts and release teams on requirements and delivery.",
    outcome:
      "Contributed application interfaces, API integrations, automated tests, and post-implementation support.",
    flow: ["Business requirements", "Interface and API", "Testing and support"],
    flowNote:
      "Conceptual development workflow; no client system details are shown.",
  },
];

export const caseStudies = stories.map((story) => ({
  ...story,
  technologies:
    workProjects.find((project) => project.id === story.id)?.technologies ?? [],
}));
