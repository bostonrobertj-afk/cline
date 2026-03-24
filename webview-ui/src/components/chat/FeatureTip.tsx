import { memo } from "react"

/**
 * Feature tips are intentionally disabled.
 *
 * They were being surfaced in copied thread content and could be fed back into
 * the model as if they were meaningful conversation text.
 */
export const FeatureTip = memo(() => null)

FeatureTip.displayName = "FeatureTip"
