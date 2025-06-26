/* eslint-disable @typescript-eslint/no-misused-promises */

import { register } from '@/actions/auth/register';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { registerFormSchema, RegisterFormSchema } from '@/validators/registerForm.validator';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

import { DialogSuccessSignup } from '@/components/layout/dialogs/dialog-success-signup';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const SignUp = () => {
  const [successModal, setSuccessModal] = useState(false)
  const form = useForm<RegisterFormSchema>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { isPending, mutate } = useMutation({
    mutationFn: register,
    onError: (error: AxiosError) => {

      if (error.response?.status === 409) {
        form.setError('email', {
          type: 'custom',
          message: 'Email já cadastrado',
        })
      }
    },
    onSuccess() {
      toast.success(t('signUp.dialog.success.title'), {
        description: t('signUp.dialog.success.content'),
      })
      setSuccessModal(true)
    },
  })
  const handleSubmit = (data: RegisterFormSchema) => {
    const { name, email, password } = data
    mutate({
      name,
      email,
      password,
    })
  }

  const handleClose = () => {
    setSuccessModal(false)
    navigate({ to: '/login', from: '/sign-up' })
  }

  return (
    <div className="w-full h-full flex transition-all justify-center items-center">
      <div className="w-2/3 h-full max-lg:hidden max-xl:w-1/2"></div>
      <Form {...form}>
        <form className="flex flex-col gap-3 w-sm max-sm:w-xs" onSubmit={form.handleSubmit(handleSubmit)}>
          <h1 className="font-bold text-3xl mb-6 w-full text-center block">{t('signUp.title')}</h1>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signUp.name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('signUp.name')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signUp.email')}</FormLabel>
                <FormControl>
                  <Input autoComplete='off' placeholder={t('signUp.email')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signUp.password')}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={t('signUp.password')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signUp.confirmPassword')}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={t('signUp.confirmPassword')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type='submit' variant='noStyles' className='mt-6'>
            {t('signUp.buttonSignUp')}
            {isPending && <div className="w-4 h-4 border-1 border-secondary border-t-transparent rounded-full animate-spin" />}
          </Button>
          <Button variant='ghost' className='mt-2' onClick={() => navigate({ to: '/login', from: '/sign-up' })}>
            {t('signUp.buttonHaveAccount')}
          </Button>
        </form>
      </Form>
      {successModal && <DialogSuccessSignup handleClose={handleClose} />}
    </div>
  )
}
export const Route = createFileRoute('/(public)/sign-up')({
  beforeLoad(ctx) {
    const { context } = ctx

    if (context.auth.isAuthenticated) {
      return redirect({
        to: '/dashboard',
      })
    }
  },
  component: SignUp,
})
