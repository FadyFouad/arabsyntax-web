declare module '*.mdx' {
  import type { MDXProps, Element } from 'mdx/types';

  export const frontmatter: {
    title: string;
    lastUpdated: string;
    description: string;
  };

  export default function MDXContent(props: MDXProps): Element;
}
