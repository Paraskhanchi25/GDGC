export interface LinkedAccount {
  id: string;
  bank_name: string;
  bank_code: string;
  account_name: string;
  account_type: string;
  masked_number: string;
  last_four: string;
  current_balance_minor: number;
  opening_balance_minor?: number;
  currency: string;
  transaction_count?: number;
}

export interface Transaction {
  id: string;
  account_id?: string | null;
  merchant: string;
  description: string;
  amount_minor: number;
  currency: string;
  transaction_type: "expense" | "income";
  category_name: string;
  payment_method: string;
  source_name: string;
  transaction_date: string;
  notes?: string | null;
}

export interface CategoryBreakdownItem {
  category: string;
  amount_minor: number;
  amount_formatted: string;
  percentage: number;
  count: number;
}

export interface DailySpendPoint {
  date: string;
  label: string;
  expense_minor: number;
  income_minor: number;
}

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  income_minor: number;
  expense_minor: number;
  net_minor: number;
}

export interface RecurringPayment {
  id: string;
  merchant: string;
  expected_amount_minor: number;
  monthly_equivalent_minor: number;
  frequency: string;
  next_payment_date: string;
  occurrences: number;
  confidence: number;
  status: "detected" | "confirmed" | "dismissed";
}

export interface ForecastData {
  as_of_date: string;
  month_end_date: string;
  days_elapsed: number;
  days_remaining: number;
  monthly_allowance_minor: number;
  current_spending_minor: number;
  remaining_allowance_minor: number;
  available_balance_minor: number;
  average_daily_spending_minor: number;
  expected_remaining_spending_minor: number;
  upcoming_recurring_minor: number;
  upcoming_recurring_items: Array<{
    merchant: string;
    amount_minor: number;
    due_date: string;
  }>;
  expected_incoming_allowance_minor: number;
  projected_month_end_balance_minor: number;
  potential_shortfall_minor: number;
  data_sufficiency: "sufficient" | "limited" | "insufficient";
  methodology_note: string;
  summary: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount_minor: number;
  current_amount_minor: number;
  remaining_amount_minor: number;
  target_date: string;
  status: "active" | "completed" | "paused";
  progress_percentage: number;
  required_weekly_minor: number;
  required_monthly_minor: number;
  days_remaining: number;
}

export interface FinancialInsight {
  id: string;
  type: string;
  title: string;
  detail: string;
}

export interface ProfileData {
  is_demo: boolean;
  display_name: string | null;
  email: string;
  location?: string;
  occupation?: string;
  country: string;
  currency: string;
  monthly_allowance_minor: number;
  allowance_frequency: string;
  expected_next_allowance_date: string | null;
  current_savings_minor: number;
  available_balance_minor?: number;
  onboarding_completed: boolean;
}

export interface OverviewData {
  profile: ProfileData;
  totals: {
    total_income_minor: number;
    total_expense_minor: number;
    net_cash_flow_minor: number;
    transaction_count: number;
  };
  available_balance_minor: number;
  monthly_allowance_minor: number;
  remaining_allowance_minor: number;
  categories: CategoryBreakdownItem[];
  daily_spending: DailySpendPoint[];
  monthly_trends: MonthlyTrendPoint[];
  period_comparison: {
    current_month_expense_minor: number;
    previous_month_expense_minor: number;
    change_percentage: number | null;
    current_month_label: string;
    previous_month_label: string;
  };
  unusual_spending: Array<{
    transaction_id: string;
    merchant: string;
    category: string;
    amount_minor: number;
    amount_formatted: string;
    date: string;
    reason: string;
  }>;
  recurring_payments: RecurringPayment[];
  forecast: ForecastData;
  goals: SavingsGoal[];
  insights: FinancialInsight[];
  recent_transactions: Transaction[];
  accounts?: LinkedAccount[];
  selected_account_id?: string;
  unread_notifications: number;
}

export interface SimulatorResult {
  purchase_name: string;
  purchase_amount_minor: number;
  payment_months: number;
  immediate_outflow_minor: number;
  purchase_date: string | null;
  available_funds_minor: number;
  expected_incoming_income_minor: number;
  upcoming_commitments_minor: number;
  savings_commitments_minor: number;
  projected_balance_after_purchase_minor: number;
  safety_buffer_minor: number;
  outcome: "affordable" | "affordable_with_caution" | "not_recommended";
  explanation: string;
  goal_impacts: Array<{
    goal_name: string;
    remaining_minor: number;
    impact: string;
  }>;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  in_app_enabled: boolean;
  weekly_summary_enabled: boolean;
  payment_reminders_enabled: boolean;
  spending_alerts_enabled: boolean;
}
