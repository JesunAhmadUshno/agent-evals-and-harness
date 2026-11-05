"""Agent evaluation suite, Level 2 Build.

Extends the Level 1 Learn idea into a configurable toy agent with
three named components that can be ablated:

- planner: multi-step decomposition. When off, the agent executes
  only the first step of a multi-step plan and answers with that
  intermediate result.
- memory: a lookup cache plus a recall store. When off, repeated
  lookups cost full price again and any step that recalls an
  earlier lookup result fails with memory_unavailable.
- verifier: an answer self-check. The toy agent has a seeded slip
  rate per task difficulty: a slip corrupts its own answer. When
  the verifier is on, it catches a slip with seeded probability
  0.85 and restores the uncorrupted answer, at extra cost.

These are TOY agent component ablations, NOT real model
ablations. The agent is not an LLM, calls no API, and learns
nothing. No claim is made about real agents or real models.

Stochasticity is simulated and seeded: every attempt uses
random.Random with a string seed built from master seed, variant
name, task id, and attempt index, so results are deterministic
given the seed list and identical on re-runs.

Scoring separation: the agent never reads expected_answer or
expected_failure_label. Those scoring keys live only in the task
files and are read only by the scorer functions in this module.

Only the Python standard library is used.
"""
import random

KNOWLEDGE_BASE = {
    "capital_canada": "Ottawa",
    "capital_france": "Paris",
    "capital_japan": "Tokyo",
    "capital_brazil": "Brasilia",
    "capital_egypt": "Cairo",
    "boiling_point_water_c": 100,
    "freezing_point_water_c": 0,
    "unit_price_apple": 3,
    "unit_price_pear": 4,
    "unit_price_melon": 7,
    "score_alice": 10,
    "score_bob": 15,
    "score_cara": 8,
    "score_dan": 12,
    "side_length_square": 5,
    "side_length_plot": 9,
    "inventory_count": 0,
    "crate_count": 6,
    "shelf_count": 14,
    "team_size": 11,
    "ticket_price": 20,
    "discount_amount": 5,
    "distance_km": 150,
    "speed_kmh": 50,
    "hours_in_day": 24,
    "minutes_in_hour": 60,
}

TOOL_COSTS = {"add": 2, "multiply": 2, "divide": 2, "lookup": 1}
VERIFIER_COST = 2
VERIFIER_CATCH_PROB = 0.85
SLIP_PER_DIFFICULTY = 0.08

CATEGORIES = ("arithmetic", "lookup", "multi-step", "memory",
              "designed-failure")

VARIANTS = {
    "full": {"planner": True, "memory": True, "verifier": True},
    "no_planner": {"planner": False, "memory": True, "verifier": True},
    "no_memory": {"planner": True, "memory": False, "verifier": True},
    "no_verifier": {"planner": True, "memory": True, "verifier": False},
    "minimal": {"planner": False, "memory": False, "verifier": False},
}

MASTER_SEEDS = [11, 22, 33, 44, 55]
ATTEMPTS_PER_TASK = 5
PASS_KS = (1, 3, 5)


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
        raise ToolFailure("division_by_zero", "division by zero")
    return a / b


def tool_lookup(key):
    if key not in KNOWLEDGE_BASE:
        raise ToolFailure("missing_knowledge",
                          "lookup miss: no entry for '" + str(key) + "'")
    return KNOWLEDGE_BASE[key]


TOOLS = {"add": tool_add, "multiply": tool_multiply,
         "divide": tool_divide, "lookup": tool_lookup}


def slip_rate(task):
    """Seeded slip probability for a task: 0.08 times difficulty."""
    return SLIP_PER_DIFFICULTY * int(task.get("difficulty", 1))


def _corrupt(answer):
    if isinstance(answer, bool):
        return not answer
    if isinstance(answer, (int, float)):
        return answer + 1
    if isinstance(answer, str):
        return answer + " (uncertain)"
    return answer


