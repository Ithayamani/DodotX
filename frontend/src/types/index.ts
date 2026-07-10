// API Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  family_id?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Family {
  id: string;
  name: string;
  code: string;
  code_generated_at?: string;
  // The backend never returns the PIN (or its hash) in API responses.
  theme: Theme;
  custom_theme?: CustomTheme;
  vacation_mode: boolean;
  vacation_start_date?: string; // YYYY-MM-DD
  vacation_end_date?: string;   // YYYY-MM-DD
  parent_id: string;
  parent_profile_picture?: string;
  created_at: string;
}

export interface FamilyCreate {
  name: string;
  pin: string;
  theme: Theme;
}

// PUT /family accepts a write-only `pin` the API never echoes back in `Family` responses.
export type FamilyUpdatePayload = Partial<Family> & { pin?: string };

export interface CustomTheme {
  name: string;
  primary: string;
  background: string;
  card: string;
  text: string;
  accent: string;
}

export interface Child {
  id: string;
  name: string;
  avatar: string;
  age?: number;
  profile_picture?: string;
  family_id: string;
  created_at: string;
}

export interface ChildCreate {
  name: string;
  avatar: string;
  age?: number;
}

export interface Task {
  id: string;
  title: string;
  icon: string;
  pts: number;
  cat: TaskCategory;
  modes: TaskMode;
  active: boolean;
  family_id: string;
  created_at: string;
}

export interface TaskCreate {
  title: string;
  icon?: string;
  pts?: number;
  cat?: TaskCategory;
  modes?: TaskMode;
  active?: boolean;
}

export interface TaskMode {
  daily: boolean;
  vacation: boolean;
}

export type TaskCategory = 'learning' | 'active' | 'creative' | 'chores' | 'health' | 'social';

export interface Reward {
  id: string;
  name: string;
  icon: string;
  pts: number;
  desc: string;
  family_id: string;
  created_at: string;
}

export interface RewardCreate {
  name: string;
  icon?: string;
  pts: number;
  desc?: string;
}

export interface Progress {
  child: Child;
  points: number;
  total_tasks: number;
  streak: number;
  perfect_days: number;
  level: LevelInfo;
  trophies: Trophy[];
  rewards: RewardStatus[];
  today_tasks_count: number;
  today_completions: string[];
}

export interface LevelInfo {
  name: string;
  min: number;
  max: number;
  progress: number;
}

export interface Trophy {
  id: string;
  name: string;
  icon: string;
  condition: string;
  earned: boolean;
  earned_at?: string;
}

export interface RewardStatus extends Reward {
  unlocked: boolean;
  progress: number;
}

export interface CheerMessage {
  id: string;
  child_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

export interface CheerCreate {
  child_id: string;
  sender_name?: string;
  message: string;
}

export type Theme = 'football' | 'space' | 'ocean' | 'nature' | 'gaming' | 'adventure';

export interface AITaskSuggestion {
  child_age: number;
  interests?: string[];
  goals?: string;
  current_tasks_count?: number;
}

export interface AITaskResponse {
  title: string;
  icon: string;
  pts: number;
  cat: TaskCategory;
  modes: TaskMode;
}

export interface JoinChildResponse {
  child_id: string;
  family_id: string;
  message: string;
  access_token: string;
  token_type: string;
  user: User;
}

export interface CalendarDay {
  completed: number;
  total: number;
  status: 'complete' | 'partial' | 'none';
  vacation: boolean;
}

export interface StreakMilestone {
  days: number;
  name: string;
  icon: string;
  reward: string;
  earned: boolean;
}

export interface CalendarData {
  child_id: string;
  child_name: string;
  days: Record<string, CalendarDay>;
  current_streak: number;
  longest_streak: number;
  complete_days: number;
  daily_task_total: number;
  vacation_task_total: number;
  vacation: { active: boolean; start?: string; end?: string };
  milestones: StreakMilestone[];
}

export interface VisitorChildSummary {
  name: string;
  avatar: string;
  profile_picture?: string;
  points: number;
  streak: number;
  perfect_days: number;
  level: LevelInfo;
  trophies_count: number;
  tasks_done_today: number;
}

export interface VisitorView {
  family_name: string;
  theme: Theme;
  vacation_mode: boolean;
  children: VisitorChildSummary[];
  total_tasks: number;
  total_rewards: number;
}

export interface AISuggestion {
  action: 'add' | 'modify' | 'remove';
  title: string;
  icon: string;
  pts: number;
  reason: string;
}

export interface AIDifficultyResult {
  analysis: string;
  suggestions: AISuggestion[];
}

export interface AIRewardSuggestion {
  title: string;
  icon: string;
  cost: number;
  reason: string;
}
