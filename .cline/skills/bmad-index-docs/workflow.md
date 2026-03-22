# Index Docs
## META
- Goal: Generate or update an `index.md` that references all documentation in a target folder.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Confirm the target directory.">
  <ask>What directory should I index?</ask>
  <action>Verify the target directory exists and is accessible.</action>
  <branch if="the target directory does not exist or is inaccessible" optional="true">
    <output>Halt with an error message that the target directory must exist and be accessible.</output>
  </branch>
</step>

<step n="2" goal="Inspect the directory contents.">
  <action>List all files and subdirectories in the target location.</action>
  <action>Group entries by type, purpose, or subdirectory.</action>
  <detail>Skip hidden files starting with `.` unless the user explicitly requests them.</detail>
</step>

<step n="3" goal="Generate concise file descriptions.">
  <action>Read each file to understand its actual purpose.</action>
  <detail>
    Create brief descriptions from file contents, not filenames. Keep each description to about 3-10 words.
  </detail>
</step>

<step n="4" goal="Create or update the index.">
  <action>Write or update `index.md` with organized file listings that use relative paths starting with `./`.</action>
  <detail>
    Sort files alphabetically within each group and keep similar files together.
  </detail>
  <branch if="the user does not have write permissions to create `index.md`" optional="true">
    <output>Halt with an error message that `index.md` cannot be written in the target directory.</output>
  </branch>
</step>

<step n="5" goal="Report completion.">
  <output>Summarize the indexed directory, the groups created, and any files that were skipped or could not be read.</output>
</step>
