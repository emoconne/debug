import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { FC, useEffect, useState } from "react";
import { useChatContext } from "../chat-context";

interface Department {
  id: string;
  name: string;
  blobContainerName: string;
}

interface Prop {
  disable: boolean;
}

export const DepartmentSelector: FC<Prop> = (props) => {
  const { chatBody, onDepartmentChange } = useChatContext();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/departments');
        if (response.ok) {
          const data = await response.json();
          setDepartments(data.departments);
        }
      } catch (error) {
        console.error('部門一覧の取得に失敗しました:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const handleDepartmentChange = (departmentId: string) => {
    onDepartmentChange(departmentId);
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        部門選択
      </label>
      <Select
        value={chatBody.selectedDepartmentId || "all"}
        onValueChange={handleDepartmentChange}
        disabled={props.disable || isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? "読み込み中..." : "部門を選択してください"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての部門</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
