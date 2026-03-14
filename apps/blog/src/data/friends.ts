export interface Friend {
  name: string;
  url: string;
  avatar?: string;
  description?: string;
}

export const FRIENDS: Friend[] = [
  {
    name: "Astro",
    url: "https://astro.build",
    avatar: "https://astro.build/favicon.svg",
    description: "The web framework for content-driven websites",
  },
  {
    name: "Tailwind CSS",
    url: "https://tailwindcss.com",
    avatar: "https://tailwindcss.com/favicons/favicon-32x32.png",
    description: "A utility-first CSS framework",
  },
];
