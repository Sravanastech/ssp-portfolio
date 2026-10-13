import { profile } from "./profile";
export const publicMetadata: Record<
  string,
  { title: string; description: string }
> = {
  "/": {
    title: `${profile.name} | ${profile.role}`,
    description: profile.description,
  },
  "/work": {
    title: `Selected Work | ${profile.name}`,
    description:
      "Explore engineering contributions across banking application modernization, produce specifications and inspections, employee timekeeping, and eCommerce, with outcomes and conceptual workflows.",
  },
  "/about": {
    title: `About | ${profile.name}`,
    description: `Meet ${profile.name}, ${profile.role} at ${profile.employer}, and explore a career in full-stack engineering and technical leadership.`,
  },
  "/contact": {
    title: `Contact | ${profile.name}`,
    description:
      "Discuss a project, engineering opportunity, or collaboration with Sravana S Parimi. Send an inquiry or contact directly by email.",
  },
  "/privacy": {
    title: `Privacy Policy | ${profile.name}`,
    description:
      "Learn how this portfolio handles contact inquiries, authentication, and information you choose to share.",
  },
  "/termsconditions": {
    title: `Terms and Conditions | ${profile.name}`,
    description:
      "Read the terms governing use of Sravana S Parimi's portfolio website and its content.",
  },
};

export const navigation = [{href:"/",label:"Home"},{href:"/work",label:"Work"},{href:"/about",label:"About"},{href:"/contact",label:"Contact"}];
