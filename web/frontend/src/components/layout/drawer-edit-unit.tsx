/* eslint-disable @typescript-eslint/no-misused-promises */

import { TProjectUnit } from '@/types/projects'
import { addUnitFormSchema, AddUnitFormSchema } from '@/validators/addUnit.validator'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'

interface DrawerAddUnitProps {
  isOpen?: boolean
  setIsOpen?: (isOpen: boolean) => void
  callback?: (data: TProjectUnit) => void
  triggerComponent?: React.ReactNode
  unit: TProjectUnit
}
const DrawerEditUnit = ({ callback, unit, triggerComponent }: DrawerAddUnitProps) => {
  const [isOpenState, setIsOpenState] = useState(false)
  const form = useForm<AddUnitFormSchema>({
    resolver: zodResolver(addUnitFormSchema),
    defaultValues: {
      name: ''
    }
  })

  const handleSubmit = (data: AddUnitFormSchema) => {
    if (callback) {
      callback({
        id: unit.id,
        name: data.name
      })
      setIsOpenState(false)
      form.reset()
    }
  }

  const handleClose = () => {
    form.reset()
    setIsOpenState(false)
  }

  useEffect(() => {
    form.setValue('name', unit.name)
  }, [unit, form])

  return (
    <Drawer direction='right' open={isOpenState} onOpenChange={setIsOpenState} onClose={handleClose}>
      <DrawerTrigger asChild>{triggerComponent ?? <Pen size={16} />}</DrawerTrigger>
      <DrawerContent className='min-w-2/5'>
        <div className='mx-auto w-full p-6'>
          <DrawerHeader>
            <DrawerTitle>Editar Unidade de Construção</DrawerTitle>
          </DrawerHeader>
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
                Salvar Unidade
              </Button>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default DrawerEditUnit
