import { useEffect } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AdminAttendancePage } from './AdminAttendancePage'

const api=vi.hoisted(()=>({terms:vi.fn(),summary:vi.fn(),logs:vi.fn(),analytics:vi.fn(),capacity:vi.fn(),updateCapacity:vi.fn(),downloadPdf:vi.fn()}))
vi.mock('./attendance-api',()=>({attendanceApi:api}))
vi.mock('./LibraryOperationsPanel',()=>({LibraryOperationsPanel:({onState}:{onState?:(state:object)=>void})=>{useEffect(()=>{onState?.({current:2,baseCapacity:40,capacity:40,available:38,percentage:5,overCapacity:false})},[onState]);return null},LibraryEventScheduler:()=>null}))
vi.mock('./AttendanceScannerModal',()=>({AttendanceScannerModal:({open}:{open:boolean})=>open?<div>Scanner opened</div>:null}))

beforeEach(()=>{api.terms.mockResolvedValue([]);api.summary.mockResolvedValue({total_visits:5,unique_visitors:4,currently_inside:2,average_visit:null,peak_hour:'9:00 AM',purpose_breakdown:[],role_breakdown:[],range:{from:'2026-09-23',to:'2026-09-23',label:'2026-09-23'}});api.logs.mockResolvedValue({rows:[],pagination:{page:1,limit:25,total:0,total_pages:0}});api.analytics.mockResolvedValue({range:{from:'2026-09-23',to:'2026-09-23',label:'2026-09-23'},hourly:[{hour:9,visits:5}],heatmap:[],daily:[]});api.capacity.mockResolvedValue({current:2,capacity:80,available:78,percentage:3,overCapacity:false});api.updateCapacity.mockResolvedValue({current:2,capacity:100,available:98,percentage:2,overCapacity:false})})
afterEach(cleanup)

it('shows the saved seat capacity on the door card without a header capacity button',async()=>{render(<AdminAttendancePage/>);expect(await screen.findByText((_,node)=>node?.textContent==='2/40')).toBeTruthy();expect(screen.queryByText('80')).toBeNull();expect(screen.queryByRole('button',{name:/Capacity/i})).toBeNull()})

it('opens the integrated camera scanner',async()=>{render(<AdminAttendancePage/>);await screen.findByText('Attendance logs');fireEvent.click(screen.getByRole('button',{name:'Open scanner'}));expect(screen.getByText('Scanner opened')).toBeTruthy()})
