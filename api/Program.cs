using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://localhost:5000");

var tasksFilePath = Path.Combine(builder.Environment.ContentRootPath, "tasks.json");
var app = builder.Build();
var tasks = LoadTasks(tasksFilePath);

app.MapGet("/api/tasks", () => Results.Ok(tasks.OrderBy(task => task.Id)));

app.MapPost("/api/tasks", (CreateTaskRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
        return Results.BadRequest("A task title is required.");

    var task = new PlannerTask(
        tasks.Count == 0 ? 1 : tasks.Max(item => item.Id) + 1,
        request.Title.Trim(),
        false,
        string.IsNullOrWhiteSpace(request.Time) ? "Anytime" : request.Time.Trim(),
        false);
    tasks.Add(task);
    SaveTasks(tasksFilePath, tasks);
    return Results.Created($"/api/tasks/{task.Id}", task);
});

app.MapPatch("/api/tasks/{id:int}", (int id, UpdateTaskRequest request) =>
{
    var index = tasks.FindIndex(task => task.Id == id);
    if (index < 0) return Results.NotFound();

    var current = tasks[index];
    var updated = current with
    {
        IsDone = request.IsDone ?? current.IsDone,
        ReminderEnabled = request.ReminderEnabled ?? current.ReminderEnabled,
    };
    tasks[index] = updated;
    SaveTasks(tasksFilePath, tasks);
    return Results.Ok(updated);
});

app.MapDelete("/api/tasks/{id:int}", (int id) =>
{
    var removed = tasks.RemoveAll(task => task.Id == id);
    if (removed > 0) SaveTasks(tasksFilePath, tasks);
    return removed == 0 ? Results.NotFound() : Results.NoContent();
});

app.Run();

static List<PlannerTask> LoadTasks(string filePath)
{
    if (!File.Exists(filePath)) return [];
    var json = File.ReadAllText(filePath);
    return JsonSerializer.Deserialize<List<PlannerTask>>(json) ?? [];
}

static void SaveTasks(string filePath, List<PlannerTask> tasks)
{
    var json = JsonSerializer.Serialize(tasks, new JsonSerializerOptions { WriteIndented = true });
    File.WriteAllText(filePath, json);
}

public sealed record PlannerTask(int Id, string Title, bool IsDone, string Time, bool ReminderEnabled);
public sealed record CreateTaskRequest(string Title, string? Time);
public sealed record UpdateTaskRequest(bool? IsDone, bool? ReminderEnabled);
