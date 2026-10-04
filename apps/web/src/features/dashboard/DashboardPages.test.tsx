import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminDashboardPage } from './AdminDashboardPage'
import { UserDashboardPage } from './UserDashboardPage'
import { clearBookCartForTests } from '../catalog/book-cart-store'

const api=vi.hoisted(()=>({admin:vi.fn(),user:vi.fn(),downloadAdminSummary:vi.fn(),fetchBookOverview:vi.fn()}))
vi.mock('./dashboard-api',()=>({dashboardApi:api}))
vi.mock('../catalog/book-catalog-api',()=>({fetchBookOverview:api.fetchBookOverview}))

const profile={name:'STI Ormoc Smart Library',seatCapacity:80,information:'Library information',mapPath:null,schedule:[{day:1,isOpen:true,opensAt:'07:00 AM',closesAt:'05:00 PM'}],nextClosure:null}
const admin={generatedAt:'2026-09-04T08:00:00.000Z',staff:{name:'Judelyn Admin',schoolId:'ADMIN-1'},profile,kpis:{totalBooks:2486,activeBorrowed:184,availableBooks:2241,overdueBooks:24,activeUsers:1348,dailyAttendance:216,activeReservations:31,outstandingFines:2840,returnedToday:12},weeklyAttendance:[{label:'Mon',value:20},{label:'Tue',value:30}],purposeBreakdown:[{label:'Research',value:10}],popularCategories:[{label:'Programming',value:84}],recentCirculation:[{id:1,userName:'John',schoolId:'0200',title:'Clean Code',barcode:'BC-1',status:'Borrowed',eventAt:'2026-09-04'}],recentActivity:[{id:1,type:'checkout',title:'Checkout confirmed',message:'Book checked out.',createdAt:'2026-09-04'}],occupancy:{current:42,capacity:80,peakHour:'10:00 AM',averageMinutes:84}}
const user={generatedAt:'2026-09-04T08:00:00.000Z',user:{name:'John Student',schoolId:'0200',program:'BSIT',role:'Student'},profile,summary:{activeLoans:1,activeBookCount:1,borrowingLimit:2,activeReservations:1,unreadNotifications:2,outstandingFines:0,clearanceStatus:'Cleared',clearanceReason:'No library obligations'},occupancy:{current:42,capacity:80},currentLoan:{id:1,title:'Clean Code',author:'Robert C. Martin',barcode:'BC-1',shelfLocation:'A-1',status:'Borrowed',dueAt:'2026-09-05 08:59 AM',coverPath:'/api/assets/covers/clean-code.png'},reservation:{id:7,title:'Database System Concepts',coverPath:'/api/assets/covers/database-systems.png',queuePosition:1,status:'ready_for_pickup',pickupDeadline:'2026-09-06 05:00 PM'},printRequest:null,latestNotification:null,announcement:{id:1,title:'Library schedule',message:'Open on Saturday.',priority:'Normal',publishedAt:'2026-09-04'},recentHistory:[{id:8,title:'Harry Potter',coverPath:'/api/assets/covers/harry-potter.png',status:'Returned',eventAt:'2026-08-25 10:02 PM'}],recommendations:[{id:2,title:'Computer Networks',author:'Andrew Tanenbaum',availableCopies:2,coverPath:'/api/assets/covers/networks.png'}]}

describe('live dashboards',()=>{
  it('loads the admin operational overview from the dashboard API',async()=>{api.admin.mockResolvedValue(admin);render(<MemoryRouter><AdminDashboardPage/></MemoryRouter>);expect(await screen.findByText('Good day, Judelyn')).toBeTruthy();expect(screen.getByText('2,486')).toBeTruthy();expect(screen.getByText('Programming')).toBeTruthy();expect(api.admin).toHaveBeenCalledTimes(1)})
  it('places recommendations after the summary cards and adds a recommended book to the shared borrow cart',async()=>{
    api.user.mockResolvedValue(user)
    api.fetchBookOverview.mockResolvedValue({titleId:2,title:'Computer Networks',author:'Andrew Tanenbaum',isbn:'9780132126953',publisher:'Pearson',publicationYear:2010,categoryId:1,categoryName:'Networking',callNumber:'TK5105',coverImagePath:'/api/assets/covers/networks.png',shelfLocation:'Shelf N-1',currentAvailabilityStatus:'Available',currentConditionStatus:'Good',totalCopiesCount:2,availableCopiesCount:2,reservableMaterialId:4,previewBarcode:'STIORMOC2026000002'})
    render(<MemoryRouter><UserDashboardPage/></MemoryRouter>)
    expect(await screen.findByText('Good day, John!')).toBeTruthy()
    expect(screen.getAllByText('Clean Code').length).toBeGreaterThan(0)
    expect(screen.getByAltText('Clean Code cover')).toBeTruthy()
    expect(screen.getByAltText('Database System Concepts cover')).toBeTruthy()
    expect(screen.getByText('Library schedule')).toBeTruthy()
    expect(screen.getByAltText('Computer Networks cover')).toBeTruthy()
    const recommendations=screen.getByText('Available to borrow')
    const loan=screen.getByText('Return reminder')
    expect(loan.compareDocumentPosition(recommendations)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button',{name:'View details'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:'Borrow'}))
    await waitFor(()=>expect(api.fetchBookOverview).toHaveBeenCalledWith(2))
    expect(await screen.findByText('Computer Networks was added to your borrow cart.')).toBeTruthy()
    expect(screen.getByRole('button',{name:'In cart'})).toBeTruthy()
  })
  it('shows a specific clearance alert for active loans with a clearance CTA',async()=>{
    api.user.mockResolvedValue({
      ...user,
      summary:{...user.summary,activeLoans:2,activeBookCount:2,outstandingFines:0,clearanceStatus:'Not Cleared',clearanceReason:'2 unreturned books'},
      currentLoan:{...user.currentLoan!,title:'Clean Code'},
    })
    render(<MemoryRouter><UserDashboardPage/></MemoryRouter>)
    expect(await screen.findByText('Account not cleared')).toBeTruthy()
    expect(screen.getByText(/2 active loans that must be returned/i)).toBeTruthy()
    expect(screen.getByText('Clearance: 2 active loans')).toBeTruthy()
    expect(screen.queryByText(/resolve your account obligations or unpaid fines/i)).toBeNull()
    const cta=screen.getByRole('link',{name:'View clearance'})
    expect(cta.getAttribute('href')).toBe('/student/clearance')
  })
  it('routes fines-only clearance alerts to the fines page',async()=>{
    api.user.mockResolvedValue({
      ...user,
      summary:{...user.summary,activeLoans:0,activeBookCount:0,outstandingFines:75,clearanceStatus:'Not Cleared',clearanceReason:'PHP 75.00 unpaid obligations'},
      currentLoan:null,
    })
    render(<MemoryRouter><UserDashboardPage/></MemoryRouter>)
    expect(await screen.findByText(/unpaid obligations that must be settled/i)).toBeTruthy()
    expect(screen.getByRole('link',{name:'View fines'}).getAttribute('href')).toBe('/student/fines')
  })
})

afterEach(()=>{cleanup();clearBookCartForTests();vi.clearAllMocks()})
