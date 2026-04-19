export interface FloorEmployee {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'busy' | 'offline';
  department?: string;
  roleName?: string;
  tasksCompleted?: number;
  efficiency?: number;
}


export const floorEmployeesCache: { data: FloorEmployee[]; ts: number } = { data: [], ts: 0 };

// 派发员工选中事件（供外部监听跳转）
export function dispatchEmployeeSelect(employeeId: string) {
  window.dispatchEvent(new CustomEvent('floor-employee-select', { detail: { employeeId } }));
}
