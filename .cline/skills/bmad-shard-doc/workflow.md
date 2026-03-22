# Shard Document

**Goal:** Split large markdown documents into smaller, organized files based on level 2 sections using `npx @kayvan/markdown-tree-parser`.

## META

- Execute the workflow in order.
- Halt whenever a user response is required.
- Speak in `communication_language`.
- Keep the original document separate from the sharded output unless the user chooses otherwise.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
## EXECUTION

<step n="1" goal="Get and validate the source document path.">
  <ask if="the source document path has not already been provided">
    Ask for the source document path.
  </ask>
  <action>Verify the file exists and is accessible.</action>
  <action>Verify the file has a `.md` extension.</action>
  <branch if="the file is missing or is not markdown" optional="true">
    <output>Halt with an error message that the source must be an accessible markdown file.</output>
  </branch>
  <detail>Use the validated source path for the rest of the workflow.</detail>
</step>

<step n="2" goal="Choose and validate the destination folder.">
  <action>Set the default destination to a folder beside the source file with the same base name and no `.md` extension.</action>
  <output>Present the default destination path and ask whether to use it or provide a custom path.</output>
  <ask>Use the suggested destination folder, or provide a different writable folder path.</ask>
  <branch if="the user accepts the default destination" optional="true">
    <action>Use the suggested destination path.</action>
  </branch>
  <branch if="the user provides a custom destination" optional="true">
    <action>Use the custom destination path.</action>
  </branch>
  <action>Verify the destination folder exists or can be created.</action>
  <action>Check write permission for the destination path.</action>
  <branch if="permission is denied or the destination cannot be created" optional="true">
    <output>Halt with an error message that the destination folder is not writable or cannot be created.</output>
  </branch>
</step>

<step n="3" goal="Run the sharding command.">
  <output>Tell the user that sharding is starting.</output>
  <action>Execute `npx @kayvan/markdown-tree-parser explode [source-document] [destination-folder]`.</action>
  <action>Capture command output and any errors.</action>
  <branch if="the command fails" optional="true">
    <output>Halt and show the error to the user.</output>
  </branch>
</step>

<step n="4" goal="Verify the shard output.">
  <action>Check that the destination folder contains sharded files.</action>
  <action>Verify that `index.md` was created in the destination folder.</action>
  <action>Count the number of files created.</action>
  <branch if="no files were created" optional="true">
    <output>Halt with an error message that no shard files were produced.</output>
  </branch>
  <branch if="index.md is missing" optional="true">
    <output>Halt with an error message that `index.md` was not created.</output>
  </branch>
</step>

<step n="5" goal="Report completion.">
  <output>Present a completion report with the source path, destination path, number of section files created, confirmation that `index.md` exists, and any warnings or tool output worth noting.</output>
  <output>Confirm that sharding completed successfully.</output>
</step>

<step n="6" goal="Handle the original document.">
  <output>Ask what should happen to the original source document: delete, move to archive, or keep.</output>
  <ask>Choose `[d]` delete, `[m]` move to archive, or `[k]` keep.</ask>
  <detail>
    - `d`: delete the original source file
    - `m`: move it to an `archive` subfolder by default, or a custom archive path if provided
    - `k`: keep the original in place, with a warning that duplicate sources can cause confusion
  </detail>
  <branch if="the user selects delete" optional="true">
    <action>Delete the original source document file.</action>
    <output>Confirm deletion of the original document.</output>
    <detail>The document can be reconstructed by concatenating the shard files in order.</detail>
  </branch>
  <branch if="the user selects move" optional="true">
    <action>Set the default archive location to an `archive` subfolder beside the source file.</action>
    <ask>Use the default archive path or provide a custom archive path.</ask>
    <action>Create the archive directory if it does not exist.</action>
    <action>Move the original document to the archive path.</action>
    <output>Confirm the archive location.</output>
  </branch>
  <branch if="the user selects keep" optional="true">
    <output>Warn that keeping both versions is not recommended and confirm the source path if the user still wants to keep it.</output>
  </branch>
</step>

## CHECKPOINT

- Halt if the `npx` command fails or produces no shard files.
- Do not proceed to the original-document decision until the shard output is verified.
