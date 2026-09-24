var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://localhost:5000");

var app = builder.Build();
var tasks = new List<PlannerTask>
{
    new(1, "Sketch the shape of the week", false, "09:00", false),
    new(2, "Take a proper lunch break", true, "12:30", false),
    new(3, "Send the follow-up note", false, "15:00", false),
    new(4, "Put tomorrow somewhere quiet", false, "17:30", false),
};

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
    return Results.Ok(updated);
});

app.MapDelete("/api/tasks/{id:int}", (int id) =>
{
    var removed = tasks.RemoveAll(task => task.Id == id);
    return removed == 0 ? Results.NotFound() : Results.NoContent();
});

app.Run();

public sealed record PlannerTask(int Id, string Title, bool IsDone, string Time, bool ReminderEnabled);
public sealed record CreateTaskRequest(string Title, string? Time);
public sealed record UpdateTaskRequest(bool? IsDone, bool? ReminderEnabled);
