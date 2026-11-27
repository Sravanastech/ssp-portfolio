package com.sravanaparimi.profile.studio;

import com.networknt.schema.Schema;
import java.util.Locale;
import tools.jackson.databind.JsonNode;

/** One content-schema/*.schema.json file: its JSON Schema, UI hints, and snapshot mapping. */
public record StudioSchema(
    String type,
    Shape shape,
    String target,
    String collection,
    String slugFrom,
    int order,
    JsonNode document,
    Schema compiled) {

  /** How blocks of this type map into the SiteSnapshot content. */
  public enum Shape {
    /** content[target] = the block data (profile). */
    OBJECT,
    /** content[target] = array of block data ordered by position. */
    ITEM,
    /** content[target][slug] = block data (seo, one per route). */
    KEYED,
    /** content[target] gets every key of the block data (copy, one block per page prefix). */
    MERGE;

    static Shape parse(String s) {
      return valueOf(s.toUpperCase(Locale.ROOT));
    }
  }
}
