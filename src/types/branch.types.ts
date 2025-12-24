export interface Branch {
  id: number;
  restaurant_id: number;
  name: string;
  address: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BranchContextType {
  selectedBranchId: number | null;
  branches: Branch[];
  isLoading: boolean;
  setSelectedBranchId: (branchId: number | null) => void;
  fetchBranches: (restaurantId: number) => Promise<void>;
}
