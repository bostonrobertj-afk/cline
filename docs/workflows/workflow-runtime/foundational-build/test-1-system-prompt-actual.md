Instructions
WORKFLOW

Workflow: brainstorming

WORKFLOW PERSONA

analyst

WORKFLOW STEPS

 Gather Inputs
 Resolve Session Approach
 Perform Interactive Brainstorming
 Organize Ideas & Plan Next Actions
====

TOOL USE

Use these tools in one response when they are not dependent on one another; if using tools dependent on one another do so sequentially.

environment_details provides runtime context
Use list_files when you need directory structure
For native tool calls, treat the tool schema as the source of truth for canonical parameter names, required fields, and argument shape. Match the schema exactly.
If you hit a meaningful blocker, material ambiguity, or unstable behavior that affects correctness or progress, include agent_feedback on your response tool call with a concise description of the issue.
RESPONSE TOOLS
Use these tools to respond to the user. A reply reaches the human user only when you use the appropriate response tool.

====

====
RULES

Operate from /Users/robertboston/Documents/Cline Extension/cline; pass explicit paths instead of assuming directory changes.
Verify important command/edit results before completion.
Use complete-line SEARCH blocks in replace_in_file and preserve marker syntax exactly.
====

CURRENT STEP

Step 3: Perform Interactive Brainstorming

Read /Users/robertboston/Documents/Cline Extension/cline/docs/projects/sequential-workflows/discovery/brainstorming.md.

Use the already selected brainstorming technique recorded in /Users/robertboston/Documents/Cline Extension/cline/docs/projects/sequential-workflows/discovery/brainstorming.md. Do not call get_brainstorming_methods.

Goal: Guide an interactive brainstorming session from setup through technique selection, idea capture, and final organization, pausing whenever user input or confirmation is needed.

Engage the user in interactive brainstorming using the selected approach.
Keep the user in control at each decision point. Pause for clarification, a technique switch, or continuation whenever needed. Record techniques_used and ideas_generated in /Users/robertboston/Documents/Cline Extension/cline/docs/projects/sequential-workflows/discovery/brainstorming.md as needed.
The goal is to generate as many ideas as possible without exhausting the user.
Techniques for keeping brainstorming going: ask probing questions, ask users how the current idea connects to an earlier idea, offer challenges to the user's idea or assumptions, offer new ideas or angles to keep the conversation going.
Once the user indicates they're ready, use workflow_progress_request to confirm and unlock the next workflow step.

====

USER'S CUSTOM INSTRUCTIONS

General Instructions for This Repo:

.clinerules/
The following is provided by a global .clinerules/ directory, located at /Users/robertboston/Documents/Cline/Rules, where the user has specified instructions for all working directories:

Persona Adoption.md

If an agent persona was provided in the system prompt, you are expected to embody that identity fully including: mannerisms, self-reference, methodology, and approach to task execution.
Token management.md

Prefer asking the user for information over executing broad-reaching tool calls to clear up ambiguity.
If you can retrieve the information you need via multiple tools, prefer the tool which will generate a smaller output.
The native tool schema sent with this turn contains the exact shape required for every tool, including Indxr tools.
Ignore INDEX.md unless the user explicitly asks to review it or the story is specifically about index-generation behavior, including if it is present in a commit you are using for your work.
.clinerules/
The following is provided by a root-level .clinerules/ directory where the user has specified instructions for this working directory (/Users/robertboston/Documents/Cline Extension/cline)

.clinerules/cli.md

CLI Development
The CLI lives in cli/ and uses React Ink for terminal UI.

If needed, look at cli/src/constants/colors.ts for re-used terminal colors, e.g. COLORS.primaryBlue highlight color (selections, spinners, success states).
Never use dimColor with gray (e.g. <Text color="gray" dimColor>) - it's too hard to read. Use color="gray" for secondary text and normal foreground (no color) for primary text.
When thinking about how to handle state or messages from core, look at webview for how it communicates with the vs code extension.
When updating the webview, consider and suggest to the user to update the CLI TUI since we want to provide a similar experience to our terminal users as we do our vs code extension users.
Adding New API Providers

When adding a new API provider to the extension, you must also update the CLI:

Update cli/src/components/ModelPicker.tsx: Add the provider to the providerModels map so getDefaultModelId() returns the correct default model. Import the models and default ID from @shared/api:
import { newProviderDefaultModelId, newProviderModels } from "@/shared/api"

export const providerModels = {
  // ...existing providers
  "new-provider": { models: newProviderModels, defaultId: newProviderDefaultModelId },
}
Use applyProviderConfig() for auth flows: When implementing OAuth or other auth flows for the provider, use the shared utility at cli/src/utils/provider-config.ts:
import { applyProviderConfig } from "../utils/provider-config"

// After successful auth:
await applyProviderConfig({ providerId: "new-provider", controller })
This handles setting provider, default model, API key mapping, state persistence, and rebuilding the API handler.

Provider-specific auth: If the provider uses OAuth (like openai-codex), add handling in SettingsPanelContent.tsx's handleProviderSelect callback. See the existing Codex OAuth flow as a reference.
.clinerules/cline-overview.md

Cline Extension Architecture & Development Guide
Project Overview

Cline is a VSCode extension that provides AI assistance through a combination of a core extension backend and a React-based webview frontend. The extension is built with TypeScript and follows a modular architecture pattern.

Architecture Overview

