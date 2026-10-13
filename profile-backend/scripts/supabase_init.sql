CREATE TABLE content_revision (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 version bigint NOT NULL DEFAULT 1,
 state text NOT NULL CHECK(state IN ('draft','published')),
 content jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE site_state(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), revision_id bigint NOT NULL REFERENCES content_revision(id));
INSERT INTO content_revision(state,content) VALUES ('published','{
  "seo": {
    "/": {
      "title": "Sravana S Parimi | Senior Software Engineer III",
      "description": "I build full-stack applications with React, Java, and Spring Boot, and lead the work that brings them to production. My responsibilities span technical direction, team leadership, and project and portfolio delivery."
    },
    "/work": {
      "title": "Selected Work | Sravana S Parimi",
      "description": "Explore engineering contributions across banking application modernization, produce specifications and inspections, employee timekeeping, and eCommerce, with outcomes and conceptual workflows."
    },
    "/about": {
      "title": "About | Sravana S Parimi",
      "description": "Meet Sravana S Parimi, Senior Software Engineer III at Fifth Third Bank, and explore a career in full-stack engineering and technical leadership."
    },
    "/contact": {
      "title": "Contact | Sravana S Parimi",
      "description": "Discuss a project, engineering opportunity, or collaboration with Sravana S Parimi. Send an inquiry or contact directly by email."
    },
    "/privacy": {
      "title": "Privacy Policy | Sravana S Parimi",
      "description": "Learn how this portfolio handles contact inquiries, authentication, and information you choose to share."
    },
    "/termsconditions": {
      "title": "Terms and Conditions | Sravana S Parimi",
      "description": "Read the terms governing use of Sravana S Parimi''s portfolio website and its content."
    }
  },
  "navigation": [
    {
      "href": "/",
      "label": "Home"
    },
    {
      "href": "/work",
      "label": "Work"
    },
    {
      "href": "/about",
      "label": "About"
    },
    {
      "href": "/contact",
      "label": "Contact"
    }
  ],
  "copy": {
    "pages.HomePage.text.1": "Engineering depth.",
    "pages.HomePage.text.2": "Delivery ownership.",
    "pages.HomePage.text.3": "Selected work across banking, produce inspections, employee timekeeping, and eCommerce. A closer look at the decisions behind the delivery.",
    "pages.HomePage.text.4": "Read case study ",
    "pages.HomePage.text.5": "Explore the case studies ",
    "pages.HomePage.text.6": "From full stack ",
    "pages.HomePage.text.7": "to team delivery.",
    "pages.HomePage.text.8": "My work connects product needs, engineering decisions, and the people who maintain the result.",
    "pages.HomePage.text.9": "More about my approach",
    "pages.HomePage.text.10": "Interfaces for complex work",
    "pages.HomePage.text.11": "Produce specifications and inspections at Kroger and employee timekeeping at FISA-OPA. Clear workflows, reusable components, and accessibility built into the UI.",
    "pages.HomePage.text.12": "React · TypeScript · Accessible UI",
    "pages.HomePage.text.13": "Services that support the experience",
    "pages.HomePage.text.14": "Java · Spring Boot · AWS",
    "pages.HomePage.text.15": "Technical direction & team growth",
    "pages.HomePage.text.16": "Architecture discussions, practical code reviews, and mentorship that help teams understand and own what they build.",
    "pages.HomePage.text.17": "Architecture · Code reviews · Mentorship",
    "pages.HomePage.text.18": "Project & portfolio delivery",
    "pages.HomePage.text.19": "Planning · Prioritization · Ticket ownership",
    "pages.HomePage.text.20": "Let''s Work Together",
    "pages.HomePage.text.21": "Have a product to build, an interface to improve, or an engineering team to grow? Tell me what you''re working on.",
    "pages.HomePage.text.22": "Send Message ",
    "pages.AboutPage.text.1": "The engineer",
    "pages.AboutPage.text.2": "behind the delivery.",
    "pages.AboutPage.text.3": "· ",
    "pages.AboutPage.text.4": "Turning complex requirements into clear interfaces and dependable systems. My career history starts in",
    "pages.AboutPage.text.5": ".",
    "pages.AboutPage.text.6": "About Me",
    "pages.AboutPage.text.7": "I''m a full-stack software engineer working from requirements and implementation through deployment and maintenance. I''ve grown from building individual features to leading UI teams through complex launches in financial services, retail, eCommerce, and enterprise applications.",
    "pages.AboutPage.text.8": "Current work at Fifth Third",
    "pages.AboutPage.text.9": "Technical leadership & delivery",
    "pages.AboutPage.text.10": "My Approach",
    "pages.AboutPage.text.11": "Start with the work people need to do. Make the interface clear, connect it to dependable services, and give the team the patterns and context to maintain it. I value practical architecture, constructive reviews, and knowledge shared through mentorship.",
    "pages.AboutPage.text.12": "See this approach in my work",
    "pages.AboutPage.text.13": "Professional Experience",
    "pages.AboutPage.text.14": "View full resume",
    "pages.AboutPage.text.15": "Let''s Connect",
    "pages.AboutPage.text.16": "For projects, opportunities, or a conversation about engineering.",
    "pages.AboutPage.text.17": "Get in Touch",
    "pages.AboutPage.text.18": "LinkedIn",
    "pages.WorkPage.text.1": "Work that connects ",
    "pages.WorkPage.text.2": "the whole picture.",
    "pages.WorkPage.text.3": "Solutions I build and problems I solve across financial services, produce inspections, employee timekeeping, and eCommerce.",
    "pages.WorkPage.text.4": "These summaries describe my contribution to team projects. Diagrams illustrate the workflows; client interfaces and private system details are not reproduced.",
    "pages.WorkPage.text.5": "· ",
    "pages.WorkPage.text.6": "The problem",
    "pages.WorkPage.text.7": "My contribution",
    "pages.WorkPage.text.8": "The outcome",
    "pages.WorkPage.text.9": "Interested in Collaborating?",
    "pages.WorkPage.text.10": "Let''s talk about your product, your team, and the engineering challenges ahead.",
    "pages.WorkPage.text.11": "Get in Touch ",
    "pages.PrivacyPage.text.1": "Privacy Policy | Sravana S Parimi",
    "pages.PrivacyPage.text.2": "Privacy Policy",
    "pages.PrivacyPage.text.3": "This portfolio presents my professional background and provides contact and authenticated resume access. The sections below describe the information these features process.",
    "pages.PrivacyPage.text.4": "1. Contact inquiries",
    "pages.PrivacyPage.text.5": "The contact form sends your name, message, and the email address or phone number you provide to Web3Forms for processing and email delivery. This information is used to receive and respond to your inquiry. Please do not include passwords, financial account details, or confidential employer information in your message.",
    "pages.PrivacyPage.text.6": "Web3Forms and its service providers process submission data under the",
    "pages.PrivacyPage.text.7": "Web3Forms privacy policy",
    "pages.PrivacyPage.text.8": ". Email inquiries are also processed by the email services used to send and receive them.",
    "pages.PrivacyPage.text.9": "2. Sign-in and resume access",
    "pages.PrivacyPage.text.10": "Auth0 handles sign-in. The resume service checks an access token before returning the PDF. The portfolio does not create a separate account record when you sign in. Auth0 and any identity provider you choose process sign-in information under their own privacy policies.",
    "pages.PrivacyPage.text.11": "3. Browser storage",
    "pages.PrivacyPage.text.12": "Your color palette and composition preferences are stored in your browser''s local storage. Sign-in services may use cookies or other storage for authentication. You can clear browser storage or manage cookies in your browser settings; doing so may reset preferences or require you to sign in again.",
    "pages.PrivacyPage.text.13": "4. Technical monitoring",
    "pages.PrivacyPage.text.14": "When enabled in production, this application''s monitoring sends page performance measurements and event categories for application errors and contact-form success or failure to the site''s monitoring endpoint. The event payload does not include contact-field values, authentication tokens, or page URLs. Hosting and service providers may separately process request information in their operational logs.",
    "pages.PrivacyPage.text.15": "5. Retention and requests",
    "pages.PrivacyPage.text.16": "Submitted inquiries may remain in the receiving mailbox and service providers'' systems under their retention settings and policies. Contact me if you want to ask about, correct, or request deletion of information you have provided. Requests involving a third-party account may also need to be addressed to that provider.",
    "pages.PrivacyPage.text.17": "6. External links and updates",
    "pages.PrivacyPage.text.18": "LinkedIn and other external sites have their own privacy practices. This page may be updated when the site''s features or data handling change.",
    "pages.PrivacyPage.text.19": "If you have any questions about this policy, feel free to",
    "pages.PrivacyPage.text.20": "get in touch",
    "pages.PrivacyPage.text.21": ".",
    "pages.TermsAndConditions.text.1": "Terms & Conditions | Sravana S Parimi",
    "pages.TermsAndConditions.text.2": "Terms and Conditions",
    "pages.TermsAndConditions.text.3": "Welcome to my personal website. By accessing and using this site, you agree to the following terms and conditions. If you do not agree, please do not use this website.",
    "pages.TermsAndConditions.text.4": "1. Use of Content",
    "pages.TermsAndConditions.text.5": "All content on this website, including text, graphics, and personal information, is provided for informational purposes only. You may view and share content with proper attribution, but you may not reproduce or republish it without prior written consent.",
    "pages.TermsAndConditions.text.6": "2. Intellectual Property",
    "pages.TermsAndConditions.text.7": "My original portfolio text and artwork are presented alongside references to work completed with teams. Employer and client names, trademarks, and third-party materials remain the property of their respective owners. Project descriptions do not claim sole ownership of team work or endorsement by those organizations.",
    "pages.TermsAndConditions.text.8": "3. External Links",
    "pages.TermsAndConditions.text.9": "This site may contain links to other websites. I am not responsible for the content, policies, or practices of any third-party sites.",
    "pages.TermsAndConditions.text.10": "4. No Warranty",
    "pages.TermsAndConditions.text.11": "While I strive to keep content accurate and up to date, I make no guarantees about the completeness, accuracy, or reliability of any content on this site.",
    "pages.TermsAndConditions.text.12": "5. Limitation of Liability",
    "pages.TermsAndConditions.text.13": "I shall not be held liable for any direct or indirect damages resulting from your use of this website.",
    "pages.TermsAndConditions.text.14": "6. Illustrative Content",
    "pages.TermsAndConditions.text.15": "Project covers and system diagrams are conceptual illustrations. They are not client screenshots, production architecture diagrams, or evidence of measured performance. They should not be interpreted as employer endorsements.",
    "pages.TermsAndConditions.text.16": "7. Changes to Terms",
    "pages.TermsAndConditions.text.17": "I may update these terms from time to time. Continued use of the site indicates your acceptance of any changes.",
    "pages.TermsAndConditions.text.18": "If you have any questions about these terms, feel free to",
    "pages.TermsAndConditions.text.19": "reach out",
    "pages.TermsAndConditions.text.20": ".",
    "pages.ContactPage.text.1": "Thanks, ",
    "pages.ContactPage.text.2": ". Message submitted.",
    "pages.ContactPage.text.3": "The message service accepted your inquiry. Your preferred contact is",
    "pages.ContactPage.text.4": ".",
    "pages.ContactPage.text.5": "Primary Contact:",
    "pages.ContactPage.text.6": "Your Message:",
    "pages.ContactPage.text.7": "\"",
    "pages.ContactPage.text.8": "\"",
    "pages.ContactPage.text.9": "Send Another Message",
    "pages.ContactPage.text.10": "Contact Sravana S Parimi | Technical Inquiries Welcome",
    "pages.ContactPage.text.11": "Let''s build",
    "pages.ContactPage.text.12": "something useful.",
    "pages.ContactPage.text.13": "Contact",
    "pages.ContactPage.text.14": "Have a project in mind or want to discuss opportunities? Let''s connect.",
    "pages.ContactPage.text.15": "Prefer email?",
    "pages.ContactPage.text.16": "Find me on",
    "pages.ContactPage.text.17": "LinkedIn",
    "components.HeroSection.text.1": "Work",
    "components.HeroSection.text.2": "About",
    "components.HeroSection.text.3": "Contact",
    "components.HeroSection.text.4": "· ",
    "components.HeroSection.text.5": "Explore Work ",
    "components.HeroSection.text.6": "Get in Touch ",
    "components.HeroSection.text.7": "Full stack. Technical direction. Delivery.",
    "components.HeroSection.text.8": "Discover the work ",
    "components.Header.text.1": "sp",
    "components.Header.text.2": ".",
    "components.Header.text.3": "Sravana S Parimi",
    "components.Header.text.4": "Full-stack engineering",
    "components.Footer.text.1": "Sravana",
    "components.Footer.text.2": "S Parimi",
    "components.Footer.text.3": ".",
    "components.Footer.text.4": "Full stack engineering.",
    "components.Footer.text.5": "Technical leadership.",
    "components.Footer.text.6": "LinkedIn ",
    "components.Footer.text.7": "Email ",
    "components.Footer.text.8": "Appearance settings",
    "components.Footer.text.9": "Composition",
    "components.Footer.text.10": "Choose how the portfolio is arranged.",
    "components.Footer.text.11": "Color palette",
    "components.Footer.text.12": "Choose the colors you prefer.",
    "components.Footer.text.13": "© ",
    "components.Footer.text.14": "Privacy Policy",
    "components.Footer.text.15": "Terms of Service",
    "components.MainMenu.text.1": "Resume",
    "components.MobileMenu.text.1": "Explore",
    "components.MobileMenu.text.2": "Work, background, and ways to connect.",
    "components.MobileMenu.text.3": "Resume",
    "components.MobileMenu.text.4": "Resume access requires sign-in."
  },
  "profile": {
    "name": "Sravana S Parimi",
    "role": "Senior Software Engineer III",
    "employer": "Fifth Third Bank",
    "location": "Cincinnati, OH",
    "careerStartYear": 2016,
    "headline": "Full stack engineer. Technical lead.",
    "description": "I build full-stack applications with React, Java, and Spring Boot, and lead the work that brings them to production. My responsibilities span technical direction, team leadership, and project and portfolio delivery.",
    "leadership": "I plan and prioritize work across project and portfolio tickets, break requirements into actionable tasks, assign ownership, and coordinate delivery with engineering and business teams. I stay close to implementation through architecture decisions, code reviews, and mentorship.",
    "currentWork": "At Fifth Third Bank, I contribute to enterprise application modernization with React, TypeScript, Java, and Spring Boot. I built a shared React component library and its Storybook documentation from scratch for reuse across multiple applications. My work also includes data-intensive interfaces, reporting, and document workflows. I also contribute automated tests, quality checks, application packaging, release tooling, and engineering documentation.",
    "url": "https://sravanasparimi.com",
    "linkedin": "https://www.linkedin.com/in/sravanap/",
    "email": "contact@sravanasparimi.com"
  },
  "experiences": [
    {
      "id": "experience-1",
      "year": "June 2026 – Present",
      "title": "Senior Software Engineer III",
      "company": "Fifth Third Bank",
      "description": "At Fifth Third Bank, I contribute to enterprise application modernization with React, TypeScript, Java, and Spring Boot. I built a shared React component library and its Storybook documentation from scratch for reuse across multiple applications. My work also includes data-intensive interfaces, reporting, and document workflows. I also contribute automated tests, quality checks, application packaging, release tooling, and engineering documentation."
    },
    {
      "id": "experience-2",
      "year": "July 2024 – May 2026",
      "title": "Technical Lead - UI",
      "company": "Kroger",
      "description": "Led UI development for produce specifications and produce quality inspection workflows. Built React and Next.js interfaces, integrated Spring Boot services, investigated performance with Dynatrace, and mentored the UI team."
    },
    {
      "id": "experience-3",
      "year": "September 2021 – March 2024",
      "title": "Senior Software Engineer",
      "company": "Financial Information Services Agency (FISA-OPA)",
      "description": "Worked on timekeeping and other payroll-related projects. Led a timekeeping UI redesign using React. Trained the UI team on React and Sencha, worked with business teams on requirements, and supported production issues and post-release maintenance."
    },
    {
      "id": "experience-4",
      "year": "January 2021 – September 2021",
      "title": "Lead Frontend Developer",
      "company": "ICF Next Global",
      "description": "Led eCommerce development with Vue 3 and Shopify Liquid, including retail storefronts. Built reusable components for account, product, cart, and checkout experiences and trained the team on Liquid and Vue."
    },
    {
      "id": "experience-5",
      "year": "October 2016 – January 2021",
      "title": "UI Developer",
      "company": "Financial Information Services Agency (FISA-OPA)",
      "description": "Worked on timekeeping and other payroll-related projects, including timesheet interfaces built with Java, Struts, ExtJS, and jQuery. Worked with business analysts and release teams on development, testing, and production maintenance."
    },
    {
      "id": "experience-6",
      "year": "January 2016 – September 2016",
      "title": "Frontend Developer",
      "company": "Earth7 Consulting LLC",
      "description": "Built business and consumer-facing web interfaces with JSF and AngularJS, implemented JAX-RS APIs, and contributed automated tests using JUnit and Cucumber."
    }
  ],
  "workProjects": [
    {
      "id": "application-modernization",
      "domain": "Full stack",
      "technologies": [
        "React",
        "TypeScript",
        "Java",
        "Spring Boot",
        "Storybook",
        "Jest",
        "Docker"
      ],
      "description": "Contribute to enterprise application modernization at Fifth Third Bank through React and TypeScript interfaces, Java/Spring Boot integration, a shared component library built from scratch for multiple applications, automated quality checks, and release tooling.",
      "outcomes": [
        {
          "label": "React component library and Storybook built from scratch for reuse across applications"
        },
        {
          "label": "Data tables, reporting, and document workflows"
        },
        {
          "label": "Automated tests, quality checks, and container packaging"
        },
        {
          "label": "Release tooling and engineering documentation"
        }
      ]
    },
    {
      "id": "quality-inspection",
      "domain": "Frontend",
      "technologies": [
        "React",
        "Next.js",
        "TypeScript",
        "Java",
        "Spring Boot"
      ],
      "description": "Led UI development for produce specifications and produce quality inspection workflows at Kroger. Built React and Next.js interfaces and integrated Spring Boot services.",
      "outcomes": [
        {
          "label": "UI development for produce specifications and produce quality inspection workflows"
        },
        {
          "label": "Integration of produce inspection data with web interfaces"
        },
        {
          "label": "Performance optimization using Dynatrace"
        },
        {
          "label": "Team mentorship on UI/UX principles and architecture"
        }
      ]
    },
    {
      "id": "workforce-modernization",
      "domain": "Frontend",
      "technologies": [
        "React",
        "TypeScript",
        "Redux",
        "HTML5",
        "CSS3",
        "Bootstrap",
        "Figma"
      ],
      "description": "Led the React UI redesign of timekeeping workflows at FISA-OPA. Analyzed requirements, trained UI team on React and Sencha products, and collaborated with business teams to resolve production issues.",
      "outcomes": [
        {
          "label": "React UI development for legacy timekeeping workflows"
        },
        {
          "label": "Training and mentorship for UI development team"
        },
        {
          "label": "RESTful API integration with responsive design"
        },
        {
          "label": "User accessibility considered in release planning"
        }
      ]
    },
    {
      "id": "ecommerce-shopify-vue",
      "domain": "Frontend",
      "technologies": [
        "Vue 3",
        "Shopify",
        "Liquid",
        "TypeScript",
        "SCSS",
        "APIs"
      ],
      "description": "Led development of multiple eCommerce websites using Vue3 and Shopify Liquid at ICF Next Global. Directed creation of e-commerce platform for a retail client. Built core pages (Account, Profile, Product, Cart, Checkout) using Shopify Liquid and reusable Vue components.",
      "outcomes": [
        {
          "label": "Core shopping and account experiences for a retail client"
        },
        {
          "label": "Shopify REST API integration for dynamic content"
        },
        {
          "label": "Vue 3 composition API for reusable components"
        },
        {
          "label": "Team training on Liquid, Vue, and eCommerce best practices"
        }
      ]
    },
    {
      "id": "payroll-systems-ui",
      "domain": "Frontend",
      "technologies": [
        "ExtJS",
        "JavaScript",
        "jQuery",
        "Java",
        "HTML5",
        "CSS",
        "Selenium"
      ],
      "description": "Enhanced timekeeping interfaces at FISA-OPA through Struts and Java enhancements. Redesigned client-facing pages, developed system enhancements and defect fixes, and performed testing. Collaborated with Business Analysts and Release Management Team.",
      "outcomes": [
        {
          "label": "Java application maintenance and framework upgrades"
        },
        {
          "label": "ExtJS and jQuery components for complex UI functionality"
        },
        {
          "label": "Selenium WebDriver testing"
        },
        {
          "label": "Production maintenance and issue resolution"
        }
      ]
    },
    {
      "id": "business-web-applications",
      "domain": "Full stack",
      "technologies": [
        "JSF",
        "JavaScript",
        "AngularJS",
        "Java",
        "JAX-RS",
        "JUnit",
        "Cucumber"
      ],
      "description": "Contributed to business and consumer-facing web applications at Earth7 Consulting LLC. Developed User Interfaces using JSF and AngularJS with automated testing through JUnit and Cucumber. Implemented JAX-RS RESTful APIs and integrated web services.",
      "outcomes": [
        {
          "label": "AngularJS controllers, views, services, and custom filters"
        },
        {
          "label": "JAX-RS RESTful API implementation"
        },
        {
          "label": "Automated testing with JUnit and Cucumber"
        },
        {
          "label": "Cross-browser compatible pages with HTML5, CSS3, JavaScript"
        }
      ]
    }
  ],
  "caseStudies": [
    {
      "id": "application-modernization",
      "name": "Enterprise application modernization",
      "preview": "Built a shared React component library and Storybook documentation from scratch for reuse across multiple applications.",
      "organization": "Fifth Third Bank",
      "role": "Senior Software Engineer III",
      "summary": "Modernizing banking operations interfaces and building shared UI tools for application teams.",
      "problem": "Application modernization involves more than replacing individual screens. Business workflows need usable data interfaces, while engineering teams need shared components, repeatable quality checks, and clear delivery guidance. My work spans these application and development needs.",
      "contribution": "Develop React and TypeScript interfaces and collaborate on Java/Spring Boot integration. Built a shared React component library and its Storybook documentation from scratch for reuse across multiple applications. The library includes data tables with filtering, inline editing, and configurable columns. Contribute reporting, spreadsheet export, document editing, and account interfaces. Improve automated tests, code-quality checks, and container packaging. Develop release tooling and engineering documentation to support test execution, review, and consistent delivery.",
      "outcome": "Contributions include a reusable component library with Storybook documentation for multiple applications, business application interfaces, automated checks, and release-support tooling. Development is ongoing, with continued work on application modernization and reusable engineering foundations.",
      "flow": [
        "Requirements",
        "Web application",
        "Review and iteration"
      ],
      "flowNote": "Conceptual development workflow; not a production architecture diagram.",
      "technologies": [
        "React",
        "TypeScript",
        "Java",
        "Spring Boot",
        "Storybook",
        "Jest",
        "Docker"
      ]
    },
    {
      "id": "quality-inspection",
      "name": "Produce specifications and inspections",
      "preview": "Led React and Next.js interface development for produce specifications and produce quality inspection workflows.",
      "organization": "Kroger",
      "role": "Technical Lead · UI",
      "summary": "Web interfaces for produce specifications and produce quality inspections.",
      "problem": "Produce inspection workflows need accessible product specifications and quality information. The work focused on bringing those details into web interfaces that support produce inspections.",
      "contribution": "Led UI development with React, Next.js, and TypeScript. Integrated Java services and guided the team on UI development and usability.",
      "outcome": "Delivered interfaces for produce specifications and quality inspection workflows. Used Dynatrace to investigate performance and mentored the team on UI/UX principles and architecture.",
      "flow": [
        "Produce specifications",
        "Produce inspection",
        "Inspection details"
      ],
      "flowNote": "Conceptual user workflow; not a production infrastructure diagram.",
      "technologies": [
        "React",
        "Next.js",
        "TypeScript",
        "Java",
        "Spring Boot"
      ]
    },
    {
      "id": "workforce-modernization",
      "name": "Employee timekeeping and leave",
      "preview": "Led a React redesign of employee timekeeping interfaces, translated business requirements, and trained the team while supporting production operations.",
      "organization": "FISA-OPA",
      "role": "Senior Software Engineer",
      "summary": "Modernizing employee timekeeping and leave interfaces.",
      "problem": "Timekeeping workflows needed a modern UI while continuing to support existing business requirements and production operations.",
      "contribution": "Alongside other payroll-related projects at FISA-OPA, led a React UI redesign for timekeeping workflows, analyzed requirements with business teams, integrated RESTful APIs, and trained the UI team on React and Sencha. Worked with UX designers on layouts and considered user accessibility in release planning.",
      "outcome": "Developed React interfaces and supported the team with training and post-release maintenance. Continued collaborating with business teams to resolve production issues.",
      "flow": [
        "Employee time and leave",
        "Responsive React interface",
        "Time and leave workflows"
      ],
      "flowNote": "Conceptual timekeeping workflow; not a production architecture diagram.",
      "technologies": [
        "React",
        "TypeScript",
        "Redux",
        "HTML5",
        "CSS3",
        "Bootstrap",
        "Figma"
      ]
    },
    {
      "id": "ecommerce-shopify-vue",
      "name": "Retail eCommerce storefront",
      "preview": "Directed storefront development from account to checkout, built reusable Vue components, and trained the team on Vue and Liquid.",
      "organization": "ICF Next Global",
      "role": "Lead Frontend Developer",
      "summary": "Connecting a retail storefront from discovery to checkout.",
      "problem": "A retail client needed an eCommerce experience with consistent account, product, cart, and checkout pages and reusable components for ongoing development.",
      "contribution": "Directed storefront development with Shopify Liquid and Vue 3. Built core shopping and account pages, connected Shopify REST APIs for dynamic content, and trained the team on Liquid and Vue development.",
      "outcome": "Delivered core eCommerce journeys using reusable Vue components and Shopify integration, creating a shared component approach for the development team.",
      "flow": [
        "Product discovery",
        "Product & cart",
        "Shopify checkout"
      ],
      "flowNote": "Conceptual shopping journey; this is not a screenshot of the client site.",
      "technologies": [
        "Vue 3",
        "Shopify",
        "Liquid",
        "TypeScript",
        "SCSS",
        "APIs"
      ]
    },
    {
      "id": "business-web-applications",
      "name": "Business and commerce web applications",
      "preview": "Built web interfaces, integrated Java APIs, and contributed automated tests across client applications.",
      "organization": "Earth7 Consulting LLC",
      "role": "Frontend Developer",
      "summary": "Interfaces and Java API integration for business and commerce applications.",
      "problem": "Client application work included business and commerce interfaces, service integration, and testing.",
      "contribution": "Developed interfaces with JSF and AngularJS, implemented JAX-RS APIs, and contributed JUnit and Cucumber tests. Worked with business analysts and release teams on requirements and delivery.",
      "outcome": "Contributed application interfaces, API integrations, automated tests, and post-implementation support.",
      "flow": [
        "Business requirements",
        "Interface and API",
        "Testing and support"
      ],
      "flowNote": "Conceptual development workflow; no client system details are shown.",
      "technologies": [
        "JSF",
        "JavaScript",
        "AngularJS",
        "Java",
        "JAX-RS",
        "JUnit",
        "Cucumber"
      ]
    }
  ],
  "expertiseData": [
    {
      "domain": "Frontend",
      "skills": [
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
        "SCSS"
      ]
    },
    {
      "domain": "UI libraries and tooling",
      "skills": [
        "Material UI",
        "Tailwind CSS",
        "Vuetify",
        "Bootstrap",
        "Storybook",
        "Component libraries",
        "Application starters"
      ]
    },
    {
      "domain": "Backend and integration",
      "skills": [
        "Java",
        "Spring Boot",
        "REST APIs",
        "JAX-RS",
        "Struts",
        "Servlets",
        "Node.js"
      ]
    },
    {
      "domain": "Cloud and diagnostics",
      "skills": [
        "AWS",
        "Azure",
        "Dynatrace",
        "SonarQube"
      ]
    },
    {
      "domain": "Testing",
      "skills": [
        "Jest",
        "JUnit",
        "Cucumber",
        "Selenium",
        "Unit testing",
        "Integration testing"
      ]
    },
    {
      "domain": "Commerce",
      "skills": [
        "Shopify",
        "Shopify Liquid",
        "Vue 3",
        "Shopify REST APIs"
      ]
    },
    {
      "domain": "Design and collaboration",
      "skills": [
        "Figma",
        "Adobe XD",
        "Git",
        "Jira",
        "ClearCase",
        "ClearQuest",
        "Code reviews",
        "Team training"
      ]
    },
    {
      "domain": "Working knowledge (resume)",
      "skills": [
        "AWS Cognito",
        "AWS API Gateway"
      ]
    }
  ]
}'::jsonb);
INSERT INTO site_state SELECT true,id FROM content_revision WHERE state='published';
CREATE TABLE accounts (
 id uuid PRIMARY KEY, issuer text NOT NULL, subject text NOT NULL,
 first_name varchar(80) NOT NULL DEFAULT '', last_name varchar(80) NOT NULL DEFAULT '',
 email varchar(254), is_admin boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 UNIQUE(issuer,subject)
);
CREATE TABLE audit_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor uuid REFERENCES accounts(id), action varchar(80) NOT NULL, resource varchar(128) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX audit_created ON audit_events(created_at);
CREATE TABLE media(id uuid PRIMARY KEY, filename text NOT NULL UNIQUE, content_type varchar(80) NOT NULL, alt_text varchar(500) NOT NULL, private boolean NOT NULL DEFAULT false, size_bytes bigint NOT NULL, sha256 varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE inquiries(id uuid PRIMARY KEY, idempotency_key varchar(128) NOT NULL UNIQUE, payload_hash varchar(64) NOT NULL, name varchar(120) NOT NULL,email varchar(254),phone varchar(32),message varchar(8000) NOT NULL, archived boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE outbox(id uuid PRIMARY KEY, inquiry_id uuid NOT NULL UNIQUE REFERENCES inquiries(id), status varchar(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed')),attempts int NOT NULL DEFAULT 0,available_at timestamptz NOT NULL DEFAULT now(),lease_id uuid,lease_until timestamptz,last_error varchar(128), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX outbox_available ON outbox(available_at) WHERE status IN ('pending','processing');
CREATE TABLE contact_limits(key varchar(64) PRIMARY KEY, window_start timestamptz NOT NULL DEFAULT now(),requests int NOT NULL);
ALTER TABLE site_state ADD COLUMN target_revision bigint REFERENCES content_revision(id);
CREATE TABLE publication_jobs(id uuid PRIMARY KEY,revision_id bigint NOT NULL UNIQUE REFERENCES content_revision(id), status varchar(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','complete','failed','superseded')), lease_id uuid, lease_until timestamptz, error varchar(128), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE job_runs(name varchar(80) NOT NULL,scheduled_at timestamptz NOT NULL,status varchar(16) NOT NULL DEFAULT 'pending', lease_id uuid,lease_until timestamptz,attempts int NOT NULL DEFAULT 0,PRIMARY KEY(name,scheduled_at));
ALTER TABLE accounts
  ADD COLUMN phone varchar(32),
  ADD COLUMN address_line1 varchar(120),
  ADD COLUMN address_line2 varchar(120),
  ADD COLUMN city varchar(80),
  ADD COLUMN region varchar(80),
  ADD COLUMN postal_code varchar(20),
  ADD COLUMN country varchar(80);
