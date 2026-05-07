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
      cover: "https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_.jpg",
    },
    {
      url: "https://www.imdb.com/title/tt0068646/",
      title: "The Godfather",
      cover: "https://m.media-amazon.com/images/M/MV5BYTJkNGQyZDgtZDQ0NC00MDM0LWEzZWQtYzUzZDEwMDljZWNjXkEyXkFqcGc@._V1_.jpg",
    },
    {
      url: "https://www.imdb.com/title/tt0468569/",
      title: "The Dark Knight",
      cover: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg",
    },
    {
      url: "https://www.imdb.com/title/tt0167260/",
      title: "The Lord of the Rings",
      cover: "https://m.media-amazon.com/images/M/MV5BN2EyZjM3NzUtNWUzMi00MTgxLWI0NTctMzY4M2VlOTdjZWRiXkEyXkFqcGdeQXVyNDUzOTQ5MjY@._V1_.jpg",
    },
    {
      url: "https://www.imdb.com/title/tt0110912/",
      title: "Pulp Fiction",
      cover: "https://m.media-amazon.com/images/M/MV5BNGNhMDIzZTUtNTBlZi00MTRlLWFjM2ItYzViMjE3YzI5MjljXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg",
    },
    {
      url: "https://www.imdb.com/title/tt0137523/",
      title: "Fight Club",
      cover: "https://m.media-amazon.com/images/M/MV5BNDIzNDU0YzEtYzE5Ni00ZjlkLTk0ZGItNjllYjI3ZmVjYmVjXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg",
    },
  ],
  albums: [
    {
      url: "https://music.163.com/album?id=34822062",
      title: "范特西",
      cover: "https://p1.music.126.net/1LLaFL7vKz2J7W8RQkLzTw==/109951163479024071.jpg",
    },
    {
      url: "https://music.163.com/album?id=355360",
      title: "七里香",
      cover: "https://p1.music.126.net/LK3HYQrR7JkS0b1f8k3Vsw==/109951163482713615.jpg",
    },
    {
      url: "https://music.163.com/album?id=356360",
      title: "十一月的萧邦",
      cover: "https://p2.music.126.net/LK3HYQrR7JkS0b1f8k3Vsw==/109951163482713615.jpg",
    },
    {
      url: "https://music.163.com/album?id=357310",
      title: "依然范特西",
      cover: "https://p1.music.126.net/LK3HYQrR7JkS0b1f8k3Vsw==/109951163482713615.jpg",
    },
    {
      url: "https://music.163.com/album?id=358080",
      title: "我很忙",
      cover: "https://p2.music.126.net/LK3HYQrR7JkS0b1f8k3Vsw==/109951163482713615.jpg",
    },
    {
      url: "https://music.163.com/album?id=359680",
      title: "魔杰座",
      cover: "https://p1.music.126.net/LK3HYQrR7JkS0b1f8k3Vsw==/109951163482713615.jpg",
    },
  ],
};