graph TB
    subgraph VSCodeExtensionHost[VSCode Extension Host]
        subgraph CoreExtension[Core Extension]
            ExtensionEntry[Extension Entry<br/>src/extension.ts]
            WebviewProvider[WebviewProvider<br/>src/core/webview/index.ts]
            Controller[Controller<br/>src/core/controller/index.ts]
            Task[Task<br/>src/core/task/index.ts]
            GlobalState[VSCode Global State]
            SecretsStorage[VSCode Secrets Storage]
            McpHub[McpHub<br/>src/services/mcp/McpHub.ts]
        end

        subgraph WebviewUI[Webview UI]
            WebviewApp[React App<br/>webview-ui/src/App.tsx]
            ExtStateContext[ExtensionStateContext<br/>webview-ui/src/context/ExtensionStateContext.tsx]
            ReactComponents[React Components]
        end

        subgraph Storage
            TaskStorage[Task Storage<br/>Per-Task Files & History]
            CheckpointSystem[Git-based Checkpoints]
        end

        subgraph apiProviders[API Providers]
            AnthropicAPI[Anthropic]
            OpenRouterAPI[OpenRouter]
            BedrockAPI[AWS Bedrock]
            OtherAPIs[Other Providers]
        end

        subgraph MCPServers[MCP Servers]
            ExternalMcpServers[External MCP Servers]
        end
    end

    %% Core Extension Data Flow
    ExtensionEntry --> WebviewProvider
    WebviewProvider --> Controller
    Controller --> Task
    Controller --> McpHub
    Task --> GlobalState
    Task --> SecretsStorage
    Task --> TaskStorage
    Task --> CheckpointSystem
    Task --> |API Requests| apiProviders
    McpHub --> |Connects to| ExternalMcpServers
    Task --> |Uses| McpHub

    %% Webview Data Flow
    WebviewApp --> ExtStateContext
    ExtStateContext --> ReactComponents

    %% Bidirectional Communication
    WebviewProvider <-->|postMessage| ExtStateContext

    style GlobalState fill:#f9f,stroke:#333,stroke-width:2px
    style SecretsStorage fill:#f9f,stroke:#333,stroke-width:2px
    style ExtStateContext fill:#bbf,stroke:#333,stroke-width:2px
    style WebviewProvider fill:#bfb,stroke:#333,stroke-width:2px
    style McpHub fill:#bfb,stroke:#333,stroke-width:2px
    style apiProviders fill:#fdb,stroke:#333,stroke-width:2px
Definitions

Core Extension: Anything inside the src folder, organized into modular components
Core Extension State: Managed by the Controller class in src/core/controller/index.ts, which serves as the single source of truth for the extension's state. It manages multiple types of persistent storage (global state, workspace state, and secrets), handles state distribution to both the core extension and webview components, and coordinates state across multiple extension instances. This includes managing API configurations, task history, settings, and MCP configurations.
Webview: Anything inside the webview-ui. All the react or view's seen by the user and user interaction components
Webview State: Managed by ExtensionStateContext in webview-ui/src/context/ExtensionStateContext.tsx, which provides React components with access to the extension's state through a context provider pattern. It maintains local state for UI components, handles real-time updates through message events, manages partial message updates, and provides methods for state modifications. The context includes extension version, messages, task history, theme, API configurations, MCP servers, marketplace catalog, and workspace file paths. It synchronizes with the core extension through VSCode's message passing system and provides type-safe access to state through a custom hook (useExtensionState).
Core Extension Architecture
The core extension follows a clear hierarchical structure:

WebviewProvider (src/core/webview/index.ts): Manages the webview lifecycle and communication
Controller (src/core/controller/index.ts): Handles webview messages and task management
Task (src/core/task/index.ts): Executes API requests and tool operations
This architecture provides clear separation of concerns:

WebviewProvider focuses on VSCode webview integration
Controller manages state and coordinates tasks
Task handles the execution of AI requests and tool operations
WebviewProvider Implementation
The WebviewProvider class in src/core/webview/index.ts is responsible for:

Managing multiple active instances through a static set (activeInstances)
Handling webview lifecycle events (creation, visibility changes, disposal)
Implementing HTML content generation with proper CSP headers
Supporting Hot Module Replacement (HMR) for development
Setting up message listeners between the webview and extension
The WebviewProvider maintains a reference to the Controller and delegates message handling to it. It also handles the creation of both sidebar and tab panel webviews, allowing Cline to be used in different contexts within VSCode.

Core Extension State
The Controller class manages multiple types of persistent storage:

Global State: Stored across all VSCode instances. Used for settings and data that should persist globally.
Workspace State: Specific to the current workspace. Used for task-specific data and settings.
Secrets: Secure storage for sensitive information like API keys.
The Controller handles the distribution of state to both the core extension and webview components. It also coordinates state across multiple extension instances, ensuring consistency.

State synchronization between instances is handled through:

File-based storage for task history and conversation data
VSCode's global state API for settings and configuration
Secrets storage for sensitive information
Event listeners for file changes and configuration updates
The Controller implements methods for:

Saving and loading task state
Managing API configurations
Handling user authentication
Coordinating MCP server connections
Managing task history and checkpoints
Webview State
The ExtensionStateContext in webview-ui/src/context/ExtensionStateContext.tsx provides React components with access to the extension's state. It uses a context provider pattern and maintains local state for UI components. The context includes:

Extension version
Messages
Task history
Theme
API configurations
MCP servers
Marketplace catalog
Workspace file paths
It synchronizes with the core extension through VSCode's message passing system and provides type-safe access to the state via a custom hook (useExtensionState).

The ExtensionStateContext handles:

Real-time updates through message events
Partial message updates for streaming content
State modifications through setter methods
Type-safe access to state through a custom hook
API Provider System

Cline supports multiple AI providers through a modular API provider system. Each provider is implemented as a separate module in the src/api/providers/ directory and follows a common interface.

API Provider Architecture
The API system consists of:

API Handlers: Provider-specific implementations in src/api/providers/
API Transformers: Stream transformation utilities in src/api/transform/
API Configuration: User settings for API keys and endpoints
API Factory: Builder function to create the appropriate handler
Key providers include:

Anthropic: Direct integration with Claude models
OpenRouter: Meta-provider supporting multiple model providers
AWS Bedrock: Integration with Amazon's AI services
Gemini: Google's AI models
Cerebras: High-performance inference with Llama, Qwen, and DeepSeek models
Ollama: Local model hosting
LM Studio: Local model hosting
VSCode LM: VSCode's built-in language models
API Configuration Management
API configurations are stored securely:

API keys are stored in VSCode's secrets storage
Model selections and non-sensitive settings are stored in global state
The Controller manages switching between providers and updating configurations
The system supports:

