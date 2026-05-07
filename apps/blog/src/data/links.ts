/**
 * Link group data for Sites and Posters directives.
 *
 * Each key is a group name referenced in markdown via:
 *   :::sites{group="design"}
 *   :::posters{group="movies"}
 */

export interface LinkItem {
  url: string;
  title: string;
  description?: string;
  cover?: string;
  icon?: string;
  labels?: Array<{ name: string; color?: string }>;
}

export const LINKS: Record<string, LinkItem[]> = {
  design: [
    {
      url: "https://astro.build",
      title: "Astro",
      description: "The web framework for content-driven websites",
      icon: "https://astro.build/favicon.svg",
      labels: [{ name: "Framework", color: "#ff5d01" }],
    },
    {
      url: "https://tailwindcss.com",
      title: "Tailwind CSS",
      description: "A utility-first CSS framework",
      icon: "https://tailwindcss.com/favicons/favicon-32x32.png",
      labels: [{ name: "CSS", color: "#06b6d4" }],
    },
    {
      url: "https://vercel.com",
      title: "Vercel",
      description: "Develop. Preview. Ship.",
      icon: "https://vercel.com/favicon.ico",
      labels: [{ name: "Platform", color: "#000" }],
    },
    {
      url: "https://figma.com",
      title: "Figma",
      description: "Collaborative design tool",
      icon: "https://static.figma.com/app/icon/1/favicon.png",
      labels: [{ name: "Design", color: "#a259ff" }],
    },
  ],
  movies: [
    {
      url: "https://www.imdb.com/title/tt0111161/",
      title: "The Shawshank Redemption",
    },
    {
      url: "https://www.imdb.com/title/tt0068646/",
      title: "The Godfather",
    },
    {
      url: "https://www.imdb.com/title/tt0468569/",
      title: "The Dark Knight",
    },
    {
      url: "https://www.imdb.com/title/tt0167260/",
      title: "The Lord of the Rings",
    },
    {
      url: "https://www.imdb.com/title/tt0110912/",
      title: "Pulp Fiction",
    },
    {
      url: "https://www.imdb.com/title/tt0137523/",
      title: "Fight Club",
    },
  ],
  albums: [
    {
      url: "https://music.163.com/album?id=34822062",
      title: "范特西",
    },
    {
      url: "https://music.163.com/album?id=355360",
      title: "七里香",
    },
    {
      url: "https://music.163.com/album?id=356360",
      title: "十一月的萧邦",
    },
    {
      url: "https://music.163.com/album?id=357310",
      title: "依然范特西",
    },
    {
      url: "https://music.163.com/album?id=358080",
      title: "我很忙",
    },
    {
      url: "https://music.163.com/album?id=359680",
      title: "魔杰座",
    },
  ],
};
