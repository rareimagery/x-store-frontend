export type PreviewProduct = {
  id: string;
  title: string;
  price: number;
  image?: string;
  description?: string;
};

export type PreviewVideo = {
  id: string;
  url: string;
  thumbnail?: string;
};

export type PreviewPost = {
  id: string;
  text: string;
  linkedProduct?: string;
};

export type BuilderPreviewPost = {
  id: string;
  text: string;
};

export type TemplatePreviewProps = {
  products: PreviewProduct[];
  videos: PreviewVideo[];
  posts: PreviewPost[];
  handle: string;
  avatar?: string;
  banner?: string;
  bio?: string;
};
