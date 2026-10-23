import React, { useState } from 'react';
import { CombatLogEntry } from '../engine/types';
import { ChevronDown, ChevronUp, Scroll } from 'lucide-react';

interface CombatLogProps {
  logs: CombatLogEntry[];
}

export const CombatLog: React.FC<CombatLogProps> = ({ logs }) => {
  const [collapsed, setCollapsed] = useState(true);

  const getLogColor = (type: CombatLogEntry['type']) => {
    switch (type) {
      case 'damage':
        return 'text-rose-400';
      case 'heal':
        return 'text-emerald-400';
      case 'loot':
        return 'text-amber-300 font-semibold';
      case 'kill':
        return 'text-yellow-300 font-medium';
      case 'system':
      default:
        return 'text-amber-100/80';
    }
  };

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-20 w-64 sm:w-72 bg-gradient-to-b from-[#1e160d]/95 to-[#0e0a06]/95 border-2 border-[#a87c33] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.9)] overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-[#2c2013] to-[#1a120a] border-b border-[#7a5822]/60 cursor-pointer text-[11px] font-cinzel font-bold text-[#fef08a] hover:brightness-110 transition"
      >
        <div className="flex items-center gap-1.5">
          <Scroll className="w-3.5 h-3.5 text-[#facc15]" />
          <span className="tracking-wider uppercase">Chronicle & Combat Log</span>
        </div>
        {collapsed ? <ChevronUp className="w-3.5 h-3.5 text-amber-300" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-300" />}
      </div>

      {/* Log Feed */}
      {!collapsed && (
        <div className="p-2 max-h-32 overflow-y-auto space-y-1 text-left font-mono text-[10px] leading-relaxed">
          {logs.slice(0, 20).map((log) => (
            <div key={log.id} className="flex gap-1.5">
              <span className="text-amber-500/50 shrink-0 text-[9px]">{log.timestamp}</span>
              <span className={getLogColor(log.type)}>{log.text}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-amber-200/40 text-center py-2">Dungeon is quiet...</div>
          )}
        </div>
      )}
    </div>
  );
};