Secure storage of API keys
Model selection and configuration
Automatic retry and error handling
Token usage tracking and cost calculation
Context window management
Plan/Act Mode API Configuration
Cline supports separate model configurations for Plan and Act modes:

Different models can be used for planning vs. execution
The system preserves model selections when switching modes
The Controller handles the transition between modes and updates the API configuration accordingly
Task Execution System

The Task class is responsible for executing AI requests and tool operations. Each task runs in its own instance of the Task class, ensuring isolation and proper state management.

Task Execution Loop
The core task execution loop follows this pattern:

class Task {
  async initiateTaskLoop(userContent: UserContent, isNewTask: boolean) {
    while (!this.abort) {
      // 1. Make API request and stream response
      const stream = this.attemptApiRequest()
      
      // 2. Parse and present content blocks
      for await (const chunk of stream) {
        switch (chunk.type) {
          case "text":
            // Parse into content blocks
            this.assistantMessageContent = parseAssistantMessageV2(chunk.text)
            // Present blocks to user
            await this.presentAssistantMessage()
            break
        }
      }
      
      // 3. Wait for tool execution to complete
      await pWaitFor(() => this.userMessageContentReady)
      
      // 4. Continue loop with tool result
      const recDidEndLoop = await this.recursivelyMakeClineRequests(
        this.userMessageContent
      )
    }
  }
}
Message Streaming System
The streaming system handles real-time updates and partial content:

class Task {
  async presentAssistantMessage() {
    // Handle streaming locks to prevent race conditions
    if (this.presentAssistantMessageLocked) {
      this.presentAssistantMessageHasPendingUpdates = true
      return
    }
    this.presentAssistantMessageLocked = true

    // Present current content block
    const block = this.assistantMessageContent[this.currentStreamingContentIndex]
    
    // Handle different types of content
    switch (block.type) {
      case "text":
        await this.say("text", content, undefined, block.partial)
        break
      case "tool_use":
        // Handle tool execution
        break
    }

    // Move to next block if complete
    if (!block.partial) {
      this.currentStreamingContentIndex++
    }
  }
}
Tool Execution Flow
Tools follow a strict execution pattern:

class Task {
  async executeToolWithApproval(block: ToolBlock) {
    // 1. Check auto-approval settings
    if (this.shouldAutoApproveTool(block.name)) {
      await this.say("tool", message)
      this.consecutiveAutoApprovedRequestsCount++
    } else {
      // 2. Request user approval
      const didApprove = await askApproval("tool", message)
      if (!didApprove) {
        this.didRejectTool = true
        return
      }
    }

    // 3. Execute tool
    const result = await this.executeTool(block)

    // 4. Save checkpoint
    await this.saveCheckpoint()

    // 5. Return result to API
    return result
  }
}
Error Handling & Recovery
The system includes robust error handling:

class Task {
  async handleError(action: string, error: Error) {
    // 1. Check if task was abandoned
    if (this.abandoned) return
    
    // 2. Format error message
    const errorString = `Error ${action}: ${error.message}`
    
    // 3. Present error to user
    await this.say("error", errorString)
    
    // 4. Add error to tool results
    pushToolResult(formatResponse.toolError(errorString))
    
    // 5. Cleanup resources
    await this.diffViewProvider.revertChanges()
    await this.browserSession.closeBrowser()
  }
}
API Request & Token Management
The Task class handles API requests with built-in retry, streaming, and token management:

class Task {
  async *attemptApiRequest(previousApiReqIndex: number): ApiStream {
    // 1. Wait for MCP servers to connect
    await pWaitFor(() => this.controllerRef.deref()?.mcpHub?.isConnecting !== true)

    // 2. Manage context window
    const previousRequest = this.clineMessages[previousApiReqIndex]
    if (previousRequest?.text) {
      const { tokensIn, tokensOut } = JSON.parse(previousRequest.text || "{}")
      const totalTokens = (tokensIn || 0) + (tokensOut || 0)
      
      // Truncate conversation if approaching context limit
      if (totalTokens >= maxAllowedSize) {
        this.conversationHistoryDeletedRange = this.contextManager.getNextTruncationRange(
          this.apiConversationHistory,
          this.conversationHistoryDeletedRange,
          totalTokens / 2 > maxAllowedSize ? "quarter" : "half"
        )
      }
    }

    // 3. Handle streaming with automatic retry
    try {
      this.isWaitingForFirstChunk = true
      const firstChunk = await iterator.next()
      yield firstChunk.value
      this.isWaitingForFirstChunk = false
      
      // Stream remaining chunks
      yield* iterator
    } catch (error) {
      // 4. Error handling with retry
      if (isOpenRouter && !this.didAutomaticallyRetryFailedApiRequest) {
        await setTimeoutPromise(1000)
        this.didAutomaticallyRetryFailedApiRequest = true
        yield* this.attemptApiRequest(previousApiReqIndex)
        return
      }
      
      // 5. Ask user to retry if automatic retry failed
      const { response } = await this.ask(
        "api_req_failed",
        this.formatErrorWithStatusCode(error)
      )
      if (response === "yesButtonClicked") {
        await this.say("api_req_retried")
        yield* this.attemptApiRequest(previousApiReqIndex)
        return
      }
    }
  }
}
Key features:

Context Window Management
Tracks token usage across requests
Automatically truncates conversation when needed
Preserves important context while freeing space
Handles different model context sizes
Streaming Architecture
Real-time chunk processing
Partial content handling
Race condition prevention
Error recovery during streaming
Error Handling
Automatic retry for transient failures
User-prompted retry for persistent issues
Detailed error reporting
State cleanup on failure
Token Tracking
Per-request token counting
Cumulative usage tracking
Cost calculation
Cache hit monitoring
Context Management System
The Context Management System handles conversation history truncation to prevent context window overflow errors. Implemented in the ContextManager class, it ensures long-running conversations remain within model context limits while preserving critical context.

Key features:

