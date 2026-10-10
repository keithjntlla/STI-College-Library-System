import { ArrowRight, Bell, BookMarked, BookOpen, CalendarClock, CheckCircle2, AlertTriangle, Clock3, Eye, MapPin, PhilippinePeso, Printer, QrCode, RotateCcw, Search, ShoppingBag, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertMessage, Button, CardLink, PageHeader, SectionCard, StatCard, StatusBadge, StatusModal } from '../../components/ui'
import { buildClearanceMessage } from './clearance-message'
import { dashboardApi } from './dashboard-api'
import type { UserDashboardData } from './types'
import { BookCoverThumbnail } from '../catalog/BookCoverThumbnail'
import { BookOverview } from '../catalog/BookOverview'
import { fetchBookOverview } from '../catalog/book-catalog-api'
import { validateBookCartAddition } from '../catalog/book-cart'
import { useBookCart } from '../catalog/book-cart-store'
import type { BookCatalogItem } from '../catalog/book-catalog-types'
import type { AuthRole } from '../auth/auth-storage'

const peso=(value:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(value)
const first=(name:string)=>name.trim().split(/\s+/)[0]||'Library user'
const dayNames=['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export function UserDashboardPage(){
  const[data,setData]=useState<UserDashboardData|null>(null);const[error,setError]=useState('');const[loading,setLoading]=useState(true)
  const[selectedTitleId,setSelectedTitleId]=useState<number|null>(null);const[borrowingTitleId,setBorrowingTitleId]=useState<number|null>(null);const[notice,setNotice]=useState('')
  const{items:cart,addItem}=useBookCart();const cartIds=useMemo(()=>new Set(cart.map(item=>item.titleId)),[cart])
  const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await dashboardApi.user())}catch(value){setError(value instanceof Error?value.message:'The dashboard could not be loaded.')}finally{setLoading(false)}},[])
  useEffect(()=>{void load()},[load])
  if(!data&&loading)return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-xl bg-[#0b5ea2]/10"/><div className="h-48 animate-pulse rounded-3xl bg-[#0b5ea2]/10"/></div>
  if(!data)return <SectionCard className="p-8 text-center"><p className="font-display text-xl font-bold text-[#0b5ea2]">Dashboard unavailable</p><p className="mt-2 text-sm text-[#0b5ea2]/65">{error}</p><Button className="mt-5" onClick={()=>void load()}><RotateCcw size={16}/>Try again</Button></SectionCard>
  const prefix=data.user.role==='Faculty'?'/faculty':'/student',limitNote=data.summary.borrowingLimit===null?'No fixed borrowing limit':`${Math.max(0,data.summary.borrowingLimit-data.summary.activeLoans)} slot${Math.max(0,data.summary.borrowingLimit-data.summary.activeLoans)===1?'':'s'} remaining`
  const occupancyPercent=Math.min(100,Math.round(data.occupancy.current/data.occupancy.capacity*100));const cleared=data.summary.clearanceStatus==='Cleared';const today=manilaDay();const todaySchedule=data.profile.schedule.find(item=>item.day===today)
  const clearanceAlert=buildClearanceMessage({
    clearanceStatus:data.summary.clearanceStatus,
    clearanceReason:data.summary.clearanceReason,
    activeLoans:data.summary.activeLoans,
    outstandingFines:data.summary.outstandingFines,
    prefix,
  })
  const addCatalogBook=(book:BookCatalogItem)=>{
    const validation=validateBookCartAddition({role:data.user.role as AuthRole,activeBookCount:data.summary.activeBookCount,selectedBookCount:cart.length,alreadySelected:cartIds.has(book.titleId)})
    if(!validation.allowed){setNotice('');setError(validation.message??'This book cannot be added to the cart.');return}
    if(!cartIds.has(book.titleId))addItem(book);setError('');setNotice(validation.message??`${book.title} was added to your borrow cart.`)
  }
  const borrowRecommendation=async(titleId:number)=>{
    setBorrowingTitleId(titleId);setError('');setNotice('')
    try{addCatalogBook(await fetchBookOverview(titleId))}catch(reason){setError(reason instanceof Error?reason.message:'The book could not be added to the cart.')}finally{setBorrowingTitleId(null)}
  }
  const recommendationsPanel=<SectionCard className="mb-5 p-5">
    <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/45">Recommended for {data.user.program??'you'}</p><h2 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Available to borrow</h2></div><Link to={`${prefix}/catalog`}><CardLink>View all</CardLink></Link></div>
    {data.recommendations.length?<div className="grid gap-5 sm:grid-cols-3">{data.recommendations.map(book=><article key={book.id} className="flex min-w-0 flex-col"><div className="flex justify-center"><BookCoverThumbnail title={book.title} coverImagePath={book.coverPath} className="h-48 w-32 rounded-xl border border-[#0b5ea2]/15 shadow-[0_6px_16px_rgba(11,94,162,0.12)] sm:h-56 sm:w-40"/></div><p className="mt-2 line-clamp-2 text-xs font-bold text-[#0b5ea2]">{book.title}</p><p className="mt-0.5 truncate text-[11px] text-[#0b5ea2]/45">{book.author}</p><p className="mt-1 text-[10px] font-semibold text-[#0b5ea2]/65">{book.availableCopies} available</p><div className="mt-auto grid grid-cols-2 gap-2 pt-3"><button type="button" onClick={()=>setSelectedTitleId(book.id)} className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-[#0b5ea2]/20 bg-[#FFFFFF] px-2 text-[11px] font-bold text-[#0b5ea2]"><Eye size={14}/>View details</button><button type="button" disabled={cartIds.has(book.id)||borrowingTitleId===book.id} onClick={()=>void borrowRecommendation(book.id)} className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-[#0b5ea2] px-2 text-[11px] font-bold text-[#FFFFFF] disabled:opacity-50"><ShoppingBag size={14}/>{cartIds.has(book.id)?'In cart':borrowingTitleId===book.id?'Adding…':'Borrow'}</button></div></article>)}</div>:<Empty text="No available recommendations right now."/>}
    <div className="mt-5 flex flex-wrap gap-3 border-t border-[#0b5ea2]/10 pt-4"><Link to={`${prefix}/catalog`}><Button><Search size={16}/>Browse catalog</Button></Link><Link to={`${prefix}/cart`}><Button variant="secondary"><ShoppingBag size={16}/>Borrow cart ({cart.length})</Button></Link><Button variant="secondary" onClick={()=>void load()}><RotateCcw size={16}/>Refresh dashboard</Button></div>
  </SectionCard>
  return <>
    <PageHeader eyebrow={`${data.user.role} workspace`} title={`Good day, ${first(data.user.name)}!`}/>
    {error ? <StatusModal type="error" description={error} onClose={() => setError('')} /> : null}
    {notice ? <StatusModal type="success" description={notice} onClose={() => setNotice('')} /> : null}
    
    {clearanceAlert ? (
      <AlertMessage
        type={clearanceAlert.type}
        title={clearanceAlert.title}
        description={clearanceAlert.description}
        action={
          <Link to={clearanceAlert.cta.to}>
            <Button variant="secondary" className="bg-white dark:bg-zinc-900">{clearanceAlert.cta.label}</Button>
          </Link>
        }
      />
    ) : null}

    <section 
      className="relative mb-5 overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-black/5 sm:p-8 bg-cover bg-center"
      style={{ backgroundImage: "url('/library-hero.webp')" }}
    >
      <div className="absolute inset-0 bg-[#0b5ea2]/85 dark:bg-[#001133]/90 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b5ea2] via-transparent to-transparent opacity-80" />
      <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-md">
            {cleared ? <><CheckCircle2 size={14} className="text-[#FFF200]" /> Clearance: Cleared</> : <><AlertTriangle size={14} className="text-red-400" /> {clearanceAlert?.pillLabel ?? 'Clearance: Action Required'}</>}
          </div>
          <h2 className="max-w-2xl font-display text-2xl font-bold sm:text-3xl text-white">Your books, requests, updates, and library visit in one place.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">{data.profile.information??'Check your account and explore available library resources.'}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={`${prefix}/catalog`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FFF200] px-4 text-sm font-bold text-[#0b5ea2] transition hover:bg-[#ffe600]">Explore catalog<ArrowRight size={16}/></Link>
            <Link to={`${prefix}/research`}><Button variant="ghost" className="bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-md ring-1 ring-white/40">Browse research</Button></Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:w-80">
          <Link to={`${prefix}/attendance`} className="group flex flex-col justify-between rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20 text-left">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/70 group-hover:text-white transition">Library Entry</p>
              <QrCode size={16} className="text-[#FFF200]" />
            </div>
            <div className="mt-3">
              <p className="text-lg font-bold leading-tight text-white">Generate<br/>QR Pass</p>
            </div>
          </Link>
          
          <Link to={`${prefix}/borrowing`} aria-label="Next loan deadline" className="flex flex-col justify-between rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFF200]">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/70">Next Deadline</p>
              <CalendarClock size={16} className="text-white/50" />
            </div>
            <div className="mt-3">
              {data.currentLoan ? (
                <>
                  <p className="text-sm font-bold leading-tight text-white line-clamp-1">{data.currentLoan.title}</p>
                  <p className="mt-1 text-xs text-[#FFF200]">Due {data.currentLoan.dueAt}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold leading-tight text-white">No active loans</p>
                  <p className="mt-1 text-xs text-white/60">Ready to borrow</p>
                </>
              )}
            </div>
          </Link>
        </div>
      </div>
    </section>
    
    <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Bento Item 1: Active Loans */}
      <Link to={`${prefix}/borrowing`} aria-label="Active loans" className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-zinc-200 shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea2] dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><BookOpen size={20} /></div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-display font-black text-zinc-900 dark:text-white leading-none">{data.summary.activeLoans}</p>
          <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Active loans</p>
        </div>
      </Link>
      
      {/* Bento Item 2: Reservations */}
      <Link to={`${prefix}/reservations`} aria-label="Reservations" className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-zinc-200 shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea2] dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"><BookMarked size={20} /></div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-display font-black text-zinc-900 dark:text-white leading-none">{data.summary.activeReservations}</p>
          <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Reservations</p>
        </div>
      </Link>
      
      {/* Bento Item 3: Updates */}
      <Link to={`${prefix}/notifications`} aria-label="Unread updates" className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-zinc-200 shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea2] dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"><Bell size={20} /></div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-display font-black text-zinc-900 dark:text-white leading-none">{data.summary.unreadNotifications}</p>
          <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Unread updates</p>
        </div>
      </Link>
      
      {/* Bento Item 4: Fines */}
      <Link to={`${prefix}/fines`} aria-label="Outstanding fines" className={`relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 ring-1 shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea2] ${data.summary.outstandingFines ? 'bg-red-50 ring-red-100 dark:bg-red-950/20 dark:ring-red-900/30' : 'bg-white ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800'}`}>
        <div className="flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${data.summary.outstandingFines ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}><PhilippinePeso size={20} /></div>
        </div>
        <div className="mt-4">
          <p className={`text-3xl font-display font-black leading-none ${data.summary.outstandingFines ? 'text-red-700 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}>{peso(data.summary.outstandingFines)}</p>
          <p className={`mt-1 text-sm font-semibold ${data.summary.outstandingFines ? 'text-red-600 dark:text-red-500' : 'text-zinc-500 dark:text-zinc-400'}`}>Outstanding fines</p>
        </div>
      </Link>
    </div>

    {data.announcement?<SectionCard className="mb-5 border-[#FFF200] bg-[#FFF200]/20 p-5"><div className="flex items-start gap-3"><Bell className="mt-0.5 text-[#0b5ea2]" size={20}/><div><p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/55">Library announcement · {data.announcement.priority}</p><h2 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">{data.announcement.title}</h2><p className="mt-2 text-sm leading-6 text-[#0b5ea2]/70">{data.announcement.message}</p></div></div></SectionCard>:null}

    <div className="mb-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
      <Link to={`${prefix}/borrowing`} aria-label="Return reminder" className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea2]"><SectionCard className="h-full p-5 transition hover:border-[#0b5ea2]/30"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/45">Current loan</p><h2 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Return reminder</h2></div>{data.currentLoan?<div className="flex flex-wrap justify-end gap-1.5"><StatusBadge status={data.currentLoan.status}/>{data.currentLoan.lostReportStatus==='Pending'?<StatusBadge status="Lost report pending"/>:null}{data.currentLoan.lostReportStatus==='Rejected'?<StatusBadge status="Lost report rejected"/>:null}</div>:null}</div>{data.currentLoan?<div className="flex gap-4 rounded-2xl bg-[#0b5ea2]/5 p-4"><BookCoverThumbnail title={data.currentLoan.title} coverImagePath={data.currentLoan.coverPath} className="h-28 w-20 rounded-xl border border-[#0b5ea2]/15 shadow-[0_4px_12px_rgba(11,94,162,0.12)]"/><div className="min-w-0 flex-1"><h3 className="font-display font-bold text-[#0b5ea2]">{data.currentLoan.title}</h3><p className="mt-0.5 text-sm text-[#0b5ea2]/65">{data.currentLoan.author}</p><div className="mt-4 grid gap-2 text-xs sm:grid-cols-2"><div className="flex items-center gap-2 text-[#0b5ea2]/65"><CalendarClock size={15}/>Due {data.currentLoan.dueAt}</div><div className="flex items-center gap-2 text-[#0b5ea2]/65"><MapPin size={15}/>{data.currentLoan.shelfLocation||data.currentLoan.barcode}</div></div></div></div>:<Empty text="You have no active borrowed books."/>}<p className="mt-3 text-xs text-[#0b5ea2]/45">{limitNote}</p></SectionCard></Link>
      {data.user.role==='Student' ? <Link to="/student/printing" aria-label="Latest print request" className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea2]"><SectionCard className="h-full p-5 transition hover:border-[#0b5ea2]/30"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/45">Print service</p><h2 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Latest request</h2></div><Printer size={21} className="text-[#0b5ea2]"/></div>{data.printRequest?<div className="rounded-2xl border border-[#0b5ea2]/15 bg-[#0b5ea2]/5 p-4"><div className="flex justify-between gap-3"><div><p className="line-clamp-1 font-semibold text-[#0b5ea2]">{data.printRequest.fileName}</p><p className="mt-1 text-xs text-[#0b5ea2]/65">{data.printRequest.copies} copies · {data.printRequest.printType}</p></div><StatusBadge status={data.printRequest.status}/></div><p className="mt-4 text-lg font-bold text-[#0b5ea2]">{peso(data.printRequest.cost)}</p></div>:<Empty text="No active print request."/>}</SectionCard></Link> : <SectionCard className="p-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/45">Print service</p><h2 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Latest request</h2></div><Printer size={21} className="text-[#0b5ea2]"/></div>{data.printRequest?<div className="rounded-2xl border border-[#0b5ea2]/15 bg-[#0b5ea2]/5 p-4"><div className="flex justify-between gap-3"><div><p className="line-clamp-1 font-semibold text-[#0b5ea2]">{data.printRequest.fileName}</p><p className="mt-1 text-xs text-[#0b5ea2]/65">{data.printRequest.copies} copies · {data.printRequest.printType}</p></div><StatusBadge status={data.printRequest.status}/></div><p className="mt-4 text-lg font-bold text-[#0b5ea2]">{peso(data.printRequest.cost)}</p></div>:<Empty text="No active print request."/>}</SectionCard>}
    </div>

    <div className="mb-5 grid gap-5 xl:grid-cols-3">
      <Link to={`${prefix}/reservations`} aria-label="Queue and pickup" className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea2]"><SectionCard className="h-full p-5 transition hover:border-[#0b5ea2]/30"><p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/45">Reservation</p><h2 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Queue and pickup</h2>{data.reservation?<div className="mt-4 flex gap-4 rounded-xl bg-[#0b5ea2]/5 p-4"><BookCoverThumbnail title={data.reservation.title} coverImagePath={data.reservation.coverPath} className="h-28 w-20 shrink-0 rounded-xl border border-[#0b5ea2]/15 shadow-[0_4px_12px_rgba(11,94,162,0.12)]"/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 font-semibold text-[#0b5ea2]">{data.reservation.title}</p><StatusBadge status={data.reservation.status}/></div><p className="mt-3 text-sm text-[#0b5ea2]/65">Queue position <strong>#{data.reservation.queuePosition}</strong></p>{data.reservation.pickupDeadline?<p className="mt-1 text-xs text-[#0b5ea2]/55">Pickup by {data.reservation.pickupDeadline}</p>:null}</div></div>:<Empty text="No active reservation."/>}</SectionCard></Link>
      <Link to={`${prefix}/notifications`} aria-label="Notifications" className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea2]"><SectionCard className="h-full p-5 transition hover:border-[#0b5ea2]/30"><p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/45">Latest update</p><h2 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Notifications</h2>{data.latestNotification?<div className="mt-4"><p className="font-semibold text-[#0b5ea2]">{data.latestNotification.title}</p><p className="mt-2 line-clamp-3 text-sm leading-6 text-[#0b5ea2]/65">{data.latestNotification.message}</p></div>:<Empty text="You are all caught up."/>}</SectionCard></Link>
      <SectionCard className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#0b5ea2]/45">Library information</p><h2 className="mt-1 font-display text-lg font-bold text-[#0b5ea2]">Hours and schedule</h2><div className="mt-4 flex items-start gap-3"><Clock3 size={19} className="mt-0.5 text-[#0b5ea2]"/><div><p className="text-sm font-semibold text-[#0b5ea2]">{dayNames[today]}: {todaySchedule?.isOpen?`${todaySchedule.opensAt} – ${todaySchedule.closesAt}`:'Closed'}</p>{data.profile.nextClosure?<p className="mt-2 text-xs text-[#0b5ea2]/65">Next closure: {data.profile.nextClosure.date} · {data.profile.nextClosure.reason}</p>:<p className="mt-2 text-xs text-[#0b5ea2]/65">No upcoming closure is posted.</p>}</div></div>{data.profile.mapPath?<a className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#0b5ea2]" href={data.profile.mapPath}><MapPin size={15}/>View library map</a>:null}</SectionCard>
    </div>

    {recommendationsPanel}

    {selectedTitleId!==null?<BookOverview titleId={selectedTitleId} role={data.user.role as AuthRole} activeBookCount={data.summary.activeBookCount} selectedBookCount={cart.length} alreadySelected={cartIds.has(selectedTitleId)} bookLimit={data.user.role==='Student'?2:null} cartPath={`${prefix}/cart`} onAddToCart={addCatalogBook} onClose={()=>setSelectedTitleId(null)}/>:null}
  </>
}

function manilaDay(){const short=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',weekday:'short'}).format(new Date());return ({Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7} as Record<string,number>)[short]??1}
function Empty({text}:{text:string}){return <p className="py-6 text-center text-sm text-[#0b5ea2]/45">{text}</p>}
