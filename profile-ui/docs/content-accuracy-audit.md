# Portfolio content accuracy audit

## Scope and evidence

Reviewed the portfolio's public page copy, metadata, shared career and project data, dormant claim-bearing components, project illustrations, privacy disclosures, and downloadable resume. The original four-page resume is preserved at `private/archive/Sravana_Parimi-before-accuracy-audit.pdf`; the revised three-page resume is `private/Sravana_Parimi.pdf`.

The original resume supplies career history through Kroger. The owner subsequently confirmed additional payroll-related projects at FISA alongside CityTime; descriptions now preserve that distinction. The owner supplied the current Fifth Third responsibilities and confirmed the title **Senior Software Engineer III**, and requested that the revised resume include Fifth Third and all earlier roles. These are first-person statements, not independently verified employment records. Job requirements, including “10–20 years,” are not evidence of personal experience or accomplishments.

## Changes and why

| Enhancement | Why |
| --- | --- |
| Added Fifth Third to the resume, homepage, and biography with React, Java, Spring Boot, AWS, Storybook libraries, and application starters. | Describes the actual work the owner supplied without inventing banking architecture or outcomes. |
| Retained Kroger, both FISA-OPA roles, ICF Next Global, and Earth7 with their original titles and supported responsibilities. | Preserves the full documented career history. |
| Removed the unsupported “11+ years” claim and used career history beginning in 2016. | The listed chronology does not establish that total. |
| Replaced Kroger's stale “Present” with July 2024–May 2026 and Fifth Third with June 2026–Present, following owner confirmation. | Avoids implying simultaneous current roles or guessing a transition date. |
| Removed unsupported user counts, transaction volumes, percentages, team sizes, and technology claims. | Prevents invented metrics and qualifications from appearing as accomplishments. |
| Removed unused fabricated project data and the growth visualization; simplified related synthetic fixtures. | Prevents stale claims from resurfacing in future UI changes. |
| Narrowed CityTime descriptions to timekeeping and leave workflows. | Official NYC sources distinguish CityTime from separate payroll and benefits applications. |
| Replaced metric-bearing SVG artwork and labeled case-study diagrams conceptual. | Illustrations should not imply measured results or disclose supposed production architecture. |
| Rewrote privacy disclosures around Web3Forms, Auth0, account callbacks, local storage, and optional monitoring. | The previous no-collection language contradicted the application's behavior. |
| Corrected intellectual-property and imagery descriptions. | Team work and third-party names do not imply sole ownership or employer endorsement. |
| Rebuilt the resume as selectable text in three readable pages and checked every rendered page. | Removes the nearly empty fourth page while retaining all roles, education, and the listed certification. |
| Updated the hero test to use shared profile copy and expanded accessibility checks to policy pages. | Verifies the revised content and public policy routes. |

## External references and verification limits

