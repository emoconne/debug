"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, GripVertical, Check, X } from "lucide-react";
import { Department } from "@/features/documents/cosmos-db-dept-service";

interface DepartmentTableProps {
  departments: Department[];
  onEdit: (department: Department) => void;
  onDelete: (departmentId: string) => void;
  onReorder: (departments: Department[]) => void;
}

export const DepartmentTable = ({ 
  departments, 
  onEdit, 
  onDelete, 
  onReorder 
}: DepartmentTableProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newDepartments = [...departments];
    const [draggedItem] = newDepartments.splice(draggedIndex, 1);
    newDepartments.splice(dropIndex, 0, draggedItem);
    
    onReorder(newDepartments);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>部門名</TableHead>
          <TableHead>説明</TableHead>
          <TableHead>BLOBコンテナ名</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead className="w-[120px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {departments.map((department, index) => (
          <TableRow
            key={department.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              ${draggedIndex === index ? 'opacity-50' : ''}
              ${dragOverIndex === index && draggedIndex !== index ? 'border-t-2 border-primary' : ''}
              cursor-move
            `}
          >
            <TableCell>
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </TableCell>
            <TableCell className="font-medium">{department.name}</TableCell>
            <TableCell>{department.description || '-'}</TableCell>
            <TableCell>{department.blobContainerName || '-'}</TableCell>
            <TableCell>
              <Badge variant={department.isActive ? "default" : "secondary"}>
                {department.isActive ? "有効" : "無効"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(department)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(department.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
