package com.sravanaparimi.profile.accounts;

/** Every admin capability. Fixed in code; roles are bundles of these. Mirrored in profile-ui. */
public enum Permission {
  CONTENT_EDIT("content.edit"),
  CONTENT_PUBLISH("content.publish"),
  MEDIA_UPLOAD("media.upload"),
  INQUIRIES_MANAGE("inquiries.manage"),
  INQUIRIES_REPLY("inquiries.reply"),
  INSIGHTS_READ("insights.read"),
  PEOPLE_READ("people.read"),
  PEOPLE_MANAGE("people.manage"),
  TEAM_MANAGE("team.manage"),
  AUDIT_READ("audit.read"),
  SETTINGS_MANAGE("settings.manage");

  private final String code;

  Permission(String code) {
    this.code = code;
  }

  public String code() {
    return code;
  }
}