class ConfigurableToyAgent:
    """Toy agent with planner, memory, and verifier switches."""

    def __init__(self, config):
        self.planner = bool(config["planner"])
        self.memory_on = bool(config["memory"])
        self.verifier = bool(config["verifier"])

    def run(self, task, rng):
        trajectory = []
        history = []
        cache = {}
        store = {}
        steps = 0
        cost = 0
        plan = task["plan"]
        if not self.planner and len(plan) > 1:
            plan = plan[:1]
        for i, step in enumerate(plan):
            tool = step["tool"]
            args = []
            failed = None
            for arg in step["args"]:
                if isinstance(arg, str) and arg == "@prev":
                    if not history:
                        failed = ToolFailure("no_previous_result",
                                             "@prev before any result")
                        break
                    args.append(history[-1])
                elif isinstance(arg, str) and arg.startswith("@step"):
                    idx = int(arg[5:])
                    if idx < 0 or idx >= len(history):
                        failed = ToolFailure("no_previous_result",
                                             "placeholder out of range")
                        break
                    args.append(history[idx])
                elif isinstance(arg, str) and arg.startswith("@recall:"):
                    key = arg[len("@recall:"):]
                    if not self.memory_on or key not in store:
                        failed = ToolFailure(
                            "memory_unavailable",
                            "recall unavailable for '" + key + "'")
                        break
                    args.append(store[key])
                else:
                    args.append(arg)
            steps += 1
            if failed is not None:
                cost += TOOL_COSTS[tool]
                trajectory.append({
                    "step": i + 1, "tool": tool, "args": args,
                    "result": None, "error": str(failed),
                    "failure_label": failed.label,
                    "cost_units": TOOL_COSTS[tool]})
                return {"answer": None, "outcome": "failure",
                        "failure_label": failed.label,
                        "steps": steps, "cost_units": cost,
                        "trajectory": trajectory, "slip": False,
                        "slip_caught": False}
            if tool == "lookup" and self.memory_on and args[0] in cache:
                result = cache[args[0]]
                step_cost = 0
            else:
                step_cost = TOOL_COSTS[tool]
                try:
                    result = TOOLS[tool](*args)
                except ToolFailure as exc:
                    cost += step_cost
                    trajectory.append({
                        "step": i + 1, "tool": tool, "args": args,
                        "result": None, "error": str(exc),
                        "failure_label": exc.label,
                        "cost_units": step_cost})
                    return {"answer": None, "outcome": "failure",
                            "failure_label": exc.label, "steps": steps,
                            "cost_units": cost, "trajectory": trajectory,
                            "slip": False, "slip_caught": False}
                if tool == "lookup":
                    if self.memory_on:
                        cache[args[0]] = result
                    store[args[0]] = result
            cost += step_cost
            history.append(result)
            trajectory.append({
                "step": i + 1, "tool": tool, "args": args,
                "result": result, "error": None, "failure_label": None,
                "cost_units": step_cost})
        answer = history[-1] if history else None
        slip = False
        slip_caught = False
        if answer is not None and rng.random() < slip_rate(task):
            slip = True
            original = answer
            answer = _corrupt(answer)
            if self.verifier and rng.random() < VERIFIER_CATCH_PROB:
                slip_caught = True
                answer = original
                steps += 1
                cost += VERIFIER_COST
                trajectory.append({
                    "step": steps, "tool": "verifier", "args": [],
                    "result": original, "error": None,
                    "failure_label": None, "cost_units": VERIFIER_COST})
        return {"answer": answer, "outcome": "success",
                "failure_label": None, "steps": steps,
                "cost_units": cost, "trajectory": trajectory,
                "slip": slip, "slip_caught": slip_caught}


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
            raise EvalError("task '" + tid + "': unknown category")
        if task.get("expected_outcome") not in ("success", "failure"):
            raise EvalError("task '" + tid + "': bad expected_outcome")
        if task["expected_outcome"] == "success" and "expected_answer" not in task:
            raise EvalError("task '" + tid + "': success needs expected_answer")
        if task["expected_outcome"] == "failure" and not task.get("expected_failure_label"):
            raise EvalError("task '" + tid + "': failure needs expected_failure_label")
        if int(task.get("difficulty", 0)) not in (1, 2, 3):
            raise EvalError("task '" + tid + "': difficulty must be 1, 2, or 3")
        plan = task.get("plan")
        if not isinstance(plan, list) or not plan:
            raise EvalError("task '" + tid + "': plan must be a non-empty list")
        for step in plan:
            if step.get("tool") not in TOOLS:
                raise EvalError("task '" + tid + "': unknown tool")
            if not isinstance(step.get("args"), list):
                raise EvalError("task '" + tid + "': step args must be a list")
    return ids


