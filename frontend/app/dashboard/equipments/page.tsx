'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { equipmentsApi, Equipment } from '@/lib/api/equipments';
import { User } from '@/types';
import AddEquipmentsModal from '@/components/modals/AddEquipmentsModal';
import EquipmentCard from '@/components/EquipmentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlusIcon, WrenchIcon, BatteryIcon, ZapIcon, PackageIcon, AnchorIcon, Cpu, Sun, Power, Layers, Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils/dateUtils';

export default function EquipmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportFormat, setReportFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf');
  const [formData, setFormData] = useState({
    model_name: '',
    category: '',
  });
  const { toast } = useToast();

  // Report generation functions
  const generateCSV = (data: Equipment[]) => {
    const headers = ['S.No.', 'Model Name', 'Category', 'Created Date', 'Created By'];
    const csvContent = [
      headers.join(','),
      ...data.map((item, index) => [
        index + 1,
        `"${item.model_name || ''}"`,
        `"${item.category || ''}"`,
        `"${item.created_at ? formatDate(item.created_at) : ''}"`,
        `"${item.created_by || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `equipment_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateExcel = (data: Equipment[]) => {
    const headers = ['S.No.', 'Model Name', 'Category', 'Created Date', 'Created By'];
    const tsvContent = [
      headers.join('\t'),
      ...data.map((item, index) => [
        index + 1,
        item.model_name || '',
        item.category || '',
        item.created_at ? formatDate(item.created_at) : '',
        item.created_by || ''
      ].join('\t'))
    ].join('\n');

    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `equipment_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDF = (data: Equipment[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate PDF reports');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Equipment Report</title>
          <meta charset="utf-8">
          <style>
            @media print {
              @page { 
                size: A4 portrait; 
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
              font-size: 12px;
            }
            .data-table th, .data-table td { 
              border: 1px solid #333; 
              padding: 10px; 
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
            <h1>Equipment Report</h1>
            <div class="date-info">
              Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
              <br>
              ${reportStartDate && reportEndDate ? `Date Range: ${reportStartDate} to ${reportEndDate}` : 'Current Filters Applied'}
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 10%;">S.No.</th>
                <th style="width: 40%;">Model Name</th>
                <th style="width: 25%;">Category</th>
                <th style="width: 25%;">Created Date</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.model_name || 'None'}</td>
                  <td>${item.category || 'None'}</td>
                  <td>${item.created_at ? formatDate(item.created_at) : 'None'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Total Records: ${data.length} | Generated by Equipment Management System | ${new Date().toISOString()}
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

  const filterDataByDateRange = (data: Equipment[]) => {
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
    const filteredData = filterDataByDateRange(filteredEquipments);
    
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

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        if (currentUser) {
          await loadCategories();
          loadEquipments();
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await equipmentsApi.getCategories();
      setCategories(cats);
      if (cats.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: cats[0] }));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Don't set fallback categories - let the API provide them
      setCategories([]);
    }
  };

  const loadEquipments = async () => {
    try {
      setLoading(true);
      const data = await equipmentsApi.getAll();
      setEquipments(data);
    } catch (error) {
      console.error('Error loading equipments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load equipments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentCreated = () => {
    loadEquipments();
    toast({
      title: 'Success',
      description: 'Equipment created successfully',
    });
  };

  const handleViewDetails = (equipment: Equipment) => {
    router.push(`/dashboard/equipments/${equipment.id}`);
  };

  const handleEditEquipment = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setFormData({
      model_name: equipment.model_name,
      category: equipment.category,
    });
    setShowEditModal(true);
  };

  // Calculate stats dynamically based on available categories
  const getStats = () => {
    const stats = [
      {
        title: 'Total Equipments',
        value: equipments.length,
        icon: WrenchIcon,
        color: 'bg-blue-500',
      },
    ];
    
    categories.forEach((cat) => {
      const count = equipments.filter((e) => e.category === cat).length;
      const iconMap: Record<string, any> = {
        'Inventor': ZapIcon,
        'Module': PackageIcon,
        'Mounting': AnchorIcon,
        'Battery': BatteryIcon,
        'Micro Inverter': Cpu,
        'Solar Edge': Sun,
        'String Inverter': Power,
        'Racking': Layers,
      };
      const colorMap: Record<string, string> = {
        'Inventor': 'bg-yellow-500',
        'Module': 'bg-green-500',
        'Mounting': 'bg-purple-500',
        'Battery': 'bg-orange-500',
        'Micro Inverter': 'bg-indigo-500',
        'Solar Edge': 'bg-amber-500',
        'String Inverter': 'bg-blue-500',
        'Racking': 'bg-teal-500',
      };
      
      stats.push({
        title: cat,
        value: count,
        icon: iconMap[cat] || WrenchIcon,
        color: colorMap[cat] || 'bg-gray-500',
      });
    });
    
    return stats;
  };

  const handleUpdateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment) return;

    try {
      setLoading(true);
      await equipmentsApi.update(editingEquipment.id, formData);
      toast({
        title: 'Success',
        description: 'Equipment updated successfully',
      });
      setShowEditModal(false);
      setEditingEquipment(null);
      loadEquipments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update equipment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEquipment = async () => {
    if (!selectedEquipment) return;

    try {
      setLoading(true);
      await equipmentsApi.delete(selectedEquipment.id);
      toast({
        title: 'Success',
        description: 'Equipment deleted successfully',
      });
      setShowDeleteModal(false);
      setSelectedEquipment(null);
      loadEquipments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete equipment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter equipments based on search term and category
  const filteredEquipments = equipments.filter((equipment) => {
    const matchesSearch = equipment.model_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || equipment.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = getStats();

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipments</h1>
          <p className="text-muted-foreground">Manage equipment models and categories</p>
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
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 shadow-md"
          >
            <PlusIcon size={18} />
            <span>Add Equipments</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-4 w-full sm:w-auto flex-wrap">
              <div className="w-48">
                <Label className="text-xs">Category</Label>
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => setCategoryFilter(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[240px] flex-1">
                <Label htmlFor="equipment-search" className="text-xs">Search</Label>
                <Input
                  id="equipment-search"
                  type="text"
                  placeholder="Search by model name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCategoryFilter('all');
                  setSearchTerm('');
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipments Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading equipments...</div>
        </div>
      ) : filteredEquipments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {equipments.length === 0
                ? 'No equipments found. Add your first equipment to get started.'
                : 'No equipments match your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
          {filteredEquipments.map((equipment) => (
            <EquipmentCard
              key={equipment.id}
              equipment={equipment}
              onViewDetails={handleViewDetails}
              onDelete={(equipment) => {
                setSelectedEquipment(equipment);
                setShowDeleteModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Add Equipments Modal */}
      <AddEquipmentsModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onEquipmentCreated={handleEquipmentCreated}
      />

      {/* Edit Equipment Modal */}
      <Dialog open={showEditModal && !!editingEquipment} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Equipment</DialogTitle>
            <DialogDescription>
              Update equipment information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateEquipment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_model_name">Model Name *</Label>
              <Input
                id="edit_model_name"
                type="text"
                value={formData.model_name}
                onChange={(e) =>
                  setFormData({ ...formData, model_name: e.target.value })
                }
                placeholder="Enter model name"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, category: value })
                }
                disabled={loading}
              >
                <SelectTrigger id="edit_category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEquipment(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Equipment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal && !!selectedEquipment} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
            <DialogDescription>Confirm equipment deletion</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <WrenchIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">
                  {selectedEquipment?.model_name}
                </h4>
                <p className="text-xs text-muted-foreground">{selectedEquipment?.category}</p>
              </div>
            </div>
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm">
              Are you sure you want to delete "{selectedEquipment?.model_name}"? This action
              cannot be undone.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedEquipment(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEquipment}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Equipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Generation Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={20} />
              Generate Equipment Report
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
                  <span className="font-medium">{filteredEquipments.length}</span>
                </div>
                {reportStartDate && reportEndDate && (
                  <div className="flex justify-between items-center mt-1">
                    <span>Date Range:</span>
                    <span className="font-medium">
                      {filterDataByDateRange(filteredEquipments).length} records
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
