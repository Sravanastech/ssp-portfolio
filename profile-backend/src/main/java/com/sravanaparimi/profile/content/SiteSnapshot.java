package com.sravanaparimi.profile.content;

import java.util.Map;

public record SiteSnapshot(long revision, Map<String, Object> content) {}
