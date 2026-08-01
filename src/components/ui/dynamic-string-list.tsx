import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DynamicStringListProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  required?: boolean;
}

export function DynamicStringList({ label, items, onChange, placeholder, required }: DynamicStringListProps) {
  const handleAdd = () => {
    onChange([...items, '']);
  };

  const handleRemove = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  const handleChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-brand-gray-900">
        {label} {required && <span className="text-brand-red">*</span>}
      </label>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder={placeholder}
            className="flex-1 p-2 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleRemove(index)}
            className="shrink-0 text-brand-gray-450 hover:text-brand-red"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleAdd}
        className="text-brand-red hover:bg-brand-red/10"
      >
        <Plus className="w-4 h-4 mr-1" />
        Tambah Item
      </Button>
    </div>
  );
}
