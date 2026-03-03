import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { pagesConfig } from '@/pages.config';
import SocialPage from './SocialPage';
import PageNotFound from '@/lib/PageNotFound';
import { Skeleton } from '@/components/ui/skeleton';

const PAGES = pagesConfig.Pages || {};
const KNOWN_PAGE_MAP = Object.keys(PAGES).reduce((acc, key) => {
  acc[key.toLowerCase()] = key;
  return acc;
}, {});

export default function PublicSocialPage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState({
    loading: true,
    config: null,
    listings: [],
    notFound: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!slug) {
        setState({ loading: false, config: null, listings: [], notFound: true });
        return;
      }

      const slugLower = slug.toLowerCase();
      const pageKey = KNOWN_PAGE_MAP[slugLower];
      if (pageKey) {
        setState({
          loading: false,
          config: null,
          listings: [],
          notFound: false,
          redirectTo: isAuthenticated ? `/${pageKey}` : '/login',
        });
        return;
      }

      try {
        const { data: config, error: configError } = await supabase
          .from('social_page_configs')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single();

        if (cancelled) return;

        if (configError || !config) {
          setState({ loading: false, config: null, listings: [], notFound: true });
          return;
        }

        let listings = [];
        const featuredIds = config.featured_listings || [];
        if (featuredIds.length > 0) {
          const { data: listingRows } = await supabase
            .from('listings')
            .select('*')
            .in('id', featuredIds)
            .eq('status', 'publie');
          listings = (listingRows || []).sort(
            (a, b) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id)
          );
        } else {
          const { data: listingRows } = await supabase
            .from('listings')
            .select('*')
            .eq('status', 'publie')
            .order('created_date', { ascending: false })
            .limit(6);
          listings = listingRows || [];
        }

        if (cancelled) return;
        setState({ loading: false, config, listings, notFound: false });
      } catch (err) {
        if (!cancelled) {
          setState({ loading: false, config: null, listings: [], notFound: true });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.redirectTo) {
    return <Navigate to={state.redirectTo} replace />;
  }

  if (state.loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <Skeleton className="w-28 h-28 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (state.notFound || !state.config) {
    return <PageNotFound />;
  }

  return (
    <SocialPage
      config={state.config}
      listings={state.listings}
      isPublic
    />
  );
}
