package com.khanago.grocery.user;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class AddressFormatter {

    private static final Pattern DETECTED_LOCATION_PATTERN = Pattern.compile("Detected Location:\\s*([^|]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern VILLAGE_PATTERN = Pattern.compile("Village/Area:\\s*([^|]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern LANDMARK_PATTERN = Pattern.compile("Landmark:\\s*([^|]+)", Pattern.CASE_INSENSITIVE);

    private AddressFormatter() {
    }

    public static String format(Address address) {
        if (address == null) {
            return "N/A";
        }

        List<String> parts = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();

        addPart(parts, seen, address.getVillage());
        addPart(parts, seen, prefix("Near By ", address.getLandmark()));
        addPart(parts, seen, address.getLine1());
        addPart(parts, seen, address.getLine2());
        addPart(parts, seen, address.getCity());
        addPart(parts, seen, address.getState());
        addPart(parts, seen, address.getPostalCode());

        return parts.isEmpty() ? "N/A" : String.join(", ", parts);
    }

    public static String formatFromNotes(String notes) {
        if (notes == null || notes.isBlank()) {
            return "";
        }

        List<String> parts = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();

        addPart(parts, seen, extract(notes, VILLAGE_PATTERN));
        addPart(parts, seen, prefix("Near By ", extract(notes, LANDMARK_PATTERN)));
        addPart(parts, seen, extract(notes, DETECTED_LOCATION_PATTERN));

        return String.join(", ", parts);
    }

    private static String extract(String notes, Pattern pattern) {
        Matcher matcher = pattern.matcher(notes);
        if (!matcher.find()) {
            return "";
        }
        return matcher.group(1).trim();
    }

    private static String prefix(String prefix, String value) {
        String normalized = normalize(value);
        return normalized.isBlank() ? "" : prefix + normalized;
    }

    private static void addPart(List<String> parts, Set<String> seen, String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return;
        }

        String key = normalized.replaceAll("[^a-zA-Z0-9]", "").toLowerCase(Locale.ROOT);
        if (key.isBlank() || seen.add(key)) {
            parts.add(normalized);
        }
    }

    private static String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().replaceAll("\\s+", " ");
    }
}