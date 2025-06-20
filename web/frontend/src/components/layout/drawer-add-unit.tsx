/* eslint-disable @typescript-eslint/no-misused-promises */

import { addUnitFormSchema, AddUnitFormSchema } from '@/validators/addUnit.validator'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '../ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'

interface DrawerAddUnitProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  callback?: (data: AddUnitFormSchema) => void
  triggerComponent?: React.ReactNode
}
const DrawerAddUnit = ({ isOpen, setIsOpen, callback, triggerComponent }: DrawerAddUnitProps) => {
  const form = useForm<AddUnitFormSchema>({
    resolver: zodResolver(addUnitFormSchema),
    defaultValues: {
      name: ''
    }
  })
  const handleSubmit = (data: AddUnitFormSchema) => {
    if (callback) {
      callback(data)
      setIsOpen(false)
      form.reset()
    }
  }

  const handleClose = () => {
    form.reset()
    setIsOpen(false)
  }
  return (
    <Drawer direction='right' open={isOpen} onOpenChange={setIsOpen} onClose={handleClose}>
      <DrawerTrigger asChild>
        {triggerComponent ?? (
          <button className='cursor-pointer rounded-t-lg bg-muted px-4 py-2 hover:bg-accent'>
            <Plus />
          </button>
        )}
      </DrawerTrigger>
      <DrawerContent className='min-w-2/5'>
        <DrawerHeader className='px-6'>
          <DrawerTitle>Adicionar Unidade de Construção</DrawerTitle>
        </DrawerHeader>
        <DrawerDescription className='px-6'>
          Aqui terá uma descrição do que é a unidade de construção, como ela deve ser utilizada e quais são os campos
          obrigatórios.
        </DrawerDescription>
        <div className='mx-auto w-full p-6'>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='w-full'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Unidade de Construção *</FormLabel>
                    <FormControl>
                      <Input placeholder='Torre A' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit' variant='noStyles' className='mt-6'>
                Criar Unidade
              </Button>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default DrawerAddUnit
