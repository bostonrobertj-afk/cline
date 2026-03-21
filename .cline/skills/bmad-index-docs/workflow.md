# Index Docs

## META

- Goal: Generate or update an `index.md` file that references all docs in a target folder.
- Execute this workflow in order.
- Halt when the target folder is missing, inaccessible, or not writable.

## EXECUTION

<step n="1" goal="Resolve the target folder and validate access">
  <action>Ask for the target folder path if it was not provided.</action>
  <action>Verify that the target folder exists and is accessible.</action>
  <action>Check that `index.md` can be created or updated in the target folder.</action>
  <branch if="target folder does not exist or cannot be accessed">
    <output>Halt with a clear error explaining that the target folder is unavailable.</output>
  </branch>
  <branch if="write permission is missing">
    <output>Halt with a clear error explaining that `index.md` cannot be written.</output>
  </branch>
</step>

<step n="2" goal="Inventory the folder contents and organize the docs">
  <action>List all files and subdirectories in the target folder.</action>
  <action>Skip hidden files and hidden folders unless the user explicitly asked to include them.</action>
  <action>Group the visible files by type, purpose, or subdirectory.</action>
  <detail>
    Keep the structure simple so the index acts as a navigation aid instead of a commentary document.
  </detail>
</step>

<step n="3" goal="Read files and draft concise descriptions">
  <action>Read each visible file that should appear in the index.</action>
  <action>Write a short description for each file based on its actual content.</action>
  <detail>
    Use descriptions that are concise but informative, usually 3-10 words.
  </detail>
  <detail>
    Do not guess from filenames alone. If a file cannot be read, note that limitation instead of inventing a description.
  </detail>
</step>

<step n="4" goal="Write or update `index.md`">
  <action>Create or replace `index.md` in the target folder with the organized file listings.</action>
  <detail>
    - Use relative links that start with `./`
    - Sort entries alphabetically within each group
    - Include subdirectory sections when the folder contains nested docs
    - Update an existing `index.md` in place rather than creating a duplicate index file
  </detail>
  <output>Present the completed index content for the target folder.</output>
</step>

<step n="5" goal="Validate the generated index">
  <action>Confirm that `index.md` was written successfully.</action>
  <action>Check that the links match the actual folder structure.</action>
  <detail>Report any missing, unreadable, or skipped files if they affect the index.</detail>
</step>

## CHECKPOINT

Workflow progress can advance only after the target folder is accessible, descriptions are grounded in file content, and `index.md` is written successfully.

## ADVISORY

- Keep the workflow focused on navigation and discovery.
- Preserve relative-path formatting and concise descriptions.
- Do not invent file contents or duplicate files.
