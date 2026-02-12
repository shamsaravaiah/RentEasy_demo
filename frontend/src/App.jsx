import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import './App.css';

// Lazy load pages for code splitting
const Landing = React.lazy(() => import('./pages/Landing.jsx').then(module => ({ default: module.Landing })));
const InviteLinkEntry = React.lazy(() => import('./pages/InviteLinkEntry.jsx').then(module => ({ default: module.InviteLinkEntry })));
const Dashboard = React.lazy(() => import('./pages/Dashboard.jsx').then(module => ({ default: module.Dashboard })));
const Login = React.lazy(() => import('./pages/Login.jsx').then(module => ({ default: module.Login })));
const Signup = React.lazy(() => import('./pages/Signup.jsx').then(module => ({ default: module.Signup })));
const ContractDetail = React.lazy(() => import('./pages/ContractDetail.jsx').then(module => ({ default: module.ContractDetail })));
const CreateContract = React.lazy(() => import('./pages/CreateContract.jsx').then(module => ({ default: module.CreateContract })));
const InvitePage = React.lazy(() => import('./pages/InvitePage.jsx').then(module => ({ default: module.InvitePage })));
const Terms = React.lazy(() => import('./pages/Terms.jsx').then(module => ({ default: module.Terms })));
const Privacy = React.lazy(() => import('./pages/Privacy.jsx').then(module => ({ default: module.Privacy })));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/invite" element={<InviteLinkEntry />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts/new"
          element={
            <ProtectedRoute>
              <CreateContract />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts/:id"
          element={
            <ProtectedRoute>
              <ContractDetail />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
