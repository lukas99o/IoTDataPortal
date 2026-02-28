import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description: string;
  noindex?: boolean;
}

const APP_NAME = 'IoT Data Portal';
const DEFAULT_OG_IMAGE = '/IoT.png';

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element!.setAttribute(key, value);
  });
}

export function Seo({ title, description, noindex = false }: SeoProps) {
  useEffect(() => {
    document.title = title;

    upsertMeta('meta[name="description"]', {
      name: 'description',
      content: description,
    });

    upsertMeta('meta[property="og:type"]', {
      property: 'og:type',
      content: 'website',
    });

    upsertMeta('meta[property="og:site_name"]', {
      property: 'og:site_name',
      content: APP_NAME,
    });

    upsertMeta('meta[property="og:title"]', {
      property: 'og:title',
      content: title,
    });

    upsertMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: description,
    });

    upsertMeta('meta[property="og:image"]', {
      property: 'og:image',
      content: DEFAULT_OG_IMAGE,
    });

    upsertMeta('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: 'summary_large_image',
    });

    upsertMeta('meta[name="twitter:title"]', {
      name: 'twitter:title',
      content: title,
    });

    upsertMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: description,
    });

    upsertMeta('meta[name="twitter:image"]', {
      name: 'twitter:image',
      content: DEFAULT_OG_IMAGE,
    });

    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex, nofollow' : 'index, follow',
    });
  }, [title, description, noindex]);

  return null;
}
