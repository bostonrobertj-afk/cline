# Rules
- Translate the existing discovery documentation into the architecture document faithfully
- If a section requires information, design, or decisioning that is not covered in existing discovery documentation, stop and ask the user for their input.
- "Done" means the document faithfully represents the product vision and is sufficiently detailed to inform a requirements document, which will in turn inform an action plan.

# Required Sections:
1. Introduction and Goals
Short description of the requirements, driving forces, extract (or abstract) of requirements. Top three (max five) quality goals for the architecture which have highest priority

2. Constraints
Anything that constrains teams in design and implementation decisions or decision about related processes. Can sometimes go beyond individual systems

3. Context and Scope
Delimits your system from its (external) communication partners (neighboring systems and users). Specifies the external interfaces. Shown from a business/domain perspective (always) or a technical perspective (optional)

4. Solution Strategy
Summary of the fundamental decisions and solution strategies that shape the architecture. Can include technology, top-level decomposition, approaches to achieve top quality goals and relevant organizational decisions.

5. Building Block View
Static decomposition of the system, abstractions of source-code, shown as hierarchy up to the appropriate level of detail.

6. Runtime View
Behavior of building blocks as scenarios, covering important use cases or features, interactions at critical external interfaces, operation and administration plus error and exception behavior.

7. Deployment View
Technical infrastructure with environments, computers, processors, topologies. Mapping of (software) building blocks to infrastructure elements.

8. Crosscutting Concepts
Overall, principal regulations and solution approaches relevant in multiple parts (→ cross-cutting) of the system. Concepts are often related to multiple building blocks. Include different topics like domain models, architecture patterns and -styles, rules for using specific technology and implementation rules.

9. Architectural Decisions
Important, expensive, critical, large scale or risky architecture decisions including rationales.

10. Risks and Technical Debt
Known technical risks or technical debt. What potential problems exist within or around the system? What does the development team feel miserable about?