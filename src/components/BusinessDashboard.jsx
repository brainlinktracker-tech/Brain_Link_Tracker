import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import TrackingLinksPage from './TrackingLinksPage';
import ClickAnalyticsTable from './ClickAnalyticsTable';
import CampaignOverview from './CampaignOverview';
import Geography from './Geography';
import { 
  User, Plus, Eye, BarChart3, TrendingUp, Activity, 
  Link, Mail, Calendar, Globe, Copy, ExternalLink,
  Target, Users, MousePointer, Shield, AlertCircle,
  FolderPlus, Settings, Trash2, Edit, Play, Pause,
  Briefcase, HardHat, UserCheck, UserX, Crown
} from 'lucide-react';
import { API_ENDPOINTS } from '../config';

const BusinessDashboard = ({ user, token, onLogout }) => {
  const [workers, setWorkers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [newWorker, setNewWorker] = useState({
    username: '',
    email: '',
    password: '',
    role: 'worker'
  });
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    target_url: '',
    status: 'active'
  });
  const [newLink, setNewLink] = useState({
    original_url: '',
    email: '',
    campaign_id: ''
  });

  useEffect(() => {
    console.log('BusinessDashboard mounted. Token:', token);
    fetchWorkers();
    fetchCampaigns();
    fetchTrackingLinks();
    fetchAnalytics();
  }, [token]);

  const fetchWorkers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter workers that belong to this business user
        const myWorkers = data.filter(u => u.role === 'worker' && u.parent_id === user.id);
        setWorkers(myWorkers || []);
      } else {
        toast.error('Failed to fetch workers');
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
      toast.error('Network error');
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CAMPAIGNS, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } else {
        toast.error('Failed to fetch campaigns');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const fetchTrackingLinks = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.LINKS, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTrackingLinks(data.links || []);
      } else {
        toast.error('Failed to fetch tracking links');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ANALYTICS, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    }
  };

  const createWorker = async () => {
    if (!newWorker.username || !newWorker.email || !newWorker.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newWorker,
          parent_id: user.id,
          status: 'active' // Business can directly activate their workers
        }),
      });

      if (response.ok) {
        toast.success('Worker created successfully');
        setNewWorker({ username: '', email: '', password: '', role: 'worker' });
        fetchWorkers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create worker');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const updateWorkerStatus = async (workerId, status) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.USERS}/${workerId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(`Worker ${status} successfully`);
        fetchWorkers();
      } else {
        toast.error('Failed to update worker status');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.target_url) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.CAMPAIGNS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCampaign),
      });

      if (response.ok) {
        toast.success('Campaign created successfully');
        setNewCampaign({ name: '', description: '', target_url: '', status: 'active' });
        fetchCampaigns();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'admin2': return <Shield className="h-4 w-4" />;
      case 'business': return <Briefcase className="h-4 w-4" />;
      case 'member': return <User className="h-4 w-4" />;
      case 'worker': return <HardHat className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-600';
      case 'admin2': return 'bg-orange-600';
      case 'business': return 'bg-blue-600';
      case 'member': return 'bg-green-600';
      case 'worker': return 'bg-gray-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'inactive': return 'bg-gray-600';
      case 'suspended': return 'bg-red-600';
      case 'pending': return 'bg-yellow-600';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Management Dashboard</h1>
          <p className="text-gray-600">Manage your workers and business operations</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className={`${getRoleBadgeColor(user.role)} text-white px-3 py-1`}>
            <div className="flex items-center space-x-1">
              {getRoleIcon(user.role)}
              <span className="capitalize">{user.role} - Business Manager</span>
            </div>
          </Badge>
          <Button variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <HardHat className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">My Workers</p>
                <p className="text-2xl font-bold">{workers.length}</p>
                <p className="text-xs text-gray-500">Active employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-xs text-gray-500">Active campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Link className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Tracking Links</p>
                <p className="text-2xl font-bold">{trackingLinks.length}</p>
                <p className="text-xs text-gray-500">Generated links</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MousePointer className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Total Clicks</p>
                <p className="text-2xl font-bold">{analytics?.overview?.totalClicks || 0}</p>
                <p className="text-xs text-gray-500">All campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worker Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardHat className="h-5 w-5" />
            <span>Worker Management</span>
          </CardTitle>
          <CardDescription>
            Manage your employees and their access to campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Worker
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Worker</DialogTitle>
                  <DialogDescription>
                    Add a new employee to your business team
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="workerUsername">Username</Label>
                    <Input
                      id="workerUsername"
                      placeholder="Enter username"
                      value={newWorker.username}
                      onChange={(e) => setNewWorker({...newWorker, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workerEmail">Email</Label>
                    <Input
                      id="workerEmail"
                      type="email"
                      placeholder="Enter email"
                      value={newWorker.email}
                      onChange={(e) => setNewWorker({...newWorker, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workerPassword">Password</Label>
                    <Input
                      id="workerPassword"
                      type="password"
                      placeholder="Enter password"
                      value={newWorker.password}
                      onChange={(e) => setNewWorker({...newWorker, password: e.target.value})}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setNewWorker({ username: '', email: '', password: '', role: 'worker' })}>
                      Cancel
                    </Button>
                    <Button onClick={createWorker}>
                      Create Worker
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => (
                <TableRow key={worker.id}>
                  <TableCell className="font-medium">{worker.username}</TableCell>
                  <TableCell>{worker.email}</TableCell>
                  <TableCell>
                    <Badge className={`${getRoleBadgeColor(worker.role)} text-white`}>
                      <div className="flex items-center space-x-1">
                        {getRoleIcon(worker.role)}
                        <span className="capitalize">{worker.role}</span>
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadgeColor(worker.status)} text-white`}>
                      {worker.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {worker.last_login ? new Date(worker.last_login).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {worker.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateWorkerStatus(worker.id, 'suspended')}
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => updateWorkerStatus(worker.id, 'active')}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Activate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {workers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No workers found. Create your first worker above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Campaign Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Campaign Management</span>
          </CardTitle>
          <CardDescription>
            Create and manage marketing campaigns for your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                  <DialogDescription>
                    Set up a new marketing campaign for your business
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaignName">Campaign Name</Label>
                    <Input
                      id="campaignName"
                      placeholder="Enter campaign name"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campaignDescription">Description</Label>
                    <Textarea
                      id="campaignDescription"
                      placeholder="Enter campaign description"
                      value={newCampaign.description}
                      onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campaignUrl">Target URL</Label>
                    <Input
                      id="campaignUrl"
                      placeholder="https://example.com"
                      value={newCampaign.target_url}
                      onChange={(e) => setNewCampaign({...newCampaign, target_url: e.target.value})}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setNewCampaign({ name: '', description: '', target_url: '', status: 'active' })}>
                      Cancel
                    </Button>
                    <Button onClick={createCampaign}>
                      Create Campaign
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Target URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.description}</TableCell>
                  <TableCell>
                    <a href={campaign.target_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {campaign.target_url}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No campaigns found. Create your first campaign above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tracking Links Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5" />
            <span>Tracking Links Management</span>
          </CardTitle>
          <CardDescription>
            Manage and monitor all tracking links for your campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrackingLinksPage />
        </CardContent>
      </Card>

      {/* Click Analytics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Click Analytics</span>
          </CardTitle>
          <CardDescription>
            Detailed analytics and performance metrics for your campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClickAnalyticsTable token={token} />
        </CardContent>
      </Card>

      {/* Campaign Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Campaign Overview</span>
          </CardTitle>
          <CardDescription>
            Comprehensive overview of all your campaigns and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignOverview token={token} />
        </CardContent>
      </Card>

      {/* Geography Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Geographic Analytics</span>
          </CardTitle>
          <CardDescription>
            Geographic distribution and performance analysis of your campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Geography token={token} />
        </CardContent>
      </Card>

      {/* Business Access Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Briefcase className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">Business Account Capabilities</h4>
              <p className="text-sm text-blue-700 mt-1">
                As a Business account holder, you have the following capabilities:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Create and manage worker accounts for your employees</li>
                <li>• Full access to campaign creation and management</li>
                <li>• Complete tracking link generation and analytics</li>
                <li>• Geographic and performance analytics for all campaigns</li>
                <li>• Worker status management (activate/suspend)</li>
                <li>• Assign campaigns and links to specific workers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessDashboard;

