import React, { useState } from 'react';
import { CombatLogEntry } from '../engine/types';
import { ChevronDown, ChevronUp, Scroll } from 'lucide-react';

interface CombatLogProps {
  logs: CombatLogEntry[];
}

export const CombatLog: React.FC<CombatLogProps> = ({ logs }) => {
  const [collapsed, setCollapsed] = useState(false);

  const getLogColor = (type: CombatLogEntry['type']) => {
    switch (type) {
      case 'damage':
        return 'text-rose-400';
      case 'heal':
        return 'text-emerald-400';
      case 'loot':
        return 'text-amber-400 font-semibold';
      case 'kill':
        return 'text-yellow-300 font-medium';
      case 'system':
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-20 w-72 md:w-80 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 cursor-pointer text-xs font-semibold text-slate-300 hover:bg-slate-850 transition"
      >
        <div className="flex items-center gap-1.5">
          <Scroll className="w-3.5 h-3.5 text-amber-400" />
          <span>Chronicle & Combat Log</span>
        </div>
        {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>

      {/* Log Feed */}
      {!collapsed && (
        <div className="p-2 max-h-36 overflow-y-auto space-y-1 text-left font-mono text-[11px] leading-relaxed">
          {logs.slice(0, 20).map((log) => (
            <div key={log.id} className="flex gap-1.5">
              <span className="text-slate-600 shrink-0 text-[10px]">{log.timestamp}</span>
              <span className={getLogColor(log.type)}>{log.text}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-slate-500 text-center py-2">Dungeon is quiet...</div>
          )}
        </div>
      )}
    </div>
  );
};
