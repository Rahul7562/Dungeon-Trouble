# Performance Guidelines

## 1. Performance Philosophy
Performance is not an afterthought. It is a fundamental requirement. Target: Minimum 60 FPS, 120 FPS preferred.

## 2. Memory Efficiency
* Avoid dynamic allocations (`new`/`malloc`) in the main loop.
* Use custom allocators (Pool, Linear, Stack) where possible.
* Keep structs tightly packed to minimize padding.

## 3. CPU Optimization & Cache Friendliness
* Embrace Data-Oriented Design (DOD). Organize data in contiguous arrays (Struct of Arrays vs Array of Structs) to maximize cache hits.
* Avoid virtual function calls in hot loops (e.g., rendering, ECS updates).

## 4. Threading Philosophy
* Design for concurrency from day one.
* Use task graphs and job systems instead of manual thread management.
* Avoid mutexes in hot paths; prefer lock-free data structures or double-buffering.

## 5. Profiling Expectations
Always profile before optimizing. Use tools like Tracy or standard OS profilers. Guessing is not optimizing.