Model-Aware Sizing: Dynamically adjusts based on different model context windows (64K for DeepSeek, 128K for most models, 200K for Claude).
Proactive Truncation: Monitors token usage and preemptively truncates conversations when approaching limits, maintaining buffers of 27K-40K tokens depending on the model.
Intelligent Preservation: Always preserves the original task message and maintains the user-assistant conversation structure when truncating.
Adaptive Strategies: Uses different truncation strategies based on context pressure - removing half of the conversation for moderate pressure or three-quarters for severe pressure.
Error Recovery: Includes specialized detection for context window errors from different providers with automatic retry and more aggressive truncation when needed.
Task State & Resumption
The Task class provides robust task state management and resumption capabilities:

class Task {
  async resumeTaskFromHistory() {
    // 1. Load saved state
    this.clineMessages = await getSavedClineMessages(this.getContext(), this.taskId)
    this.apiConversationHistory = await getSavedApiConversationHistory(this.getContext(), this.taskId)

    // 2. Handle interrupted tool executions
    const lastMessage = this.apiConversationHistory[this.apiConversationHistory.length - 1]
    if (lastMessage.role === "assistant") {
      const toolUseBlocks = content.filter(block => block.type === "tool_use")
      if (toolUseBlocks.length > 0) {
        // Add interrupted tool responses
        const toolResponses = toolUseBlocks.map(block => ({
          type: "tool_result",
          tool_use_id: block.id,
          content: "Task was interrupted before this tool call could be completed."
        }))
        modifiedOldUserContent = [...toolResponses]
      }
    }

    // 3. Notify about interruption
    const agoText = this.getTimeAgoText(lastMessage?.ts)
    newUserContent.push({
      type: "text",
      text: `[TASK RESUMPTION] This task was interrupted ${agoText}. It may or may not be complete, so please reassess the task context.`
    })

    // 4. Resume task execution
    await this.initiateTaskLoop(newUserContent, false)
  }

  private async saveTaskState() {
    // Save conversation history
    await saveApiConversationHistory(this.getContext(), this.taskId, this.apiConversationHistory)
    await saveClineMessages(this.getContext(), this.taskId, this.clineMessages)
    
    // Create checkpoint
    const commitHash = await this.checkpointTracker?.commit()
    
    // Update task history
    await this.controllerRef.deref()?.updateTaskHistory({
      id: this.taskId,
      ts: lastMessage.ts,
      task: taskMessage.text,
      // ... other metadata
    })
  }
}
Key aspects of task state management:

Task Persistence
Each task has a unique ID and dedicated storage directory
Conversation history is saved after each message
File changes are tracked through Git-based checkpoints
Terminal output and browser state are preserved
State Recovery
Tasks can be resumed from any point
Interrupted tool executions are handled gracefully
File changes can be restored from checkpoints
Context is preserved across VSCode sessions
Workspace Synchronization
File changes are tracked through Git
Checkpoints are created after tool executions
State can be restored to any checkpoint
Changes can be compared between checkpoints
Error Recovery
Failed API requests can be retried
Interrupted tool executions are marked
Resources are cleaned up properly
User is notified of state changes
Plan/Act Mode System

Cline implements a dual-mode system that separates planning from execution:

Mode Architecture
The Plan/Act mode system consists of:

Mode State: Stored in chatSettings.mode in the Controller's state
Mode Switching: Handled by togglePlanActModeWithChatSettings in the Controller
Mode-specific Models: Optional configuration to use different models for each mode
Mode-specific Prompting: Different system prompts for planning vs. execution
Mode Switching Process
When switching between modes:

The current model configuration is saved to mode-specific state
The previous mode's model configuration is restored
The Task instance is updated with the new mode
The webview is notified of the mode change
Telemetry events are captured for analytics
Plan Mode
Plan mode is designed for:

Information gathering and context building
Asking clarifying questions
Creating detailed execution plans
Discussing approaches with the user
In Plan mode, the AI uses the plan_mode_respond tool to engage in conversational planning without executing actions.

Act Mode
Act mode is designed for:

Executing the planned actions
Using tools to modify files, run commands, etc.
Implementing the solution
Providing results and completion feedback
In Act mode, the AI has access to all tools except plan_mode_respond and focuses on implementation rather than discussion.

Data Flow & State Management

Core Extension Role
The Controller acts as the single source of truth for all persistent state. It:

Manages VSCode global state and secrets storage
Coordinates state updates between components
Ensures state consistency across webview reloads
Handles task-specific state persistence
Manages checkpoint creation and restoration
Terminal Management
The Task class manages terminal instances and command execution:

class Task {
  async executeCommandTool(command: string): Promise<[boolean, ToolResponse]> {
    // 1. Get or create terminal
    const terminalInfo = await this.terminalManager.getOrCreateTerminal(cwd)
    terminalInfo.terminal.show()

    // 2. Execute command with output streaming
    const process = this.terminalManager.runCommand(terminalInfo, command)
    
    // 3. Handle real-time output
    let result = ""
    process.on("line", (line) => {
      result += line + "\n"
      if (!didContinue) {
        sendCommandOutput(line)
      } else {
        this.say("command_output", line)
      }
    })

    // 4. Wait for completion or user feedback
    let completed = false
    process.once("completed", () => {
      completed = true
    })

    await process

    // 5. Return result
    if (completed) {
      return [false, `Command executed.\n${result}`]
    } else {
      return [
        false,
        `Command is still running in the user's terminal.\n${result}\n\nYou will be updated on the terminal status and new output in the future.`
      ]
    }
  }
}
Key features:

Terminal Instance Management
Multiple terminal support
Terminal state tracking (busy/inactive)
Process cooldown monitoring
Output history per terminal
Command Execution
Real-time output streaming
User feedback handling
Process state monitoring
Error recovery
Browser Session Management
The Task class handles browser automation through Puppeteer:

