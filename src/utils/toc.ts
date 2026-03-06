export type TocHeading = {
  depth: number;
  slug: string;
  text: string;
};

export interface NestedTocHeading extends TocHeading {
  children: TocHeading[];
}

export function buildNestedHeadings(
  headings: TocHeading[]
): NestedTocHeading[] {
  const nested: NestedTocHeading[] = [];
  let currentH2: NestedTocHeading | null = null;

  headings.forEach(h => {
    if (h.depth === 2) {
      currentH2 = { ...h, children: [] };
      nested.push(currentH2);
    } else if (h.depth === 3 && currentH2) {
      currentH2.children.push(h);
    }
  });

  return nested;
}
