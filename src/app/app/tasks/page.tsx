import { PageHeader } from "@/components/shared";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { Plus, CheckCircle2, Circle, Clock } from "lucide-react";

// TODO: Fetch actual tasks from database
const MOCK_TASKS = [
  {
    id: "1",
    title: "Complete quarterly review",
    description: "Review and analyze Q4 financial performance",
    status: "pending" as const,
    dueDate: "2024-01-15",
  },
  {
    id: "2",
    title: "Update team KPIs",
    description: "Set new KPIs for the upcoming quarter",
    status: "in_progress" as const,
    dueDate: "2024-01-20",
  },
  {
    id: "3",
    title: "Client onboarding process",
    description: "Document the new client onboarding workflow",
    status: "completed" as const,
    dueDate: "2024-01-10",
  },
  {
    id: "4",
    title: "Marketing strategy review",
    description: "Evaluate current marketing channels and ROI",
    status: "pending" as const,
    dueDate: "2024-01-25",
  },
];

const statusConfig = {
  pending: { label: "Pending", icon: Circle, variant: "outline" as const },
  in_progress: { label: "In Progress", icon: Clock, variant: "secondary" as const },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" as const },
};

export default function TasksPage() {
  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Manage your action items and track progress"
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </PageHeader>

      {/* Task Filters */}
      <div className="mb-6 flex gap-2">
        <Button variant="secondary" size="sm">
          All
        </Button>
        <Button variant="ghost" size="sm">
          Pending
        </Button>
        <Button variant="ghost" size="sm">
          In Progress
        </Button>
        <Button variant="ghost" size="sm">
          Completed
        </Button>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {MOCK_TASKS.map((task) => {
          const status = statusConfig[task.status];
          const StatusIcon = status.icon;

          return (
            <Card key={task.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center">
                  <StatusIcon
                    className={`h-6 w-6 ${
                      task.status === "completed"
                        ? "text-green-500"
                        : task.status === "in_progress"
                          ? "text-blue-500"
                          : "text-muted-foreground"
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-medium ${
                        task.status === "completed" ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.title}
                    </h3>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                </div>

                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Due</div>
                  <div className="text-sm font-medium">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                </div>

                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State Placeholder */}
      {MOCK_TASKS.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Circle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No tasks yet</h3>
            <p className="mb-4 text-muted-foreground">Create your first task to get started</p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
