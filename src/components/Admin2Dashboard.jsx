import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '../config';
import TrackingLinksPage from './TrackingLinksPage'; // Import TrackingLinksPage
import ClickAnalyticsTable from './ClickAnalyticsTable'; // Import ClickAnalyticsTable
import CampaignOverview from './CampaignOverview'; // Import CampaignOverview
import Geography from './Geography'; // Import Geography
import { 
  Users, UserCheck, UserX, Shield, Briefcase, HardHat, 
  TrendingUp, Activity, BarChart3, Eye, Settings 
} from 'lucide-react';

const Admin2Dashboard = ({ user, token }) => {
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("member");

  useEffect(() => {
    fetchUsers();
    fetchAnalytics();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error('Failed to fetch users');
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
      console.error('Failed to fetch analytics:', error);
    }
  };

  const createUser = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPassword,
          role: newUserRole,
        }),
      });

      if (response.ok) {
        toast.success('User created successfully');
        fetchUsers();
        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
        setNewUserRole('member');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to create user');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const approveUser = async (userId) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.USERS}/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('User approved successfully');
        fetchUsers();
      } else {
        toast.error('Failed to approve user');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.USERS}/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        toast.success('User role updated successfully');
        fetchUsers();
        setSelectedUser(null);
      } else {
        toast.error('Failed to update user role');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'member': return <Briefcase className="h-4 w-4" />;
      case 'worker': return <HardHat className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'member': return 'bg-blue-500';
      case 'worker': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'inactive': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Filter users to show all except the main admin (assuming main admin has role 'admin' and a specific ID, e.g., 1)
  const myUsers = users.filter(u => !(u.role === 'admin' && u.id === 1));
  const pendingUsers = myUsers.filter(u => u.status === 'pending');
  const activeUsers = myUsers.filter(u => u.status === 'active');
  const members = myUsers.filter(u => u.role === 'member');
  const workers = myUsers.filter(u => u.role === 'worker');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Business Management Dashboard</h2>
          <p className="text-muted-foreground">Manage your team and monitor performance</p>
        </div>
        <Badge className="bg-orange-500 text-white">
          <Shield className="h-3 w-3 mr-1" />
          Admin 2 - Business Manager
        </Badge>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Team Members</p>
                <p className="text-2xl font-bold">{myUsers.length}</p>
                <p className="text-xs text-gray-500">Excluding yourself</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Members</p>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-gray-500">Business accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <HardHat className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Workers</p>
                <p className="text-2xl font-bold">{workers.length}</p>
                <p className="text-xs text-gray-500">Employee accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Pending Approval</p>
                <p className="text-2xl font-bold">{pendingUsers.length}</p>
                <p className="text-xs text-gray-500">Awaiting activation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Team Total Clicks</p>
                  <p className="text-2xl font-bold">{analytics.overview.totalClicks}</p>
                  <p className="text-xs text-green-600">All team campaigns</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Team Conversion Rate</p>
                  <p className="text-2xl font-bold">{analytics.overview.conversionRate}%</p>
                  <p className="text-xs text-green-600">Average performance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Security Events</p>
                  <p className="text-2xl font-bold">{analytics.overview.blockedRequests}</p>
                  <p className="text-xs text-red-600">Blocked threats</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserX className="h-5 w-5" />
              <span>Pending Team Member Approvals</span>
            </CardTitle>
            <CardDescription>
              New team members waiting for activation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested Role</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((userItem) => (
                  <TableRow key={userItem.id}>
                    <TableCell className="font-medium">{userItem.username}</TableCell>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>
                      <Badge className={`${getRoleBadgeColor(userItem.role)} text-white`}>
                        <div className="flex items-center space-x-1">
                          {getRoleIcon(userItem.role)}
                          <span className="capitalize">{userItem.role}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(userItem.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => approveUser(userItem.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Team Members Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>My Team Members</span>
          </CardTitle>
          <CardDescription>
            Manage roles and permissions for your team (Limited Admin 2 access)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myUsers.map((userItem) => (
                <TableRow key={userItem.id}>
                  <TableCell className="font-medium">{userItem.username}</TableCell>
                  <TableCell>{userItem.email}</TableCell>
                  <TableCell>
                    <Badge className={`${getRoleBadgeColor(userItem.role)} text-white`}>
                      <div className="flex items-center space-x-1">
                        {getRoleIcon(userItem.role)}
                        <span className="capitalize">{userItem.role}</span>
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadgeColor(userItem.status)} text-white`}>
                      {userItem.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {userItem.last_login ? new Date(userItem.last_login).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={userItem.subscription_status === 'active' ? 'default' : 'secondary'}>
                      {userItem.subscription_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {userItem.id !== user.id && userItem.role !== 'admin' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(userItem);
                              setNewRole(userItem.role);
                            }}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Manage Team Member</DialogTitle>
                            <DialogDescription>
                              Update role for {selectedUser?.username} (Admin 2 restrictions apply)
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="role">Role</Label>
                              <select
                                id="role"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                              >
                                <option value="admin2">Admin 2</option>
                                <option value="member">Member (Business Account)</option>
                                <option value="worker">Worker (Employee)</option>
                              </select>
                              <p className="text-xs text-gray-500">
                                Note: As Admin 2, you can manage other Admin 2s, Members, and Workers in your team
                              </p>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => setSelectedUser(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => updateUserRole(selectedUser.id, newRole)}
                              >
                                Update Role
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {userItem.id === user.id && (
                      <Badge variant="outline">You</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create New Team Member */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Create New Team Member</span>
          </CardTitle>
          <CardDescription>
            Add new members or workers to your team (Admin 2 can create all roles except main admin)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newUsername">Username</Label>
              <input
                id="newUsername"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email</Label>
              <input
                id="newEmail"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password</Label>
              <input
                id="newPassword"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUserRole">Role</Label>
              <select
                id="newUserRole"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
              >
                <option value="admin2">Admin 2</option>
                <option value="business">Business</option>
                <option value="member">Member</option>
                <option value="worker">Worker</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={createUser}>
              Create User
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Links Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
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
            <Eye className="h-5 w-5" />
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

      {/* Restrictions Notice */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800">Admin 2 Access Level</h4>
              <p className="text-sm text-orange-700 mt-1">
                As an Admin 2, you have comprehensive access similar to the main admin with these capabilities:
              </p>
              <ul className="text-sm text-orange-700 mt-2 space-y-1">
                <li>• Create and manage all user types except main admin</li>
                <li>• Full access to analytics, campaigns, and tracking links</li>
                <li>• Manage team members and their permissions</li>
                <li>• Access to geographic and performance analytics</li>
                <li>• Cannot delete or modify the main admin account</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin2Dashboard;


