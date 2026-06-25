import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

const REQUEST_TYPES = [
  { value: "price_change", label: "Изменение цены на услугу" },
  { value: "new_service", label: "Добавить новую услугу" },
  { value: "new_model", label: "Добавить новую модель устройства" },
  { value: "new_category", label: "Добавить новую категорию" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RequestModal({ open, onClose }: Props) {
  const { toast } = useToast();
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/requests", {
        type,
        description,
        proposedValue: proposedValue || undefined,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка отправки");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setType("");
        setDescription("");
        setProposedValue("");
        onClose();
      }, 2000);
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !description) return;
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Запрос на изменение</DialogTitle>
          <DialogDescription>
            Отправьте запрос администратору на изменение цены, добавление услуги или модели.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="font-semibold text-green-700 dark:text-green-400">Запрос отправлен!</p>
            <p className="text-sm text-muted-foreground">Администратор рассмотрит ваш запрос.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="req-type">Тип запроса</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="req-type" data-testid="select-request-type">
                  <SelectValue placeholder="Выберите тип..." />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-desc">Описание</Label>
              <Textarea
                id="req-desc"
                data-testid="textarea-description"
                placeholder={
                  type === "price_change"
                    ? "Например: iPhone 13 — Замена дисплея, изменить цену с 4000₽ на 3800₽"
                    : type === "new_service"
                    ? "Например: iPhone 15 — добавить услугу «Полировка корпуса» за 500₽"
                    : type === "new_model"
                    ? "Например: Добавить Samsung Galaxy S24 в категорию Android"
                    : "Опишите запрос подробно..."
                }
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                required
              />
            </div>

            {(type === "price_change" || type === "new_service") && (
              <div className="space-y-1.5">
                <Label htmlFor="req-value">Предлагаемая цена (₽)</Label>
                <Input
                  id="req-value"
                  data-testid="input-proposed-value"
                  type="number"
                  placeholder="Например: 3800"
                  value={proposedValue}
                  onChange={e => setProposedValue(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Отмена
              </Button>
              <Button
                type="submit"
                data-testid="button-send-request"
                className="flex-1 gap-2"
                disabled={!type || !description || mutation.isPending}
              >
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Отправить
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
