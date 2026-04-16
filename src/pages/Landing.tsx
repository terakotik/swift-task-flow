import { ClipboardList, Users } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-8">
        <div>
          <h1 className="text-3xl font-black text-foreground mb-2">TaskFlow</h1>
          <p className="text-muted-foreground text-sm">Платформа для выполнения заданий</p>
        </div>

        <div className="flex justify-center gap-8">
          <div className="flex flex-col items-center gap-1">
            <ClipboardList size={28} className="text-primary" />
            <span className="text-3xl font-black text-foreground">20</span>
            <span className="text-xs text-muted-foreground font-semibold">Заданий в системе</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Users size={28} className="text-primary" />
            <span className="text-3xl font-black text-foreground">9</span>
            <span className="text-xs text-muted-foreground font-semibold">Подключено человек</span>
          </div>
        </div>
      </div>
    </div>
  );
}
