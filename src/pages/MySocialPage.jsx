import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import SocialPage from './SocialPage';
import { Skeleton } from '@/components/ui/skeleton';

export default function MySocialPage() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, config: null, listings: [] });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.email) {
        setState({ loading: false, config: null, listings: [] });
        return;
      }

      try {
        const { data: config, error: configError } = await supabase
          .from('social_page_configs')
          .select('*')
          .eq('created_by', user.email)
          .order('updated_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (configError || !config) {
          setState({ loading: false, config: null, listings: [] });
          return;
        }

        let listings = [];
        const featuredIds = config.featured_listings || [];
        if (featuredIds.length > 0) {
          const { data: rows } = await supabase
            .from('listings')
            .select('*')
            .in('id', featuredIds);
          listings = (rows || []).sort(
            (a, b) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id)
          );
        } else {
          const { data: rows } = await supabase
            .from('listings')
            .select('*')
            .eq('status', 'publie')
            .order('created_date', { ascending: false })
            .limit(6);
          listings = rows || [];
        }

        if (cancelled) return;
        setState({ loading: false, config, listings });
      } catch (err) {
        if (!cancelled) setState({ loading: false, config: null, listings: [] });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.email]);

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

  if (!state.config) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Pas encore de Social Page</h2>
          <p className="text-gray-600 mb-4">
            Configurez votre page publique dans le Social Page Builder pour pouvoir la partager.
          </p>
          <a
            href="/SocialBuilder"
            className="inline-flex items-center px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800"
          >
            Configurer ma page
          </a>
        </div>
      </div>
    );
  }

  return <SocialPage config={state.config} listings={state.listings} isPublic={false} />;
}
