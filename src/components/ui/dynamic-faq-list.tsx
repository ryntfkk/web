import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Faq {
  question: string;
  answer: string;
}

interface DynamicFaqListProps {
  label: string;
  items: Faq[];
  onChange: (items: Faq[]) => void;
}

export function DynamicFaqList({ label, items, onChange }: DynamicFaqListProps) {
  const handleAdd = () => {
    onChange([...items, { question: '', answer: '' }]);
  };

  const handleRemove = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  const handleChange = (index: number, field: keyof Faq, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-brand-gray-900">
        {label}
      </label>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-start border p-3 rounded-lg border-brand-gray-100 bg-brand-gray-60/50">
          <div className="flex-1 space-y-3">
            <div>
              <input
                type="text"
                value={item.question}
                onChange={(e) => handleChange(index, 'question', e.target.value)}
                placeholder="Pertanyaan..."
                className="w-full p-2 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red bg-white"
              />
            </div>
            <div>
              <input
                type="text"
                value={item.answer}
                onChange={(e) => handleChange(index, 'answer', e.target.value)}
                placeholder="Jawaban..."
                className="w-full p-2 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red bg-white"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleRemove(index)}
            className="shrink-0 text-brand-gray-450 hover:text-brand-red bg-white"
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
        Tambah Pertanyaan
      </Button>
    </div>
  );
}
