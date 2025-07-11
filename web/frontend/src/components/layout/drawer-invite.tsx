import { postSendInvite } from '@/actions/invites/postSendInvite';
import { getAllProjectsByUser } from '@/actions/projects/getProjects';
import { AddUserToProjectFormSchema } from '@/validators/addUserToProject.validator';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CircleX, UserPlus } from 'lucide-react';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Combobox } from '../ui/combobox';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const permissionsOptions: Array<{ value: string; label: 'drawerInvite.viewPermission' | 'drawerInvite.editPermission' }> = [
  { value: 'project:view', label: 'drawerInvite.viewPermission' },
  { value: 'project:edit', label: 'drawerInvite.editPermission' }
];
const DrawerInvite = () => {
  const ref = useRef<HTMLButtonElement>(null);

  const { t } = useTranslation();
  const form = useForm({
    resolver: zodResolver(AddUserToProjectFormSchema),
    defaultValues: {
      projectId: '',
      email: '',
      permissions: []
    }
  })

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: getAllProjectsByUser
  })

  const { mutate } = useMutation({
    mutationFn: ({projectId, email, permissions}: AddUserToProjectFormSchema) => postSendInvite(projectId, email, permissions),
    onSuccess: () => {
      toast.success(t("drawerInvite.title"), {
        description: t("drawerInvite.successMessage"),
        duration: 5000,
      });
      form.reset();
      ref.current?.click()
    },
    onError: () => {
      toast.error(t("drawerInvite.title"), {
        description: t("drawerInvite.errorMessage"),
        duration: 5000,
        icon: <CircleX className='stroke-destructive' size={24} />
      });
    } 
  })

  const handleSubmit = (data: AddUserToProjectFormSchema) => {
    const { projectId, email, permissions } = data;
    console.log('Submitting invite:', { projectId, email, permissions });
    mutate({ projectId, email, permissions });
  }
 
  return (
    <Drawer
       direction="right"
    >
      <DrawerTrigger ref={ref} className='flex w-full justify-between'>
        <span>{t('projects.title')}</span>
        <UserPlus size={20} className='group-[.closed]:mx-auto' />
      </DrawerTrigger>
       <DrawerContent className='min-w-2/5'>
        <DrawerHeader className='px-6'>
          <DrawerTitle>
            {t('drawerInvite.title')}
          </DrawerTitle>
        </DrawerHeader>
        <DrawerDescription className='px-6'>
          {t('drawerInvite.description')}
        </DrawerDescription>
        <Form {...form}>
          <form className='flex flex-col gap-10 px-6 py-4' onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name='projectId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('drawerInvite.projectsLabel')}</FormLabel>
                  <FormControl className='w-full'>
                    <Select onValueChange={field.onChange} defaultValue={String(field.value)} >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder={t('drawerInvite.projectsPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {
                          projects?.data.projects.map(project => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              {project.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('drawerInvite.emailLabel')}</FormLabel>
                <FormControl className='w-full'>
                  <Combobox {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='permissions'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('drawerInvite.permissionsLabel')}</FormLabel>
                {
                  permissionsOptions.map((permission) => (
                    <FormItem key={permission.value} className='flex items-center gap-2 pl-2'>
                      <FormControl>
                        <input
                          type='checkbox'
                          value={permission.value}
                          checked={field.value.includes(permission.value)}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (e.target.checked) {
                              field.onChange([...field.value, value]);
                            } else {
                              field.onChange(field.value.filter((v: string) => v !== value));
                            }
                          }}
                        />
                      </FormControl>
                      
                      <FormLabel>{t(permission.label)}</FormLabel>
                    </FormItem>
                  ))
                }
            <FormMessage />
            </FormItem>
            )}
          />
          <Button type='submit' className='w-full mt-4'>
            {t('drawerInvite.inviteButton')}
          </Button>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  )
}

export default DrawerInvite