class Task {
  async executeBrowserAction(action: BrowserAction): Promise<BrowserActionResult> {
    switch (action) {
      case "launch":
        // 1. Launch browser with fixed resolution
        await this.browserSession.launchBrowser()
        return await this.browserSession.navigateToUrl(url)

      case "click":
        // 2. Handle click actions with coordinates
        return await this.browserSession.click(coordinate)

      case "type":
        // 3. Handle keyboard input
        return await this.browserSession.type(text)

      case "close":
        // 4. Clean up resources
        return await this.browserSession.closeBrowser()
    }
  }
}
Key aspects:

Browser Control
Fixed 900x600 resolution window
Single instance per task lifecycle
Automatic cleanup on task completion
Console log capture
Interaction Handling
Coordinate-based clicking
Keyboard input simulation
Screenshot capture
Error recovery
MCP (Model Context Protocol) Integration

MCP Architecture
The MCP system consists of:

McpHub Class: Central manager in src/services/mcp/McpHub.ts
MCP Connections: Manages connections to external MCP servers
MCP Settings: Configuration stored in a JSON file
MCP Marketplace: Online catalog of available MCP servers
MCP Tools & Resources: Capabilities exposed by connected servers
The McpHub class:

Manages the lifecycle of MCP server connections
Handles server configuration through a settings file
Provides methods for calling tools and accessing resources
Implements auto-approval settings for MCP tools
Monitors server health and handles reconnection
MCP Server Types
Cline supports two types of MCP server connections:

Stdio: Command-line based servers that communicate via standard I/O
SSE: HTTP-based servers that communicate via Server-Sent Events
MCP Server Management
The McpHub class provides methods for:

Discovering and connecting to MCP servers
Monitoring server health and status
Restarting servers when needed
Managing server configurations
Setting timeouts and auto-approval rules
MCP Tool Integration
MCP tools are integrated into the Task execution system:

Tools are discovered and registered at connection time
The Task class can call MCP tools through the McpHub
Tool results are streamed back to the AI
Auto-approval settings can be configured per tool
MCP Marketplace
The MCP Marketplace provides:

A catalog of available MCP servers
One-click installation
README previews
Server status monitoring
The Controller class manages MCP servers through the McpHub service:

class Controller {
  mcpHub?: McpHub

  constructor(context: vscode.ExtensionContext, webviewProvider: WebviewProvider) {
    this.mcpHub = new McpHub(this)
  }

  async downloadMcp(mcpId: string) {
    // Fetch server details from marketplace
    const response = await axios.post<McpDownloadResponse>(
      "https://api.cline.bot/v1/mcp/download",
      { mcpId },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    )

    // Create task with context from README
    const task = `Set up the MCP server from ${mcpDetails.githubUrl}...`

    // Initialize task and show chat view
    await this.initClineWithTask(task)
  }
}
Conclusion

This guide provides a comprehensive overview of the Cline extension architecture, with special focus on state management, data persistence, and code organization. Following these patterns ensures robust feature implementation with proper state handling across the extension's components.

Remember:

Always persist important state in the extension
The core extension follows a WebviewProvider -> Controller -> Task flow
Use proper typing for all state and messages
Handle errors and edge cases
Test state persistence across webview reloads
Follow the established patterns for consistency
Place new code in appropriate directories
Maintain clear separation of concerns
Install dependencies in correct package.json
Contributing

Contributions to the Cline extension are welcome! Please follow these guidelines:

When adding new tools or API providers, follow the existing patterns in the src/integrations/ and src/api/providers/ directories, respectively. Ensure that your code is well-documented and includes appropriate error handling.

The .clineignore file allows users to specify files and directories that Cline should not access. When implementing new features, respect the .clineignore rules and ensure that your code does not attempt to read or modify ignored files.

.clinerules/general.md
This file is the secret sauce for working effectively in this codebase. It captures tribal knowledge—the nuanced, non-obvious patterns that make the difference between a quick fix and hours of back-and-forth & human intervention.

When to add to this file:

User had to intervene, correct, or hand-hold
Multiple back-and-forth attempts were needed to get something working
You discovered something that required reading many files to understand
A change touched files you wouldn't have guessed
Something worked differently than you expected
User explicitly asks to "add this to CLAUDE.md"
Proactively suggest additions when any of the above happen—don't wait to be asked.

What NOT to add: Stuff you can figure out from reading a few files, obvious patterns, or standard practices. This file should be high-signal, not comprehensive.

Miscellaneous

This is a VS Code extension—check package.json for available scripts before trying to verify builds (e.g., npm run compile, not npm run build).
When creating PRs, contributors should not create changelog-entry files. Maintainers handle release versioning and changelog curation during the release process.
When adding new feature flags, see this PR as a reference https://github.com/cline/cline/pull/7566
Additional instructions about making requests: @.clinerules/network.md
gRPC/Protobuf Communication

The extension and webview communicate via gRPC-like protocol over VS Code message passing.

Proto files live in proto/ (e.g., proto/cline/task.proto, proto/cline/ui.proto)

Each feature domain has its own .proto file
For simple data, use shared types in proto/cline/common.proto (StringRequest, Empty, Int64Request)
For complex data, define custom messages in the feature's .proto file
Naming: Services PascalCaseService, RPCs camelCase, Messages PascalCase
For streaming responses, use stream keyword (see subscribeToAuthCallback in account.proto)
Run npm run protos after any proto changes—generates types in:

src/shared/proto/ - Shared type definitions
src/generated/grpc-js/ - Service implementations
src/generated/nice-grpc/ - Promise-based clients
src/generated/hosts/ - Generated handlers
Adding new enum values (like a new ClineSay type) requires updating conversion mappings in src/shared/proto-conversions/cline-message.ts

Adding new RPC methods requires:

Handler in src/core/controller/<domain>/
Call from webview via generated client: UiServiceClient.scrollToSettings(StringRequest.create({ value: "browser" }))
Example—the explain-changes feature touched:

proto/cline/task.proto - Added ExplainChangesRequest message and explainChanges RPC
proto/cline/ui.proto - Added GENERATE_EXPLANATION = 29 to ClineSay enum
src/shared/ExtensionMessage.ts - Added ClineSayGenerateExplanation type
src/shared/proto-conversions/cline-message.ts - Added mapping for new say type
src/core/controller/task/explainChanges.ts - Handler implementation
webview-ui/src/components/chat/ChatRow.tsx - UI rendering
Adding a New API Provider

