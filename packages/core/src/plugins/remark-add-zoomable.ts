import type { Root, Image } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

type ZoomableOptions = {
  className?: string;
};

type ImageWithData = Image & {
  data?: {
    hProperties?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

export const remarkAddZoomable: Plugin<[ZoomableOptions?], Root> = ({
  className = "zoomable",
} = {}) => {
  return tree => {
    visit(tree, "image", node => {
      const imageNode = node as ImageWithData;
      imageNode.data = imageNode.data || {};
      imageNode.data.hProperties = imageNode.data.hProperties || {};
      imageNode.data.hProperties.class = className;
    });
  };
};
