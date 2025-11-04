export type VisibilityType = "private" | "public";

export const DEFAULT_CHAT_VISIBILITY: VisibilityType = "private";

export function sanitizeVisibility(
  visibility: VisibilityType
): VisibilityType {
  return visibility === "public"
    ? DEFAULT_CHAT_VISIBILITY
    : visibility;
}
