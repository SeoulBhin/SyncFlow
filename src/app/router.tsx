import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/landing/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { ProfilePage } from '@/pages/auth/ProfilePage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ChannelView } from '@/pages/channel/ChannelView'
import { GroupPage } from '@/pages/group/GroupPage'
import { DocumentEditorPage } from '@/pages/editor/DocumentEditorPage'
import { CodeEditorPage } from '@/pages/editor/CodeEditorPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { TasksPage } from '@/pages/tasks/TasksPage'
import { PricingPage } from '@/pages/billing/PricingPage'
import { BillingHistoryPage } from '@/pages/billing/BillingHistoryPage'
import { MeetingHistoryPage } from '@/pages/meeting/MeetingHistoryPage'
import { MeetingRoomPage } from '@/pages/meeting/MeetingRoomPage'
import { MeetingSummaryPage } from '@/pages/meeting/MeetingSummaryPage'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { ErrorPage } from '@/pages/errors/ErrorPage'

export const router = createBrowserRouter([
  /* ── Public routes ── */
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
  /* ── App routes (/app prefix) ── */
  {
    path: '/app',
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'channel/:channelId', element: <ChannelView /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'group/:groupId', element: <GroupPage /> },
      { path: 'editor/:pageId', element: <DocumentEditorPage /> },
      { path: 'code/:pageId', element: <CodeEditorPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'meetings', element: <MeetingHistoryPage /> },
      { path: 'meetings/:id', element: <MeetingRoomPage /> },
      { path: 'meetings/:id/summary', element: <MeetingSummaryPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'billing', element: <PricingPage /> },
      { path: 'billing/history', element: <BillingHistoryPage /> },
    ],
  },
  /* ── Legacy redirects ── */
  { path: '/dashboard', element: <Navigate to="/app" replace /> },
  { path: '/messenger', element: <Navigate to="/app" replace /> },
  { path: '/tasks', element: <Navigate to="/app/tasks" replace /> },
  { path: '/meetings', element: <Navigate to="/app/meetings" replace /> },
  { path: '/meetings/:id', element: <Navigate to="/app/meetings" replace /> },
  { path: '/meetings/:id/summary', element: <Navigate to="/app/meetings" replace /> },
  { path: '/settings', element: <Navigate to="/app/settings" replace /> },
  { path: '/profile', element: <Navigate to="/app/profile" replace /> },
  { path: '/editor/:pageId', element: <Navigate to="/app/editor/:pageId" replace /> },
  { path: '/code/:pageId', element: <Navigate to="/app/code/:pageId" replace /> },
  { path: '/billing', element: <Navigate to="/app/billing" replace /> },
  { path: '/billing/history', element: <Navigate to="/app/billing/history" replace /> },
  /* ── 404 ── */
  {
    path: '*',
    element: <PublicLayout />,
    children: [{ path: '*', element: <NotFoundPage /> }],
  },
])
