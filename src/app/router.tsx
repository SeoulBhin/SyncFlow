import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/landing/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { ProfilePage } from '@/pages/auth/ProfilePage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { MessengerPage } from '@/pages/messenger/MessengerPage'
import { GroupPage } from '@/pages/group/GroupPage'
import { DocumentEditorPage } from '@/pages/editor/DocumentEditorPage'
import { CodeEditorPage } from '@/pages/editor/CodeEditorPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { TasksPage } from '@/pages/tasks/TasksPage'
import { PricingPage } from '@/pages/billing/PricingPage'
import { BillingHistoryPage } from '@/pages/billing/BillingHistoryPage'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { ErrorPage } from '@/pages/errors/ErrorPage'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/messenger', element: <MessengerPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/group/:groupId', element: <GroupPage /> },
      { path: '/editor/:pageId', element: <DocumentEditorPage /> },
      { path: '/code/:pageId', element: <CodeEditorPage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/billing', element: <PricingPage /> },
      { path: '/billing/history', element: <BillingHistoryPage /> },
    ],
  },
  {
    path: '*',
    element: <PublicLayout />,
    children: [{ path: '*', element: <NotFoundPage /> }],
  },
])
