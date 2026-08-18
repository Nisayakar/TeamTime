package com.teamtime.event;

import com.teamtime.entity.Notification;
import org.springframework.context.ApplicationEvent;

public class NotificationEvent extends ApplicationEvent {
    private final Notification notification;

    public NotificationEvent(Object source, Notification notification) {
        super(source);
        this.notification = notification;
    }

    public Notification getNotification() {
        return notification;
    }
}
