Maintain the implementation plan for the application.

Inputs may include:
- Current application source code
- Existing implementation artifacts
- Change requests
- Enhancement requests
- Bug reports

Behavior:

If `docs/PLAN.md` does not exist:

* Create an initial implementation plan.
* Generate the first version plan (`v1.0`).

If `docs/PLAN.md` already exists:

* Preserve all existing content.
* Identify the latest product version that does not yet have a corresponding implementation plan.
* Append a new versioned plan section representing only the implementation delta required for that version.

Planning Constraints:

1. No Enterprise Boilerplate: Consolidate layers. Avoid separate repositories, domain models, or service dependency injection folders. Keep backend code localized to single file entry points (e.g., a single Program.cs for .NET, a single server.ts for Node) using in-memory state.
2. Flat Frontend Structure: Build highly responsive, functional UI views without deep nested state-management abstractions or heavy routing frameworks.
3. Compact Scope: Limit implementation plan to between 1 and 3 high-impact, sequential steps.
4. The shell of the end to end implementation must be available from the first step onnwards, and may be grown at each step.

Each version section must contain:

# Version vX.Y

## Change Summary

Brief description of the product changes being implemented.

## Dependencies

Prior versions or features that this version relies on.

## Implementation Steps

### Step vX.Y.1

Goal:

Files Affected:

Expected Visible Outcome:

### Step vX.Y.2

Goal:

Files Affected:

Expected Visible Outcome:

(continue as needed)

## Completion Criteria

Observable outcomes proving the version has been fully implemented.

Additional Rules:

* The plan is append-only.
* Prior plan versions are immutable.
* Use deterministic step identifiers (v1.0.1, v1.0.2, v1.1.1, etc.).
* Optimize for incremental implementation.

Save the updated document as `docs/PLAN.md`.
Do not write any application code yet.