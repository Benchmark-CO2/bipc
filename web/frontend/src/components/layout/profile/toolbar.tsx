import { useInvites } from '@/hooks/useInvites';
import { Link } from '@tanstack/react-router';
import { t } from 'i18next';

const ProfileToolbar = () => {
  const { invites, setHasOpened, hasOpened, newInvitesCount } = useInvites();
  const hasInvites = invites && invites.length > 0;
  return (
    <div className='flex flex-col gap-4 p-4 bg-accent-foreground/10 shadow-md rounded-lg mt-4 mb-6'>
      <div>
        <h2 className='text-lg font-semibold text-gray-800 dark:text-gray-200'>{t('profile.title')}</h2>
        <p className='text-gray-600 dark:text-gray-400'>{t('profile.description')}</p>
      </div>

      <div>
        <ul className='space-y-2'>
         
          <li>
            <Link to='/profile/invites' className='text-blue-600 hover:underline dark:text-blue-400 flex' onClick={() => setHasOpened(true)}>
              Invites
              <div>
                {hasInvites && !hasOpened && (
                  <span className='ml-2 inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 rounded-full lowercase'>
                    {newInvitesCount} {t('common.new', { count: newInvitesCount })}
                  </span>
                )}
              </div>
            </Link>
          </li>
        </ul>
      </div>

    </div>
  )
}

export default ProfileToolbar