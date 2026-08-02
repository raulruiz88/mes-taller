'use client';

import { useState, useMemo } from 'react';
import { WorkOrder, AppUser } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { getUrgency } from '@/lib/utils/urgency';
import { useAuth } from '@/lib/hooks/useAuth';
import { Calendar, Clock, AlertTriangle, User, PauseCircle, ChevronLeft, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react';
import { addDays, subDays, format, isSameDay, differenceInDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface GanttChartProps {
  workOrders: WorkOrder[];
  users: AppUser[];
  onSelectOT: (ot: WorkOrder) => void;
}

export default function GanttChart({ workOrders, users, onSelectOT }: GanttChartProps) {
  const { isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<'hoy' | 'semana' | 'mes'>('semana');
  const [baseDate, setBaseDate] = useState<Date>(new Date());
  const [filterTechUid, setFilterTechUid] = useState<string>('todos');

  // Todos los usuarios activos (incluyendo Admins que tengan OTs asignadas)
  const allActiveUsers = useMemo(
    () => users.filter((u) => u.isActive !== false),
    [users]
  );

  // OTs activas (no completadas ni canceladas)
  const activeOTs = useMemo(() => {
    return workOrders
      .filter((o) => o.status !== 'completada' && o.status !== 'cancelada')
      .filter((o) => filterTechUid === 'todos' || o.asignadoA === filterTechUid);
  }, [workOrders, filterTechUid]);

  // Agrupar OTs por usuario / técnico (filtrando usuarios con 0 OTs)
  const { assignedUserRows, unassignedRow } = useMemo(() => {
    const assignedList: { user?: AppUser; label: string; ots: WorkOrder[] }[] = [];

    allActiveUsers.forEach((u) => {
      const otsOfTech = activeOTs.filter(
        (o) =>
          (u.uid && o.asignadoA === u.uid) ||
          (u.displayName && o.asignadoNombre?.toLowerCase() === u.displayName.toLowerCase())
      );
      
      // Mostrar ÚNICAMENTE usuarios que tienen OTs asignadas actualmente (otsOfTech.length > 0)
      if (otsOfTech.length > 0) {
        if (filterTechUid === 'todos' || filterTechUid === u.uid) {
          assignedList.push({
            user: u,
            label: u.displayName,
            ots: otsOfTech,
          });
        }
      }
    });

    // Fila independiente para OTs sin asignar
    const unassignedOTs = activeOTs.filter((o) => !o.asignadoA && !o.asignadoNombre);
    let unassigned: { label: string; ots: WorkOrder[] } | null = null;
    if (unassignedOTs.length > 0 && filterTechUid === 'todos') {
      unassigned = {
        label: '⚠️ Sin Asignar a Técnico',
        ots: unassignedOTs,
      };
    }

    return { assignedUserRows: assignedList, unassignedRow: unassigned };
  }, [allActiveUsers, activeOTs, filterTechUid]);

  // Generar intervalo de días para Semana (7 días) y Mes (30 días)
  const daysInterval = useMemo(() => {
    if (viewMode === 'semana') {
      const start = startOfWeek(baseDate, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      return eachDayOfInterval({ start, end });
    } else {
      const start = subDays(baseDate, 3);
      const end = addDays(start, 29);
      return eachDayOfInterval({ start, end });
    }
  }, [viewMode, baseDate]);

  return (
    <div className="glass rounded-2xl p-6 border border-slate-800 space-y-6 overflow-hidden">
      {/* Controls & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Programación de Trabajos por Técnico
          </h2>
          <p className="text-xs text-slate-400">
            {viewMode === 'hoy'
              ? 'Vista detallada completa de las asignaciones activas de hoy'
              : 'Matriz comprimida por técnico y días límite de entrega'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector Técnico */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterTechUid}
              onChange={(e) => setFilterTechUid(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="todos" className="bg-slate-900">Todos los Usuarios</option>
              {allActiveUsers.map((t) => (
                <option key={t.uid} value={t.uid} className="bg-slate-900">
                  {t.displayName} ({t.role})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Vista: Hoy / Semana / Mes */}
          <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('hoy')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'hoy'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hoy (Detallado)
            </button>
            <button
              onClick={() => setViewMode('semana')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'semana'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semana (7d)
            </button>
            <button
              onClick={() => setViewMode('mes')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'mes'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mes (30d)
            </button>
          </div>

          {/* Nav Fechas para Semana/Mes */}
          {viewMode !== 'hoy' && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
              <button
                onClick={() => setBaseDate(subDays(baseDate, viewMode === 'semana' ? 7 : 15))}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Anterior"
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
                title="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MODO 1: HOY (VISTA DETALLADA COMPLETA POR TÉCNICO) ── */}
      {viewMode === 'hoy' && (
        <div className="space-y-6">
          {assignedUserRows.map((row) => (
            <div key={row.label} className="glass-light rounded-2xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center font-bold text-white text-xs">
                    {row.label.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{row.label}</h3>
                    {row.user && <p className="text-[11px] text-slate-400 capitalize">{row.user.role}</p>}
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium">
                  {row.ots.length} trabajo{row.ots.length !== 1 ? 's' : ''} asignado{row.ots.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {row.ots.map((ot) => {
                  const urgency = getUrgency(ot.fechaEntrega, ot.status);

                  return (
                    <div
                      key={ot.id}
                      onClick={() => onSelectOT(ot)}
                      className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 p-4 rounded-xl cursor-pointer transition-all space-y-2 group hover:border-blue-500/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-400">{ot.folio}</span>
                        {ot.status === 'en_pausa' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium flex items-center gap-1">
                            <PauseCircle className="w-3 h-3" /> Pausada
                          </span>
                        ) : (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            urgency === 'rojo' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            urgency === 'amarillo' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {urgency === 'rojo' ? 'CRÍTICA' : urgency === 'amarillo' ? 'URGENTE' : 'EN TIEMPO'}
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-white font-semibold line-clamp-2">{ot.descripcion}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Cliente: <strong className="text-slate-300">{ot.cliente}</strong></p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 text-slate-400">
                        <span>Piezas: <strong className="text-emerald-400">{ot.piezasProcesadas} / {ot.totalPiezas}</strong></span>
                        <span>Entrega: <strong className="text-slate-200">{formatDate(ot.fechaEntrega)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* OTs Sin Asignar en Modo Hoy */}
          {unassignedRow && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Órdenes Sin Asignar a Técnico ({unassignedRow.ots.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unassignedRow.ots.map((ot) => (
                  <div
                    key={ot.id}
                    onClick={() => onSelectOT(ot)}
                    className="bg-slate-900/90 hover:bg-slate-900 border border-amber-500/40 p-4 rounded-xl cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-400">{ot.folio}</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-semibold">
                        Pendiente
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-white font-semibold line-clamp-2">{ot.descripcion}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Cliente: <strong className="text-slate-300">{ot.cliente}</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODO 2 & 3: SEMANA (7d) Y MES (30d) ── */}
      {(viewMode === 'semana' || viewMode === 'mes') && (
        <div className="w-full overflow-x-auto pb-2">
          <div className={`${viewMode === 'mes' ? 'min-w-[1650px]' : 'min-w-[950px]'} space-y-2 inline-block w-full`}>
            {/* Class de Grilla Unificada (Alineación Pixel-Perfect entre Header y Filas) */}
            {(() => {
              const gridStyle = {
                display: 'grid',
                gridTemplateColumns: viewMode === 'semana' 
                  ? '220px repeat(7, minmax(0, 1fr))' 
                  : '220px repeat(30, minmax(46px, 1fr))',
                gap: '4px',
              };

              return (
                <>
                  {/* Header de Fechas */}
                  <div style={gridStyle} className="border-b border-slate-800 pb-2 text-xs font-semibold text-slate-400 items-center">
                    <div className="pr-3 text-slate-300 font-bold text-xs uppercase tracking-wider">
                      Técnico / Operador
                    </div>
                    {daysInterval.map((day, idx) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div
                          key={idx}
                          className={`py-1 rounded-lg text-center transition-all ${
                            isToday
                              ? 'bg-blue-950/70 border-t-2 border-x border-b border-t-blue-400 border-x-blue-500/30 border-b-blue-500/30 text-blue-300 shadow-sm'
                              : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800'
                          }`}
                        >
                          <p className={`text-[9px] uppercase tracking-tighter font-semibold ${isToday ? 'text-blue-400 flex items-center justify-center gap-0.5' : 'text-slate-400 opacity-80'}`}>
                            {isToday && <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />}
                            {format(day, viewMode === 'mes' ? 'EE' : 'EEE', { locale: es })}
                          </p>
                          <p className={`text-xs font-mono font-bold ${isToday ? 'text-white font-extrabold' : 'text-slate-300'}`}>
                            {format(day, 'dd')}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Filas por Técnico Asignado */}
                  <div className="space-y-2">
                    {assignedUserRows.map((row) => (
                      <div
                        key={row.label}
                        style={gridStyle}
                        className="glass-light rounded-xl p-2 border border-slate-800/80 hover:border-slate-700 transition-all items-center"
                      >
                        {/* Columna Izquierda: Nombre del Técnico */}
                        <div className="pr-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-xs shrink-0">
                              {row.label.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{row.label}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">
                                {row.ots.length} OT{row.ots.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Grilla de Días en la Derecha */}
                        {daysInterval.map((day, idx) => {
                          const isToday = isSameDay(day, new Date());
                          // OTs activas cuya fecha de entrega cae en este día o están atrasadas (se muestran en HOY)
                          const otsOnDay = row.ots.filter((ot) => {
                            const deliveryDate = ot.fechaEntrega
                              ? ('toDate' in ot.fechaEntrega ? ot.fechaEntrega.toDate() : new Date(ot.fechaEntrega))
                              : null;
                            
                            if (isToday) {
                              if (!deliveryDate) return true;
                              const isOverdue = differenceInDays(new Date(), deliveryDate) > 0 && !isSameDay(deliveryDate, new Date());
                              if (isOverdue) return true;
                            }

                            return deliveryDate ? isSameDay(day, deliveryDate) : false;
                          });

                          return (
                            <div
                              key={idx}
                              className={`min-h-[44px] flex flex-col items-center justify-center gap-1 p-0.5 ${
                                isToday ? 'bg-blue-500/10 border-x border-blue-500/20' : ''
                              }`}
                            >
                              {otsOnDay.map((ot) => {
                                const urgency = getUrgency(ot.fechaEntrega, ot.status);
                                const shortFolio = ot.folio.replace(/^OT-20\d\d-/, '');

                                let badgeColor = 'bg-emerald-600 text-white border-emerald-400/60 hover:bg-emerald-500';
                                if (ot.status === 'en_pausa') {
                                  badgeColor = 'bg-purple-600 text-purple-100 border-purple-400/60 hover:bg-purple-500';
                                } else if (urgency === 'rojo') {
                                  badgeColor = 'bg-red-600 text-white border-red-400 hover:bg-red-500 animate-pulse-slow';
                                } else if (urgency === 'amarillo') {
                                  badgeColor = 'bg-amber-600 text-amber-100 border-amber-400/60 hover:bg-amber-500';
                                }

                                return (
                                  <button
                                    key={ot.id}
                                    onClick={() => onSelectOT(ot)}
                                    title={`${ot.folio}: ${ot.descripcion} (${ot.cliente}) | Entrega: ${formatDate(ot.fechaEntrega)}`}
                                    className={`w-full py-1 rounded-lg border text-[11px] font-mono font-bold transition-all shadow-md flex items-center justify-center text-center truncate ${badgeColor}`}
                                  >
                                    {shortFolio}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* Fila Separada para Trabajos Sin Asignar */}
                    {unassignedRow && (
                      <div className="pt-3 border-t border-slate-800 space-y-2">
                        <div
                          style={gridStyle}
                          className="bg-amber-950/20 rounded-xl p-2 border border-amber-500/30 items-center"
                        >
                          {/* Columna Izquierda */}
                          <div className="pr-3 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                                ⚠️
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-amber-300 truncate">Sin Asignar</p>
                                <p className="text-[10px] text-amber-400/80 font-semibold">
                                  {unassignedRow.ots.length} OT{unassignedRow.ots.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Grilla de Días */}
                          {daysInterval.map((day, idx) => {
                            const isToday = isSameDay(day, new Date());
                            const otsOnDay = unassignedRow.ots.filter((ot) => {
                              const deliveryDate = ot.fechaEntrega
                                ? ('toDate' in ot.fechaEntrega ? ot.fechaEntrega.toDate() : new Date(ot.fechaEntrega))
                                : null;
                              
                              if (isToday) {
                                if (!deliveryDate) return true;
                                const isOverdue = differenceInDays(new Date(), deliveryDate) > 0 && !isSameDay(deliveryDate, new Date());
                                if (isOverdue) return true;
                              }

                              return deliveryDate ? isSameDay(day, deliveryDate) : false;
                            });

                            return (
                              <div
                                key={idx}
                                className={`min-h-[44px] flex flex-col items-center justify-center gap-1 p-0.5 ${
                                  isToday ? 'bg-amber-500/10 border-x border-amber-500/30' : ''
                                }`}
                              >
                                {otsOnDay.map((ot) => {
                                  const urgency = getUrgency(ot.fechaEntrega, ot.status);
                                  const shortFolio = ot.folio.replace(/^OT-20\d\d-/, '');

                                  let badgeColor = 'bg-amber-600 text-amber-100 border-amber-400/60 hover:bg-amber-500';

                                  return (
                                    <button
                                      key={ot.id}
                                      onClick={() => onSelectOT(ot)}
                                      title={`${ot.folio}: ${ot.descripcion} (${ot.cliente}) | Entrega: ${formatDate(ot.fechaEntrega)}`}
                                      className={`w-full py-1 rounded-lg border text-[11px] font-mono font-bold transition-all shadow-md flex items-center justify-center text-center truncate ${badgeColor}`}
                                    >
                                      {shortFolio}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3 flex-wrap gap-3">
        <span className="font-semibold text-slate-300">Simbología en calendario:</span>
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
            <span>Crítico / Límite Hoy</span>
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