When adding a new provider (e.g., "openai-codex"), you must update the proto conversion layer in THREE places or the provider will silently reset to Anthropic:

proto/cline/models.proto - Add to the ApiProvider enum (e.g., OPENAI_CODEX = 40;)
convertApiProviderToProto() in src/shared/proto-conversions/models/api-configuration-conversion.ts - Add case mapping string to proto enum
convertProtoToApiProvider() in the same file - Add case mapping proto enum back to string
Why this matters: Without these, the provider string hits the default case and returns ANTHROPIC. The webview, provider list, and handler all work fine, but the state silently resets when it round-trips through proto serialization. No error is thrown.

Other files to update when adding a provider:

src/shared/api.ts - Add to ApiProvider union type, define models
src/shared/providers/providers.json - Add to provider list for dropdown
src/core/api/index.ts - Register handler in createHandlerForProvider()
webview-ui/src/components/settings/utils/providerUtils.ts - Add cases in getModelsForProvider() and normalizeApiConfiguration()
webview-ui/src/utils/validate.ts - Add validation case
webview-ui/src/components/settings/ApiOptions.tsx - Render provider component
Responses API Providers (OpenAI Codex, OpenAI Native)

Providers using OpenAI's Responses API require native tool calling. XML tools don't work with the Responses API.

Symptoms of broken native tool calling:

Tools get called multiple times (e.g., ask_followup_question asks the same question twice)
Tool arguments get duplicated or malformed
The model responds but tools aren't recognized
Root causes to check:

Provider missing from isNextGenModelProvider() in src/utils/model-utils.ts. The native variant matchers (e.g., native-gpt-5/config.ts) call this function. If your provider isn't in the list, the matcher returns false and falls back to XML tools.
Model missing apiFormat: ApiFormat.OPENAI_RESPONSES in its model info (src/shared/api.ts). This property signals that the model requires native tool calling. The task runner in src/core/task/index.ts checks this and forces enableNativeToolCalls: true regardless of user settings.
When adding a new Responses API provider:

Add provider to isNextGenModelProvider() list in src/utils/model-utils.ts
Set apiFormat: ApiFormat.OPENAI_RESPONSES on all models that use the Responses API
The variant matcher and task runner will handle the rest automatically
Adding Tools to System Prompt

This is tricky—multiple prompt variants and configs. Always search for existing similar tools first and follow their pattern. Look at the full chain from prompt definition → variant configs → handler → UI before implementing.

Add to ClineDefaultTool enum in src/shared/tools.ts
Tool definition in src/core/prompts/system-prompt/tools/ (create file like generate_explanation.ts)
Define variants for each ModelFamily (generic, next-gen, xs, etc.)
Export variants array (e.g., export const my_tool_variants = [GENERIC, NATIVE_NEXT_GEN, XS])
Fallback behavior: If a variant isn't defined for a model family, ClineToolSet.getToolByNameWithFallback() automatically falls back to GENERIC. So you only need to export [GENERIC] unless the tool needs model-specific behavior.
Register in src/core/prompts/system-prompt/tools/init.ts - Import and spread into allToolVariants
Add to variant configs - Each model family has its own config in src/core/prompts/system-prompt/variants/*/config.ts. Add your tool's enum to the .tools() list:
generic/config.ts, next-gen/config.ts, gpt-5/config.ts, native-gpt-5/config.ts, native-gpt-5-1/config.ts, native-next-gen/config.ts, gemini-3/config.ts, glm/config.ts, hermes/config.ts, xs/config.ts
Important: If you add to a variant's config, make sure the tool spec exports a variant for that ModelFamily (or relies on GENERIC fallback)
Create handler in src/core/task/tools/handlers/
Wire up in ToolExecutor.ts if needed for execution flow
Add to tool parsing in src/core/assistant-message/index.ts if needed
If tool has UI feedback: add ClineSay enum in proto, update src/shared/ExtensionMessage.ts, update src/shared/proto-conversions/cline-message.ts, update webview-ui/src/components/chat/ChatRow.tsx
Modifying System Prompt

Read these first: src/core/prompts/system-prompt/README.md, tools/README.md, __tests__/README.md

System prompt is modular: components (reusable sections) + variants (model-specific configs) + templates (with {{PLACEHOLDER}} resolution).

Key directories:

components/ - Shared sections: rules.ts, capabilities.ts, editing_files.ts, etc.
variants/ - Model-specific: generic/, next-gen/, xs/, gpt-5/, gemini-3/, hermes/, glm/, etc.
templates/ - Template engine and placeholder definitions
Variant tiers (ask user which to modify):

Next-gen (Claude 4, GPT-5, Gemini 2.5): next-gen/, native-next-gen/, native-gpt-5/, native-gpt-5-1/, gemini-3/, gpt-5/
Standard (default fallback): generic/
Local/small models: xs/, hermes/, glm/
How overrides work: Variants can override components via componentOverrides in their config.ts, or provide a custom template in template.ts (e.g., next-gen/template.ts exports rules_template). If no override, the shared component from components/ is used.

Example: Adding a rule to RULES section

Check if variant overrides rules: look for rules_template in variants/*/template.ts or componentOverrides.RULES in config.ts
If shared: modify components/rules.ts
If overridden: modify that variant's template
XS variant is special—has heavily condensed inline content in template.ts
After any changes, regenerate snapshots:

UPDATE_SNAPSHOTS=true npm run test:unit
Snapshots live in __tests__/__snapshots__/. Tests validate across model families and context variations (browser, MCP, focus chain).

Modifying Default Slash Commands

Three places need updates:

src/core/slash-commands/index.ts - Command definitions
src/core/prompts/commands.ts - System prompt integration
webview-ui/src/utils/slash-commands.ts - Webview autocomplete
Adding New Global State Keys

