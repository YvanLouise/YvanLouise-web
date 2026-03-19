import { SiteUiText, WorkType } from "../types";

export function getWorkTypeLabel(type: WorkType, uiText: SiteUiText): string {
  if (type === "music") {
    return uiText.works.musicLabel;
  }

  if (type === "software") {
    return uiText.works.softwareLabel;
  }

  if (type === "game") {
    return uiText.works.gameLabel;
  }

  return uiText.works.animationLabel;
}
