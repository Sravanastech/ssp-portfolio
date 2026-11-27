package com.sravanaparimi.profile.studio;

import tools.jackson.databind.JsonNode;

/** The content of one block, detached from persistence: what splitting yields, assembly takes. */
public record BlockPart(
    String type, String collection, String slug, int position, JsonNode data) {}
