import React, { useState, useContext, createContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Alert, AlertDescription } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
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
  Download,
  Edit,
  Trash2,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react';
import { useToast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
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

// Layout Component with Navigation
const Layout = ({ children, title = "ConnectVault" }) => {
  const { logout } = useAuth();
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
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-navy-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-navy-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_connect-vault-crm/artifacts/sgfxttrw_Applogo.png" 
                alt="ConnectVault" 
                className="h-10 w-auto cursor-pointer"
                onClick={() => navigate('/dashboard')}
              />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-navy-900">ConnectVault Dashboard</h1>
                {title !== "Dashboard" && (
                  <span className="text-sm text-navy-600">{title}</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button 
                  variant="outline" 
                  className="relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-gold-500 text-navy-900 h-5 w-5 rounded-full text-xs flex items-center justify-center">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-navy-900">Notifications</h3>
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
              <Button variant="outline" onClick={logout}>
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
      <footer className="bg-white border-t border-navy-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-navy-600">
            Powered by Offer On Tap
          </p>
        </div>
      </footer>
    </div>
  );
};

// Login Component
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_connect-vault-crm/artifacts/sgfxttrw_Applogo.png" 
            alt="ConnectVault Logo" 
            className="max-h-24 mx-auto mb-4 object-contain"
          />
          <CardTitle className="text-2xl font-bold text-navy-900">Login to ConnectVault</CardTitle>
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
                className="border-navy-200 focus:border-navy-400"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-navy-200 focus:border-navy-400"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-navy-600 hover:bg-navy-700 text-white"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <a 
              href="/forgot-password" 
              className="text-sm text-navy-600 hover:text-navy-800"
            >
              Forgot password?
            </a>
            <div className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="text-navy-600 hover:text-navy-800 font-medium">
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_connect-vault-crm/artifacts/sgfxttrw_Applogo.png" 
            alt="ConnectVault Logo" 
            className="max-h-24 mx-auto mb-4 object-contain"
          />
          <CardTitle className="text-2xl font-bold text-navy-900">Create Account</CardTitle>
          <CardDescription>Join ConnectVault CRM</CardDescription>
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
              className="border-navy-200 focus:border-navy-400"
            />
            <Input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              className="border-navy-200 focus:border-navy-400"
            />
            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="border-navy-200 focus:border-navy-400"
            />
            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="border-navy-200 focus:border-navy-400"
            />
            <Button 
              type="submit" 
              className="w-full bg-navy-600 hover:bg-navy-700 text-white"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-navy-600 hover:text-navy-800 font-medium">
                Login
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-navy-200 rounded w-1/3"></div>
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
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-navy-900 mb-2">Dashboard</h2>
        <p className="text-navy-600">Welcome back! Here's your CRM overview.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-navy-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/contacts')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy-600">Total Contacts</p>
                <p className="text-3xl font-bold text-navy-900">{summary?.total_contacts || 0}</p>
              </div>
              <div className="p-3 bg-navy-100 rounded-full">
                <Users className="h-6 w-6 text-navy-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-navy-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/tasks')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy-600">Tasks Due Today</p>
                <p className="text-3xl font-bold text-navy-900">{summary?.tasks_due_today || 0}</p>
              </div>
              <div className="p-3 bg-gold-100 rounded-full">
                <Calendar className="h-6 w-6 text-gold-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-navy-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/offers')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy-600">Active Offers</p>
                <p className="text-3xl font-bold text-navy-900">{summary?.active_offers || 0}</p>
              </div>
              <div className="p-3 bg-navy-100 rounded-full">
                <Target className="h-6 w-6 text-navy-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-navy-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/offers')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy-600">Commission Summary</p>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-green-600">
                    Paid: ${summary?.commission_summary?.total_paid?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-lg font-semibold text-red-600">
                    Unpaid: ${summary?.commission_summary?.total_unpaid?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-gold-100 rounded-full">
                <DollarSign className="h-6 w-6 text-gold-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="bg-cream-100 rounded-xl p-8">
        <Card className="border-navy-200 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-navy-900 text-2xl">Quick Actions</CardTitle>
            <CardDescription className="text-navy-600">Get started with your CRM tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Button 
                className="btn-navy h-auto py-6 px-6 flex flex-col items-center space-y-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                onClick={() => navigate('/contacts')}
              >
                <Users className="h-8 w-8" />
                <span className="text-lg font-semibold">Contacts</span>
              </Button>
              <Button 
                className="btn-gold h-auto py-6 px-6 flex flex-col items-center space-y-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                onClick={() => navigate('/offers')}
              >
                <Target className="h-8 w-8" />
                <span className="text-lg font-semibold">Offers</span>
              </Button>
              <Button 
                className="btn-navy h-auto py-6 px-6 flex flex-col items-center space-y-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                onClick={() => navigate('/tasks')}
              >
                <Calendar className="h-8 w-8" />
                <span className="text-lg font-semibold">Tasks</span>
              </Button>
              <Button 
                className="btn-gold h-auto py-6 px-6 flex flex-col items-center space-y-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                onClick={() => navigate('/marketing-vault')}
              >
                <Mail className="h-8 w-8" />
                <span className="text-lg font-semibold">Marketing Vault</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

// Contacts Component
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
      // Stub for now - will implement endpoints later
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
      // Stub for now
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
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-navy-900">Contacts</h2>
          <p className="text-navy-600">Manage your contacts and outreach</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="btn-navy">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <Input
                placeholder="Platform (e.g., Instagram, LinkedIn)"
                value={formData.platform}
                onChange={(e) => setFormData({...formData, platform: e.target.value})}
                required
              />
              <Textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
              <div className="flex space-x-2">
                <Button type="submit" className="bg-navy-600 hover:bg-navy-700">
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

      <Card>
        <CardHeader>
          <CardTitle>Your Contacts</CardTitle>
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

// Tasks Component
const Tasks = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tasks, setTasks] = useState({
    pending: [],
    in_progress: [],
    done: []
  });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'pending'
  });

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      const newTask = {
        id: Date.now().toString(),
        ...taskFormData,
        created_at: new Date().toISOString()
      };
      
      setTasks(prev => ({
        ...prev,
        [taskFormData.status]: [...prev[taskFormData.status], newTask]
      }));
      
      setTaskFormData({
        title: '',
        description: '',
        due_date: '',
        status: 'pending'
      });
      setShowTaskForm(false);
      
      toast({
        title: "Success",
        description: "Task added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    }
  };

  const moveTask = (taskId, fromStatus, toStatus) => {
    const taskToMove = tasks[fromStatus].find(task => task.id === taskId);
    if (taskToMove) {
      setTasks(prev => ({
        ...prev,
        [fromStatus]: prev[fromStatus].filter(task => task.id !== taskId),
        [toStatus]: [...prev[toStatus], { ...taskToMove, status: toStatus }]
      }));
      
      toast({
        title: "Task Updated",
        description: `Task moved to ${toStatus.replace('_', ' ')}`,
      });
    }
  };

  const deleteTask = (taskId, status) => {
    setTasks(prev => ({
      ...prev,
      [status]: prev[status].filter(task => task.id !== taskId)
    }));
    
    toast({
      title: "Task Deleted",
      description: "Task removed successfully",
    });
  };

  const renderTaskColumn = (status, title, tasks) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No {title.toLowerCase()} tasks
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-3 bg-white shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteTask(task.id, status)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {task.description && (
                  <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                )}
                {task.due_date && (
                  <p className="text-xs text-gray-500 mb-2">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                )}
                <div className="flex space-x-1">
                  {status !== 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moveTask(task.id, status, 'pending')}
                      className="text-xs h-6"
                    >
                      ← Pending
                    </Button>
                  )}
                  {status !== 'in_progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moveTask(task.id, status, 'in_progress')}
                      className="text-xs h-6"
                    >
                      In Progress
                    </Button>
                  )}
                  {status !== 'done' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moveTask(task.id, status, 'done')}
                      className="text-xs h-6"
                    >
                      Done →
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout title="Tasks">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-navy">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-navy-900">Tasks</h2>
          <p className="text-navy-600">Manage your tasks and follow-ups</p>
        </div>
        <Button onClick={() => setShowTaskForm(!showTaskForm)} className="btn-navy">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Add Task Form */}
      {showTaskForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <Input
                placeholder="Task Title"
                value={taskFormData.title}
                onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value})}
                required
              />
              <Textarea
                placeholder="Task description (optional)"
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="date"
                  value={taskFormData.due_date}
                  onChange={(e) => setTaskFormData({...taskFormData, due_date: e.target.value})}
                />
                <Select
                  value={taskFormData.status}
                  onValueChange={(value) => setTaskFormData({...taskFormData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="bg-navy-600 hover:bg-navy-700">
                  Add Task
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowTaskForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderTaskColumn('pending', 'Pending', tasks.pending)}
        {renderTaskColumn('in_progress', 'In Progress', tasks.in_progress)}
        {renderTaskColumn('done', 'Done', tasks.done)}
      </div>
    </Layout>
  );
};

