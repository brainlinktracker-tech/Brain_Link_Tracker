import React, { useState, useEffect } from 'react'
import LoginPage from './components/LoginPage'
import AdminPanel from './components/AdminPanel'
import Admin2Dashboard from './components/Admin2Dashboard'
import BusinessDashboard from './components/BusinessDashboard'
import MemberDashboard from './components/MemberDashboard'
import WorkerDashboard from './components/WorkerDashboard'
import { Toaster } from 'sonner'

function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    // Check for existing auth token on app load
    const savedToken = localStorage.getItem('authToken')
    const savedUser = localStorage.getItem('user')
    
    console.log('App useEffect - savedToken:', savedToken)
    console.log('App useEffect - savedUser:', savedUser)
    
    if (savedToken && savedUser) {
      console.log('Setting user and token from localStorage')
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    } else {
      console.log('No saved auth data, should show login page')
      setUser(null)
      setToken(null)
    }
  }, [])

  const handleLogin = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
  }

  const renderDashboard = () => {
    if (!user || !token) return null

    switch (user.role) {
      case 'admin':
        return <AdminPanel user={user} token={token} onLogout={handleLogout} />
      case 'admin2':
        return <Admin2Dashboard user={user} token={token} onLogout={handleLogout} />
      case 'business':
        return <BusinessDashboard user={user} token={token} onLogout={handleLogout} />
      case 'member':
        return <MemberDashboard user={user} token={token} onLogout={handleLogout} />
      case 'worker':
        return <WorkerDashboard user={user} token={token} onLogout={handleLogout} />
      default:
        return <div>Unknown user role</div>
    }
  }

  return (
    <div className="App">
      <Toaster position="top-right" />
      {(() => {
        console.log("Render decision - user:", user, "token:", token);
        console.log("Should show login?", !user || !token);
        if (user && token) {
          console.log("Rendering dashboard for user:", user.role);
          return renderDashboard();
        } else {
          console.log("Rendering LoginPage");
          return <LoginPage onLogin={handleLogin} />;
        }
      })()}
    </div>
  )
}

export default App


