Created At: 2026-10-04T12:27:16+08:00
Completed At: 2026-10-04T12:27:16+08:00

The command exited with code 0.
Output:
warning: in the working copy of 'apps/web/src/features/dashboard/UserDashboardPage.tsx', LF will be replaced by CRLF the next time Git touches it
diff --git a/apps/web/src/features/dashboard/UserDashboardPage.tsx b/apps/web/src/features/dashboard/UserDashboardPage.tsx
index e06cf4e..0263dc2 100644
--- a/apps/web/src/features/dashboard/UserDashboardPage.tsx
+++ b/apps/web/src/features/dashboard/UserDashboardPage.tsx
@@ -1,6 +1,7 @@
 import { ArrowRight, Bell, BookMarked, BookOpen, CalendarClock, CheckCircle2, Clock3, Eye, MapPin, PhilippinePeso, Printer, RotateCcw, Search, ShoppingBag, Sparkles } from 'lucide-react'
 import { useCallback, useEffect, useMemo, useState } from 'react'
 import { Link } from 'react-router-dom'
+import { StatusModal } from '../../components/ui'
 import { Button, CardLink, PageHeader, SectionCard, StatCard, StatusBadge } from '../../components/ui'
 import { dashboardApi } from './dashboard-api'
 import type { UserDashboardData } from './types'
@@ -42,10 +43,11 @@ export function UserDashboardPage(){
   </SectionCard>
   return <>
     <PageHeader eyebrow={`${data.user.role} workspace`} title={`Good day, ${first(data.user.name)}!`}/>
-    {error?<div role="alert" className="mb-5 rounded-2xl bg-[#FFF200] px-4 py-3 text-sm font-semibold text-[#003399]">{error}</div>:null}{notice?<div role="status" className="mb-5 rounded-2xl bg-[#003399] px-4 py-3 text-sm font-semibold text-[#FFFFFF]">{notice}</div>:null}
+    {error ? <StatusModal type="error" description={error} onClose={() => setError('')} /> : null}
+      {notice ? <StatusModal type="success" description={notice} onClose={() => setNotice('')} /> : null}
     <section className="relative mb-5 overflow-hidden rounded-3xl bg-[#003399] p-6 text-white shadow-xl shadow-[#003399]/10 sm:p-8">
       <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[42px] border-white/5"/><div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10"><Sparkles size={14} className="text-[#FFF200]"/>Your library, made smarter</div><h2 className="max-w-2xl font-display text-2xl font-bold sm:text-3xl">Your books, requests, updates, and library visit in one place.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/80">{data.profile.information??'Check your account and explore available library resources.'}</p><div className="mt-5 flex flex-wrap gap-3"><Link to={`${prefix}/catalog`}><Button className="bg-[#FFF200] text-[#003399]">Explore catalog<ArrowRight size={16}/></Button></Link><Link to={`${prefix}/research`}><Button variant="ghost" className="bg-white/10 text-white hover:bg-white/15 hover:text-white">Browse research</Button></Link></div></div>
-      <div className="grid grid-cols-2 gap-3 lg:w-72"><div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><p className="text-xs text-white/70">Library occupancy</p><p className="mt-1 text-2xl font-bold">{data.occupancy.current}<span className="text-sm font-medium text-white/60"> / {data.occupancy.capacity}</span></p><div className="mt-3 h-1.5 rounded-full bg-white/10"><div style={{width:`${occupancyPercent}%`}} className="h-full rounded-full bg-[#FFF200]"/></div></div><div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><p className="text-xs text-white/70">Clearance status</p><div className="mt-2 flex items-center gap-2 text-lg font-bold"><CheckCircle2 size={20} className="text-[#FFF200]"/>{data.summary.clearanceStatus}</div><p className="mt-3 text-xs text-white/60">{cleared?'No clearance block':'Resolve account obligations'}</p></div></div></div>
+      <div className="grid grid-cols-2 gap-3 lg:w-72"><div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><p className="text-xs text-white/70">Library occupancy</p><p className="mt-1 text-2xl font-bold">{data.occupancy.current}<span className="text-sm font-medium text-white/60"> / {data.occupancy.capacity}</span></p><div className="mt-3 h-1.5 rounded-full bg-white/10"><div style={{width:`${occupancyPercent}%`}} className="h-full rounded-full bg-[#FFF200]"/></div></div><div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><p className="text-xs text-white/70">Clearance status</p><div className="mt-2 flex items-center gap-2 text-lg font-bold"><CheckCircle2 size={20} className="text-[#FFF200]"/>{data.summary.clearanceStatus}</div><p className="mt-3 text-xs text-white/60">{cleared?'No clearance block':data.summary.clearanceReason?'Reason: '+data.summary.clearanceReason:'Resolve account obligations'}</p></div></div></div>
     </section>
     <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Active loans" value={data.summary.activeLoans} icon={BookOpen} tone="blue"/><StatCard label="Reservations" value={data.summary.activeReservations} icon={BookMarked} tone="violet"/><StatCard label="Unread updates" value={data.summary.unreadNotifications} icon={Bell} tone="orange"/><StatCard label="Outstanding fines" value={peso(data.summary.outstandingFines)} icon={PhilippinePeso} tone={data.summary.outstandingFines?'red':'emerald'}/></div>
     {recommendationsPanel}

