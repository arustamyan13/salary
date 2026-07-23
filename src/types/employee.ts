export type Employee = {
  id: string
  user_id: string
  name: string
  salary: number
  pay_day: string
  official: boolean
  comment: string | null
  created_at: string
  updated_at: string
}

export type EmployeeInsert = {
  name: string
  salary: number
  pay_day: string
  official: boolean
  comment?: string | null
}

export type EmployeeUpdate = Partial<EmployeeInsert>

export type SortOption = 'pay_day' | 'name' | 'salary'
export type FilterOption = 'all' | 'official' | 'unofficial'

export type CardUrgency = 'ok' | 'soon' | 'urgent'

export type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
  updated_at: string
}
