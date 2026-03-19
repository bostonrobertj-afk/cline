import { mentionRegexGlobal } from "@shared/context-mentions"
import { USER_CONTENT_TAGS } from "@shared/messages/constants"

export function hasUserContentTag(text: string): boolean {
	return USER_CONTENT_TAGS.some((tag) => text.includes(tag))
}

export function hasExplicitMentionSyntax(text: string): boolean {
	mentionRegexGlobal.lastIndex = 0
	return mentionRegexGlobal.test(text)
}