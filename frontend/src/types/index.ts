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
  pin: string;
  theme: Theme;
  vacation_mode: boolean;
  parent_id: string;
  created_at: string;
}

export interface FamilyCreate {
  name: string;
  pin: string;
  theme: Theme;
}

export interface Child {
  id: string;
  name: string;
  avatar: string;
  age?: number;
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
