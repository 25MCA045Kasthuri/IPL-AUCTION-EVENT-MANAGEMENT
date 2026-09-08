import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import LiveAuction from './pages/LiveAuction'
import Admin from './pages/Admin'
import Results from './pages/Results'

function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <Outlet />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/live-auction" element={<LiveAuction />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['ADMIN', 'CONDUCTOR']}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results"
              element={
                <ProtectedRoute roles={['ADMIN', 'CONDUCTOR']}>
                  <Results />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
