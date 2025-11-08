'use client';

import { useEffect, useMemo, useState } from 'react';
import { ahjApi, ProjectAhj } from '@/lib/api/ahj';
import CreateAhjModal from '@/components/modals/CreateAhjModal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Trash2, Download, Calendar, FileText } from 'lucide-react';
import ConfirmModal from '@/components/modals/ConfirmModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AhjPage() {
  const [items, setItems] = useState<ProjectAhj[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAhj, setSelectedAhj] = useState<ProjectAhj | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportFormat, setReportFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf');

  const load = async () => {
    try {
      setLoading(true);
      const data = await ahjApi.list();
      setItems(data);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const matchesQuery = !q || [it.ahj, it.us_state, it.created_by, it.updated_by].some((v) => String(v || '').toLowerCase().includes(q));
      const matchesState = stateFilter === 'all' || (it.us_state || '') === stateFilter;
      return matchesQuery && matchesState;
    });
  }, [items, search, stateFilter]);

  const stateCounts = useMemo(() => {
    const counts: { [state: string]: number } = {};
    items.forEach((item) => {
      const state = item.us_state || 'Unknown';
      counts[state] = (counts[state] || 0) + 1;
    });
    return counts;
  }, [items]);

  const handleDeleteClick = (ahj: ProjectAhj) => {
    setSelectedAhj(ahj);
    setShowDeleteModal(true);
  };

  // Report generation functions
  const generateCSV = (data: ProjectAhj[]) => {
    const headers = ['S.No.', 'Project AHJ Name', 'US State', 'Electric Code', 'Building Code', 'Residential Code', 'Fire Code', 'Created Date', 'Created By'];
    const csvContent = [
      headers.join(','),
      ...data.map((item, index) => [
        index + 1,
        `"${item.ahj || 'None'}"`,
        `"${item.us_state || 'None'}"`,
        `"${item.electric_code || 'None'}"`,
        `"${item.building_code || 'None'}"`,
        `"${item.residential_code || 'None'}"`,
        `"${item.fire_code || 'None'}"`,
        `"${item.created_at ? formatDate(item.created_at) : 'None'}"`,
        `"${item.created_by || 'None'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ahj_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateExcel = (data: ProjectAhj[]) => {
    // Simple Excel-like format using TSV
    const headers = ['S.No.', 'Project AHJ Name', 'US State', 'Electric Code', 'Building Code', 'Residential Code', 'Fire Code', 'Created Date', 'Created By'];
    const tsvContent = [
      headers.join('\t'),
      ...data.map((item, index) => [
        index + 1,
        item.ahj || 'None',
        item.us_state || 'None',
        item.electric_code || 'None',
        item.building_code || 'None',
        item.residential_code || 'None',
        item.fire_code || 'None',
        item.created_at ? formatDate(item.created_at) : 'None',
        item.created_by || 'None'
      ].join('\t'))
    ].join('\n');

    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ahj_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDF = (data: ProjectAhj[]) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate PDF reports');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AHJ Report</title>
          <meta charset="utf-8">
          <style>
            @media print {
              @page { 
                size: A4 landscape; 
                margin: 0.3in;
                margin-header: 0;
                margin-footer: 0;
              }
              html, body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
              font-size: 12px;
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .header h1 { 
              margin: 0 0 10px 0; 
              font-size: 20px; 
              color: #333;
            }
            .date-info { 
              font-size: 12px; 
              color: #666; 
            }
            .data-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              font-size: 10px;
            }
            .data-table th, .data-table td { 
              border: 1px solid #333; 
              padding: 8px; 
              text-align: left; 
              vertical-align: top;
            }
            .data-table th { 
              background-color: #f5f5f5; 
              font-weight: bold; 
              color: #333;
            }
            .data-table tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
            .footer { 
              margin-top: 20px; 
              font-size: 10px; 
              color: #666; 
              text-align: center;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }
            .no-print {
              margin: 20px 0;
              text-align: center;
            }
            .print-btn {
              background: #007bff;
              color: white;
              border: none;
              padding: 10px 20px;
              margin: 5px;
              cursor: pointer;
              border-radius: 4px;
            }
            .close-btn {
              background: #6c757d;
              color: white;
              border: none;
              padding: 10px 20px;
              margin: 5px;
              cursor: pointer;
              border-radius: 4px;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AHJ Report</h1>
            <div class="date-info">
              Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
              <br>
              ${reportStartDate && reportEndDate ? `Date Range: ${reportStartDate} to ${reportEndDate}` : 'Current Filters Applied'}
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;">S.No.</th>
                <th style="width: 18%;">Project AHJ Name</th>
                <th style="width: 8%;">US State</th>
                <th style="width: 15%;">Electric Code</th>
                <th style="width: 15%;">Building Code</th>
                <th style="width: 15%;">Residential Code</th>
                <th style="width: 12%;">Fire Code</th>
                <th style="width: 12%;">Created Date</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.ahj || 'None'}</td>
                  <td>${item.us_state || 'None'}</td>
                  <td>${item.electric_code || 'None'}</td>
                  <td>${item.building_code || 'None'}</td>
                  <td>${item.residential_code || 'None'}</td>
                  <td>${item.fire_code || 'None'}</td>
                  <td>${item.created_at ? formatDate(item.created_at) : 'None'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Total Records: ${data.length} | Generated by AHJ Management System | ${new Date().toISOString()}
          </div>

          <div class="no-print">
            <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
            <button class="close-btn" onclick="window.close()">Close</button>
          </div>

          <script>
            // Auto-trigger print dialog after page loads
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filterDataByDateRange = (data: ProjectAhj[]) => {
    // If no date range specified, return ALL data
    if (!reportStartDate || !reportEndDate) return data;
    
    return data.filter(item => {
      if (!item.created_at) return true; // Include records without dates
      const itemDate = new Date(item.created_at);
      const startDate = new Date(reportStartDate);
      const endDate = new Date(reportEndDate);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const handleGenerateReport = () => {
    // Use currently filtered data (respects screen filters like search, state filter)
    const currentlyFilteredData = filtered; // Use data that respects current screen filters
    const finalData = filterDataByDateRange(currentlyFilteredData); // Then apply date range if specified
    
    switch (reportFormat) {
      case 'csv':
        generateCSV(finalData);
        break;
      case 'excel':
        generateExcel(finalData);
        break;
      case 'pdf':
        generatePDF(finalData);
        break;
    }
    
    setShowReportModal(false);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAhj) return;
    
    try {
      setDeleting(true);
      await ahjApi.delete(selectedAhj.id);
      await load(); // Reload the list
      setShowDeleteModal(false);
      setSelectedAhj(null);
    } catch (error: any) {
      console.error('Error deleting AHJ:', error);
      alert(error.message || 'Failed to delete AHJ. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">AHJ</h1>
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
              {filtered.length} Total
            </div>
          </div>
          <p className="text-muted-foreground">Manage AHJ records and codes</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Generate Report
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 shadow-md">
            <Plus size={18} />
            <span>Create AHJ</span>
          </Button>
        </div>
      </div>

      {/* List Card like Users UI */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">AHJ List</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-4 w-full sm:w-auto">
              <div className="min-w-[240px]">
                <Label htmlFor="ahj-search" className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="ahj-search" placeholder="Search AHJ, state, user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                </div>
              </div>
              <div className="w-48">
                <Label className="text-xs">US State</Label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'].map((s) => {
                      const count = stateCounts[s] || 0;
                      return (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center justify-between w-full">
                            <span>{s}</span>
                            {count > 0 && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                {count}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                    {stateCounts['Unknown'] && (
                      <SelectItem value="Unknown">
                        <div className="flex items-center justify-between w-full">
                          <span>Unknown State</span>
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                            {stateCounts['Unknown']}
                          </span>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { /* client-side filter applied automatically */ }} className="flex items-center gap-2"><Filter size={16} /> Apply</Button>
              <Button variant="outline" onClick={() => { setSearch(''); setStateFilter('all'); }}>
                Reset
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mt-4">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading AHJ...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No AHJ entries found</div>
            ) : (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">S.No.</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Project AHJ Name</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">US State</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Electric Code</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Building Code</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Residential Code</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fire Code</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {filtered.map((row, index) => (
                    <tr 
                      key={row.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => window.location.href = `/dashboard/ahj/${row.id}`}
                    >
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground font-medium">{index + 1}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground font-medium">{row.ahj || '-'}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.us_state ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {row.us_state}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.electric_code ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                            {row.electric_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.building_code ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            {row.building_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.residential_code ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                            {row.residential_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground">
                        {row.fire_code ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                            {row.fire_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/dashboard/ahj/${row.id}`} 
                            className="text-primary hover:underline text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Details
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(row);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateAhjModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={load} />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAhj(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete AHJ"
        message={`Are you sure you want to delete "${selectedAhj?.ahj || 'this AHJ'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
      />

      {/* Report Generation Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={20} />
              Generate AHJ Report
            </DialogTitle>
            <DialogDescription>
              Configure your report settings and download in your preferred format.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="text-sm font-medium">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm font-medium">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <Label className="text-sm font-medium">Export Format</Label>
              <Select value={reportFormat} onValueChange={(value: 'pdf' | 'csv' | 'excel') => setReportFormat(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText size={16} />
                      PDF Document
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText size={16} />
                      CSV File
                    </div>
                  </SelectItem>
                  <SelectItem value="excel">
                    <div className="flex items-center gap-2">
                      <FileText size={16} />
                      Excel File
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview Info */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Current Filter Records:</span>
                  <span className="font-medium">{filtered.length}</span>
                </div>
                {reportStartDate && reportEndDate && (
                  <div className="flex justify-between items-center mt-1">
                    <span>With Date Range:</span>
                    <span className="font-medium">
                      {filterDataByDateRange(filtered).length} records
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center mt-1">
                  <span>Total in System:</span>
                  <span className="font-medium text-xs">{items.length}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReportModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReport}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


