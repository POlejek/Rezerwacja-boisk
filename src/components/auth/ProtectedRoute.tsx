import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export default function ProtectedRoute({ children, requireAdmin }: Props) {
  const { user, loading } = useAuth();
  const [roleLoading, setRoleLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchRole() {
      if (!requireAdmin || !user) {
        setIsAdmin(null);
        return;
      }
      setRoleLoading(true);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data() as any;
        if (active) setIsAdmin(data?.role === 'admin');
      } finally {
        if (active) setRoleLoading(false);
      }
    }
    fetchRole();
    return () => {
      active = false;
    };
  }, [requireAdmin, user]);

  if (loading || roleLoading) return <div className="p-4">Ładowanie…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && isAdmin === false) return <Navigate to="/" replace />;
  return <>{children}</>;
}
