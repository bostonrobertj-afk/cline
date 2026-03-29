import { workspaceResolver } from "@core/workspace"
import { openFile as openFileIntegration } from "@integrations/misc/open-file"
import { Empty } from "@shared/proto/cline/common"
import { OpenFileRelativePathAtRangeRequest } from "@shared/proto/cline/file"
import { getWorkspacePath } from "@utils/path"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

/**
 * Opens a file in the editor by a relative path and reveals a target line/range.
 * @param controller The controller instance
 * @param request The request message containing the relative file path and selection range
 * @returns Empty response
 */
export async function openFileRelativePathAtRange(
	_controller: Controller,
	request: OpenFileRelativePathAtRangeRequest,
): Promise<Empty> {
	const workspacePath = await getWorkspacePath()

	if (!workspacePath) {
		Logger.error("Error in openFileRelativePathAtRange: No workspace path available")
		return Empty.create()
	}

	if (request.relativePath) {
		const resolvedPath = workspaceResolver.resolveWorkspacePath(
			workspacePath,
			request.relativePath,
			"Controller.openFileRelativePathAtRange",
		)
		const absolutePath = typeof resolvedPath === "string" ? resolvedPath : resolvedPath.absolutePath

		openFileIntegration(absolutePath, request.preserveFocus ?? false, request.preview ?? false, {
			startLine: request.startLine,
			startCharacter: request.startCharacter ?? 1,
			endLine: request.endLine ?? request.startLine,
			endCharacter: request.endCharacter ?? request.startCharacter ?? 1,
		})
	}

	return Empty.create()
}
