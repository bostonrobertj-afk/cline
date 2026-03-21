
# Index Docs

## META
- managed_workflow_extraction: enabled
- phase_type: workflow
- source_format: procedural

## EXECUTION
<step n="1" goal="Review Detailed Guidance">
  <action>Read the advisory, reference, and prose sections in this file completely before taking action.</action>
</step>

<step n="2" goal="Follow Workflow">
  <action>Execute this file in order, preserving every approval gate, routing rule, document update instruction, and constraint described below.</action>
</step>

## CHECKPOINT
Workflow progress can advance only after the required outputs, approvals, and routing conditions in this file are satisfied.

## ADVISORY
- Treat the <prose> section as the authoritative detailed instructions for this file.
- Preserve all existing user-input pauses, continuation checks, and referenced companion files.
- Keep any document templates, frontmatter updates, and save instructions exactly as authored.

## REFERENCE
- Original authored procedure retained below for managed workflow extraction compatibility.

<prose>
**Goal:** Generate or update an index.md to reference all docs in a target folder.


## EXECUTION

### Step 1: Scan Directory

- List all files and subdirectories in the target location

### Step 2: Group Content

- Organize files by type, purpose, or subdirectory

### Step 3: Generate Descriptions

- Read each file to understand its actual purpose and create brief (3-10 word) descriptions based on the content, not just the filename

### Step 4: Create/Update Index

- Write or update index.md with organized file listings


## OUTPUT FORMAT

```markdown
# Directory Index

## Files

- **[filename.ext](./filename.ext)** - Brief description
- **[another-file.ext](./another-file.ext)** - Brief description

## Subdirectories

### subfolder/

- **[file1.ext](./subfolder/file1.ext)** - Brief description
- **[file2.ext](./subfolder/file2.ext)** - Brief description

### another-folder/

- **[file3.ext](./another-folder/file3.ext)** - Brief description
```


## HALT CONDITIONS

- HALT if target directory does not exist or is inaccessible
- HALT if user does not have write permissions to create index.md


## VALIDATION

- Use relative paths starting with ./
- Group similar files together
- Read file contents to generate accurate descriptions - don't guess from filenames
- Keep descriptions concise but informative (3-10 words)
- Sort alphabetically within groups
- Skip hidden files (starting with .) unless specified
</prose>
