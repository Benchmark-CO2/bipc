/* eslint-disable @typescript-eslint/no-misused-promises */
import { putProject } from '@/actions/projects/putProject';
import useCep from '@/hooks/useLocation';
import { IProject } from '@/types/projects';
import { masks } from '@/utils/masks';
import { editProjectFormSchema, EditProjectFormSchema } from '@/validators/editProject.validator';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Edit } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface IDrawerAddProject {
  componentTrigger: React.ReactNode
  projectData: IProject
}

export default function DrawerEditProject({ componentTrigger, projectData }: IDrawerAddProject) {
  const { t } = useTranslation()
  const form = useForm<EditProjectFormSchema>({
    resolver: zodResolver(editProjectFormSchema),
    defaultValues: {
      name: projectData.name || '',
      description: projectData.description || '',
      cep: projectData.cep || '',
      projectPhase: projectData.project_phase || '',
      state: projectData.state || '',
      city: projectData.city || '',
      street: projectData.street || '',
      neighborhood: projectData.neighborhood || '',
      number: projectData.number || ''
    }
  })

  const { data: locationData, isError, isLoading: locationLoading, searchCep } = useCep()

  const navigate = useNavigate()

  const { data, isSuccess, isPending, mutate } = useMutation({
    mutationFn: (data: EditProjectFormSchema) => putProject(data, projectData.uuid),
    onError: (error) => {
      toast.error(t('error.errorEditProject'), {
        description: error.message,
        duration: 5000
      })
    },
    onSuccess: () => {
      toast.success(t('success.projectUpdated'), {
        duration: 5000
      })
    }
  })

  const onSubmit = (data: EditProjectFormSchema) => {
    mutate(data)
  }

  useEffect(() => {
    // if (data?.project_uuid) {
    //   navigate({
    //     to: `/projects/${data.data.project_uuid}`,
    //     from: '/projects'
    //   })
    //     .then(() => null)
    //     .catch((err: unknown) => err)
    // }
  }, [data, navigate])


  useEffect(() => {
    if (locationData) {
      form.setValue('state', locationData.state)
      form.setValue('city', locationData.city)
      form.setValue('neighborhood', locationData.neighborhood || '')
      form.setValue('street', locationData.street || '')
    }
  }, [locationData, form])

  useEffect(() => {
    if (isError) {
      toast.error(t('error.errorFetchZipCode'), {
        description: t('warn.verifyZipCode'),
        duration: 5000
      })
      // form.setError('cep', {
      //   type: 'manual',
      //   message: 'Verifique se o CEP está correto'
      // })
      form.setValue('state', '')
      form.setValue('city', '')
    }
  }, [isError, form])

  return (
    <Drawer direction='right'>
      <DrawerTrigger asChild data-action='edit-project'>
        {componentTrigger ?? (
          <Edit size={20} color={'#FFF'} className='delete-project absolute top-2 right-2 z-50 hover:shadow-md' />
        )}
      </DrawerTrigger>
      <DrawerContent className='min-w-2/5 px-6'>
        <div className='mx-auto w-11/12'>
          <DrawerHeader>
            <DrawerTitle>Editar Projetos</DrawerTitle>
            {/* <DrawerDescription>Set your daily activity goal.</DrawerDescription> */}
          </DrawerHeader>
          <Form {...form}>
            <form className='flex w-full flex-col gap-3 p-4 max-sm:w-sm' onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('drawer.projectNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder='Projeto 1' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                // control={form.control}
                name='cep'
                render={({ field }) => (
                  <FormItem className='flex-1/3'>
                    <FormLabel>{t('drawer.cepLabel')}</FormLabel>
                    <FormControl>
                      <div className='flex items-center gap-2'>
                        <Input
                          placeholder={t('drawer.cepPlaceholder')}
                          value={masks.cep((field.value as string) || '')}
                          onChange={(e) => {
                            field.onChange(e.target.value)
                            if (e.target.value.length > 8) searchCep(e.target.value)
                          }}
                        />
                        {locationLoading && (
                          <div className='h-4 w-4 animate-spin rounded-full border-1 border-primary border-t-transparent' />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='flex w-full gap-4'>
                <FormField
                  control={form.control}
                  name='state'
                  render={({ field }) => (
                    <FormItem className='flex-1/3'>
                      <FormLabel>{t('drawer.stateLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('drawer.statePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='city'
                  render={({ field }) => (
                    <FormItem className='flex-2/3'>
                      <FormLabel>{t('drawer.cityLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('drawer.cityPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name='neighborhood'
                render={({ field }) => (
                  <FormItem className='flex-2/3'>
                    <FormLabel>{t('drawer.neighborhoodLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('drawer.neighborhoodPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='flex w-full gap-4'>
                <FormField
                  control={form.control}
                  name='street'
                  render={({ field }) => (
                    <FormItem className='flex-2/3'>
                      <FormLabel>{t('drawer.streetLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('drawer.streetPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='number'
                  render={({ field }) => (
                    <FormItem className='flex-1/3'>
                      <FormLabel>{t('drawer.numberLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('drawer.numberPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name='projectPhase'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('drawer.projectPhaseLabel')}</FormLabel>
                    <FormControl>
                      <Select defaultValue='' onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder={t('drawer.projectPhasePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='preliminaryStudy'>{t('common.projectPhaseOptions.preliminaryStudy')}</SelectItem>
                          <SelectItem value='draft'>{t('common.projectPhaseOptions.draft')}</SelectItem>
                          <SelectItem value='basicProject'>{t('common.projectPhaseOptions.basicProject')}</SelectItem>
                          <SelectItem value='executiveProject'>{t('common.projectPhaseOptions.executiveProject')}</SelectItem>
                          <SelectItem value='releasedForConstruction'>{t('common.projectPhaseOptions.releasedForConstruction')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('drawer.descriptionLabel')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('drawer.descriptionPlaceholder')}
                        minLength={10}
                        maxLength={200}
                        rows={4}
                        className='resize-none'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* <FormField
                control={form.control}
                name='image'
                render={({ field: { onChange, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Imagem do Projeto</FormLabel>
                    <FormControl>
                      <Input
                        type='file'
                        accept='image/*'
                        onChange={(e) => {
                          const file = e.target.files?.[0] // Captura apenas o primeiro arquivo
                          if (file) onChange(file)
                        }}
                        {...rest}
                        value={undefined} // Prevents React from trying to control the value
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
              <Button disabled={isPending || isSuccess} type='submit' variant='noStyles' className='mt-6'>
                {t('drawer.editProjectButton')}
                {isPending && (
                  <div className='h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent' />
                )}
              </Button>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
