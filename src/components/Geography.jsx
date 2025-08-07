import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { RefreshCw, Search, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '../config';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const Geography = ({ token }) => {
  const [geoData, setGeoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchGeographyData = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.GEOGRAPHY, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGeoData(data.geo_data || []);
      } else {
        toast.error('Failed to fetch geography data');
      }
    } catch (error) {
      console.error('Error fetching geography data:', error);
      toast.error('Network error while fetching geography data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeographyData();
  }, [token]);

  const filteredGeoData = geoData.filter(item =>
    item.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.region?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Geography Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading geography data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Geography Overview</span>
            </CardTitle>
            <CardDescription>
              Geographical distribution of clicks and visitors
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchGeographyData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Unique Visitors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGeoData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No locations match your search.' : 'No geography data available yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredGeoData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span>{item.country || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.region || 'Unknown'}</TableCell>
                    <TableCell>{item.city || 'Unknown'}</TableCell>
                    <TableCell>{item.clicks || 0}</TableCell>
                    <TableCell>{item.unique_visitors || 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredGeoData.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredGeoData.length} of {geoData.length} geographical entries
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Geography;