// Offers Component
const Offers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [offers, setOffers] = useState([]);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [offerFormData, setOfferFormData] = useState({
    offer_name: '',
    promo_link: ''
  });
  const [commissionFormData, setCommissionFormData] = useState({
    offer_id: '',
    customer_name: '',
    customer_email: '',
    commission_amount: '',
    paid: false
  });

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    try {
      // Add offer locally for now
      const newOffer = {
        id: Date.now().toString(),
        ...offerFormData,
        tracking_link: `${offerFormData.promo_link}?ref=track_${Date.now()}`
      };
      setOffers([...offers, newOffer]);
      setOfferFormData({ offer_name: '', promo_link: '' });
      setShowOfferForm(false);
      toast({
        title: "Success",
        description: "Offer added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add offer",
        variant: "destructive",
      });
    }
  };

  const handleCommissionSubmit = async (e) => {
    e.preventDefault();
    try {
      toast({
        title: "Success",
        description: "Commission logged successfully",
      });
      setCommissionFormData({
        offer_id: '',
        customer_name: '',
        customer_email: '',
        commission_amount: '',
        paid: false
      });
      setShowCommissionForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log commission",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <Layout title="Offers & Commissions">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-gold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-navy-900">Offers & Commissions</h2>
          <p className="text-navy-600">Manage your offers and track commissions</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowOfferForm(!showOfferForm)} className="btn-gold">
            <Plus className="h-4 w-4 mr-2" />
            Add Offer
          </Button>
          <Button onClick={() => setShowCommissionForm(!showCommissionForm)} className="btn-gold">
            <Plus className="h-4 w-4 mr-2" />
            Log Commission
          </Button>
        </div>
      </div>

      {/* Add Offer Form */}
      {showOfferForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Offer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOfferSubmit} className="space-y-4">
              <Input
                placeholder="Offer Name"
                value={offerFormData.offer_name}
                onChange={(e) => setOfferFormData({...offerFormData, offer_name: e.target.value})}
                required
              />
              <Input
                placeholder="Promo Link (Affiliate URL)"
                value={offerFormData.promo_link}
                onChange={(e) => setOfferFormData({...offerFormData, promo_link: e.target.value})}
                required
              />
              <div className="flex space-x-2">
                <Button type="submit" className="bg-navy-600 hover:bg-navy-700">
                  Add Offer
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowOfferForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Add Commission Form */}
      {showCommissionForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Log Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCommissionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Customer Name"
                  value={commissionFormData.customer_name}
                  onChange={(e) => setCommissionFormData({...commissionFormData, customer_name: e.target.value})}
                  required
                />
                <Input
                  type="email"
                  placeholder="Customer Email"
                  value={commissionFormData.customer_email}
                  onChange={(e) => setCommissionFormData({...commissionFormData, customer_email: e.target.value})}
                  required
                />
              </div>
              <Input
                type="number"
                step="0.01"
                placeholder="Commission Amount"
                value={commissionFormData.commission_amount}
                onChange={(e) => setCommissionFormData({...commissionFormData, commission_amount: e.target.value})}
                required
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="paid"
                  checked={commissionFormData.paid}
                  onChange={(e) => setCommissionFormData({...commissionFormData, paid: e.target.checked})}
                />
                <label htmlFor="paid" className="text-sm">Mark as paid</label>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="bg-gold-600 hover:bg-gold-700">
                  Log Commission
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCommissionForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Offers</CardTitle>
          </CardHeader>
          <CardContent>
            {offers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No offers yet. Create your first offer to get started!
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <div key={offer.id} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">{offer.offer_name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Promo Link:</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(offer.promo_link, "Promo Link")}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Promo Link
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Tracking Link:</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(offer.tracking_link, "Tracking Link")}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Tracking Link
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commission Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              No commissions recorded yet.
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

// Marketing Vault Component
const MarketingVault = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('swipes');
  const [showForms, setShowForms] = useState({
    swipe: false,
    hook: false,
    prompt: false
  });

  // State for all vaults
  const [swipeVault, setSwipeVault] = useState([
    {
      id: '1',
      subject: "Excited to connect with you 🚀",
      body: "Hey [Name], thanks for checking this out. I'm all about helping you keep things simple, actionable, and effective. Keep an eye out—I'll be sharing resources that can help you get real traction. Talk soon!"
    },
    {
      id: '2',
      subject: "Found something worth sharing 👇",
      body: "I don't usually recommend just anything, but this stood out. If you're serious about growing online, check this out: [Your Link]. It's straightforward, no fluff, and can help you move forward faster."
    },
    {
      id: '3',
      subject: "Quick tip you can use today",
      body: "Here's one thing I always recommend: focus on ONE clear action at a time. Whether it's building a list, refining your pitch, or getting your offer out—clarity wins. If you need a tool to help keep things organized, here's what I use: [Your Link]."
    }
  ]);

  const [hookVault, setHookVault] = useState([
    { id: '1', text: "What if one small change could double your sales?" },
    { id: '2', text: "Most marketers get this wrong… here's the fix 👇" },
    { id: '3', text: "Stop wasting hours on busy work — try this instead." },
    { id: '4', text: "The secret I wish I knew when I started marketing online." },
    { id: '5', text: "Want consistent leads without paid ads? Read this." }
  ]);

  const [promptVault, setPromptVault] = useState([
    { id: '1', text: "Write a 3-part email sequence for promoting [Offer] to affiliate marketers." },
    { id: '2', text: "Generate 5 social media captions with hooks to drive traffic to [Link]." },
    { id: '3', text: "Rewrite this sales email in a casual, friendly tone." },
    { id: '4', text: "Create 10 TikTok hooks for digital marketing offers." },
    { id: '5', text: "Draft a product description for [Offer] that emphasizes simplicity and results." }
  ]);

  // Form states
  const [swipeFormData, setSwipeFormData] = useState({ subject: '', body: '' });
  const [hookFormData, setHookFormData] = useState({ text: '' });
  const [promptFormData, setPromptFormData] = useState({ text: '' });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard",
    });
  };

  const handleSwipeSubmit = (e) => {
    e.preventDefault();
    const newSwipe = {
      id: Date.now().toString(),
      subject: swipeFormData.subject,
      body: swipeFormData.body
    };
    setSwipeVault([...swipeVault, newSwipe]);
    setSwipeFormData({ subject: '', body: '' });
    setShowForms({ ...showForms, swipe: false });
    toast({
      title: "Success",
      description: "Swipe added successfully",
    });
  };

  const handleHookSubmit = (e) => {
    e.preventDefault();
    const newHook = {
      id: Date.now().toString(),
      text: hookFormData.text
    };
    setHookVault([...hookVault, newHook]);
    setHookFormData({ text: '' });
    setShowForms({ ...showForms, hook: false });
    toast({
      title: "Success",
      description: "Hook added successfully",
    });
  };

  const handlePromptSubmit = (e) => {
    e.preventDefault();
    const newPrompt = {
      id: Date.now().toString(),
      text: promptFormData.text
    };
    setPromptVault([...promptVault, newPrompt]);
    setPromptFormData({ text: '' });
    setShowForms({ ...showForms, prompt: false });
    toast({
      title: "Success",
      description: "Prompt added successfully",
    });
  };

  const deleteItem = (id, type) => {
    switch(type) {
      case 'swipe':
        setSwipeVault(swipeVault.filter(item => item.id !== id));
        break;
      case 'hook':
        setHookVault(hookVault.filter(item => item.id !== id));
        break;
      case 'prompt':
        setPromptVault(promptVault.filter(item => item.id !== id));
        break;
    }
    toast({
      title: "Deleted",
      description: "Item removed successfully",
    });
  };

  return (
    <Layout title="Marketing Vault">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-4 btn-gold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-navy-900">Marketing Vault</h2>
          <p className="text-navy-600">Your collection of swipes, hooks, and prompts</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="swipes">Swipe Vault</TabsTrigger>
          <TabsTrigger value="hooks">Hook Vault</TabsTrigger>
          <TabsTrigger value="prompts">Prompt Vault</TabsTrigger>
        </TabsList>

        <TabsContent value="swipes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Email Swipes</h3>
            <Button 
              onClick={() => setShowForms({ ...showForms, swipe: !showForms.swipe })}
              className="btn-gold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Swipe
            </Button>
          </div>

          {showForms.swipe && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Email Swipe</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSwipeSubmit} className="space-y-4">
                  <Input
                    placeholder="Email Subject"
                    value={swipeFormData.subject}
                    onChange={(e) => setSwipeFormData({...swipeFormData, subject: e.target.value})}
                    required
                  />
                  <Textarea
                    placeholder="Email Body"
                    value={swipeFormData.body}
                    onChange={(e) => setSwipeFormData({...swipeFormData, body: e.target.value})}
                    required
                    rows={4}
                  />
                  <div className="flex space-x-2">
                    <Button type="submit" className="bg-navy-600 hover:bg-navy-700">
                      Add Swipe
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowForms({ ...showForms, swipe: false })}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {swipeVault.map((swipe) => (
            <Card key={swipe.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium mb-2">Subject: {swipe.subject}</p>
                    <p className="text-sm text-gray-600">{swipe.body}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(`Subject: ${swipe.subject}\n\n${swipe.body}`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteItem(swipe.id, 'swipe')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="hooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Marketing Hooks</h3>
            <Button 
              onClick={() => setShowForms({ ...showForms, hook: !showForms.hook })}
              className="btn-gold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Hook
            </Button>
          </div>

          {showForms.hook && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Marketing Hook</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleHookSubmit} className="space-y-4">
                  <Textarea
                    placeholder="Enter your marketing hook..."
                    value={hookFormData.text}
                    onChange={(e) => setHookFormData({text: e.target.value})}
                    required
                    rows={2}
                  />
                  <div className="flex space-x-2">
                    <Button type="submit" className="bg-navy-600 hover:bg-navy-700">
                      Add Hook
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowForms({ ...showForms, hook: false })}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {hookVault.map((hook) => (
            <Card key={hook.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <p className="flex-1">{hook.text}</p>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(hook.text)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteItem(hook.id, 'hook')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">ChatGPT Prompts</h3>
            <Button 
              onClick={() => setShowForms({ ...showForms, prompt: !showForms.prompt })}
              className="bg-navy-600 hover:bg-navy-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Prompt
            </Button>
          </div>

          {showForms.prompt && (
            <Card>
              <CardHeader>
                <CardTitle>Add New ChatGPT Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePromptSubmit} className="space-y-4">
                  <Textarea
                    placeholder="Enter your ChatGPT prompt..."
                    value={promptFormData.text}
                    onChange={(e) => setPromptFormData({text: e.target.value})}
                    required
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <Button type="submit" className="bg-navy-600 hover:bg-navy-700">
                      Add Prompt
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowForms({ ...showForms, prompt: false })}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {promptVault.map((prompt) => (
            <Card key={prompt.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <p className="flex-1">{prompt.text}</p>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(prompt.text)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteItem(prompt.id, 'prompt')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_connect-vault-crm/artifacts/sgfxttrw_Applogo.png" 
            alt="ConnectVault Logo" 
            className="max-h-24 mx-auto mb-4 object-contain"
          />
          <CardTitle className="text-2xl font-bold text-navy-900">Reset Password</CardTitle>
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
              className="border-navy-200 focus:border-navy-400"
            />
            <Button 
              type="submit" 
              className="w-full bg-navy-600 hover:bg-navy-700 text-white"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a href="/login" className="text-sm text-navy-600 hover:text-navy-800">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center pt-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                Invalid reset link. Please request a new password reset.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <a href="/forgot-password" className="text-navy-600 hover:text-navy-800">
                Request New Reset Link
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_connect-vault-crm/artifacts/sgfxttrw_Applogo.png" 
            alt="ConnectVault Logo" 
            className="max-h-24 mx-auto mb-4 object-contain"
          />
          <CardTitle className="text-2xl font-bold text-navy-900">Set New Password</CardTitle>
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
              className="border-navy-200 focus:border-navy-400"
            />
            <Input
              type="password"
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="border-navy-200 focus:border-navy-400"
            />
            <Button 
              type="submit" 
              className="w-full bg-navy-600 hover:bg-navy-700 text-white"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a href="/login" className="text-sm text-navy-600 hover:text-navy-800">
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
  const { token, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return token ? children : <Navigate to="/login" />;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return token ? <Navigate to="/dashboard" /> : children;
};

// Main App Component
function App() {
  return (
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
            <Route path="/offers" element={
              <ProtectedRoute>
                <Offers />
              </ProtectedRoute>
            } />
            <Route path="/marketing-vault" element={
              <ProtectedRoute>
                <MarketingVault />
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;