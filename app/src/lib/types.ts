export type UserRole = 'admin' | 'firm_user'
export type ReviewStatus = 'pending' | 'published' | 'auto_published' | 'rejected'
export type Sentiment = 'positive' | 'negative' | 'neutral'
export type ResponseLength = 'short' | 'medium' | 'long'
export type Sector = string

export interface InfoCard {
  address?: string
  hours?: string
  highlights?: string
  faq?: string
  forbidden_info?: string
}

export interface Firm {
  id: string
  name: string
  sector: Sector
  gmb_location_id: string | null
  gmb_access_token: string | null
  gmb_refresh_token: string | null
  system_prompt: string | null
  approval_mode: boolean
  response_length: ResponseLength
  is_active: boolean
  info_card: InfoCard | null
  created_at: string
}

export interface Profile {
  id: string
  firm_id: string | null
  role: UserRole
  full_name: string | null
  created_at: string
}

export interface Review {
  id: string
  firm_id: string
  gmb_review_id: string
  reviewer_name: string
  reviewer_id: string | null
  rating: number
  review_text: string | null
  review_language: string | null
  review_date: string
  ai_response: string | null
  edited_response: string | null
  final_response: string | null
  status: ReviewStatus
  template_id: string | null
  tokens_input: number | null
  tokens_output: number | null
  cost_usd: number | null
  published_at: string | null
  created_at: string
  firms?: { name: string }
}

export interface ReviewAnalysis {
  id: string
  review_id: string
  firm_id: string
  sentiment: Sentiment
  topics: string[]
  importance_score: number
  keywords: string[]
  has_critical_keyword: boolean
  critical_keywords: string[]
  created_at: string
}

export interface Template {
  id: string
  firm_id: string | null
  sector: Sector | null
  name: string
  rating_range: '1-2' | '3-4' | '5'
  topic: string
  opening: string
  body: string
  closing: string
  is_system: boolean
  created_at: string
}

export interface UsageLog {
  id: string
  firm_id: string
  review_id: string | null
  model: string
  tokens_input: number
  tokens_output: number
  total_tokens: number
  cost_usd: number
  created_at: string
}

export interface BlacklistWord {
  id: string
  firm_id: string
  word: string
  created_at: string
}

export interface Notification {
  id: string
  firm_id: string
  review_id: string | null
  type: string
  message: string
  is_read: boolean
  created_at: string
}
