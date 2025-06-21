import { login } from '@/actions/auth/login';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const auth = useAuth()
  const navigate = useNavigate({
    from: '/login'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldsError, setFieldsError] = useState({
    email: false,
    password: false
  })

  const { t } = useTranslation()

  const { data, mutate, isPending, isError } = useMutation({
    mutationFn: login
  })

  const handleError = () => {
    setFieldsError({
      email: !email,
      password: !password
    })
  }
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (email && password) {
      mutate({ email, password })
    }
    handleError()
  }

  const navigateTo = (to: string): void => {
    navigate({
      to,
      from: '/login'
    })
      .then(() => null)
      .catch((err: unknown) => err)
  }

  useEffect(() => {
    const token = data?.data.authentication_token
    if (token) {
      auth.login(token, data?.data.user)
      navigateTo('/')
    }
  }, [data, navigate])

  return (
    <div className='flex h-full w-full items-center justify-center transition-all'>
      <div className='h-full w-2/3 max-xl:w-1/2 max-lg:hidden'></div>
      <div className='flex w-1/3 flex-col items-center justify-center gap-4 max-xl:w-1/2 max-lg:w-full'>
        <h1 className='mb-6 text-3xl font-bold'>{t('loginPage.title')}</h1>
        {isError && <h3 className='mb-2 text-yellow-400'>{t('loginPage.error')}</h3>}
        <form onSubmit={handleSubmit} className='flex w-sm flex-col gap-3 max-sm:w-xs'>
          <input
            data-error={fieldsError.email}
            className='rounded-sm border-1 border-zinc-600 pl-2 data-[error=true]:border-red-500'
            type='email'
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
            }}
            placeholder={t('loginPage.placeholderEmail')}
          />
          <input
            data-error={fieldsError.password}
            className='rounded-sm border-1 border-zinc-600 pl-2 data-[error=true]:border-red-500'
            type='password'
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
            }}
            placeholder={t('loginPage.placeholderPassword')}
          />
          <Button className='bg-zinc-600 text-white hover:bg-zinc-700' type='submit' disabled={isPending}>
            {t('loginPage.buttonLogin')}
            {isPending && (
              <div className='h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent' />
            )}
          </Button>
        </form>
        <Button
          className='w-sm bg-zinc-600 text-white hover:bg-zinc-700 max-sm:w-xs'
          onClick={() => {
            navigateTo('/sign-up')
          }}
        >
          {t('loginPage.buttonRegister')}
        </Button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/(public)/login')({
  beforeLoad(ctx) {
    const { context } = ctx

    if (context.auth.isAuthenticated) {
      return redirect({
        to: '/projects'
      })
    }
  },
  component: Login
})
