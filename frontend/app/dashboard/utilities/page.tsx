'use client';

import { useEffect, useMemo, useState } from 'react';
import { utilitiesApi, Utility } from '@/lib/api/utilities';
import CreateUtilityModal from '@/components/modals/CreateUtilityModal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, Download, FileText } from 'lucide-react';
import ConfirmModal from '@/components/modals/ConfirmModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function UtilitiesPage() {
  const [items, setItems] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState<Utility | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportFormat, setReportFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf');
  const [attachmentCounts, setAttachmentCounts] = useState<{[key: number]: number}>({});

  const load = async () => {
    try {
      setLoading(true);
      const data = await utilitiesApi.list();
      setItems(data);
      
      // Get attachment count for each utility
      const counts: {[key: number]: number} = {};
      for (const utility of data) {
        try {
          const utilityDetail = await utilitiesApi.get(utility.id);
          counts[utility.id] = utilityDetail.files && Array.isArray(utilityDetail.files) ? utilityDetail.files.length : 0;
        } catch (e) {
          counts[utility.id] = 0;
        }
      }
      setAttachmentCounts(counts);
    } catch (e) {
      setItems([]);
      setAttachmentCounts({});
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
      const matchesQuery = !q || [it.utility_name, it.created_by, it.updated_by].some((v) => String(v || '').toLowerCase().includes(q));
      return matchesQuery;
    });
  }, [items, search]);

  const handleDeleteClick = (utility: Utility) => {
    setSelectedUtility(utility);
    setShowDeleteModal(true);
  };

  // Report generation functions
  const generateCSV = (data: Utility[]) => {
    const headers = ['S.No.', 'Utility Name', 'Utility Websites', 'Site Plan Requirements', 'Electrical Plan Requirements', 'Other Plan Requirements', 'Attachments Count', 'Created Date', 'Created By'];
    const csvContent = [
      headers.join(','),
      ...data.map((item, index) => [
        index + 1,
        `"${item.utility_name || ''}"`,
        `"${item.utility_websites?.join('; ') || ''}"`,
        `"${item.site_plan_requirements || ''}"`,
        `"${item.electrical_plan_requirements || ''}"`,
        `"${item.other_plan_requirements || ''}"`,
        attachmentCounts[item.id] || 0,
        `"${item.created_at ? formatDate(item.created_at) : ''}"`,
        `"${item.created_by || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `utility_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateExcel = (data: Utility[]) => {
    const headers = ['S.No.', 'Utility Name', 'Utility Websites', 'Site Plan Requirements', 'Electrical Plan Requirements', 'Other Plan Requirements', 'Attachments Count', 'Created Date', 'Created By'];
    const tsvContent = [
      headers.join('\t'),
      ...data.map((item, index) => [
        index + 1,
        item.utility_name || '',
        item.utility_websites?.join('; ') || '',
        item.site_plan_requirements || '',
        item.electrical_plan_requirements || '',
        item.other_plan_requirements || '',
        attachmentCounts[item.id] || 0,
        item.created_at ? formatDate(item.created_at) : '',
        item.created_by || ''
      ].join('\t'))
    ].join('\n');

    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `utility_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDF = (data: Utility[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate PDF reports');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Utility Report</title>
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
            <h1>Utility Report</h1>
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
                <th style="width: 15%;">Utility Name</th>
                <th style="width: 20%;">Utility Websites</th>
                <th style="width: 18%;">Site Plan Requirements</th>
                <th style="width: 18%;">Electrical Plan Requirements</th>
                <th style="width: 14%;">Other Plan Requirements</th>
                <th style="width: 5%;">Attachments</th>
                <th style="width: 5%;">Created Date</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.utility_name || 'None'}</td>
                  <td>${item.utility_websites?.join('; ') || 'None'}</td>
                  <td>${item.site_plan_requirements || 'None'}</td>
                  <td>${item.electrical_plan_requirements || 'None'}</td>
                  <td>${item.other_plan_requirements || 'None'}</td>
                  <td>${attachmentCounts[item.id] || 0}</td>
                  <td>${item.created_at ? formatDate(item.created_at) : 'None'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Total Records: ${data.length} | Generated by Utility Management System | ${new Date().toISOString()}
          </div>

          <div class="no-print">
            <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
            <button class="close-btn" onclick="window.close()">Close</button>
          </div>

          <script>
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

  const filterDataByDateRange = (data: Utility[]) => {
    if (!reportStartDate || !reportEndDate) return data;
    
    return data.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      const startDate = new Date(reportStartDate);
      const endDate = new Date(reportEndDate);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const handleGenerateReport = () => {
    const filteredData = filterDataByDateRange(filtered);
    
    switch (reportFormat) {
      case 'csv':
        generateCSV(filteredData);
        break;
      case 'excel':
        generateExcel(filteredData);
        break;
      case 'pdf':
        generatePDF(filteredData);
        break;
    }
    
    setShowReportModal(false);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUtility) return;
    
    try {
      setDeleting(true);
      await utilitiesApi.delete(selectedUtility.id);
      await load(); // Reload the list
      setShowDeleteModal(false);
      setSelectedUtility(null);
    } catch (error: any) {
      console.error('Error deleting utility:', error);
      alert(error.message || 'Failed to delete utility. Please try again.');
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
            <h1 className="text-2xl font-bold text-foreground">Utilities</h1>
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
              {filtered.length} Total
            </div>
          </div>
          <p className="text-muted-foreground">Manage utility records</p>
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
            <span>Create Utilities</span>
          </Button>
        </div>
      </div>

      {/* List Card like AHJ UI */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Utilities List</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-4 w-full sm:w-auto">
              <div className="min-w-[240px]">
                <Label htmlFor="utility-search" className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="utility-search" placeholder="Search utility name, user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setSearch(''); }}>
                Reset
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mt-4">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading utilities...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No utilities found</div>
            ) : (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">S.No.</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Utility Name</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Utility Websites</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Site Plan Requirements</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Electrical Plan Requirements</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Other Plan Requirements</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Utility Attachments</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {filtered.map((row, index) => (
                    <tr 
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => window.location.href = `/dashboard/utilities/${row.id}`}
                    >
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground font-medium">{index + 1}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-foreground font-medium">{row.utility_name || '-'}</td>
                      <td className="px-3 py-4 text-sm text-foreground max-w-[200px]">
                        {row.utility_websites && row.utility_websites.length > 0 ? (
                          <div className="space-y-1">
                            {row.utility_websites.slice(0, 2).map((website, idx) => (
                              <a
                                key={idx}
                                href={website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs block truncate"
                                title={website}
                              >
                                {website}
                              </a>
                            ))}
                            {row.utility_websites.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{row.utility_websites.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No websites</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-foreground max-w-[180px]">
                        {row.site_plan_requirements ? (
                          <p className="text-xs truncate" title={row.site_plan_requirements}>
                            {row.site_plan_requirements}
                          </p>
                        ) : (
                          <span className="text-gray-400 text-xs">No requirements</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-foreground max-w-[180px]">
                        {row.electrical_plan_requirements ? (
                          <p className="text-xs truncate" title={row.electrical_plan_requirements}>
                            {row.electrical_plan_requirements}
                          </p>
                        ) : (
                          <span className="text-gray-400 text-xs">No requirements</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-foreground max-w-[180px]">
                        {row.other_plan_requirements ? (
                          <p className="text-xs truncate" title={row.other_plan_requirements}>
                            {row.other_plan_requirements}
                          </p>
                        ) : (
                          <span className="text-gray-400 text-xs">No requirements</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-foreground">
                        {(() => {
                          const attachmentCount = attachmentCounts[row.id] || 0;
                          return attachmentCount > 0 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {attachmentCount} {attachmentCount === 1 ? 'file' : 'files'}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">0 files</span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/dashboard/utilities/${row.id}`} 
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

      <CreateUtilityModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={load} />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUtility(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Utility"
        message={`Are you sure you want to delete "${selectedUtility?.utility_name || 'this utility'}"? This action cannot be undone.`}
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
              Generate Utility Report
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
                  <span>Total Records:</span>
                  <span className="font-medium">{filtered.length}</span>
                </div>
                {reportStartDate && reportEndDate && (
                  <div className="flex justify-between items-center mt-1">
                    <span>Date Range:</span>
                    <span className="font-medium">
                      {filterDataByDateRange(filtered).length} records
                    </span>
                  </div>
                )}
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

