import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LibraryEventScheduler, LibraryOperationsPanel } from './LibraryOperationsPanel'
const api=vi.hoisted(()=>({state:vi.fn(),events:vi.fn(),saveEvent:vi.fn(),cancelEvent:vi.fn(),updatePolicy:vi.fn(),hours:vi.fn(),saveHours:vi.fn(),addClosure:vi.fn(),removeClosure:vi.fn(),updateCapacity:vi.fn()}))
vi.mock('./attendance-api',()=>({attendanceApi:api}))
beforeEach(()=>{vi.clearAllMocks();api.state.mockResolvedValue({state:'Open',current:1,serviceVisits:2,available:4,baseCapacity:80,capacity:5,cutoffAt:'2026-10-12T18:55:00+08:00',closesAt:'2026-10-12T19:00:00+08:00',allowWalkIns:true,allowBorrowing:true,allowPrinting:true,events:[{title:'Research seminar'}],policy:{version:1,preclosingMinutes:5}});api.events.mockResolvedValue([]);api.saveEvent.mockResolvedValue({});api.updateCapacity.mockResolvedValue({})})
afterEach(cleanup)
it('Staff sees operating state, seat/service counts and cutoff without management controls',async()=>{
 render(<LibraryOperationsPanel/>);await screen.findByText(/1 seats occupied · 2 printing visits/)
 expect(screen.getByText(/6:55 PM/)).toBeTruthy();expect(screen.getByText(/Research seminar/)).toBeTruthy();expect(screen.getByText(/Visitors can use 5 seats/)).toBeTruthy();expect(screen.queryByLabelText('Event title')).toBeNull();expect(screen.queryByRole('button',{name:'Attendance cutoff settings'})).toBeNull();expect(screen.queryByRole('button',{name:'Library hours'})).toBeNull();expect(screen.queryByRole('button',{name:'Seat capacity'})).toBeNull()
})
it('Librarian submits explicit event capacity, Manila dates and service decisions',async()=>{
 render(<LibraryEventScheduler/>);fireEvent.click(screen.getByRole('button',{name:/Schedule class, meeting or seminar/}));await screen.findByLabelText('Event title')
 for(const [label,value] of [['Event title','Seminar'],['Affected space','Reading area'],['Remaining library seats','12'],['Starts at (Manila)','2026-10-12T09:00'],['Ends at (Manila)','2026-10-12T10:00']])fireEvent.change(screen.getByLabelText(label),{target:{value}})
 expect((screen.getByRole('checkbox',{name:'Allow walk-ins'}) as HTMLInputElement).checked).toBe(true)
 expect(screen.getByText(/Visitors can use 12 seats/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Schedule event'}));await waitFor(()=>expect(api.saveEvent).toHaveBeenCalled())
 expect(api.saveEvent.mock.calls[0][1]).toMatchObject({capacity:12,startsAt:'2026-10-12T09:00:00+08:00',allowWalkIns:true,allowBorrowing:true,allowPrinting:true})
})
it('Librarian saves weekly hours and confirms before removing a closed date',async()=>{
 const hours={weekly:[{dayOfWeek:1,isOpen:true,opensAt:'07:00',closesAt:'19:00'}],closures:[{date:'2026-12-25',reason:'Christmas'}]}
 api.hours.mockResolvedValue(hours);api.saveHours.mockResolvedValue(hours);api.removeClosure.mockResolvedValue({...hours,closures:[]})
 render(<LibraryOperationsPanel manage/>);fireEvent.click(await screen.findByRole('button',{name:'Library hours'}));expect(await screen.findByLabelText('Monday opens')).toBeTruthy()
 fireEvent.change(screen.getByLabelText('Monday closes'),{target:{value:'17:00'}})
 fireEvent.click(screen.getByRole('button',{name:'Save library hours'}))
 await waitFor(()=>expect(api.saveHours).toHaveBeenCalled())
 expect(api.saveHours.mock.calls[0][0].find((day:{dayOfWeek:number})=>day.dayOfWeek===1).closesAt).toBe('17:00')
 expect(await screen.findByText('Library hours saved.')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Remove'}));fireEvent.click(screen.getByRole('button',{name:'Confirm removal'}))
 await waitFor(()=>expect(api.removeClosure).toHaveBeenCalledWith('2026-12-25'))
})
it('Librarian saves seat capacity from the operations card',async()=>{
 const changed=vi.fn()
 render(<LibraryOperationsPanel manage onChanged={changed}/>)
 fireEvent.click(await screen.findByRole('button',{name:'Seat capacity'}))
 fireEvent.change(screen.getByLabelText('Maximum occupants'),{target:{value:'100'}})
 fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Expanded study area'}})
 fireEvent.click(screen.getByRole('button',{name:'Save capacity'}))
 await waitFor(()=>expect(api.updateCapacity).toHaveBeenCalledWith(100,'Expanded study area'))
 expect(changed).toHaveBeenCalled()
})
