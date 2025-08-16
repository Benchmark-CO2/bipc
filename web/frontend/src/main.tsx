import { ThemeProvider } from '@/components/theme-provider';
import '@/index.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from './components/ui/sonner';
import { AuthContext } from './context/authContext';
import { useAuth } from './hooks/useAuth';
import './i18n';
import { AuthProvider } from './providers/authProvider';
import { routeTree } from './routeTree.gen';
import { queryClient } from './utils/queryClient';
import { ProjectContext } from './context/projectContext';
import { ProjectProvider } from './providers/projectProvider';
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    auth: {} as AuthContext,
    project: {} as ProjectContext,
    queryClient
  }
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export const App = () => {
  const auth = useAuth()
  return (
    <RouterProvider
      router={router}
      context={{
        auth
      }}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme='light'>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ProjectProvider>

          <App />
          <Toaster
            position='bottom-right'
            toastOptions={{
              classNames: {
                description: '!text-gray-600 !dark:text-gray-300'
              }
            }}
          />
          </ProjectProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
)
