import { getAllProjectsByUser } from '@/actions/projects/getProjects';
import { postAddUserToProject } from '@/actions/projects/postAddUserToProject';
import { AddUserToProjectFormSchema } from '@/validators/addUserToProject.validator';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const permissionsOptions: Array<{ value: string; label: 'drawerInvite.viewPermission' | 'drawerInvite.editPermission' }> = [
  { value: 'project:view', label: 'drawerInvite.viewPermission' },
  { value: 'project:edit', label: 'drawerInvite.editPermission' }
];
const DrawerInvite = () => {
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

  const { mutate, isError } = useMutation({
    mutationFn: ({projectId, email, permissions}: AddUserToProjectFormSchema) => postAddUserToProject(projectId, email, permissions),
    onSuccess: (data) => {
      toast.success(t("drawerInvite.title"), {
        description: t("drawerInvite.successMessage"),
        duration: 5000,
      });
      form.reset();
    },
    onError: (error: any) => {
      console.error('Error inviting user:', error);
      toast.error(t("drawerInvite.title"), {
        description: t("drawerInvite.errorMessage"),
        duration: 5000,
      });
    } 
  })

  const handleSubmit = (data: AddUserToProjectFormSchema) => {
    const { projectId, email, permissions } = data;
    mutate({ projectId, email, permissions });
  }
 
  // useEffect(() => {
  //   if (isError) {
  //     toast.error(t("error.errorFetchZipCode"), {
  //       description: t("warn.verifyZipCode"),
  //       duration: 5000,
  //     });
  //   }
  // }, [isError]);
  return (
    <Drawer
       direction="right"
    >
      <DrawerTrigger>
        <button className="btn btn-primary cursor-pointer">{t('drawerInvite.title')}</button>
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
                  <Input
                    placeholder={t('drawerInvite.emailPlaceholder')}
                    {...field}
                  />
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