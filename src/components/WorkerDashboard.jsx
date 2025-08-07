import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import { 
  HardHat, Eye, BarChart3, TrendingUp, Activity, 
  Link, Mail, Calendar, Globe, Copy, ExternalLink,
  Target, Users, MousePointer, Shield, AlertCircle,
  Crown, Briefcase, User, UserCheck, Clock,
  CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import { API_ENDPOINTS } from '../config';

const WorkerDashboard = ({ user, token, onLogout }) => {
  const [assignedCampaigns, setAssignedCampaigns] = useState([]);
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignedCampaigns();
    fetchTrackingLinks();
    fetchAnalytics();
    fetchTasks();
  }, []);

  const fetchAssignedCampaigns = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/worker/campaigns`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssignedCampaigns(data.campaigns || []);
      } else {
        // For demo purposes, show some sample campaigns
        setAssignedCampaigns([]);
      }
    } catch (error) {
      console.error('Network error fetching campaigns');
      setAssignedCampaigns([]);
    }
  };

  const fetchTrackingLinks = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/worker/tracking-links`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTrackingLinks(data.links || []);
      } else {
        setTrackingLinks([]);
      }
    } catch (error) {
      console.error('Network error fetching tracking links');
      setTrackingLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/worker/analytics`, {
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

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/worker/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        // Demo tasks for worker
        setTasks([
          {
            id: 1,
            title: 'Review Campaign Performance',
            description: 'Check the performance metrics for Q4 marketing campaign',
            status: 'pending',
            priority: 'medium',
            due_date: '2024-01-15',
            assigned_by: 'Business Manager'
          },
          {
            id: 2,
            title: 'Update Tracking Links',
            description: 'Verify all tracking links are working correctly',
            status: 'in_progress',
            priority: 'high',
            due_date: '2024-01-10',
            assigned_by: 'Admin2'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setTasks([]);
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

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'in_progress': return 'bg-purple-500';
      case 'paused': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getTaskPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
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

  // Calculate worker-specific statistics
  const workerStats = {
    totalLinks: trackingLinks.length,
    totalClicks: trackingLinks.reduce((sum, link) => sum + (link.clicks || 0), 0),
    totalOpens: trackingLinks.reduce((sum, link) => sum + (link.opens || 0), 0),
    activeCampaigns: assignedCampaigns.filter(c => c.status === 'active').length,
    pendingTasks: tasks.filter(t => t.status === 'pending').length,
    completedTasks: tasks.filter(t => t.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-600"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Worker Dashboard</h1>
          <p className="text-gray-600">View assigned tasks and monitor campaign performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className={`${getRoleBadgeColor(user.role)} text-white px-3 py-1`}>
            <div className="flex items-center space-x-1">
              {getRoleIcon(user.role)}
              <span className="capitalize">{user.role} - Employee Access</span>
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
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Assigned Campaigns</p>
                <p className="text-2xl font-bold">{workerStats.activeCampaigns}</p>
                <p className="text-xs text-gray-500">Active campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Pending Tasks</p>
                <p className="text-2xl font-bold">{workerStats.pendingTasks}</p>
                <p className="text-xs text-gray-500">Awaiting completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Completed Tasks</p>
                <p className="text-2xl font-bold">{workerStats.completedTasks}</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Performance</p>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-xs text-gray-500">Task completion rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>My Tasks</span>
          </CardTitle>
          <CardDescription>
            Tasks assigned to you by your managers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate">{task.description}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getTaskPriorityColor(task.priority)} text-white`}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadgeColor(task.status)} text-white`}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(task.due_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{task.assigned_by}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {task.status === 'pending' && (
                        <Button size="sm" variant="outline">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No tasks assigned yet. Contact your manager for assignments.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assigned Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Assigned Campaigns</span>
          </CardTitle>
          <CardDescription>
            Campaigns you have been assigned to work on (Read-only access)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedCampaigns.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No campaigns assigned yet. Contact your manager for access.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedCampaigns.map((campaign) => {
                const campaignLinks = trackingLinks.filter(link => link.campaign_id === campaign.id);
                const campaignClicks = campaignLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
                const campaignOpens = campaignLinks.reduce((sum, link) => sum + (link.opens || 0), 0);
                
                return (
                  <Card key={campaign.id} className="border-l-4 border-l-gray-500">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold">{campaign.name}</h4>
                          <p className="text-sm text-gray-500">{campaign.description || 'No description'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Links:</span>
                            <span className="ml-1 font-medium">{campaignLinks.length}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Clicks:</span>
                            <span className="ml-1 font-medium">{campaignClicks}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Opens:</span>
                            <span className="ml-1 font-medium">{campaignOpens}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Status:</span>
                            <Badge 
                              variant="outline" 
                              className={`ml-1 ${campaign.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <Badge variant="outline">
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </Badge>
                          <Badge className="bg-gray-100 text-gray-800">
                            Read-only
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tracking Links (Read-Only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5" />
            <span>Campaign Tracking Links</span>
          </CardTitle>
          <CardDescription>
            View tracking links from your assigned campaigns (Read-only access)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trackingLinks.length === 0 ? (
            <div className="text-center py-8">
              <Link className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tracking links available in your assigned campaigns.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Original URL</TableHead>
                  <TableHead>Tracking Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trackingLinks.map((link) => {
                  const campaign = assignedCampaigns.find(c => c.id === link.campaign_id);
                  const trackingUrl = `${API_ENDPOINTS.BASE}/track/click/${link.tracking_token}`;
                  
                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {campaign ? campaign.name : 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        <a 
                          href={link.original_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {link.original_url}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center space-x-2">
                          <span className="truncate text-sm font-mono">
                            {trackingUrl}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(trackingUrl)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadgeColor(link.status || 'active')} text-white`}>
                          {link.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{link.clicks || 0}</span>
                      </TableCell>
                      <TableCell>
                        {new Date(link.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(trackingUrl)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(link.original_url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>My Performance Summary</span>
          </CardTitle>
          <CardDescription>
            Your contribution to assigned campaigns and tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{workerStats.totalClicks}</div>
              <div className="text-sm text-blue-500">Total Clicks Generated</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{workerStats.completedTasks}</div>
              <div className="text-sm text-green-500">Tasks Completed</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">85%</div>
              <div className="text-sm text-purple-500">Success Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Worker Access Notice */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <HardHat className="h-5 w-5 text-gray-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-800">Worker Access Level</h4>
              <p className="text-sm text-gray-700 mt-1">
                As a Worker, you have limited access focused on assigned tasks:
              </p>
              <ul className="text-sm text-gray-700 mt-2 space-y-1">
                <li>• View and complete tasks assigned by your managers</li>
                <li>• Read-only access to assigned campaigns and tracking links</li>
                <li>• Monitor performance metrics for campaigns you're working on</li>
                <li>• Copy tracking links for use in your assigned work</li>
                <li>• Cannot create, edit, or delete campaigns, links, or users</li>
                <li>• Contact your Business Manager or Admin for additional access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkerDashboard;

