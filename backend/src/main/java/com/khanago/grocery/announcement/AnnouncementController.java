package com.khanago.grocery.announcement;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementRepository repo;

    /** Public — called by the Ionic app on every home load */
    @GetMapping("/api/public/announcement")
    public Announcement get() {
        return repo.findById(1L).orElseGet(Announcement::new);
    }

    /** Admin only — save/update the announcement */
    @PutMapping("/api/admin/announcement")
    public Announcement update(@RequestBody Map<String, Object> body) {
        Announcement a = repo.findById(1L).orElseGet(Announcement::new);
        a.setId(1L);
        if (body.containsKey("message"))  a.setMessage((String) body.get("message"));
        if (body.containsKey("active"))   a.setActive((Boolean) body.get("active"));
        if (body.containsKey("bgColor"))  a.setBgColor((String) body.get("bgColor"));
        return repo.save(a);
    }
}
