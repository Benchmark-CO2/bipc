import { PORTAL_URL } from '@/utils/constants';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';

const activeProps = {
  style: {
    fontWeight: "bold",
  },
};

export default function PublicHeader() {
  const { t } = useTranslation();
  return (
    <nav className="p-4 bg-gray-800 text-white flex gap-4">
      <Link to="/" activeProps={activeProps}>
        {t('home.title')}
      </Link>
      <Link to="/login" activeProps={activeProps}>
        {t('public.login')}
      </Link>
      {PORTAL_URL && <Button className='ml-auto' variant={'noStyles'} onClick={() => window.location.href = PORTAL_URL as string}>
        Portal
      </Button>}
    </nav>
  )
}