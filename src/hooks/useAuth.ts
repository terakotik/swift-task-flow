import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const mountedRef = useRef(true);

  const checkRole = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (mountedRef.current) {
        setIsAdmin(data?.some(r => r.role === 'admin') ?? false);
      }
    } catch {
      if (mountedRef.current) setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await checkRole(u.id);
      }
      if (mountedRef.current) setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mountedRef.current) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await checkRole(u.id);
        } else {
          setIsAdmin(false);
        }
        if (mountedRef.current) setLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [checkRole]);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  return { user, loading, isAdmin, signOut };
}
