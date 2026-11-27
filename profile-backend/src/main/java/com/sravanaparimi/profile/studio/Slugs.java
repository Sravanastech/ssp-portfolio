package com.sravanaparimi.profile.studio;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Stable block keys. A slug is unique per block type. */
public final class Slugs {
  private static final Pattern VALID = Pattern.compile("^[A-Za-z0-9/][A-Za-z0-9._/-]{0,119}$");

  private Slugs() {}

  public static boolean isValid(String slug) {
    return slug != null && VALID.matcher(slug).matches();
  }

  public static String slugify(String text) {
    if (text == null) return "";
    String s = text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
    s = s.replaceAll("^-+|-+$", "");
    return s.length() > 100 ? s.substring(0, 100).replaceAll("-+$", "") : s;
  }

  public static String unique(String base, Set<String> taken) {
    if (!taken.contains(base)) return base;
    int n = 2;
    while (taken.contains(base + "-" + n)) n++;
    return base + "-" + n;
  }
}
