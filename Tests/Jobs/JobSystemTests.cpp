#include "catch_amalgamated.hpp"
#include "Jobs/Scheduler/JobScheduler.h"
#include "Jobs/Utilities/Promise.h"
#include "Jobs/Utilities/ParallelFor.h"
#include "Jobs/Utilities/CancellationToken.h"
#include "Threading/ThreadManager.h"
#include <atomic>
#include <thread>
#include <chrono>

using namespace DungeonEngine;
using namespace DungeonEngine::Jobs;

class TestJob : public IJob {
public:
    TestJob(std::atomic<int>& counter, std::shared_ptr<Promise<void>> promise = nullptr)
        : m_Counter(counter), m_Promise(std::move(promise)) {}

    void Execute() override {
        m_Counter++;
        if (m_Promise) {
            m_Promise->SetValue();
        }
    }

private:
    std::atomic<int>& m_Counter;
    std::shared_ptr<Promise<void>> m_Promise;
};

TEST_CASE("JobSystem: Basic Scheduling", "[JobSystem]") {
    auto threadManager = std::make_shared<Threading::ThreadManager>();
    JobScheduler scheduler(threadManager);
    scheduler.Initialize(4);

    SECTION("Single Job Execution") {
        std::atomic<int> counter = 0;
        auto promise = std::make_shared<Promise<void>>();
        auto future = promise->GetFuture();

        TestJob job(counter, promise);
        scheduler.Submit(&job);

        future.Wait();
        REQUIRE(future.IsReady() == true);
        REQUIRE(counter.load() == 1);
    }

    SECTION("Multiple Jobs Execution") {
        std::atomic<int> counter = 0;
        const int numJobs = 100;
        std::vector<std::shared_ptr<Promise<void>>> promises;
        std::vector<std::unique_ptr<TestJob>> jobs;

        for (int i = 0; i < numJobs; ++i) {
            auto promise = std::make_shared<Promise<void>>();
            promises.push_back(promise);
            jobs.push_back(std::make_unique<TestJob>(counter, promise));
        }

        for (auto& job : jobs) {
            scheduler.Submit(job.get());
        }

        for (auto& promise : promises) {
            promise->GetFuture().Wait();
        }

        REQUIRE(counter.load() == numJobs);
    }

    scheduler.Shutdown();
}

TEST_CASE("JobSystem: ParallelFor", "[JobSystem]") {
    auto threadManager = std::make_shared<Threading::ThreadManager>();
    JobScheduler scheduler(threadManager);
    scheduler.Initialize(4);

    SECTION("Execute ParallelFor over range") {
        const int numElements = 1000;
        std::vector<int> data(numElements, 0);

        auto future = ParallelFor::Execute(&scheduler, numElements, 100, [&data](Core::u32 index) {
            data[index] = index * 2;
        });

        future.Wait();

        for (int i = 0; i < numElements; ++i) {
            REQUIRE(data[i] == i * 2);
        }
    }

    scheduler.Shutdown();
}

TEST_CASE("JobSystem: Future and Promise", "[JobSystem]") {
    SECTION("Future gets value from Promise") {
        Promise<int> promise;
        Future<int> future = promise.GetFuture();

        REQUIRE(future.IsReady() == false);

        promise.SetValue(42);

        REQUIRE(future.IsReady() == true);
        REQUIRE(future.Get() == 42);
    }
}

TEST_CASE("JobSystem: Cancellation", "[JobSystem]") {
    CancellationTokenSource source;
    CancellationToken token = source.GetToken();

    REQUIRE(token.IsCancellationRequested() == false);

    source.Cancel();

    REQUIRE(token.IsCancellationRequested() == true);
}

class DependencyJob : public IJob {
public:
    DependencyJob(std::atomic<int>& order, int expectedValue, std::shared_ptr<Promise<void>> promise = nullptr)
        : m_Order(order), m_ExpectedValue(expectedValue), m_Promise(std::move(promise)) {}

    void Execute() override {
        REQUIRE(m_Order.load() == m_ExpectedValue);
        m_Order++;

        for (auto child : m_Children) {
            child->RemoveDependency();
            if (child->IsReady()) {
                m_Scheduler->Submit(child);
            }
        }

        if (m_Promise) {
            m_Promise->SetValue();
        }
    }

    void AddChild(IJob* child) {
        child->AddDependency();
        m_Children.push_back(child);
    }

    void SetScheduler(JobScheduler* scheduler) {
        m_Scheduler = scheduler;
    }

private:
    std::atomic<int>& m_Order;
    int m_ExpectedValue;
    std::shared_ptr<Promise<void>> m_Promise;
    std::vector<IJob*> m_Children;
    JobScheduler* m_Scheduler = nullptr;
};

TEST_CASE("JobSystem: Dependencies", "[JobSystem]") {
    auto threadManager = std::make_shared<Threading::ThreadManager>();
    JobScheduler scheduler(threadManager);
    scheduler.Initialize(2);

    SECTION("Job Execution Order") {
        std::atomic<int> order = 0;
        auto promise = std::make_shared<Promise<void>>();

        DependencyJob parent(order, 0);
        DependencyJob child1(order, 1);
        DependencyJob child2(order, 2, promise);

        parent.SetScheduler(&scheduler);
        child1.SetScheduler(&scheduler);
        child2.SetScheduler(&scheduler);

        parent.AddChild(&child1);
        child1.AddChild(&child2);

        REQUIRE(child1.IsReady() == false);
        REQUIRE(child2.IsReady() == false);

        scheduler.Submit(&parent);

        promise->GetFuture().Wait();
        REQUIRE(order.load() == 3);
    }

    scheduler.Shutdown();
}
