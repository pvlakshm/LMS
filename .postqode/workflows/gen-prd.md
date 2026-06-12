Maintain the Product Requirements Document (PRD) for the application.

Behavior:

If `docs/PRD.md` does not exist:

* Create an initial PRD.
* Create a version section `v1.0`.

If `docs/PRD.md` already exists:

* Preserve all existing content.
* Append a new version section representing the requested changes.
* Increment the version number using semantic product versions (v1.1, v1.2, v2.0, etc.).
* Record only the delta introduced by the new request.

Each version section must contain:

## Version

Version identifier

## Source

Origin of the request (user notes, stakeholder feedback, bug report, etc.)

## Summary

High-level description of the change.

## Requirements

New or modified functional requirements.

## Business Rules

New or modified business constraints.

## UI Impact

Changes affecting the UI while respecting the existing UI Contract.

## API Impact

Changes affecting API contracts, payloads, status codes, or integrations.

## Acceptance Criteria

Observable conditions required for completion.

## Affected Areas

Features, pages, workflows, or modules impacted by the change.

Additional Rules:

* The PRD is append-only.
* Prior versions are immutable.
* When requirements supersede previous behavior, explicitly identify the superseded version and requirement.

Save the updated document as `docs/PRD.md`.
Do not write any application code yet.