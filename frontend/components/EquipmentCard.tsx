'use client';

import { PackageIcon, ZapIcon, AnchorIcon, BatteryIcon, CalendarIcon, TagIcon, TrashIcon, Cpu, Sun, Power, Layers } from 'lucide-react';
import { Equipment } from '@/lib/api/equipments';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/dateUtils';

interface EquipmentCardProps {
  equipment: Equipment;
  onViewDetails?: (equipment: Equipment) => void;
  onDelete?: (equipment: Equipment) => void;
}

const getCategoryConfig = (category: string) => {
  const configs: Record<string, { icon: any; color: string; bgColor: string }> = {
    Module: { icon: PackageIcon, color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', bgColor: 'bg-green-500' },
    Inventor: { icon: ZapIcon, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', bgColor: 'bg-yellow-500' },
    Mounting: { icon: AnchorIcon, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400', bgColor: 'bg-purple-500' },
    Battery: { icon: BatteryIcon, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', bgColor: 'bg-orange-500' },
    'Micro Inverter': { icon: Cpu, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400', bgColor: 'bg-indigo-500' },
    'Solar Edge': { icon: Sun, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400', bgColor: 'bg-amber-500' },
    'String Inverter': { icon: Power, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', bgColor: 'bg-blue-500' },
    'Racking': { icon: Layers, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400', bgColor: 'bg-teal-500' },
  };
  return configs[category] || { icon: PackageIcon, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400', bgColor: 'bg-gray-500' };
};

export default function EquipmentCard({ equipment, onViewDetails, onDelete }: EquipmentCardProps) {
  const config = getCategoryConfig(equipment.category);
  const CategoryIcon = config.icon;

  return (
    <Card 
      className="hover:shadow-md transition-shadow h-full flex flex-col cursor-pointer" 
      onClick={() => onViewDetails?.(equipment)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`${config.bgColor} p-3 rounded-lg mb-3`}>
            <CategoryIcon className="h-6 w-6 text-white" />
          </div>
          <Badge className={config.color}>
            {equipment.category}
          </Badge>
        </div>
        <CardTitle className="text-lg line-clamp-2">
          {equipment.model_name}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 pt-0">
        {/* Category Icon and Label */}
        <div className="mb-4 flex items-center space-x-2 text-sm text-muted-foreground">
          <TagIcon size={16} />
          <span>{equipment.category} Equipment</span>
        </div>

        {/* Created Date and By */}
        <div className="mb-2 flex items-center space-x-2 text-xs text-muted-foreground">
          <CalendarIcon size={12} />
          <span>
            <span className="font-medium">Created:</span> {equipment.created_at ? formatDate(equipment.created_at) : 'N/A'}
            {equipment.created_by && ` - ${equipment.created_by}`}
          </span>
        </div>

        {/* Last Edited Date and By */}
        {equipment.updated_at && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <CalendarIcon size={12} />
            <span>
              <span className="font-medium">Last edited:</span> {formatDate(equipment.updated_at)}
              {equipment.updated_by && ` - ${equipment.updated_by}`}
            </span>
          </div>
        )}
      </CardContent>

      {/* Footer with Actions */}
      <CardFooter className="pt-0 flex gap-2">
        {onViewDetails && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(equipment);
            }}
            className="flex-1"
            size="sm"
            variant="outline"
          >
            View Details
          </Button>
        )}
        {onDelete && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(equipment);
            }}
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
          >
            <TrashIcon size={14} />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

