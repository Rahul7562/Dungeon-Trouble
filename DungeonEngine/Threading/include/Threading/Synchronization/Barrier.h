#pragma once
#include "Mutex.h"
#include "ConditionVariable.h"
#include "Core/Types.h"
#include "Core/Assert.h"
#include <functional>

namespace DungeonEngine::Threading {

    // C++17 polyfill for C++20 std::barrier
    class Barrier {
    public:
        explicit Barrier(Core::i32 count, std::function<void()> completionFunction = nullptr)
            : m_ThreadCount(count)
            , m_Count(count)
            , m_Generation(0)
            , m_CompletionFunction(completionFunction)
        {
            DT_ASSERT(count > 0, "Barrier count must be strictly positive");
        }

        void ArriveAndWait() {
            m_Mutex.Lock();
            Core::u32 gen = m_Generation;

            if (--m_Count == 0) {
                m_Generation++;
                m_Count = m_ThreadCount;
                if (m_CompletionFunction) {
                    m_CompletionFunction();
                }
                m_CV.NotifyAll();
                m_Mutex.Unlock();
            } else {
                m_CV.Wait(m_Mutex, [this, gen] { return gen != m_Generation; });
                m_Mutex.Unlock();
            }
        }

    private:
        Mutex m_Mutex;
        ConditionVariable m_CV;
        Core::i32 m_ThreadCount;
        Core::i32 m_Count;
        Core::u32 m_Generation;
        std::function<void()> m_CompletionFunction;
    };

}
