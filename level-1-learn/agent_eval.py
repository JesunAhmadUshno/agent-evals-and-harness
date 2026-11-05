"""Agent evaluation, Level 1 Learn.

Score one deterministic toy agent on a fixed labelled task set:
success rate overall and per category, steps per task, cost per
task, and a trajectory log per task (ordered tool calls with
arguments and results).

The agent is a deterministic rule based toy. It is NOT an LLM, it
calls no API, and it learns nothing. It follows the tool plan in
each task, resolving placeholders that refer to earlier tool
results. This level is about the evaluator, not about agent
quality: no claim is made about any real agent.

Only the Python standard library is used.
"""

KNOWLEDGE_BASE = {
    "capital_canada": "Ottawa",
    "capital_france": "Paris",
    "boiling_point_water_c": 100,
    "unit_price_apple": 3,
    "score_alice": 10,
    "score_bob": 15,
    "side_length_square": 5,
    "inventory_count": 0,
}

TOOL_COSTS = {"add": 2, "multiply": 2, "divide": 2, "lookup": 1}

CATEGORIES = ("arithmetic", "lookup", "multi-step", "designed-failure")


class EvalError(Exception):
    """Named error for invalid task definitions."""


class ToolFailure(Exception):
    """A tool call failed in a named way. Carries a failure label."""

    def __init__(self, label, message):
        super().__init__(message)
        self.label = label


def tool_add(a, b):
    return a + b


def tool_multiply(a, b):
    return a * b


def tool_divide(a, b):
    if b == 0:
        raise ToolFailure("division_by_zero", "division by zero: %s / 0" % (a,))
    return a / b


def tool_lookup(key):
    if key not in KNOWLEDGE_BASE:
        raise ToolFailure(
            "missing_knowledge", "lookup miss: no entry for '" + str(key) + "'")
    return KNOWLEDGE_BASE[key]


TOOLS = {"add": tool_add, "multiply": tool_multiply,
         "divide": tool_divide, "lookup": tool_lookup}


def resolve_args(args, history):
    """Replace '@prev' with the last result and '@stepN' with result N."""
    resolved = []
    for arg in args:
        if isinstance(arg, str) and arg == "@prev":
            if not history:
                raise EvalError("@prev used before any tool result")
            resolved.append(history[-1])
        elif isinstance(arg, str) and arg.startswith("@step"):
            idx = int(arg[5:])
            if idx < 0 or idx >= len(history):
                raise EvalError("placeholder out of range: " + arg)
            resolved.append(history[idx])
        else:
            resolved.append(arg)
    return resolved


class ToyAgent:
    """Deterministic toy agent: executes a task plan step by step."""

    def run(self, task):
        trajectory = []
        history = []
        steps = 0
        cost = 0
        for i, step in enumerate(task["plan"]):
            tool = step["tool"]
            args = resolve_args(step["args"], history)
            steps += 1
            cost += TOOL_COSTS[tool]
            try:
                result = TOOLS[tool](*args)
            except ToolFailure as exc:
                trajectory.append({
                    "step": i + 1, "tool": tool, "args": args,
                    "result": None, "error": str(exc),
                    "failure_label": exc.label, "cost_units": TOOL_COSTS[tool]})
                return {"answer": None, "outcome": "failure",
                        "failure_label": exc.label, "steps": steps,
                        "cost_units": cost, "trajectory": trajectory}
            history.append(result)
            trajectory.append({
                "step": i + 1, "tool": tool, "args": args,
                "result": result, "error": None, "failure_label": None,
                "cost_units": TOOL_COSTS[tool]})
        answer = history[-1] if history else None
        return {"answer": answer, "outcome": "success", "failure_label": None,
                "steps": steps, "cost_units": cost, "trajectory": trajectory}


def validate_tasks(tasks):
    ids = set()
    if not isinstance(tasks, list) or not tasks:
        raise EvalError("task set must be a non-empty list")
    for task in tasks:
        tid = task.get("id")
        if not isinstance(tid, str) or not tid:
            raise EvalError("every task needs a non-empty string id")
        if tid in ids:
            raise EvalError("duplicate task id: '" + tid + "'")
        ids.add(tid)
        if task.get("category") not in CATEGORIES:
            raise EvalError("task '" + tid + "': unknown category '"
                            + str(task.get("category")) + "'")
        if task.get("expected_outcome") not in ("success", "failure"):
            raise EvalError("task '" + tid + "': expected_outcome must be success or failure")
        if task["expected_outcome"] == "success" and "expected_answer" not in task:
            raise EvalError("task '" + tid + "': success tasks need expected_answer")
        if task["expected_outcome"] == "failure" and not task.get("expected_failure_label"):
            raise EvalError("task '" + tid + "': failure tasks need expected_failure_label")
        plan = task.get("plan")
        if not isinstance(plan, list) or not plan:
            raise EvalError("task '" + tid + "': plan must be a non-empty list")
        for step in plan:
            if step.get("tool") not in TOOLS:
                raise EvalError("task '" + tid + "': unknown tool '" + str(step.get("tool")) + "'")
            if not isinstance(step.get("args"), list):
                raise EvalError("task '" + tid + "': step args must be a list")
    return ids


def _round(x):
    return round(float(x), 4)


def evaluate(tasks, agent=None):
    """Run the agent on every task and score the results."""
    validate_tasks(tasks)
    agent = agent or ToyAgent()
    records = []
    for task in tasks:
        run = agent.run(task)
        if task["expected_outcome"] == "success":
            matches = (run["outcome"] == "success"
                       and run["answer"] == task["expected_answer"])
        else:
            matches = (run["outcome"] == "failure"
                       and run["failure_label"] == task["expected_failure_label"])
        records.append({
            "task_id": task["id"], "category": task["category"],
            "expected_outcome": task["expected_outcome"],
            "expected_answer": task.get("expected_answer"),
            "expected_failure_label": task.get("expected_failure_label"),
            "agent_outcome": run["outcome"], "agent_answer": run["answer"],
            "failure_label": run["failure_label"],
            "matches_expected": matches,
            "steps": run["steps"], "cost_units": run["cost_units"],
            "trajectory": run["trajectory"]})
    total = len(records)
    succeeded = sum(1 for r in records if r["agent_outcome"] == "success")
    matched = sum(1 for r in records if r["matches_expected"])
    total_steps = sum(r["steps"] for r in records)
    total_cost = sum(r["cost_units"] for r in records)
    per_category = {}
    for cat in CATEGORIES:
        rs = [r for r in records if r["category"] == cat]
        if not rs:
            continue
        succ = sum(1 for r in rs if r["agent_outcome"] == "success")
        per_category[cat] = {
            "tasks": len(rs), "succeeded": succ,
            "success_rate": _round(succ / len(rs)),
            "total_steps": sum(r["steps"] for r in rs),
            "mean_steps": _round(sum(r["steps"] for r in rs) / len(rs)),
            "total_cost_units": sum(r["cost_units"] for r in rs),
            "mean_cost_units": _round(sum(r["cost_units"] for r in rs) / len(rs)),
            "matches_expected": sum(1 for r in rs if r["matches_expected"])}
    summary = {
        "total_tasks": total, "succeeded": succeeded,
        "failed": total - succeeded,
        "success_rate": _round(succeeded / total),
        "matches_expected": matched, "match_rate": _round(matched / total),
        "total_steps": total_steps, "mean_steps": _round(total_steps / total),
        "total_cost_units": total_cost, "mean_cost_units": _round(total_cost / total),
        "trajectory_entries": sum(len(r["trajectory"]) for r in records),
        "per_category": per_category}
    return {"tasks": records, "summary": summary}
