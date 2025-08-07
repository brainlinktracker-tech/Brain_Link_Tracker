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
  Crown, Briefcase, HardHat, UserCheck
} from 'lucide-react';
import { API_ENDPOINTS } from '../config';

const MemberDashboard = ({ user, token, onLogout }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
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
    fetchCampaigns();
    fetchTrackingLinks();
    fetchAnalytics();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/campaigns`, {
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

  const fetchTrackingLinks = async (campaignId = null) => {
    try {
      const url = campaignId 
        ? `${API_ENDPOINTS.BASE}/campaigns/${campaignId}/tracking-links`
        : `${API_ENDPOINTS.BASE}/tracking-links`;
        
      const response = await fetch(url, {
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
      const response = await fetch(`${API_ENDPOINTS.BASE}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.target_url) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newCampaign),
      });

      if (response.ok) {
        toast.success('Campaign created successfully');
        setNewCampaign({ name: '', description: '', target_url: '', status: 'active' });
        fetchCampaigns();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create campaign');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const createTrackingLink = async () => {
    if (!newLink.original_url) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/tracking-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newLink),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Tracking link created successfully');
        setNewLink({ original_url: '', email: '', campaign_id: '' });
        fetchTrackingLinks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create tracking link');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Member Dashboard</h1>
          <p className="text-gray-600">Manage your personal campaigns and track performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className={`${getRoleBadgeColor(user.role)} text-white px-3 py-1`}>
            <div className="flex items-center space-x-1">
              {getRoleIcon(user.role)}
              <span className="capitalize">{user.role} - Individual User</span>
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
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">My Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-xs text-gray-500">Personal campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Link className="h-5 w-5 text-blue-500" />
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
              <MousePointer className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Total Clicks</p>
                <p className="text-2xl font-bold">{analytics?.overview?.totalClicks || 0}</p>
                <p className="text-xs text-gray-500">All campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Active Links</p>
                <p className="text-2xl font-bold">{trackingLinks.filter(link => link.status === 'active').length}</p>
                <p className="text-xs text-gray-500">Currently active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Create New Campaign</span>
            </CardTitle>
            <CardDescription>
              Set up a new marketing campaign to track your links
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                  <DialogDescription>
                    Set up a new campaign to organize your tracking links
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Link className="h-5 w-5" />
              <span>Generate Tracking Link</span>
            </CardTitle>
            <CardDescription>
              Create a new tracking link for your campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Tracking Link</DialogTitle>
                  <DialogDescription>
                    Create a new tracking link for your campaign
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkUrl">Original URL</Label>
                    <Input
                      id="linkUrl"
                      placeholder="https://example.com"
                      value={newLink.original_url}
                      onChange={(e) => setNewLink({...newLink, original_url: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkEmail">Email (Optional)</Label>
                    <Input
                      id="linkEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={newLink.email}
                      onChange={(e) => setNewLink({...newLink, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkCampaign">Campaign (Optional)</Label>
                    <select
                      id="linkCampaign"
                      className="w-full p-2 border rounded-md"
                      value={newLink.campaign_id}
                      onChange={(e) => setNewLink({...newLink, campaign_id: e.target.value})}
                    >
                      <option value="">Select a campaign</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setNewLink({ original_url: '', email: '', campaign_id: '' })}>
                      Cancel
                    </Button>
                    <Button onClick={createTrackingLink}>
                      Generate Link
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* My Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>My Campaigns</span>
          </CardTitle>
          <CardDescription>
            Overview of all your personal campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedCampaign(campaign)}>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
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
            <span>My Tracking Links</span>
          </CardTitle>
          <CardDescription>
            Manage and monitor all your tracking links
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
            <span>Performance Overview</span>
          </CardTitle>
          <CardDescription>
            Comprehensive overview of your campaign performance
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
            Geographic distribution and performance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Geography token={token} />
        </CardContent>
      </Card>

      {/* Member Access Notice */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-800">Member Account Capabilities</h4>
              <p className="text-sm text-green-700 mt-1">
                As a Member account holder, you have the following capabilities:
              </p>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• Create and manage personal campaigns</li>
                <li>• Generate unlimited tracking links</li>
                <li>• Access detailed click analytics and performance metrics</li>
                <li>• View geographic distribution of your audience</li>
                <li>• Monitor campaign performance in real-time</li>
                <li>• Export analytics data for external analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberDashboard;