def score_attempt(task, run):
    """Scorer only: compares a run against the task scoring keys."""
    if task["expected_outcome"] == "success":
        return run["outcome"] == "success" and run["answer"] == task["expected_answer"]
    return (run["outcome"] == "failure"
            and run["failure_label"] == task["expected_failure_label"])


def pass_at_k(attempt_matrix, k):
    """Fraction of tasks where any of the first k attempts passed.

    attempt_matrix: list of per-task lists of booleans.
    A task passes at k if any of its first k attempts is True.
    """
    if not attempt_matrix:
        raise EvalError("attempt matrix must be non-empty")
    passed = sum(1 for row in attempt_matrix if any(row[:k]))
    return round(passed / len(attempt_matrix), 4)


def mean_and_variance(values):
    """Population mean, variance, and std, rounded to 4 places."""
    if not values:
        raise EvalError("values must be non-empty")
    mean = sum(values) / len(values)
    var = sum((v - mean) ** 2 for v in values) / len(values)
    return {"mean": round(mean, 4), "variance": round(var, 4),
            "std": round(var ** 0.5, 4)}


def run_suite(tasks, variant_name, master_seed):
    """Run one variant under one master seed: ATTEMPTS_PER_TASK per task."""
    validate_tasks(tasks)
    agent = ConfigurableToyAgent(VARIANTS[variant_name])
    matrix = []
    steps_total = 0
    cost_total = 0
    attempts = 0
    per_task = []
    for task in tasks:
        row = []
        for a in range(ATTEMPTS_PER_TASK):
            seed = "%s:%s:%s:%d" % (master_seed, variant_name, task["id"], a)
            rng = random.Random(seed)
            run = agent.run(task, rng)
            row.append(score_attempt(task, run))
            steps_total += run["steps"]
            cost_total += run["cost_units"]
            attempts += 1
        matrix.append(row)
        per_task.append({"task_id": task["id"], "attempts_passed": sum(row),
                         "attempts": len(row)})
    attempt_success = sum(sum(r) for r in matrix) / attempts
    return {"matrix": matrix, "per_task": per_task,
            "attempt_success_rate": round(attempt_success, 4),
            "pass_at_k": {str(k): pass_at_k(matrix, k) for k in PASS_KS},
            "mean_steps": round(steps_total / attempts, 4),
            "mean_cost_units": round(cost_total / attempts, 4)}


def run_harness(dev_tasks, heldout_tasks):
    """Run every variant under every master seed on both task sets."""
    all_tasks = list(dev_tasks) + list(heldout_tasks)
    variants = {}
    for name in VARIANTS:
        split = {}
        for label, subset in (("dev", dev_tasks), ("heldout", heldout_tasks),
                              ("all", all_tasks)):
            seed_rows = [run_suite(subset, name, s) for s in MASTER_SEEDS]
            rates = [r["attempt_success_rate"] for r in seed_rows]
            stats = mean_and_variance(rates)
            split[label] = {
                "tasks": len(subset),
                "mean_attempt_success_rate": stats["mean"],
                "variance_attempt_success_rate": stats["variance"],
                "std_attempt_success_rate": stats["std"],
                "pass_at_k": {
                    str(k): round(sum(r["pass_at_k"][str(k)]
                                       for r in seed_rows) / len(seed_rows), 4)
                    for k in PASS_KS},
                "mean_steps": round(sum(r["mean_steps"] for r in seed_rows)
                                    / len(seed_rows), 4),
                "mean_cost_units": round(sum(r["mean_cost_units"]
                                             for r in seed_rows)
                                         / len(seed_rows), 4),
                "per_seed_success_rates": rates}
        variants[name] = split
    ablation = []
    for name in VARIANTS:
        a = variants[name]["all"]
        ablation.append({
            "variant": name, "components": VARIANTS[name],
            "pass_at_1": a["pass_at_k"]["1"],
            "pass_at_3": a["pass_at_k"]["3"],
            "pass_at_5": a["pass_at_k"]["5"],
            "mean_success": a["mean_attempt_success_rate"],
            "variance": a["variance_attempt_success_rate"],
            "std": a["std_attempt_success_rate"],
            "mean_steps": a["mean_steps"],
            "mean_cost_units": a["mean_cost_units"]})
    return {"variants": variants, "ablation_table": ablation}
