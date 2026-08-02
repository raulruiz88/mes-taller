'use client';

import { useState, useMemo } from 'react';
import { WorkOrder, AppUser } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { getUrgency } from '@/lib/utils/urgency';
import { useAuth } from '@/lib/hooks/useAuth';
import { Calendar, Clock, AlertTriangle, User, PauseCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, subDays, format, isSameDay, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface GanttChartProps {
  workOrders: WorkOrder[];
  users: AppUser[];
  onSelectOT: (ot: WorkOrder) => void;
}

export default function GanttChart({ workOrders, users, onSelectOT }: GanttChartProps) {
  const { isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<'semana' | 'mes'>('semana');
  const [baseDate, setBaseDate] = useState<Date>(new Date());
  const [filterTechUid, setFilterTechUid] = useState<string>('todos');

  // Filtrar técnicos
  const techUsers = useMemo(
    () => users.filter((u) => u.role === 'tecnico' || u.role === 'supervisor' || u.role === 'produccion'),
    [users]
  );

  // OTs activas (no completadas ni canceladas)
  const activeOTs = useMemo(() => {
    return workOrders
      .filter((o) => o.status !== 'completada' && o.status !== 'cancelada')
      .filter((o) => filterTechUid === 'todos' || o.asignadoA === filterTechUid);
  }, [workOrders, filterTechUid]);

  // Generar rango de días según el modo de vista (Semana de 7 días o Mes de 30 días)
  const daysInterval = useMemo(() => {
    if (viewMode === 'semana') {
      const start = startOfWeek(baseDate, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      return eachDayOfInterval({ start, end });
    } else {
      const start = subDays(baseDate, 5);
      const end = addDays(start, 29);
      return eachDayOfInterval({ start, end });
    }
  }, [viewMode, baseDate]);

  const startDateRange = daysInterval[0];
  const endDateRange = daysInterval[daysInterval.length - 1];

  return (
    <div className="glass rounded-2xl p-6 border border-slate-800 space-y-6">
      {/* Controls & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Diagrama de Gantt & Programación
          </h2>
          <p className="text-xs text-slate-400">
            Seguimiento de tiempos, duraciones y desviaciones por orden de trabajo
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector Técnico */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterTechUid}
              onChange={(e) => setFilterTechUid(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="todos" className="bg-slate-900">Todos los Técnicos</option>
              {techUsers.map((t) => (
                <option key={t.uid} value={t.uid} className="bg-slate-900">
                  {t.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Vista Semana / Mes */}
          <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('semana')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'semana'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semana (7 días)
            </button>
            <button
              onClick={() => setViewMode('mes')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'mes'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mes (30 días)
            </button>
          </div>

          {/* Nav Fechas */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
            <button
              onClick={() => setBaseDate(subDays(baseDate, viewMode === 'semana' ? 7 : 15))}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setBaseDate(new Date())}
              className="px-2 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
            >
              Hoy
            </button>
            <button
              onClick={() => setBaseDate(addDays(baseDate, viewMode === 'semana' ? 7 : 15))}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Gantt Matrix Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px] space-y-2">
          {/* Header Rows (Días) */}
          <div className="flex border-b border-slate-800 pb-2 text-xs font-semibold text-slate-400">
            <div className="w-72 shrink-0 pr-2">Orden de Trabajo / Técnico</div>
            <div className="flex-1 grid grid-flow-col auto-cols-fr gap-1 text-center">
              {daysInterval.map((day, idx) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={idx}
                    className={`py-1 rounded-lg ${
                      isToday ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/40' : ''
                    }`}
                  >
                    <p className="text-[10px] uppercase">{format(day, 'eee', { locale: es })}</p>
                    <p className="text-xs">{format(day, 'dd/MM')}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rows per OT */}
          {activeOTs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay órdenes activas programadas en este rango de fechas.</p>
            </div>
          ) : (
            activeOTs.map((ot) => {
              const start = ot.fechaInicio
                ? ('toDate' in ot.fechaInicio ? ot.fechaInicio.toDate() : new Date(ot.fechaInicio))
                : new Date();
              const end = ot.fechaEntrega
                ? ('toDate' in ot.fechaEntrega ? ot.fechaEntrega.toDate() : new Date(ot.fechaEntrega))
                : addDays(new Date(), 3);

              // Calcular desvío / retraso en días
              const today = new Date();
              const diasRetraso = differenceInDays(today, end);
              const isOverdue = diasRetraso > 0 && ot.status !== 'en_pausa';

              const urgency = getUrgency(ot.fechaEntrega, ot.status);

              // Determinar color de barra
              let barColor = 'bg-emerald-600/80 border-emerald-500 text-emerald-100';
              if (ot.status === 'en_pausa') {
                barColor = 'bg-purple-600/80 border-purple-500 text-purple-100';
              } else if (urgency === 'rojo') {
                barColor = 'bg-red-600/90 border-red-500 text-white animate-pulse-slow';
              } else if (urgency === 'amarillo') {
                barColor = 'bg-amber-600/80 border-amber-500 text-amber-100';
              }

              return (
                <div
                  key={ot.id}
                  className="flex items-center glass-light rounded-xl p-2.5 hover:bg-slate-800/60 transition-all group"
                >
                  {/* Info Izquierda */}
                  <div className="w-72 shrink-0 pr-3 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-400">{ot.folio}</span>
                      {ot.asignadoNombre ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {ot.asignadoNombre}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                          Sin Asignar
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white font-medium truncate mt-0.5">{ot.descripcion}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>Entrega: {formatDate(ot.fechaEntrega)}</span>
                      {isOverdue && (
                        <span className="text-red-400 font-bold bg-red-950/60 px-1 rounded border border-red-500/30">
                          +{diasRetraso}d Atraso
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra Visual Gantt */}
                  <div className="flex-1 grid grid-flow-col auto-cols-fr gap-1 items-center">
                    {daysInterval.map((day, idx) => {
                      const isBetween = day >= start && day <= end;
                      const isEndDay = isSameDay(day, end);

                      return (
                        <div key={idx} className="h-9 flex items-center justify-center relative">
                          {isBetween && (
                            <button
                              onClick={() => onSelectOT(ot)}
                              title={`${ot.folio}: ${ot.descripcion} | Entrega: ${formatDate(ot.fechaEntrega)}`}
                              className={`w-full h-7 rounded-lg border text-[10px] font-semibold flex items-center justify-center px-1 truncate transition-transform hover:scale-[1.03] ${barColor}`}
                            >
                              {isEndDay ? (
                                ot.status === 'en_pausa' ? '⏸️ Pausa' : '🏁 Límite'
                              ) : (
                                <span className="opacity-90">{ot.piezasProcesadas}/{ot.totalPiezas} pzas</span>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Leyenda del Gantt */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3 flex-wrap gap-3">
        <span className="font-semibold text-slate-300">Simbología:</span>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" />
            <span>En Tiempo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500" />
            <span>Urgente (&lt;72h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500" />
            <span>Crítico / Atrasado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-500" />
            <span>En Pausa ⏸️</span>
          </div>
        </div>
      </div>
    </div>
  );
}
