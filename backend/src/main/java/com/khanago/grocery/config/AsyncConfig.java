package com.khanago.grocery.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Configures a bounded thread pool for all @Async tasks (e.g. Telegram notifications).
 *
 * Why this matters for scalability:
 *   - Default SimpleAsyncTaskExecutor creates a new thread per call — unbounded, no reuse.
 *   - Under concurrent order load this thread pool queues work and reuses threads.
 *   - Core=2 / Max=8 / Queue=500 handles bursts safely without exhausting system resources.
 *   - Notifications never block the order checkout transaction — failures are swallowed
 *     with a log entry so customer orders always succeed regardless of Telegram availability.
 */
@Configuration
public class AsyncConfig implements AsyncConfigurer {

    @Bean(name = "notificationExecutor")
    public Executor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);       // always-alive threads
        executor.setMaxPoolSize(8);        // burst capacity
        executor.setQueueCapacity(500);    // backlog before scaling to max
        executor.setThreadNamePrefix("notify-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(10);
        executor.initialize();
        return executor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return notificationExecutor();
    }
}
