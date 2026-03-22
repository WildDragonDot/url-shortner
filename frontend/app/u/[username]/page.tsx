'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ExternalLink, Link2 } from 'lucide-react';

interface CollectionLink {
  id: string;
  label: string;
  short_url: string;
  og_title?: string;
  og_image?: string;
  position: number;
}

interface Collection {
  slug: string;
  title?: string;
  description?: string;
  theme: string;
  links: CollectionLink[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CollectionPublicPage() {
  const params = useParams();
  const username = params.username as string;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    fetch(`${API_URL}/@${username}`)
      .then(res => {
        if (!res.ok) { setNotFound(true); return null; }
        return res.json();
      })
      .then(data => { if (data) setCollection(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !collection) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">@{username}</h1>
          <p className="text-slate-500 text-sm">This collection doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Profile header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">@</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{collection.title || `@${collection.slug}`}</h1>
          {collection.description && (
            <p className="text-slate-600 text-sm mt-2 max-w-sm mx-auto">{collection.description}</p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-3">
          {collection.links.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">No links yet.</p>
          ) : (
            collection.links.map(link => (
              <a
                key={link.id}
                href={link.short_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full p-4 bg-white rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all group"
              >
                {link.og_image && (
                  <img src={link.og_image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {link.label || link.og_title || link.short_url}
                  </p>
                  {link.label && link.og_title && (
                    <p className="text-xs text-slate-400 truncate">{link.og_title}</p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-primary-600 flex-shrink-0 transition" />
              </a>
            ))
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          Powered by <a href="/" className="text-primary-600 hover:underline">ShortURL</a>
        </p>
      </div>
    </div>
  );
}