Adding a new key to global state requires updates in multiple places. Missing any step causes silent failures.

Required steps:

Type definition in src/shared/storage/state-keys.ts - Add to GlobalState or Settings interface
Read from globalState in src/core/storage/utils/state-helpers.ts:
Add const myKey = context.globalState.get<GlobalStateAndSettings["myKey"]>("myKey") in readGlobalStateFromDisk()
Add to the return object: myKey: myKey ?? defaultValue,
StateManager handles read/write via setGlobalState()/getGlobalStateKey() after initialization
Common mistake: Adding only the return value without the context.globalState.get() call. This compiles but the value is always undefined on load.

Settings plumbing gotcha: if a key is user-toggleable from settings, wire both controller update paths:

src/core/controller/state/updateSettings.ts for webview updateSetting(...)
src/core/controller/state/updateSettingsCli.ts for CLI/ACP settings updates Missing one path causes a toggle to appear to change in one surface while the backend state stays unchanged.
Webview toggle gotcha: settings changes must also round-trip back in state payloads.

Add the field to UpdateSettingsRequest in proto/cline/state.proto (for webview update requests), then run npm run protos
Include the key in Controller.getStateToPostToWebview() (src/core/controller/index.ts)
Ensure ExtensionState and webview defaults include the key (src/shared/ExtensionMessage.ts, webview-ui/src/context/ExtensionStateContext.tsx) If this round-trip wiring is missing, the backend value can update but the toggle in webview appears stuck or reverts.
StateManager Cache vs Direct globalState Access

StateManager uses an in-memory cache populated during StateManager.initialize(context) in common.ts. For most state, use controller.stateManager.setGlobalState()/getGlobalStateKey().

Exception: State needed immediately at extension startup (before cache is ready)

When Window A sets state and immediately opens Window B, the new window's StateManager cache is populated from context.globalState during initialization. If you need to read state in Window B right at startup (e.g., in common.ts during initialize()), read directly from context.globalState.get() instead of StateManager's cache.

Example pattern (see lastShownAnnouncementId and worktreeAutoOpenPath):

// Writing (normal pattern)
controller.stateManager.setGlobalState("myKey", value)

// Reading at startup in common.ts (bypass cache)
const value = context.globalState.get<string>("myKey")
This is only needed for cross-window state read during the brief startup window before StateManager cache is fully usable. Normal state access after initialization should use StateManager.

ChatRow Cancelled/Interrupted States

When a ChatRow displays a loading/in-progress state (spinner), you must handle what happens when the task is cancelled. This is non-obvious because cancellation doesn't update the message content—you have to infer it from context.

The pattern:

A message has a status field (e.g., "generating", "complete", "error") stored in message.text as JSON
When cancelled mid-operation, the status stays "generating" forever—no one updates it
To detect cancellation, check TWO conditions:
!isLast — if this message is no longer the last message, something else happened after it (interrupted)
lastModifiedMessage?.ask === "resume_task" || "resume_completed_task" — task was just cancelled and is waiting to resume
Example from generate_explanation:

const wasCancelled =
    explanationInfo.status === "generating" &&
    (!isLast ||
        lastModifiedMessage?.ask === "resume_task" ||
        lastModifiedMessage?.ask === "resume_completed_task")
const isGenerating = explanationInfo.status === "generating" && !wasCancelled
Why both checks?

!isLast catches: cancelled → resumed → did other stuff → this old message is stale
lastModifiedMessage?.ask === "resume_task" catches: just cancelled, hasn't resumed yet, this message is still technically "last"
See also: BrowserSessionRow.tsx uses similar pattern with isLastApiReqInterrupted and isLastMessageResume.

Backend side: When streaming is cancelled, clean up properly (close tabs, clear comments, etc.) by checking taskState.abort after the streaming function returns.

.clinerules/network.md

Networking & Proxy Support
To ensure Cline works correctly in all environments (VSCode, JetBrains, CLI) and with various network configurations (especially corporate proxies), strictly follow these guidelines for all network activity.

In extension code, do NOT use the global fetch or a default axios instance. (Note, shared/net.ts is exempt from these rules because it sets up the fetch wrappers.) In Webview code, you SHOULD use global fetch.

Global fetch and default axios do not automatically pick up proxy configurations in all environments (specifically JetBrains and CLI). You MUST use the provided utilities in @/shared/net which handle proxy agent configuration. In the webview, the browser/embedder handles proxies.

Guidelines

1. Using fetch
Instead of fetch(...), import the proxy-aware wrapper:

import { fetch } from '@/shared/net'

// Usage is identical to global fetch
const response = await fetch('https://api.example.com/data')
2. Using axios
When using axios, you must apply the settings from getAxiosSettings():

import axios from 'axios'
import { getAxiosSettings } from '@/shared/net'

const response = await axios.get('https://api.example.com/data', {
  headers: { 'Authorization': '...' },
  ...getAxiosSettings() // <--- CRITICAL: Injects the proxy agent if needed
})
3. Third-Party Clients (OpenAI, Ollama, etc.)
Most API client libraries allow you to customize the fetch implementation. You MUST pass the proxy-aware fetch to these clients.

Example (OpenAI):

import OpenAI from "openai"
import { fetch } from "@/shared/net"

this.client = new OpenAI({
  apiKey: '...',
  fetch, // <--- CRITICAL: Pass our fetch wrapper
})
4. Tests
Use mockFetchForTesting to mock the underlying fetch implementation.

Example (callback):

import { mockFetchForTesting } from "@/shared/net"

...
  let mockFetch = ...
  mockFetchForTesting(mockFetch, () => {
    // This calls mockFetch
    fetch('https://foo.example').then(...)
  })
  // Original fetch is restored immediately when the call returns.
Example (Promise):

import { mockFetchForTesting } from "@/shared/net"

...
  let mockFetch = ...
  await mockFetchForTesting(mockFetch, async () => {
    await ...
    // This calls mockFetch
    await fetch('https://foo.example')
    ...
  })
  // Original fetch is restored when the Promise from the callback settles
Verification

