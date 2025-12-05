// Import necessary variables and functions
import { task, getTimeStatus, calculateTimeSpent, timeLogs } from "./path/to/imports"

// Admin Dashboard Component
const AdminDashboard = () => {
  return (
    <div>
      {/* Time Allocation Progress Bar */}
      {task.estimated_hours && (
        <div className="mt-3 w-full max-w-md">
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                getTimeStatus(calculateTimeSpent(timeLogs, task.id), task.estimated_hours) === "exceeded"
                  ? "bg-red-500"
                  : getTimeStatus(calculateTimeSpent(timeLogs, task.id), task.estimated_hours) === "warning"
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{
                width: Math.min(100, (calculateTimeSpent(timeLogs, task.id) / (task.estimated_hours * 60)) * 100) + "%",
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
