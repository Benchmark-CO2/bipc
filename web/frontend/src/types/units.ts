import { IModule } from './modules'

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Unit = {
  id: string
  title: string
  modules: IModule[]
}