- [NYC employee portals](https://www.nyc.gov/site/opa/other-services/portals.page) identifies CityTime's time and leave functions and lists other employee systems separately.
- [NYC Comptroller's financial IT report](https://comptroller.nyc.gov/reports/neglecting-the-basics-the-critical-need-to-modernize-the-citys-financial-it/) provides further system context. It does not verify this individual's contributions.
- [Source for Sports](https://www.sourceforsports.ca/) corroborates retailer context, not authorship or employment.
- [Web3Forms privacy policy](https://web3forms.com/privacy) describes the form provider's processing. The portfolio now links to it rather than promising unsupported provider retention or confidentiality guarantees.
- [Auth0 data security guidance](https://auth0.com/docs/secure/security-guidance/data-security) supplies provider context; local authentication and callback code establishes this application's described behavior.
- The supplied [LinkedIn profile](https://www.linkedin.com/in/sravanap/) could not be retrieved publicly. No similarly named person's profile was used as evidence.

Education, certification, and employment remain owner/resume-reported. Public web sources cannot certify these personal records. The live production domain was not retrievable during this audit; source, local browser, and production-build checks do not establish the deployed site's current configuration.

## Unresolved details deliberately omitted

- Dates resolved by owner: Kroger ended May 31, 2026; Fifth Third began June 1, 2026. Website and resume use month/year formatting.
- Whether “Swift” means the programming language or SWIFT messaging; copy currently says “legacy desktop applications.”
- Unsupported quantified impact, confidential system details, and responsibilities inferred solely from the supplied job requirements.

The public contact address is retained from existing site configuration; mailbox delivery and production provider/hosting retention settings were not independently verified. No real contact submission or production deployment was performed.

## Validation

- Production build and six-route prerender completed.
- 156 unit tests passed.
- Full 17-test browser suite passed, including all three compositions, responsive layouts, keyboard behavior, contrast, and private-resume blocking.
- Expanded seven-test public-route accessibility and resume-blocking suite passed, including privacy and terms pages.
- Lint: zero errors; four existing Fast Refresh warnings.
- Revised resume: three pages; all six role entries retained; every page rendered and visually inspected.
- Built HTML, SVG, and JavaScript passed a check for removed tenure/scale claims and required current-role details; no PDF is included in dist. The private resume remains behind the existing authenticated service.

## October 5 2026 public portfolio disclosure pass

At the owner's request, changed public project titles to general descriptions and retained organization/title/date facts from the supplied resume and owner statements. Added Fifth Third application modernization and Earth7 business web application case studies using only those existing contributions. Fifth Third outcomes explicitly remain ongoing. Generalized project descriptions in the experience timeline, Home and Work data, fragment identifiers, and Kroger illustration. Removed the internal inspection product/team name, retail client name, platform topology, and retirement-product detail from website copy. Technologies describe reported experience, not certified publication permission.

Public checks performed:
- https://www.nyc.gov/site/opa/other-services/portals.page confirms time and leave context only.
- https://www.sourceforsports.ca/ confirms retailer context only; client name is omitted from website case studies regardless.
- https://www.53.com/content/fifth-third/en/careers.html confirms general technology function, not this person's project, stack, or contributions. No public product announcement was attributed to the owner.
- Searches did not establish that Earth7 Solutions is the same entity as the resume's Earth7 Consulting LLC. Retained the resume name; confirmation remains open.
- No authoritative Kroger product source was found in the targeted search. Absence of a result is not proof of secrecy; the internal product name was omitted as requested.

This is an editorial reduction in disclosure, not legal clearance. Employment versus client relationships and permission to identify organizations remain owner-reported and need correction if the resume labels describe client engagements. No NDA or employer publication policy was supplied. Generalizing titles does not anonymize organizations or guarantee compliance. The protected resume PDF and historical audit documents retain their original detail; they were not republished or rewritten in this pass. Old product-specific fragment identifiers were replaced with general identifiers; prior bookmarks to those fragments no longer target a case-study section. No production deployment performed.

Validation for this pass: `npm run test:run` passed 156 tests in 23 files; `npm run build` passed and prerendered all six public routes; `npx playwright test e2e/quality.spec.ts` passed all eight checks (public-route accessibility, private-resume blocking, reduced motion). A built HTML/JavaScript/SVG scan found none of the removed internal product/team or retail client names and confirmed both added organizations in Work HTML. Browser checks initially could not bind the local port inside the sandbox; the permitted rerun passed.

## Fifth Third intake expansion

Following the owner's request to add a thorough update, expanded the existing Fifth Third case study, project summary, and shared current-role copy. Covered reusable components and Storybook; data interfaces, reporting and document workflows; automated tests and application packaging; and release tooling and engineering documentation. Used collaboration wording for backend integration and ongoing wording for results. These are owner-supplied intake claims, partly inferred from repository activity by its author; this assistant did not inspect the employer repositories or independently verify attribution. The update request authorizes these local editorial changes, not employer publication clearance.

Excluded internal project/repository names, hostnames, coworker identities, commit/test counts, entitlement details, security defects, exact releases, and unreleased features. No new metrics or mentoring claims were added. Earth7 remains based on the earlier resume because no new Earth7 intake was supplied. The private resume and deployment workflow were not modified in this update.

Owner subsequently clarified that the shared React component library and its Storybook setup/documentation were built from scratch for reuse across multiple applications. Public copy now explicitly records that ownership and purpose. This is an owner-confirmed contribution; no application count, adoption metric, or sole ownership claim was added.

## Business context wording review

Owner clarified the Kroger domain as produce specifications and produce quality inspection flows. Updated project title, preview, summary, problem/outcome text, conceptual diagram labels, public illustration, experience text, and Home/Work introductions accordingly. Kept the existing general fragment ID to preserve links. Internal product names/acronyms remain omitted. Also clarified FISA as employee timekeeping and leave, ICF as retail eCommerce, Fifth Third as banking operations interfaces and shared development tools, and Earth7 as business and commerce web applications. Corrected Earth7's project category from Backend to Full stack to match its documented interface and API contributions. No additional client details or metrics inferred. Resume and historical documents retain their original wording.