If you are adding a new network call or integration:

Check @/shared/net.ts is imported.
Ensure fetch or getAxiosSettings is being used.
Verify that third-party clients are configured to use the custom fetch.
.clinerules/protobuf-development.md

Cline Protobuf Development Guide
This guide outlines how to add new gRPC endpoints for communication between the webview (frontend) and the extension host (backend).

Overview

Cline uses Protobuf to define a strongly-typed API, ensuring efficient and type-safe communication. All definitions are in the /proto directory. The compiler and plugins are included as project dependencies, so no manual installation is needed.

Key Concepts & Best Practices

File Structure: Each feature domain should have its own .proto file (e.g., account.proto, task.proto).
Message Design:
For simple, single-value data, use the shared types in proto/common.proto (e.g., StringRequest, Empty, Int64Request). This promotes consistency.
For complex data structures, define custom messages within the feature's .proto file (see task.proto for examples like NewTaskRequest).
Naming Conventions:
Services: PascalCaseService (e.g., AccountService).
RPCs: camelCase (e.g., accountEmailIdentified).
Messages: PascalCase (e.g., StringRequest).
Streaming: For server-to-client streaming, use the stream keyword on the response type. See subscribeToAuthCallback in account.proto for an example.
4-Step Development Workflow

Here’s how to add a new RPC, using scrollToSettings as an example.

1. Define the RPC in a .proto File
Add your service method to the appropriate file in the proto/ directory.

File: proto/ui.proto

service UiService {
  // ... other RPCs
  // Scrolls to a specific settings section in the settings view
  rpc scrollToSettings(StringRequest) returns (KeyValuePair);
}
Here, we use the common StringRequest and KeyValuePair types.

2. Compile Definitions
After editing a .proto file, regenerate the TypeScript code. From the project root, run:

npm run protos
This command compiles all .proto files and outputs the generated code to src/generated/ and src/shared/. Do not edit these generated files manually.

3. Implement the Backend Handler
Create the RPC implementation in the backend. Handlers are located in src/core/controller/[service-name]/.

File: src/core/controller/ui/scrollToSettings.ts

import { Controller } from ".."
import { StringRequest, KeyValuePair } from "../../../shared/proto/common"

/**
 * Executes a scroll to settings action
 * @param controller The controller instance
 * @param request The request containing the ID of the settings section to scroll to
 * @returns KeyValuePair with action and value fields for the UI to process
 */
export async function scrollToSettings(controller: Controller, request: StringRequest): Promise<KeyValuePair> {
	return KeyValuePair.create({
		key: "scrollToSettings",
		value: request.value || "",
	})
}
4. Call the RPC from the Webview
Call the new RPC from a React component in webview-ui/. The generated client makes this simple.

File: webview-ui/src/components/browser/BrowserSettingsMenu.tsx (Example)

import { UiServiceClient } from "../../../services/grpc"
import { StringRequest } from "../../../../shared/proto/common"

// ... inside a React component
const handleMenuClick = async () => {
    try {
        await UiServiceClient.scrollToSettings(StringRequest.create({ value: "browser" }))
    } catch (error) {
        console.error("Error scrolling to browser settings:", error)
    }
}
.clinerules/storage.md

Storage Architecture
Global settings, secrets and workspace state are stored in file-backed JSON stores under ~/.cline/data/. This is the shared storage layer used by VSCode, CLI, and JetBrains.

Key Abstractions

StorageContext (src/shared/storage/storage-context.ts)
The entry point. Created via createStorageContext() and passed to StateManager.initialize(). Contains three ClineFileStorage instances:

globalState → ~/.cline/data/globalState.json
secrets → ~/.cline/data/secrets.json (mode 0o600)
workspaceState → ~/.cline/data/workspaces/<hash>/workspaceState.json
ClineFileStorage (src/shared/storage/ClineFileStorage.ts)
Synchronous JSON key-value store backed by a single file. Supports get(), set(), setBatch(), delete(). Writes are atomic (write-then-rename).

StateManager (src/core/storage/StateManager.ts)
In-memory cache on top of StorageContext. All runtime reads hit the cache; writes update cache immediately and debounce-flush to disk.

⚠️ Do NOT Use VSCode's ExtensionContext for Storage

Do not read from or write to context.globalState, context.workspaceState, or context.secrets for persistent data. These are VSCode-specific and not available on CLI or JetBrains.

Instead, use:

// Reading state
StateManager.get().getGlobalStateKey("myKey")
StateManager.get().getSecretKey("mySecretKey")
StateManager.get().getWorkspaceStateKey("myWsKey")

// Writing state
StateManager.get().setGlobalState("myKey", value)
StateManager.get().setSecret("mySecretKey", value)
StateManager.get().setWorkspaceState("myWsKey", value)
Remember that your data may be read by a different client than the one that wrote it. For example, a value written by Cline in JetBrains may be read by Cline CLI.

VSCode Migration (src/hosts/vscode/vscode-to-file-migration.ts)

On VSCode startup, a migration copies data from VSCode's ExtensionContext storage into the file-backed stores. This runs in src/common.ts before StateManager.initialize().

Sentinel: __vscodeMigrationVersion key in global state and workspace state — prevents re-migration.
Merge strategy: File store wins. Existing values are never overwritten.
Safe downgrade: VSCode storage is NOT cleared, so older extension versions still work.
Adding New Storage Keys

Add to src/shared/storage/state-keys.ts (see existing patterns)
Read/write via StateManager (NOT via context.globalState)
If adding a secret, add to SecretKeys array in state-keys.ts
File Layout

~/.cline/
  data/
    globalState.json          # Global settings & state
    secrets.json              # API keys (mode 0o600)
    tasks/
      taskHistory.json        # Task history (separate file)
    workspaces/
      <hash>/
        workspaceState.json   # Per-workspace toggles
<environment_details>

System-Generated Runtime Context
This block is generated by the runtime and is not direct input from the human user.

Visual Studio Code Visible Files
docs/action-plan-guide.md

Current Mode
ACT MODE
</environment_details>