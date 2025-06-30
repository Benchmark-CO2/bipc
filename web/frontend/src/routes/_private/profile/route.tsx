import ProfileToolbar from '@/components/layout/profile/toolbar';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_private/profile')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
    <ProfileToolbar  />

    <Outlet  />
  </div>
}
