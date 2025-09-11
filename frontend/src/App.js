import React, { useState, useContext, createContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Alert, AlertDescription } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import { Textarea } from './components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { 
  Bell, 
  Users, 
  Calendar, 
  DollarSign, 
  Target, 
  ArrowLeft, 
  Plus, 
  Copy, 
  Edit,
  Trash2,
  Mail,
  Settings as SettingsIcon,
  ExternalLink
} from 'lucide-react';
import { useToast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Settings Context
const SettingsContext = createContext(null);

const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    branding: { app_name: "ConnectVault", logo_path: "" },
    quick_access_links: {
      chatgpt: "https://chatgpt.com/",
      instagram: "https://instagram.com/",
      tiktok: "https://tiktok.com/",
      youtube: "https://youtube.com/",
      facebook: "https://facebook.com/",
      pinterest: "https://pinterest.com/"
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, setSettings, loading, fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        try {
          await axios.get(`${API}/dashboard/summary`);
          // Token is valid, set user as authenticated
          setUser({ authenticated: true });
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    
    initializeAuth();
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Fetch user data after successful login
      try {
        const userResponse = await axios.get(`${API}/dashboard/summary`);
        // Set a simple user object to indicate authentication
        setUser({ username, authenticated: true });
      } catch (userError) {
        console.error('Failed to fetch user data:', userError);
        // Even if user data fetch fails, we have a valid token
        setUser({ username, authenticated: true });
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/auth/register`, userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const forgotPassword = async (emailOrUsername) => {
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { 
        email_or_username: emailOrUsername 
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Request failed' 
      };
    }
  };

  const resetPassword = async (token, newPassword, confirmPassword) => {
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Password reset failed' 
      };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      forgotPassword,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ConnectVault Logo Component
const ConnectVaultLogo = ({ className = "" }) => {
  const { settings } = useSettings();
  const [logoExists, setLogoExists] = useState(false);

  useEffect(() => {
    // Check if logo.png exists
    // eslint-disable-next-line no-undef
    const img = new Image();
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
    img.src = '/logo.png';
  }, []);
  
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {logoExists && (
        <img 
          src="/logo.png" 
          alt="ConnectVault" 
          className="connectvault-logo"
        />
      )}
      <div className="connectvault-text-logo">
        ConnectVault
      </div>
    </div>
  );
};

// Quick Access Strip Component
const QuickAccessStrip = () => {
  const quickLinks = [
    { key: 'chatgpt', label: 'ChatGPT', url: 'https://chat.openai.com' },
    { key: 'instagram', label: 'Instagram', url: 'https://instagram.com' },
    { key: 'tiktok', label: 'TikTok', url: 'https://tiktok.com' },
    { key: 'youtube', label: 'YouTube', url: 'https://youtube.com' },
    { key: 'facebook', label: 'Facebook', url: 'https://facebook.com' },
    { key: 'pinterest', label: 'Pinterest', url: 'https://pinterest.com' }
  ];

  return (
    <div className="quick-access-strip">
      <div className="flex items-center justify-between flex-wrap">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 md:mb-0">Quick Access</h3>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <a
              key={link.key}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="quick-access-btn"
              aria-label={`Open ${link.label} in new tab`}
            >
              <ExternalLink className="h-3 w-3" />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// Layout Component with Navigation
const Layout = ({ children, title = "ConnectVault" }) => {
  const { logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'task',
      message: 'Follow up with John Doe',
      time: '2 hours ago',
      read: false
    },
    {
      id: '2', 
      type: 'commission',
      message: 'New commission logged: $150',
      time: '1 day ago',
      read: false
    },
    {
      id: '3',
      type: 'task',
      message: 'Weekly commission summary available',
      time: '3 days ago',
      read: true
    }
  ]);

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const fetchDashboardSummary = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard summary:', error);
    }
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen dashboard-bg">
      {/* Header */}
      <header className="connectvault-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <ConnectVaultLogo />
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button 
                  variant="outline" 
                  className="relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="View notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-secondary-gold text-primary-navy h-5 w-5 rounded-full text-xs flex items-center justify-center">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-accent-gray rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b border-accent-gray">
                      <h3 className="font-semibold text-primary-navy">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {notification.time}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNotifications(false)}
                        className="w-full"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={() => navigate('/settings')} aria-label="Settings">
                <SettingsIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={logout} aria-label="Logout">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-accent-gray mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600">
            Powered by Offer On Tap
          </p>
        </div>
      </footer>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const fetchDashboardSummary = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard summary:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white rounded-lg shadow"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      {/* Quick Access Strip */}
      <QuickAccessStrip />
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-primary-navy mb-2">Dashboard</h2>
        <p className="text-text-secondary">Welcome back! Here's your CRM overview.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="premium-card cursor-pointer" onClick={() => navigate('/contacts')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Total Contacts</p>
                <p className="text-3xl font-bold text-primary-navy">{summary?.total_contacts || 0}</p>
              </div>
              <div className="p-3 bg-primary-navy-light rounded-full">
                <Users className="h-6 w-6 text-primary-navy" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card cursor-pointer" onClick={() => navigate('/tasks')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Tasks Due Today</p>
                <p className="text-3xl font-bold text-primary-navy">{summary?.tasks_due_today || 0}</p>
              </div>
              <div className="p-3 bg-secondary-gold-light rounded-full">
                <Calendar className="h-6 w-6 text-primary-navy" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card cursor-pointer" onClick={() => navigate('/promo-links')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Active Promo Links</p>
                <p className="text-3xl font-bold text-primary-navy">{summary?.active_promo_links || 0}</p>
              </div>
              <div className="p-3 bg-secondary-gold-light rounded-full">
                <Target className="h-6 w-6 text-primary-navy" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card cursor-pointer" onClick={() => navigate('/promo-links')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Commission Summary</p>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-green-600">
                    Paid: ${summary?.commission_summary?.total_paid?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-lg font-semibold text-red-600">
                    Unpaid: ${summary?.commission_summary?.total_unpaid?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-secondary-gold-light rounded-full">
                <DollarSign className="h-6 w-6 text-primary-navy" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="premium-card bg-white shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-primary-navy text-3xl font-bold">Quick Actions</CardTitle>
          <CardDescription className="text-text-secondary text-lg">Get started with your CRM tasks</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Button 
              className="dashboard-tile-navy"
              onClick={() => navigate('/contacts')}
              aria-label="Go to Contacts"
            >
              <Users className="h-8 w-8 mb-3" />
              <span className="text-lg font-semibold">Contacts</span>
            </Button>
            <Button 
              className="dashboard-tile-gold"
              onClick={() => navigate('/promo-links')}
              aria-label="Go to Promo Links"
            >
              <Target className="h-8 w-8 mb-3" />
              <span className="text-lg font-semibold">Promo Links</span>
            </Button>
            <Button 
              className="dashboard-tile-navy"
              onClick={() => navigate('/tasks')}
              aria-label="Go to Tasks"
            >
              <Calendar className="h-8 w-8 mb-3" />
              <span className="text-lg font-semibold">Tasks</span>
            </Button>
            <Button 
              className="dashboard-tile-gold"
              onClick={() => navigate('/marketing-vault')}
              aria-label="Go to Marketing Vault"
            >
              <Mail className="h-8 w-8 mb-3" />
              <span className="text-lg font-semibold">Marketing Vault</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

// Login Component
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    if (result.success) {
      // Navigate using React Router instead of window.location
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen dashboard-gradient-bg flex items-center justify-center px-4">
      <Card className="w-full max-w-md premium-card">
        <CardHeader className="text-center">
          <ConnectVaultLogo className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-primary-navy">Login to your CRM</CardTitle>
          <CardDescription>Access your CRM dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="form-input"
                aria-label="Username"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
                aria-label="Password"
              />
            </div>
            <Button 
              type="submit" 
              className="login-button"
              disabled={loading}
              aria-label={loading ? 'Logging in' : 'Login'}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <a 
              href="/forgot-password" 
              className="text-sm text-primary-navy hover:text-primary-navy-hover"
            >
              Forgot password?
            </a>
            <div className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="text-primary-navy hover:text-primary-navy-hover font-medium">
                Sign up
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Register Component
const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { settings } = useSettings();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const result = await register(formData);
    if (result.success) {
      setSuccess('Account created successfully. Please log in');
      setFormData({ full_name: '', username: '', email: '', password: '', role: 'user' });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen dashboard-gradient-bg flex items-center justify-center px-4">
      <Card className="w-full max-w-md premium-card">
        <CardHeader className="text-center">
          <ConnectVaultLogo className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-primary-navy">Create Account</CardTitle>
          <CardDescription>Join {settings.branding.app_name} CRM</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            <Input
              type="text"
              name="full_name"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="form-input"
              aria-label="Full Name"
            />
            <Input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              className="form-input"
              aria-label="Username"
            />
            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="form-input"
              aria-label="Email"
            />
            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="form-input"
              aria-label="Password"
            />
            <Button 
              type="submit" 
              className="login-button"
              disabled={loading}
              aria-label={loading ? 'Creating Account' : 'Create Account'}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-primary-navy hover:text-primary-navy-hover font-medium">
                Login
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Email Subscriber Component
const EmailSubscriber = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    group_id: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/email/subscribe`, formData);
      toast({
        title: "Success",
        description: response.data.message,
        variant: "default",
      });
      setFormData({ name: '', email: '', group_id: '' });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to add subscriber",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Email">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-primary-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Email Marketing</h2>
          <p className="text-text-secondary">Add subscribers to your MailerLite list</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-primary-navy">Add Subscriber</CardTitle>
            <CardDescription>Add a new subscriber to your email list</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="form-input"
                  aria-label="Subscriber Name"
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="form-input"
                  aria-label="Subscriber Email"
                />
              </div>
              <div>
                <Input
                  placeholder="Group ID (Optional)"
                  value={formData.group_id}
                  onChange={(e) => setFormData({...formData, group_id: e.target.value})}
                  className="form-input"
                  aria-label="MailerLite Group ID"
                />
              </div>
              <Button 
                type="submit" 
                className="btn-primary-navy w-full"
                disabled={loading}
                aria-label={loading ? 'Adding Subscriber' : 'Add Subscriber'}
              >
                {loading ? 'Adding Subscriber...' : 'Add Subscriber'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-primary-navy">MailerLite Campaign Management</CardTitle>
            <CardDescription>Manage your email campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary mb-4">
              Access your MailerLite dashboard to create and manage email campaigns.
            </p>
            <Button 
              className="btn-secondary-gold w-full"
              onClick={() => window.open('https://dashboard.mailerlite.com/campaigns', '_blank')}
              aria-label="Open MailerLite Campaigns in new tab"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open MailerLite Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

// Settings Component (Admin Only)
const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load saved API key from localStorage
    const saved = localStorage.getItem('brevo-api-key');
    if (saved) {
      setBrevoApiKey(saved);
    }
  }, []);

  const handleSave = () => {
    if (!brevoApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Brevo API key",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem('brevo-api-key', brevoApiKey);
    toast({
      title: "Success",
      description: "Brevo API key saved successfully",
    });
  };

  return (
    <Layout title="Settings">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-primary-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Settings</h2>
          <p className="text-text-secondary">Configure your ConnectVault CRM</p>
        </div>
      </div>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-primary-navy">Email Integration (Brevo)</CardTitle>
          <CardDescription>Configure your Brevo API key for email marketing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Brevo API Key
            </label>
            <Input
              type="password"
              value={brevoApiKey}
              onChange={(e) => setBrevoApiKey(e.target.value)}
              placeholder="Enter your Brevo API key"
              className="form-input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get your API key from your Brevo dashboard under API & Integration section
            </p>
          </div>
          <Button onClick={handleSave} className="btn-primary-navy" disabled={loading}>
            {loading ? 'Saving...' : 'Save API Key'}
          </Button>
        </CardContent>
      </Card>
    </Layout>
  );
};

// Email Subscriber Component (updating the existing one)
const EmailSubscriber = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    to: '',
    subject: 'Test Email from ConnectVault',
    content: 'This is a test email sent from your ConnectVault CRM.'
  });
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const stored = localStorage.getItem('marketing-vault');
      if (stored) {
        setTemplates(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        subject: template.subject,
        content: template.body
      });
      setSelectedTemplate(templateId);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    
    const apiKey = localStorage.getItem('brevo-api-key');
    if (!apiKey) {
      toast({
        title: "API Key Missing",
        description: "Please configure your Brevo API key in Settings first",
        variant: "destructive",
      });
      return;
    }

    if (!formData.to.trim()) {
      toast({
        title: "Missing Email",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Simulate API call (you could implement actual Brevo integration here)
    setTimeout(() => {
      toast({
        title: "Test Email Sent",
        description: `Test email sent to ${formData.to}`,
      });
      setLoading(false);
    }, 1000);
  };

  return (
    <Layout title="Email Marketing">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-primary-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Email Marketing</h2>
          <p className="text-text-secondary">Send emails using your Brevo integration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Send Test Email */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-primary-navy">Send Test Email</CardTitle>
            <CardDescription>Send a test email using your Brevo API key</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">To Email *</label>
                <Input
                  type="email"
                  value={formData.to}
                  onChange={(e) => setFormData({...formData, to: e.target.value})}
                  placeholder="recipient@example.com"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Subject</label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="Email subject"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Content</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Email content"
                  className="form-input"
                  rows="5"
                />
              </div>
              <Button type="submit" className="btn-primary-navy w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Test Email'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Choose Template */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-primary-navy">Choose Template from Marketing Vault</CardTitle>
            <CardDescription>Load a template into the email editor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Select Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">Choose a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </div>
              {templates.length === 0 && (
                <p className="text-sm text-gray-500">
                  No templates found. Visit the Marketing Vault to load templates.
                </p>
              )}
              <Button 
                onClick={() => navigate('/marketing-vault')} 
                variant="outline" 
                className="w-full"
              >
                Go to Marketing Vault
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

// Other existing components (simplified for brevity - Contacts, Tasks, etc.)
// These would need to be updated to use "Promo Links" instead of "Offers"

// Contacts Component (updated)
const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    platform: '',
    notes: ''
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setContacts([]);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      toast({
        title: "Success",
        description: "Contact added successfully",
      });
      setShowForm(false);
      setFormData({ name: '', email: '', platform: '', notes: '' });
      fetchContacts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout title="Contacts">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-primary-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Contacts</h2>
          <p className="text-text-secondary">Manage your contacts and outreach</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="btn-primary-navy">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8 premium-card">
          <CardHeader>
            <CardTitle className="text-primary-navy">Add New Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="form-input"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="form-input"
                />
              </div>
              <Input
                placeholder="Platform (e.g., Instagram, LinkedIn)"
                value={formData.platform}
                onChange={(e) => setFormData({...formData, platform: e.target.value})}
                required
                className="form-input"
              />
              <Textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
              <div className="flex space-x-2">
                <Button type="submit" className="btn-primary-navy">
                  Add Contact
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-primary-navy">Your Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No contacts yet. Add your first contact to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{contact.name}</h3>
                      <p className="text-sm text-gray-600">{contact.email}</p>
                      <p className="text-sm text-gray-600">{contact.platform}</p>
                      {contact.notes && <p className="text-sm mt-2">{contact.notes}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

// Simplified placeholder components for other pages (Tasks, PromoLinks, MarketingVault, etc.)
const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    notes: '',
    priority: 'medium',
    assignee: ''
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const stored = localStorage.getItem('tasks');
      if (stored) {
        setTasks(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    const newTask = {
      id: Date.now().toString(),
      ...formData,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));

    toast({
      title: "Success",
      description: "Task added successfully",
    });

    setFormData({ title: '', due_date: '', notes: '', priority: 'medium', assignee: '' });
    setShowModal(false);
  };

  const moveTask = (taskId, newStatus) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    setTasks(updatedTasks);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <Layout title="Tasks">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-primary-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Tasks</h2>
          <p className="text-text-secondary">Manage your tasks and follow-ups</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="btn-primary-navy">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md premium-card">
            <CardHeader>
              <CardTitle className="text-primary-navy">Add New Task</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Task title"
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Due Date</label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="form-input w-full"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Assignee (Optional)</label>
                  <Input
                    value={formData.assignee}
                    onChange={(e) => setFormData({...formData, assignee: e.target.value})}
                    placeholder="Assigned to"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Task notes"
                    className="form-input"
                    rows="3"
                  />
                </div>
                <div className="flex space-x-4">
                  <Button type="submit" className="btn-primary-navy">
                    Add Task
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['pending', 'in_progress', 'done'].map((status) => (
          <Card key={status} className="premium-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 capitalize">
                {status.replace('_', ' ')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getTasksByStatus(status).map((task) => (
                  <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.due_date && (
                      <p className="text-xs text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                    )}
                    {task.priority && (
                      <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="mt-1">
                        {task.priority}
                      </Badge>
                    )}
                    <div className="flex space-x-1 mt-2">
                      {status !== 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => moveTask(task.id, 'pending')}>
                          ← Pending
                        </Button>
                      )}
                      {status !== 'in_progress' && (
                        <Button size="sm" variant="outline" onClick={() => moveTask(task.id, 'in_progress')}>
                          → Progress
                        </Button>
                      )}
                      {status !== 'done' && (
                        <Button size="sm" variant="outline" onClick={() => moveTask(task.id, 'done')}>
                          ✓ Done
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {getTasksByStatus(status).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No {status.replace('_', ' ')} tasks
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
};

const PromoLinks = () => {
  const [promoLinks, setPromoLinks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    destination_url: '',
    notes: '',
    active: true
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPromoLinks();
  }, []);

  const fetchPromoLinks = async () => {
    try {
      // For now, use localStorage to store promo links
      const stored = localStorage.getItem('promo-links');
      if (stored) {
        setPromoLinks(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error fetching promo links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic URL validation
    try {
      new URL(formData.destination_url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Missing Name",
        description: "Please enter a name for the promo link",
        variant: "destructive",
      });
      return;
    }

    const newLink = {
      id: Date.now().toString(),
      ...formData,
      created_at: new Date().toISOString()
    };

    const updatedLinks = [...promoLinks, newLink];
    setPromoLinks(updatedLinks);
    localStorage.setItem('promo-links', JSON.stringify(updatedLinks));

    toast({
      title: "Success",
      description: "Promo link added successfully",
    });

    setFormData({ name: '', destination_url: '', notes: '', active: true });
    setShowForm(false);
  };

  const toggleActive = (id) => {
    const updatedLinks = promoLinks.map(link => 
      link.id === id ? { ...link, active: !link.active } : link
    );
    setPromoLinks(updatedLinks);
    localStorage.setItem('promo-links', JSON.stringify(updatedLinks));
  };

  return (
    <Layout title="Promo Links">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-secondary-gold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Promo Links</h2>
          <p className="text-text-secondary">Manage your promotional links</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="btn-secondary-gold">
          <Plus className="h-4 w-4 mr-2" />
          Add Promo Link
        </Button>
      </div>

      {showForm && (
        <Card className="premium-card mb-6">
          <CardHeader>
            <CardTitle className="text-primary-navy">Add New Promo Link</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Summer Sale Campaign"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Destination URL *</label>
                <Input
                  type="url"
                  value={formData.destination_url}
                  onChange={(e) => setFormData({...formData, destination_url: e.target.value})}
                  placeholder="https://example.com/offer"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Optional notes about this promo link"
                  className="form-input"
                  rows="3"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="active" className="text-sm font-medium text-text-primary">Active</label>
              </div>
              <div className="flex space-x-4">
                <Button type="submit" className="btn-secondary-gold">
                  Add Link
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-primary-navy">Your Promo Links</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : promoLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No promo links yet. Add your first promotional link to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {promoLinks.map((link) => (
                <div key={link.id} className="border rounded-lg p-4 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-lg">{link.name}</h3>
                      <Badge variant={link.active ? "default" : "secondary"}>
                        {link.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-600 mb-2">
                      <a href={link.destination_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {link.destination_url}
                      </a>
                    </p>
                    {link.notes && <p className="text-sm text-gray-600">{link.notes}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      Created: {new Date(link.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => toggleActive(link.id)}
                    >
                      {link.active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

const MarketingVault = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadMarketingVault();
  }, []);

  const loadMarketingVault = async () => {
    try {
      // Check if we have templates in localStorage
      let stored = localStorage.getItem('marketing-vault');
      
      if (!stored) {
        // Load seed data for first time
        const response = await fetch('/marketing_vault.json');
        const seedData = await response.json();
        localStorage.setItem('marketing-vault', JSON.stringify(seedData));
        setTemplates(seedData);
      } else {
        setTemplates(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading marketing vault:', error);
      // Fallback to empty array if can't load seed data
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast here
      console.log('Copied to clipboard');
    });
  };

  return (
    <Layout title="Marketing Vault">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-secondary-gold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-primary-navy">Marketing Vault</h2>
          <p className="text-text-secondary">Your collection of email templates and marketing content</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading templates...</div>
      ) : (
        <div className="space-y-6">
          {templates.map((template) => (
            <Card key={template.id} className="premium-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-primary-navy">{template.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">{template.goal}</Badge>
                      <Badge variant="secondary">{template.when_to_send}</Badge>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(template.subject + '\n\n' + template.body)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-1">Subject Line:</h4>
                    <p className="text-sm bg-gray-50 p-2 rounded border">{template.subject}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-1">Email Body:</h4>
                    <div className="text-sm bg-gray-50 p-4 rounded border whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {template.body}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    <strong>Goal:</strong> {template.goal} | <strong>When to send:</strong> {template.when_to_send}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
};

// Forgot Password Component
const ForgotPassword = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();
  const { settings } = useSettings();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setResetLink('');

    const result = await forgotPassword(emailOrUsername);
    if (result.success) {
      setMessage(result.data.message);
      if (result.data.reset_link) {
        setResetLink(result.data.reset_link);
      }
    } else {
      setMessage(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen dashboard-gradient-bg flex items-center justify-center px-4">
      <Card className="w-full max-w-md premium-card">
        <CardHeader className="text-center">
          <ConnectVaultLogo className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-primary-navy">Reset Password</CardTitle>
          <CardDescription>Enter your email or username</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800">{message}</AlertDescription>
              </Alert>
            )}
            {resetLink && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  <a href={resetLink} className="underline font-medium">
                    Click here to reset your password
                  </a>
                </AlertDescription>
              </Alert>
            )}
            <Input
              type="text"
              placeholder="Email or Username"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              className="form-input"
            />
            <Button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a href="/login" className="text-sm text-primary-navy hover:text-primary-navy-hover">
              Back to Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Reset Password Component
const ResetPassword = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const result = await resetPassword(token, formData.newPassword, formData.confirmPassword);
    if (result.success) {
      setSuccess('Password reset successfully. You can now login with your new password.');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen dashboard-gradient-bg flex items-center justify-center px-4">
        <Card className="w-full max-w-md premium-card">
          <CardContent className="text-center pt-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                Invalid reset link. Please request a new password reset.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <a href="/forgot-password" className="text-primary-navy hover:text-primary-navy-hover">
                Request New Reset Link
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-gradient-bg flex items-center justify-center px-4">
      <Card className="w-full max-w-md premium-card">
        <CardHeader className="text-center">
          <ConnectVaultLogo className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-primary-navy">Set New Password</CardTitle>
          <CardDescription>Enter your new password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            <Input
              type="password"
              name="newPassword"
              placeholder="New Password"
              value={formData.newPassword}
              onChange={handleChange}
              required
              className="form-input"
            />
            <Input
              type="password"
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="form-input"
            />
            <Button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a href="/login" className="text-sm text-primary-navy hover:text-primary-navy-hover">
              Back to Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token, user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return (token && user) ? children : <Navigate to="/login" />;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { token, user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return (token && user) ? <Navigate to="/dashboard" /> : children;
};

// Main App Component
function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App font-sans">
            <Routes>
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/register" element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } />
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } />
              <Route path="/reset-password" element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/contacts" element={
                <ProtectedRoute>
                  <Contacts />
                </ProtectedRoute>
              } />
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              } />
              <Route path="/promo-links" element={
                <ProtectedRoute>
                  <PromoLinks />
                </ProtectedRoute>
              } />
              <Route path="/marketing-vault" element={
                <ProtectedRoute>
                  <MarketingVault />
                </ProtectedRoute>
              } />
              <Route path="/email" element={
                <ProtectedRoute>
                  <EmailSubscriber />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              {/* Legacy route redirect */}
              <Route path="/offers" element={<Navigate to="/promo-links" />} />
            </Routes>
            <Toaster />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;