import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', u.id);
        if (active) setIsAdmin(data?.some(r => r.role === 'admin') ?? false);
      }
      if (active) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', u.id)
            .then(({ data }) => {
              if (active) setIsAdmin(data?.some(r => r.role === 'admin') ?? false);
            });
        } else {
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return { user, loading, isAdmin, signOut };
}
