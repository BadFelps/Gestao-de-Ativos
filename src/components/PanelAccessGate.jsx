import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAccess } from '@/lib/accessContext';

export default function PanelAccessGate({ panel, children }) {
  const navigate = useNavigate();
  const { getSession } = useAccess();
  const session = getSession(panel);

  useEffect(() => {
    if (!session) {
      navigate(`/access/${panel}`, { replace: true });
    }
  }, [session, panel, navigate]);

  if (!session) {
    return null;
  }

  return children;
}